import { supabase } from './supabase';
import { GOOGLE_MAPS_API_KEY, UBATUBA_BOUNDS, UBATUBA_CENTER } from './googleMapsConfig';

const GOOGLE_KEY = GOOGLE_MAPS_API_KEY || import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

// Cache em memória local para tempo de resposta instantâneo (< 1ms)
const localCache = new Map<string, { lat: number; lng: number; label: string; provider: string }>();

try {
  const savedCache = localStorage.getItem('ubt_endereco_cache_local');
  if (savedCache) {
    const parsed = JSON.parse(savedCache);
    Object.entries(parsed).forEach(([key, val]: [string, any]) => {
      localCache.set(key, val);
    });
  }
} catch (e) {
  console.warn('Erro ao carregar cache local do localStorage:', e);
}

const saveLocalCache = () => {
  try {
    const obj = Object.fromEntries(localCache.entries());
    localStorage.setItem('ubt_endereco_cache_local', JSON.stringify(obj));
  } catch (e) {
    console.warn('Erro ao salvar cache local no localStorage:', e);
  }
};

export const normalizeAddress = (address: string): string => {
  if (!address) return '';
  return address
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\br\b|\brua\b/gi, 'rua')
    .replace(/\bav\b|\bavenida\b/gi, 'avenida')
    .replace(/\bpca\b|\bpraca\b/gi, 'praca')
    .replace(/\brod\b|\brodovia\b/gi, 'rodovia')
    .replace(/\btrav\b|\btravessa\b/gi, 'travessa')
    .replace(/\bal\b|\balameda\b/gi, 'alameda')
    .replace(/\bjd\b|\bjardim\b/gi, 'jardim');
};

const logMetric = async (
  metricType: 'cache_hit' | 'fallback_usage' | 'avg_time' | 'error' | 'not_found',
  query: string,
  normalizedQuery: string,
  provider?: string,
  responseTimeMs?: number,
  errorMessage?: string
) => {
  try {
    await supabase.from('geocoding_metrics').insert({
      metric_type: metricType,
      query,
      normalized_query: normalizedQuery,
      provider,
      response_time_ms: responseTimeMs,
      error_message: errorMessage
    });
  } catch (e) {
    // Silently ignore metrics error
  }
};

const saveToPersistentCache = async (
  query: string,
  normalizedQuery: string,
  lat: number,
  lng: number,
  provider: string,
  confidence: number = 1.0
) => {
  try {
    localCache.set(normalizedQuery, { lat, lng, label: query, provider });
    saveLocalCache();

    await supabase.from('endereco_cache').insert({
      query,
      normalized_query: normalizedQuery,
      latitude: lat,
      longitude: lng,
      provider,
      confidence
    });
  } catch (e) {
    console.error('Erro ao persistir no cache:', e);
  }
};

// Geocodificação Direta com Google Maps Geocoding API
export const geocodeGoogle = async (query: string): Promise<{ lat: number; lng: number } | null> => {
  if (!GOOGLE_KEY) return null;
  try {
    const encoded = encodeURIComponent(query + ', Ubatuba, SP, Brasil');
    const boundsParam = `&bounds=${UBATUBA_BOUNDS.south},${UBATUBA_BOUNDS.west}|${UBATUBA_BOUNDS.north},${UBATUBA_BOUNDS.east}`;
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encoded}&key=${GOOGLE_KEY}&language=pt-BR&region=br${boundsParam}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data && data.status === 'OK' && data.results && data.results.length > 0) {
      const { lat, lng } = data.results[0].geometry.location;
      return { lat, lng };
    }
  } catch (err) {
    console.warn('Google Geocode error:', err);
  }
  return null;
};

