import { useState, useRef, useEffect } from 'react';
import { MapPin, Search, X } from 'lucide-react';
import {
  searchAddressesWithSessionToken,
  getPlaceDetails,
  AutocompleteSuggestion,
  searchAddresses
} from '../lib/geoService';

interface Props {
  value: string;
  onChange: (value: string, coords?: { lat: number; lng: number }) => void;
  placeholder?: string;
  dark?: boolean;
}

export function AddressSearch({ value, onChange, placeholder = 'Digite o endereço', dark = true }: Props) {
  const [suggestions, setSuggestions] = useState<AutocompleteSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const sessionTokenRef = useRef<any>(null);

  // Inicializa ou renova o Session Token do Google Places
  const initSessionToken = () => {
    if (typeof window !== 'undefined' && (window as any).google?.maps?.places?.AutocompleteSessionToken) {
      sessionTokenRef.current = new (window as any).google.maps.places.AutocompleteSessionToken();
    } else {
      sessionTokenRef.current = 'session_' + Math.random().toString(36).substring(2, 15);
    }
  };

  useEffect(() => {
    initSessionToken();
  }, []);

  const handleInput = (v: string) => {
    onChange(v);
    clearTimeout(debounceRef.current);
    if (v.length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }

    if (!sessionTokenRef.current) {
      initSessionToken();
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      const results = await searchAddressesWithSessionToken(v, sessionTokenRef.current);
      setSuggestions(results);
      setOpen(results.length > 0);
      setLoading(false);
    }, 300); // 300ms debounce
  };

  const handleSelectSuggestion = async (s: AutocompleteSuggestion) => {
    setLoading(true);
    const details = await getPlaceDetails(s.placeId, sessionTokenRef.current);
    // Renovar token de sessão para a próxima busca
    initSessionToken();

    const userNumberMatch = value.match(/(?:,\s*|n[º°]?\s*|\s+)(\d+[a-zA-Z]?)(?:\b|$)/i) || value.match(/(\d+)/);
    const userTypedNumber = userNumberMatch ? userNumberMatch[1] : null;

    let finalAddress = details?.formattedAddress || s.label;
    if (userTypedNumber && !finalAddress.match(new RegExp(`\\b${userTypedNumber}\\b`))) {
      const parts = finalAddress.split(',');
      if (parts.length > 1) {
        parts[0] = `${parts[0].trim()}, ${userTypedNumber}`;
        finalAddress = parts.join(', ');
      } else {
        finalAddress = `${finalAddress}, ${userTypedNumber}`;
      }
    }

    const coords = details ? { lat: details.lat, lng: details.lng } : undefined;
    onChange(finalAddress, coords);
    setOpen(false);
    setLoading(false);
  };

  const inputStyle: React.CSSProperties = {
    flex: 1,
    background: 'transparent',
    border: 'none',
    outline: 'none',
    fontFamily: 'DM Sans',
    fontSize: 14,
    color: dark ? '#FFFFFF' : '#0B1B3E',
  };

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    height: 48,
    padding: '0 14px',
    borderRadius: 12,
    background: dark ? 'rgba(255,255,255,0.06)' : '#FFFFFF',
    border: `1px solid ${dark ? 'rgba(255,255,255,0.10)' : '#D8DBE5'}`,
    position: 'relative',
  };

  const dropdownStyle: React.CSSProperties = {
    position: 'absolute',
    top: 52,
    left: 0,
    right: 0,
    zIndex: 1000,
    background: dark ? '#18181B' : '#FFFFFF',
    border: `1px solid ${dark ? '#27272A' : '#D8DBE5'}`,
    borderRadius: 12,
    overflow: 'hidden',
    boxShadow: '0 8px 24px rgba(0,0,0,0.20)',
  };

  return (
    <div style={{ position: 'relative' }}>
      <div style={containerStyle}>
        <MapPin size={16} color="#0DB87E" style={{ flexShrink: 0 }} />
        <input
          value={value}
          onChange={(e) => handleInput(e.target.value)}
          placeholder={placeholder}
          style={inputStyle}
        />
        {loading && (
          <div
            style={{
              width: 16,
              height: 16,
              borderRadius: '50%',
              border: '2px solid #0DB87E',
              borderTopColor: 'transparent',
              animation: 'spin 0.8s linear infinite',
              flexShrink: 0,
            }}
          />
        )}
        {value && !loading && (
          <X
            size={16}
            color={dark ? 'rgba(255,255,255,0.40)' : '#9399AD'}
            style={{ cursor: 'pointer', flexShrink: 0 }}
            onClick={() => {
              onChange('');
              setSuggestions([]);
              setOpen(false);
              initSessionToken();
            }}
          />
        )}
      </div>
      {open && (
        <div style={dropdownStyle}>
          {suggestions.map((s, i) => (
            <div
              key={s.placeId || i}
              onClick={() => handleSelectSuggestion(s)}
              style={{
                padding: '12px 16px',
                cursor: 'pointer',
                borderBottom: i < suggestions.length - 1 ? `1px solid ${dark ? 'rgba(255,255,255,0.07)' : '#EFF0F3'}` : 'none',
                display: 'flex',
                gap: 10,
                alignItems: 'flex-start',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.06)' : '#F7F8FA')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <MapPin size={14} color={dark ? 'rgba(255,255,255,0.35)' : '#9399AD'} style={{ flexShrink: 0, marginTop: 2 }} />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontFamily: 'DM Sans', fontSize: 13, fontWeight: 600, color: dark ? 'white' : '#0B1B3E' }}>
                  {s.mainText}
                </span>
                <span style={{ fontFamily: 'DM Sans', fontSize: 11, color: dark ? 'rgba(255,255,255,0.5)' : '#5B6178' }}>
                  {s.secondaryText}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
