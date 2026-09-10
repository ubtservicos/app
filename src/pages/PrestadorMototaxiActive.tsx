import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Navigation, MapPin, CheckCircle2, Star, MessageSquare,
  User as UserIcon, Building2, Users, Gift, Heart,
} from "lucide-react";
import PrestadorMapLight from "@/components/prestador/PrestadorMapLight";
import PrimaryButtonLight from "@/components/prestador/PrimaryButtonLight";
import Confetti from "react-confetti";
import { calcSplit, formatBRL, SPLIT_META } from "@/utils/ride";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { supabase } from "@/lib/supabase";
import QuickStatusMessages from "@/components/mototaxi/QuickStatusMessages";

const ICONS = { User: UserIcon, Building2, Users, Gift, Star, Heart } as const;
type IconKey = keyof typeof ICONS;

const UBATUBA = { lat: -23.4336, lng: -45.0838 };
const ORIGIN = { lat: UBATUBA.lat + 0.005, lng: UBATUBA.lng + 0.003 };
const DESTINATION = { lat: UBATUBA.lat + 0.018, lng: UBATUBA.lng + 0.012 };

type Phase = "arriving" | "in_progress" | "completed";

interface ActiveRide {
  id: string;
  type: "carona" | "entrega";
  origin: string;
  destination: string;
  distanceKm: number;
  durationMin: number;
  price: number;
  passengerName?: string;
  originCoords?: { lat: number; lng: number };
  destinationCoords?: { lat: number; lng: number };
}

const Sheet = ({ children }: { children: React.ReactNode }) => (
  <div
    className="absolute left-0 right-0 bottom-0 z-10 text-zinc-100"
    style={{
      background: "var(--prestador-card)",
      borderRadius: "24px 24px 0 0",
      padding: "12px 20px 96px",
      boxShadow: "0 -4px 24px rgba(0,0,0,0.2)",
    }}
  >
    <div className="mx-auto mb-3 rounded-full" style={{ width: 40, height: 4, background: "var(--prestador-border)" }} />
    {children}
  </div>
);