// Geocoding Direto Híbrido (Cache -> CEP DB -> Google Maps)
export const geocodeAddress = async (address: string): Promise<{ lat: number; lng: number; label: string } | null> => {
  if (!address || address.trim().length < 3) return null;
  const startTime = Date.now();
  const normalized = normalizeAddress(address);

  try {
    // 1. Cache Local
    if (localCache.has(normalized)) {
      const cached = localCache.get(normalized)!;
      const elapsed = Date.now() - startTime;
      logMetric('cache_hit', address, normalized, cached.provider, elapsed);
      return { lat: cached.lat, lng: cached.lng, label: cached.label };
    }

    // 2. Cache Remoto (Supabase)
    const { data: remoteCache } = await supabase
      .from('endereco_cache')
      .select('*')
      .eq('normalized_query', normalized)
      .limit(1)
      .maybeSingle();

    if (remoteCache) {
      const elapsed = Date.now() - startTime;
      localCache.set(normalized, {
        lat: Number(remoteCache.latitude),
        lng: Number(remoteCache.longitude),
        label: remoteCache.query,
        provider: remoteCache.provider
      });
      saveLocalCache();
      logMetric('cache_hit', address, normalized, remoteCache.provider, elapsed);
      return {
        lat: Number(remoteCache.latitude),
        lng: Number(remoteCache.longitude),
        label: remoteCache.query
      };
    }

    // 3. Tabela Local ceps_ubatuba
    const cepMatch = address.match(/(\d{5}-?\d{3})/);
    if (cepMatch) {
      const rawCep = cepMatch[1];
      const formattedCep = rawCep.includes('-') ? rawCep : `${rawCep.slice(0, 5)}-${rawCep.slice(5)}`;
      const { data: dbItem } = await supabase
        .from('ceps_ubatuba')
        .select('*')
        .eq('cep', formattedCep)
        .maybeSingle();

      if (dbItem) {
        const label = `${dbItem.logradouro}, ${dbItem.bairro}, Ubatuba - CEP ${dbItem.cep}`;
        if (dbItem.lat && dbItem.lng) {
          const elapsed = Date.now() - startTime;
          await saveToPersistentCache(label, normalized, Number(dbItem.lat), Number(dbItem.lng), 'cache_cep');
          logMetric('fallback_usage', address, normalized, 'cache_cep', elapsed);
          return { lat: Number(dbItem.lat), lng: Number(dbItem.lng), label };
        }
      }
    }

    // 4. Google Maps Geocoding
    if (GOOGLE_KEY) {
      const coords = await geocodeGoogle(address);
      if (coords) {
        const elapsed = Date.now() - startTime;
        await saveToPersistentCache(address, normalized, coords.lat, coords.lng, 'google', 0.98);
        logMetric('fallback_usage', address, normalized, 'google', elapsed);
        return { lat: coords.lat, lng: coords.lng, label: address };
      }
    }

    return null;
  } catch (e: any) {
    logMetric('error', address, normalized, 'system', Date.now() - startTime, e.message);
    return null;
  }
};

