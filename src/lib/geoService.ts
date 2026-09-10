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

// Geocodificação Direta com Google Maps Geocoding SDK
export const geocodeGoogle = async (query: string): Promise<{ lat: number; lng: number } | null> => {
  if (typeof window !== "undefined" && (window as any).google?.maps?.Geocoder) {
    try {
      const geocoder = new (window as any).google.maps.Geocoder();
      const results = await new Promise<any[]>((resolve) => {
        geocoder.geocode(
          {
            address: query + ", Ubatuba, SP, Brasil",
            bounds: {
              south: UBATUBA_BOUNDS.south,
              west: UBATUBA_BOUNDS.west,
              north: UBATUBA_BOUNDS.north,
              east: UBATUBA_BOUNDS.east,
            },
          },
          (res: any, status: string) => {
            if (status === "OK" && res && res.length > 0) resolve(res);
            else resolve([]);
          }
        );
      });
      if (results.length > 0 && results[0]?.geometry?.location) {
        const loc = results[0].geometry.location;
        return { lat: typeof loc.lat === "function" ? loc.lat() : Number(loc.lat), lng: typeof loc.lng === "function" ? loc.lng() : Number(loc.lng) };
      }
    } catch (err) {
      console.warn("Google Geocode SDK error:", err);
    }
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
    // 1. Google Maps Reverse Geocode via SDK
    if (typeof window !== "undefined" && (window as any).google?.maps?.Geocoder) {
      try {
        const geocoder = new (window as any).google.maps.Geocoder();
        const results = await new Promise<any[]>((resolve) => {
          geocoder.geocode({ location: { lat, lng } }, (res: any, status: string) => {
            if (status === "OK" && res && res.length > 0) resolve(res);
            else resolve([]);
          });
        });
        if (results.length > 0 && results[0]?.formatted_address) {
          logMetric('fallback_usage', `${lat},${lng}`, 'reverse_geocode', 'google', Date.now() - startTime);
          return results[0].formatted_address;
        }
      } catch (sdkErr) {
        console.warn('Google Reverse Geocode SDK error:', sdkErr);
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

// Helper para criar ou instanciar Session Token do Google Places SDK (New)
export const createAutocompleteSessionToken = (): any => {
  if (typeof window !== 'undefined' && (window as any).google?.maps?.places?.AutocompleteSessionToken) {
    try {
      return new (window as any).google.maps.places.AutocompleteSessionToken();
    } catch {
      return null;
    }
  }
  return null;
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

// Autocomplete de Endereços com Places API (New)
export const searchAddressesWithSessionToken = async (
  query: string,
  sessionToken?: any
): Promise<AutocompleteSuggestion[]> => {
  if (!query || query.trim().length < 2) return [];

  // 1. Google Maps Places API (New) via JS SDK
  if (typeof window !== 'undefined' && (window as any).google?.maps?.places?.AutocompleteSuggestion?.fetchAutocompleteSuggestions) {
    try {
      const google = (window as any).google;
      const isNativeSessionToken =
        sessionToken &&
        google?.maps?.places?.AutocompleteSessionToken &&
        sessionToken instanceof google.maps.places.AutocompleteSessionToken;

      const request: any = {
        input: query,
        locationRestriction: {
          west: UBATUBA_BOUNDS.west,
          north: UBATUBA_BOUNDS.north,
          east: UBATUBA_BOUNDS.east,
          south: UBATUBA_BOUNDS.south,
        },
        includedRegionCodes: ['br'],
        language: 'pt-BR',
      };

      if (isNativeSessionToken) {
        request.sessionToken = sessionToken;
      }

      const response = await google.maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions(request);
      if (response && response.suggestions && response.suggestions.length > 0) {
        const formatted: AutocompleteSuggestion[] = response.suggestions
          .filter((s: any) => s.placePrediction)
          .map((s: any) => {
            const p = s.placePrediction;
            const label = p.text?.toString() || p.mainText?.toString() || '';
            const mainText = p.mainText?.toString() || label;
            const secondaryText = p.secondaryText?.toString() || 'Ubatuba, SP';
            return {
              placeId: p.placeId,
              label,
              mainText,
              secondaryText,
            };
          });
        return formatted;
      }
    } catch (err) {
      console.warn('Erro fetchAutocompleteSuggestions (Places API New):', err);
    }
  }

  // 2. Fallback Places API (New) via REST API v1
  if (GOOGLE_KEY) {
    try {
      const body: any = {
        input: query,
        locationRestriction: {
          rectangle: {
            low: { latitude: UBATUBA_BOUNDS.south, longitude: UBATUBA_BOUNDS.west },
            high: { latitude: UBATUBA_BOUNDS.north, longitude: UBATUBA_BOUNDS.east }
          }
        },
        includedRegionCodes: ['br'],
        languageCode: 'pt-BR'
      };

      if (typeof sessionToken === 'string' && sessionToken) {
        body.sessionToken = sessionToken;
      }

      const res = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': GOOGLE_KEY,
        },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (data && data.suggestions && data.suggestions.length > 0) {
        return data.suggestions
          .filter((s: any) => s.placePrediction)
          .map((s: any) => {
            const p = s.placePrediction;
            const label = p.text?.text || p.structuredFormat?.mainText?.text || '';
            const mainText = p.structuredFormat?.mainText?.text || label;
            const secondaryText = p.structuredFormat?.secondaryText?.text || 'Ubatuba, SP';
            return {
              placeId: p.placeId,
              label,
              mainText,
              secondaryText,
            };
          });
      }
    } catch (err) {
      console.warn('Erro REST v1 places:autocomplete:', err);
    }
  }

  return [];
};

// Obter Detalhes do Lugar por PlaceID usando Places API (New) com Place.fetchFields
export const getPlaceDetails = async (
  placeId: string,
  sessionToken?: any
): Promise<{ lat: number; lng: number; formattedAddress: string } | null> => {
  if (!placeId) return null;

  // 1. Google Maps Places API (New) via JS SDK com Place.fetchFields
  if (typeof window !== 'undefined' && (window as any).google?.maps?.places?.Place) {
    try {
      const google = (window as any).google;
      const isNativeSessionToken =
        sessionToken &&
        google?.maps?.places?.AutocompleteSessionToken &&
        sessionToken instanceof google.maps.places.AutocompleteSessionToken;

      const place = new google.maps.places.Place({ id: placeId });
      await place.fetchFields({
        fields: ['location', 'displayName', 'formattedAddress'],
        sessionToken: isNativeSessionToken ? sessionToken : undefined,
      });

      const lat = typeof place.location?.lat === 'function' ? place.location.lat() : Number(place.location?.lat);
      const lng = typeof place.location?.lng === 'function' ? place.location.lng() : Number(place.location?.lng);
      const formattedAddress = place.formattedAddress || (typeof place.displayName === 'string' ? place.displayName : (place.displayName as any)?.text) || '';

      if (!isNaN(lat) && !isNaN(lng)) {
        return {
          lat,
          lng,
          formattedAddress,
        };
      }
    } catch (err) {
      console.warn('Erro Place.fetchFields (Places API New):', err);
    }
  }

  // 2. Fallback Places API (New) via REST API v1
  if (GOOGLE_KEY) {
    try {
      const url = `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?languageCode=pt-BR`;
      const res = await fetch(url, {
        headers: {
          'X-Goog-Api-Key': GOOGLE_KEY,
          'X-Goog-FieldMask': 'id,displayName,formattedAddress,location'
        }
      });
      const data = await res.json();
      if (data && data.location?.latitude && data.location?.longitude) {
        return {
          lat: data.location.latitude,
          lng: data.location.longitude,
          formattedAddress: data.formattedAddress || data.displayName?.text || '',
        };
      }
    } catch (err) {
      console.warn('Erro REST v1 places details:', err);
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

// CALCULAR DISTÂNCIA E ROTA COM GOOGLE MAPS ROUTES API (computeRoutes)
export const getRouteInfo = async (
  from: { lat: number; lng: number },
  to: { lat: number; lng: number }
): Promise<{ distanceKm: number; durationMin: number; polyline: [number, number][] } | null> => {
  if (!from || !to) return null;

  // 1. Tentar via Routes API moderna (google.maps.routes.Route.computeRoutes)
  if (typeof window !== "undefined" && (window as any).google?.maps) {
    const google = (window as any).google;

    if (google.maps?.routes?.Route?.computeRoutes) {
      try {
        const response = await google.maps.routes.Route.computeRoutes({
          origin: {
            location: {
              latLng: { latitude: Number(from.lat), longitude: Number(from.lng) },
            },
          },
          destination: {
            location: {
              latLng: { latitude: Number(to.lat), longitude: Number(to.lng) },
            },
          },
          travelMode: "DRIVE",
          routingPreference: "TRAFFIC_UNAWARE",
        });

        if (response?.routes?.[0]) {
          const r = response.routes[0];
          const leg = r.legs?.[0];
          const distanceMeters = r.distanceMeters || leg?.distanceMeters || 0;
          const durationSeconds = parseInt(String(r.duration || leg?.duration || "0").replace("s", ""), 10) || 0;
          const distanceKm = +(distanceMeters / 1000).toFixed(2);
          const durationMin = Math.ceil(durationSeconds / 60) || 2;
          let polyline: [number, number][] = [];
          if (r.polyline?.encodedPolyline) {
            polyline = decodeGooglePolyline(r.polyline.encodedPolyline);
          }
          return {
            distanceKm: Math.max(0.5, distanceKm),
            durationMin: Math.max(2, durationMin),
            polyline: polyline.length > 0 ? polyline : [[from.lat, from.lng], [to.lat, to.lng]],
          };
        }
      } catch (routesErr) {
        // Fallback to mathematical calculation
      }
    }
  }

  // 2. Fallback Matemático em Linha Reta se SDK não estiver disponível ou falhar
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