const PrestadorMototaxiActive = () => {
  const navigate = useNavigate();
  const user = useCurrentUser();
  const [phase, setPhase] = useState<Phase>("arriving");
  const [myLocation, setMyLocation] = useState<{ lat: number; lng: number }>(UBATUBA);
  const [ride, setRide] = useState<ActiveRide | null>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [lastSentPhrase, setLastSentPhrase] = useState<string | null>(null);
  const [incomingMessage, setIncomingMessage] = useState<{ text: string; sender: string } | null>(null);
  const [isPaymentConfirmed, setIsPaymentConfirmed] = useState(false);
  const msgChannelRef = useRef<any>(null);

  useEffect(() => {
    if (!ride?.id) return;
    const channel = supabase.channel(`ride_msg_${ride.id}`);
    channel
      .on('broadcast', { event: 'quick_message' }, ({ payload }) => {
        console.log('Mensagem rápida recebida pelo prestador:', payload);
        if (payload?.text && payload?.from === 'tomador') {
          setIncomingMessage({
            text: payload.text,
            sender: 'Passageiro(a)',
          });
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          msgChannelRef.current = channel;
        }
      });

    return () => {
      supabase.removeChannel(channel);
      msgChannelRef.current = null;
    };
  }, [ride?.id]);

  useEffect(() => {
    if (incomingMessage) {
      const timer = setTimeout(() => setIncomingMessage(null), 6000);
      return () => clearTimeout(timer);
    }
  }, [incomingMessage]);

  const handleSendQuickMessage = async (text: string) => {
    setLastSentPhrase(text);
    if (ride?.id) {
      try {
        if (msgChannelRef.current) {
          await msgChannelRef.current.send({
            type: 'broadcast',
            event: 'quick_message',
            payload: { text, from: 'prestador', ts: Date.now() }
          });
        } else {
          const channel = supabase.channel(`ride_msg_${ride.id}`);
          channel.subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              channel.send({
                type: 'broadcast',
                event: 'quick_message',
                payload: { text, from: 'prestador', ts: Date.now() }
              });
            }
          });
        }
      } catch (e) {
        console.warn("Falha ao transmitir mensagem do prestador:", e);
      }
    }
  };

  useEffect(() => {
    if (phase === "completed" && isPaymentConfirmed) {
      const timer = setTimeout(() => {
        sessionStorage.removeItem("ubt_active_ride");
        navigate("/app/prestador/home");
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [phase, isPaymentConfirmed, navigate]);

  // Carregar dados da corrida do banco
  useEffect(() => {
    const loadRideFromDb = async (rideId: string) => {
      const { data, error } = await supabase
        .from('mototaxi_corridas')
        .select('*')
        .eq('id', rideId)
        .single();
      if (data && !error) {
        const originObj = typeof data.origin === 'string' ? JSON.parse(data.origin) : data.origin;
        const destObj = typeof data.destination === 'string' ? JSON.parse(data.destination) : data.destination;
        setRide({
          id: data.id,
          type: data.type,
          origin: originObj.address || 'Origem',
          destination: destObj.address || 'Destino',
          distanceKm: Number(data.distance_km),
          durationMin: data.duration_min,
          price: Number(data.estimated_price),
          originCoords: { lat: Number(originObj.lat), lng: Number(originObj.lng) },
          destinationCoords: { lat: Number(destObj.lat), lng: Number(destObj.lng) }
        });
        if (data.status === 'in_progress') {
          setPhase("in_progress");
        } else if (data.status === 'completed') {
          setPhase("completed");
        } else if (data.status === 'paid') {
          setPhase("completed");
          setIsPaymentConfirmed(true);
        }
      }
    };

    const stored = sessionStorage.getItem("ubt_active_ride");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        loadRideFromDb(parsed.id);
      } catch { /* noop */ }
    } else {
      // fallback
      setRide({
        id: "ride-001",
        type: "carona",
        origin: "Rua das Toninhas, 120",
        destination: "Praia Grande, Quiosque 8",
        distanceKm: 3.4,
        durationMin: 11,
        price: 12.5,
        originCoords: ORIGIN,
        destinationCoords: DESTINATION
      });
    }
  }, []);

  // GPS watch
  useEffect(() => {
    if (!navigator.geolocation) return;
    let id: number | null = null;
    try {
      id = navigator.geolocation.watchPosition(
        (pos) => setMyLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {},
        { enableHighAccuracy: true, maximumAge: 0 }
      );
    } catch { /* noop */ }
    return () => {
      if (id !== null && navigator.geolocation) navigator.geolocation.clearWatch(id);
    };
  }, []);

  const activeSessionIdRef = useRef<string | null>(null);

  // Sincronizar sessão GPS no Supabase com lógica Select-First e Resiliência a Conflito (409)
  useEffect(() => {
    if (!user.uid || !myLocation) return;
    let isCancelled = false;

    async function syncSession() {
      try {
        let sessionId = activeSessionIdRef.current;

        // 1. Select-First: Se ainda não temos o ID em memória, buscar sessão existente no banco
        if (!sessionId) {
          const { data: existingSession, error: selectErr } = await supabase
            .from('mototaxi_sessoes')
            .select('id, is_online')
            .eq('prestador_id', user.uid)
            .maybeSingle();

          if (!selectErr && existingSession) {
            sessionId = existingSession.id;
            activeSessionIdRef.current = existingSession.id;
          }
        }

        if (sessionId) {
          // 2. Reaproveitamento de sessão fantasma/ativa: Apenas UPDATE
          const { error: updateErr } = await supabase
            .from('mototaxi_sessoes')
            .update({
              is_online: true,
              lat: myLocation.lat,
              lng: myLocation.lng,
              updated_at: new Date().toISOString()
            })
            .eq('id', sessionId);

          if (updateErr) throw updateErr;
        } else {
          // 3. Nenhuma sessão existente: Inserir nova sessão
          const { data: inserted, error: insertErr } = await supabase
            .from('mototaxi_sessoes')
            .insert({
              prestador_id: user.uid,
              is_online: true,
              lat: myLocation.lat,
              lng: myLocation.lng,
              updated_at: new Date().toISOString()
            })
            .select('id')
            .single();

          if (insertErr) {
            // Tratamento inteligente de conflito (409 Duplicate Key / Unique Constraint)
            console.warn("Conflito ao criar sessão de mototáxi ativo (409). Recuperando sessão ativa...", insertErr);
            const { data: recovered } = await supabase
              .from('mototaxi_sessoes')
              .select('id')
              .eq('prestador_id', user.uid)
              .maybeSingle();

            if (recovered && !isCancelled) {
              activeSessionIdRef.current = recovered.id;
              await supabase
                .from('mototaxi_sessoes')
                .update({
                  is_online: true,
                  lat: myLocation.lat,
                  lng: myLocation.lng,
                  updated_at: new Date().toISOString()
                })
                .eq('id', recovered.id);
            }
          } else if (inserted && !isCancelled) {
            activeSessionIdRef.current = inserted.id;
          }
        }
      } catch (err) {
        console.error("Erro na sincronização de sessão mototáxi ativa:", err);
      }
    }

    syncSession();

    return () => {
      isCancelled = true;
    };
  }, [user.uid, myLocation]);

  // Escutar cancelamento da corrida pelo passageiro
  useEffect(() => {
    if (!ride?.id) return;

    const channel = supabase
      .channel(`active_ride_${ride.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'mototaxi_corridas', filter: `id=eq.${ride.id}` },
        (payload: any) => {
          if (payload.new) {
            if (payload.new.status === 'cancelled') {
              alert('A corrida foi cancelada pelo passageiro.');
              sessionStorage.removeItem("ubt_active_ride");
              navigate("/app/prestador/home");
            } else if (payload.new.status === 'paid') {
              setIsPaymentConfirmed(true);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ride?.id, navigate]);

  if (!ride) return null;

  const startRide = async () => {
    try {
      const { error } = await supabase
        .from('mototaxi_corridas')
        .update({ status: 'in_progress' })
        .eq('id', ride.id);
      if (error) throw error;
      setPhase("in_progress");
    } catch (e) {
      console.error(e);
      alert('Erro ao iniciar corrida.');
    }
  };

  const completeRide = async () => {
    try {
      const { error } = await supabase
        .from('mototaxi_corridas')
        .update({ status: 'completed', final_price: ride.price })
        .eq('id', ride.id);
      if (error) throw error;
      setPhase("completed");
    } catch (e) {
      console.error(e);
      alert('Erro ao concluir corrida.');
    }
  };

  const finalize = () => {
    sessionStorage.removeItem("ubt_active_ride");
    navigate("/app/prestador/home");
  };

  /* ---------------- COMPLETED ---------------- */
  if (phase === "completed") {
    const youReceive = ride.price * 0.9;
    const split = calcSplit(ride.price);
    return (
      <div
        className="min-h-[100svh] overflow-y-auto text-zinc-100 relative overflow-hidden"
        style={{ background: "var(--prestador-bg)", padding: 24, paddingBottom: 96 }}
      >
        {isPaymentConfirmed && <Confetti numberOfPieces={250} recycle={false} />}
        <div className="text-center pt-4">
          <CheckCircle2 size={48} color="#0DB87E" className="mx-auto" />
          <h1 className="mt-3 font-display text-[22px] font-bold text-white">
            {isPaymentConfirmed ? "Corrida Paga e Concluída!" : "Serviço finalizado!"}
          </h1>
          {!isPaymentConfirmed && (
            <p className="mt-1 font-sans text-[13px] text-[#F5A623] flex items-center justify-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#F5A623] animate-pulse" />
              Aguardando confirmação de pagamento do passageiro...
            </p>
          )}
        </div>

        <div
          className="mt-5 rounded-2xl text-center"
          style={{ background: "var(--prestador-card)", padding: 20, border: "1px solid var(--prestador-border)" }}
        >
          <p className="font-sans text-[13px]" style={{ color: "#9399AD" }}>Você recebeu</p>
          <p className="mt-1 font-display text-[28px] font-bold" style={{ color: "#0DB87E" }}>
            {formatBRL(youReceive)}
          </p>

          <div className="my-3 h-px" style={{ background: "var(--prestador-border)" }} />

          <div className="space-y-1.5 text-left">
            {SPLIT_META.map((m) => {
              const Icon = ICONS[m.icon as IconKey];
              const value = split[m.key];
              const isPrest = m.key === "prestador";
              return (
                <div key={m.key} className="flex items-center gap-2">
                  <Icon size={14} style={{ color: m.color }} />
                  <span className="font-sans text-[12px] flex-1" style={{ color: "#A1A1AA" }}>
                    {m.label}
                  </span>
                  <span
                    className="font-sans text-[12px]"
                    style={{ color: isPrest ? "#0DB87E" : "#A1A1AA", fontWeight: isPrest ? 600 : 400 }}
                  >
                    {formatBRL(value)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-5">
          <p className="font-sans text-[14px] font-semibold text-white">
            Como foi o cliente?
          </p>
          <div className="mt-2 flex items-center justify-center gap-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <button key={i} type="button" onClick={() => setRating(i)} aria-label={`Nota ${i}`}>
                <Star
                  size={32}
                  fill={i <= rating ? "#F5A623" : "transparent"}
                  color={i <= rating ? "#F5A623" : "#D8DBE5"}
                />
              </button>
            ))}
          </div>

          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Comentário opcional..."
            rows={4}
            className="mt-4 w-full rounded-xl outline-none font-sans text-[14px] resize-none"
            style={{
              background: "var(--prestador-card)",
              border: "1px solid var(--prestador-border)",
              padding: "12px 14px",
              color: "#FFFFFF",
              minHeight: 100,
            }}
          />
        </div>

        <div className="mt-5">
          <PrimaryButtonLight onClick={finalize}>
            Enviar e voltar ao trabalho
          </PrimaryButtonLight>
        </div>
      </div>
    );
  }

  /* ---------------- ARRIVING / IN_PROGRESS ---------------- */
  const routeFrom = phase === "arriving" ? myLocation : (ride.originCoords || ORIGIN);
  const routeTo = phase === "arriving" ? (ride.originCoords || ORIGIN) : (ride.destinationCoords || DESTINATION);

  return (
    <div className="relative min-h-[100svh] text-zinc-100" style={{ background: "var(--prestador-bg)" }}>
      {/* Floating incoming quick message banner */}
      {incomingMessage && (
        <div
          className="fixed top-4 left-4 right-4 z-[1200] max-w-md mx-auto p-3.5 rounded-2xl bg-zinc-900/95 border border-[#0DB87E] shadow-2xl backdrop-blur-md flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-4 duration-300"
          onClick={() => setIncomingMessage(null)}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#0DB87E]/20 border border-[#0DB87E]/40 flex items-center justify-center shrink-0">
              <MessageSquare size={18} className="text-[#0DB87E]" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-[#0DB87E] uppercase tracking-wider">{incomingMessage.sender}</p>
              <p className="text-[13px] font-medium text-white">{incomingMessage.text}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIncomingMessage(null);
            }}
            className="text-zinc-400 hover:text-white text-xs px-2 py-1 rounded"
          >
            ✕
          </button>
        </div>
      )}

      <div className="absolute inset-0">
        <PrestadorMapLight
          myLocation={myLocation}
          origin={ride.originCoords || ORIGIN}
          destination={phase === "in_progress" ? (ride.destinationCoords || DESTINATION) : null}
          routeFrom={routeFrom}
          routeTo={routeTo}
        />
      </div>

      <Sheet>
        {phase === "arriving" ? (
          <>
            <span
              className="inline-flex items-center gap-1 px-3 py-1 rounded-full font-sans text-[12px] font-semibold"
              style={{ background: "rgba(13,184,126,0.15)", border: "1px solid #0DB87E", color: "#0DB87E" }}
            >
              A caminho do cliente
            </span>

            <div className="mt-3 flex items-start gap-2">
              <Navigation size={16} color="#0DB87E" className="mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="font-sans text-[14px] font-semibold text-white">
                  {ride.origin}
                </p>
                <p className="font-sans text-[13px]" style={{ color: "#A1A1AA" }}>
                  ~{ride.durationMin} min
                </p>
              </div>
            </div>

            {(() => {
              const pName = ride.passengerName || "Passageiro(a)";
              const pInitials = pName
                .split(" ")
                .filter(Boolean)
                .map((p) => p[0])
                .slice(0, 2)
                .join("")
                .toUpperCase() || "UB";

              return (
                <div
                  className="mt-3 rounded-xl flex items-center gap-3"
                  style={{ background: "var(--prestador-bg)", padding: 12, border: "1px solid var(--prestador-border)" }}
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center animate-pulse"
                    style={{ background: "rgba(13,184,126,0.15)", color: "#0DB87E" }}
                  >
                    <span className="font-display font-bold text-[14px]">{pInitials}</span>
                  </div>
                  <p className="font-sans text-[14px] font-semibold text-white">
                    {pName}
                  </p>
                </div>
              );
            })()}

            <QuickStatusMessages
              role="prestador"
              onSendMessage={handleSendQuickMessage}
              lastSentPhrase={lastSentPhrase}
              className="mt-3"
            />

            <div className="mt-4">
              <PrimaryButtonLight onClick={startRide}>
                Cheguei ao ponto de embarque
              </PrimaryButtonLight>
            </div>
          </>
        ) : (
          <>
            <span
              className="inline-flex items-center gap-1 px-3 py-1 rounded-full font-sans text-[12px] font-semibold"
              style={{ background: "rgba(13,184,126,0.15)", border: "1px solid #0DB87E", color: "#0DB87E" }}
            >
              Em andamento
            </span>

            <div className="mt-3 flex items-start gap-2">
              <MapPin size={16} color="#E84040" className="mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="font-sans text-[14px] font-semibold text-white">
                  {ride.destination}
                </p>
                <p className="font-sans text-[13px]" style={{ color: "#A1A1AA" }}>
                  ~{ride.durationMin} min
                </p>
              </div>
            </div>

            <QuickStatusMessages
              role="prestador"
              onSendMessage={handleSendQuickMessage}
              lastSentPhrase={lastSentPhrase}
              className="mt-3"
            />

            <div className="mt-4">
              <PrimaryButtonLight onClick={completeRide}>
                Concluir serviço
              </PrimaryButtonLight>
            </div>
          </>
        )}
      </Sheet>
    </div>
  );
};

export default PrestadorMototaxiActive;