// Geocoding Reverso Híbrido (Coordenadas -> Endereço)
export const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
  try {
    const startTime = Date.now();
    // 1. Google Maps Reverse Geocode
    if (GOOGLE_KEY) {
      const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_KEY}&language=pt-BR`);
      const data = await res.json();
      if (data && data.status === 'OK' && data.results && data.results.length > 0) {
        logMetric('fallback_usage', `${lat},${lng}`, 'reverse_geocode', 'google', Date.now() - startTime);
        return data.results[0].formatted_address;
      }
    }

    // 2. Fallback Banco Local ceps_ubatuba
    const delta = 0.0015;
    const { data: closeItems } = await supabase
      .from('ceps_ubatuba')
      .select('*')
      .gte('lat', lat - delta)
      .lte('lat', lat + delta)
      .gte('lng', lng - delta)
      .lte('lng', lng + delta)
      .not('lat', 'is', null);

    if (closeItems && closeItems.length > 0) {
      const item = closeItems[0];
      return `${item.logradouro}, ${item.bairro}, Ubatuba - CEP ${item.cep}`;
    }

    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  } catch {
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }
};

// Interface para Autocomplete com Session Token
export interface AutocompleteSuggestion {
  placeId: string;
  label: string;
  mainText: string;
  secondaryText: string;
  lat?: number;
  lng?: number;
}

// Autocomplete de Endereços com Session Token Google Maps Places
export const searchAddressesWithSessionToken = async (
  query: string,
  sessionToken?: string
): Promise<AutocompleteSuggestion[]> => {
  if (!query || query.trim().length < 2) return [];

  // Se a SDK Google Maps JS estiver carregada na window, usa AutocompleteService
  if (typeof window !== 'undefined' && (window as any).google?.maps?.places) {
    return new Promise((resolve) => {
      try {
        const google = (window as any).google;
        const autocompleteService = new google.maps.places.AutocompleteService();
        
        const sw = new google.maps.LatLng(UBATUBA_BOUNDS.south, UBATUBA_BOUNDS.west);
        const ne = new google.maps.LatLng(UBATUBA_BOUNDS.north, UBATUBA_BOUNDS.east);
        const bounds = new google.maps.LatLngBounds(sw, ne);

        autocompleteService.getPlacePredictions(
          {
            input: query + ', Ubatuba',
            componentRestrictions: { country: 'br' },
            bounds,
            locationBias: bounds,
            sessionToken: sessionToken ? (sessionToken as any) : undefined,
          },
          (predictions: any[], status: any) => {
            if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
              const formatted: AutocompleteSuggestion[] = predictions.map((p: any) => ({
                placeId: p.place_id,
                label: p.description,
                mainText: p.structured_formatting?.main_text || p.description,
                secondaryText: p.structured_formatting?.secondary_text || 'Ubatuba, SP',
              }));
              resolve(formatted);
            } else {
              resolve([]);
            }
          }
        );
      } catch (err) {
        console.warn('Erro no Autocomplete JS SDK:', err);
        resolve([]);
      }
    });
  }

  // Fallback REST API
  if (GOOGLE_KEY) {
    try {
      const encoded = encodeURIComponent(query + ', Ubatuba');
      const tokenParam = sessionToken ? `&sessiontoken=${sessionToken}` : '';
      const locationBias = `&location=${UBATUBA_CENTER.lat},${UBATUBA_CENTER.lng}&radius=25000`;
      const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encoded}&components=country:br&language=pt-BR${locationBias}${tokenParam}&key=${GOOGLE_KEY}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data && data.status === 'OK' && data.predictions) {
        return data.predictions.map((p: any) => ({
          placeId: p.place_id,
          label: p.description,
          mainText: p.structured_formatting?.main_text || p.description,
          secondaryText: p.structured_formatting?.secondary_text || 'Ubatuba, SP',
        }));
      }
    } catch (err) {
      console.warn('Erro no Google Places REST Autocomplete:', err);
    }
  }

  return [];
};

// Obter Detalhes do Lugar por PlaceID (com Session Token para fechar a sessão com billing consolidado)
export const getPlaceDetails = async (
  placeId: string,
  sessionToken?: string
): Promise<{ lat: number; lng: number; formattedAddress: string } | null> => {
  if (typeof window !== 'undefined' && (window as any).google?.maps?.places) {
    return new Promise((resolve) => {
      try {
        const google = (window as any).google;
        const dummyDiv = document.createElement('div');
        const placesService = new google.maps.places.PlacesService(dummyDiv);

        placesService.getDetails(
          {
            placeId,
            fields: ['geometry', 'formatted_address', 'name'],
            sessionToken: sessionToken ? (sessionToken as any) : undefined,
          },
          (result: any, status: any) => {
            if (status === google.maps.places.PlacesServiceStatus.OK && result?.geometry?.location) {
              resolve({
                lat: result.geometry.location.lat(),
                lng: result.geometry.location.lng(),
                formattedAddress: result.formatted_address || result.name || '',
              });
            } else {
              resolve(null);
            }
          }
        );
      } catch (err) {
        console.warn('Erro getDetails PlacesService SDK:', err);
        resolve(null);
      }
    });
  }

  // Fallback REST API
  if (GOOGLE_KEY) {
    try {
      const tokenParam = sessionToken ? `&sessiontoken=${sessionToken}` : '';
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=geometry,formatted_address,name${tokenParam}&key=${GOOGLE_KEY}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data && data.status === 'OK' && data.result?.geometry?.location) {
        return {
          lat: data.result.geometry.location.lat,
          lng: data.result.geometry.location.lng,
          formattedAddress: data.result.formatted_address || data.result.name,
        };
      }
    } catch (err) {
      console.warn('Erro REST getPlaceDetails:', err);
    }
  }

  return null;
};

// Busca de Endereços compatível com interface antiga (para retrocompatibilidade)
export const searchAddresses = async (query: string): Promise<Array<{ label: string; lat: number; lng: number }>> => {
  if (!query || query.trim().length < 2) return [];

  // 1. Tentar Autocomplete Google Places
  const suggestions = await searchAddressesWithSessionToken(query);
  if (suggestions.length > 0) {
    const results: Array<{ label: string; lat: number; lng: number }> = [];
    for (const item of suggestions.slice(0, 5)) {
      const details = await getPlaceDetails(item.placeId);
      if (details) {
        results.push({
          label: details.formattedAddress || item.label,
          lat: details.lat,
          lng: details.lng,
        });
      } else {
        results.push({
          label: item.label,
          lat: UBATUBA_CENTER.lat,
          lng: UBATUBA_CENTER.lng,
        });
      }
    }
    if (results.length > 0) return results;
  }

  // 2. Fallback Banco Local ceps_ubatuba
  const { data: dbItems } = await supabase
    .from('ceps_ubatuba')
    .select('*')
    .ilike('logradouro', `%${query}%`)
    .limit(5);

  if (dbItems && dbItems.length > 0) {
    return dbItems.map((item) => ({
      label: `${item.logradouro}, ${item.bairro}, Ubatuba - CEP ${item.cep}`,
      lat: item.lat ? Number(item.lat) : UBATUBA_CENTER.lat,
      lng: item.lng ? Number(item.lng) : UBATUBA_CENTER.lng,
    }));
  }

  return [];
};

// Decodificador de Polyline Encoded do Google Directions API
export function decodeGooglePolyline(encoded: string): [number, number][] {
  const points: [number, number][] = [];
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;

  while (index < len) {
    let b;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    points.push([lat / 1e5, lng / 1e5]);
  }

  return points;
}

// CALCULAR DISTÂNCIA E ROTA COM GOOGLE MAPS DIRECTIONS SERVICE
export const getRouteInfo = async (
  from: { lat: number; lng: number },
  to: { lat: number; lng: number }
): Promise<{ distanceKm: number; durationMin: number; polyline: [number, number][] } | null> => {
  if (!from || !to) return null;

  // 1. Tentar via JS SDK DirectionsService se disponível
  if (typeof window !== 'undefined' && (window as any).google?.maps?.DirectionsService) {
    try {
      const google = (window as any).google;
      const directionsService = new google.maps.DirectionsService();

      const result = await new Promise<any>((resolve, reject) => {
        directionsService.route(
          {
            origin: { lat: Number(from.lat), lng: Number(from.lng) },
            destination: { lat: Number(to.lat), lng: Number(to.lng) },
            travelMode: google.maps.TravelMode.DRIVING,
          },
          (res: any, status: any) => {
            if (status === google.maps.DirectionsStatus.OK && res) {
              resolve(res);
            } else {
              reject(new Error(`Directions request failed: ${status}`));
            }
          }
        );
      });

      if (result?.routes?.[0]?.legs?.[0]) {
        const leg = result.routes[0].legs[0];
        const distanceKm = +(leg.distance.value / 1000).toFixed(2);
        const durationMin = Math.ceil(leg.duration.value / 60);

        const polyline: [number, number][] = [];
        result.routes[0].overview_path.forEach((p: any) => {
          polyline.push([p.lat(), p.lng()]);
        });

        return { distanceKm, durationMin, polyline };
      }
    } catch (sdkErr) {
      console.warn('Erro DirectionsService JS SDK, tentando REST fallback:', sdkErr);
    }
  }

  // 2. Fallback REST API Google Directions
  if (GOOGLE_KEY) {
    try {
      const originStr = `${from.lat},${from.lng}`;
      const destStr = `${to.lat},${to.lng}`;
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${originStr}&destination=${destStr}&mode=driving&key=${GOOGLE_KEY}&language=pt-BR`;
      const res = await fetch(url);
      const data = await res.json();
      if (data && data.status === 'OK' && data.routes?.length > 0) {
        const route = data.routes[0];
        const leg = route.legs[0];
        const distanceKm = +(leg.distance.value / 1000).toFixed(2);
        const durationMin = Math.ceil(leg.duration.value / 60);
        const polyline = decodeGooglePolyline(route.overview_polyline.points);

        return { distanceKm, durationMin, polyline };
      }
    } catch (restErr) {
      console.warn('Erro REST Google Directions:', restErr);
    }
  }

  // 3. Fallback Matemático em Linha Reta se offline
  const latDiff = Math.abs(from.lat - to.lat) * 111;
  const lngDiff = Math.abs(from.lng - to.lng) * 111 * Math.cos((from.lat * Math.PI) / 180);
  const approxDistance = +Math.sqrt(latDiff * latDiff + lngDiff * lngDiff).toFixed(2);
  const approxDuration = Math.ceil((approxDistance / 30) * 60);

  return {
    distanceKm: Math.max(0.5, approxDistance),
    durationMin: Math.max(2, approxDuration),
    polyline: [
      [from.lat, from.lng],
      [to.lat, to.lng],
    ],
  };
};
