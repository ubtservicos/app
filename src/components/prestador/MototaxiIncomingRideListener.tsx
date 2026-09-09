import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Bike, Package, MapPin, Navigation } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatBRL } from "@/utils/ride";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useRealtimeChannel } from "@/hooks/useRealtimeChannel";
import { toast } from "sonner";

export interface Chamado {
  id: string;
  type: "carona" | "entrega";
  origin: string;
  destination: string;
  distanceKm: number;
  durationMin: number;
  price: number;
}

export const playChamadoSound = () => {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      (navigator as Navigator).vibrate?.([300, 150, 300, 150, 300]);
    }
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      const audioCtx = new AudioContextClass();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.15); // A5
      osc.frequency.setValueAtTime(1174.66, audioCtx.currentTime + 0.3); // D6
      gain.gain.setValueAtTime(0.4, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.6);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.6);
    }
  } catch (e) {
    // audio play blocked or unsupported
  }
};

export const ChamadoModal = ({
  chamado,
  onAccept,
  onReject,
}: {
  chamado: Chamado;
  onAccept: () => void;
  onReject: () => void;
}) => {
  const [seconds, setSeconds] = useState(60);

  useEffect(() => {
    playChamadoSound();
  }, []);

  useEffect(() => {
    if (seconds <= 0) {
      onReject();
      return;
    }
    const id = setInterval(() => setSeconds((s) => s - 1), 1000);
    return () => clearInterval(id);
  }, [seconds, onReject]);

  const C = 175.93; // 2 * pi * 28
  const dash = (seconds / 60) * C;
  const youReceive = chamado.price * 0.9;

  return (
    <div
      className="fixed inset-0 flex items-end justify-center z-[1100]"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)", zIndex: 1100 }}
    >
      <div
        className="w-full max-w-md pb-28"
        style={{
          background: "var(--prestador-card, #132348)",
          borderTop: "2px solid var(--prestador-border, rgba(255,255,255,0.1))",
          borderRadius: "24px 24px 0 0",
          padding: "24px 24px 100px 24px",
          maxHeight: "90vh",
          overflowY: "auto",
          animation: "ubt-slide-up 300ms ease-out",
        }}
      >
        <div className="flex items-start justify-between">
          <div>
            <span
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-sans text-[11px] font-bold uppercase tracking-wider mb-1"
              style={{ background: "rgba(13,184,126,0.15)", color: "#0DB87E", border: "1px solid rgba(13,184,126,0.3)" }}
            >
              Novo Pedido de Corrida
            </span>
            <h3 className="font-display text-[20px] font-bold text-white">
              Chamado Disponível! 🔔
            </h3>
          </div>
          <svg width="60" height="60" viewBox="0 0 64 64">
            <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4" />
            <circle
              cx="32"
              cy="32"
              r="28"
              fill="none"
              stroke="#0DB87E"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={`${dash} ${C}`}
              transform="rotate(-90 32 32)"
            />
            <text x="32" y="38" textAnchor="middle" fill="#FFFFFF" fontSize="17" fontWeight="700" fontFamily="Syne">
              {seconds}s
            </text>
          </svg>
        </div>

        <div
          className="mt-4 rounded-2xl"
          style={{ background: "var(--prestador-bg, #0B1B3E)", border: "1px solid var(--prestador-border, rgba(255,255,255,0.1))", padding: 18 }}
        >
          <span
            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-sans text-[12px] font-semibold"
            style={{ background: "rgba(13,184,126,0.15)", color: "#0DB87E" }}
          >
            {chamado.type === "entrega" ? <Package size={12} /> : <Bike size={12} />}
            {chamado.type === "entrega" ? "Entrega" : "Carona"}
          </span>

          <div className="mt-3 flex items-start gap-2">
            <MapPin size={16} color="#0DB87E" className="mt-0.5 shrink-0" />
            <span className="font-sans text-[14px] text-white">
              {chamado.origin}
            </span>
          </div>
          <div className="my-1 flex justify-center">
            <Navigation size={15} color="rgba(255,255,255,0.30)" />
          </div>
          <div className="flex items-start gap-2">
            <MapPin size={16} color="#E84040" className="mt-0.5 shrink-0" />
            <span className="font-sans text-[14px] text-white">
              {chamado.destination}
            </span>
          </div>

          <div className="my-3 h-px" style={{ background: "rgba(255,255,255,0.08)" }} />

          <p className="font-sans text-[13px]" style={{ color: "rgba(255,255,255,0.6)" }}>
            {chamado.distanceKm} km · ~{chamado.durationMin} min
          </p>
          <div className="mt-2 flex items-end justify-between">
            <span className="font-sans text-[13px]" style={{ color: "rgba(255,255,255,0.5)" }}>
              Você recebe (90%)
            </span>
            <span className="font-display text-[22px] font-bold" style={{ color: "#0DB87E" }}>
              {formatBRL(youReceive)}
            </span>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={onAccept}
            className="w-full h-12 rounded-xl font-display font-semibold text-[#09090B] flex items-center justify-center transition-transform active:scale-98 shadow-md"
            style={{ background: "#0DB87E" }}
          >
            Aceitar Corrida ({seconds}s)
          </button>
          <button
            type="button"
            onClick={onReject}
            className="w-full h-11 rounded-xl font-sans text-[14px] font-medium transition-colors"
            style={{
              background: "rgba(255,255,255,0.05)",
              color: "rgba(255,255,255,0.6)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            Recusar
          </button>
        </div>
      </div>
    </div>
  );
};

export const MototaxiIncomingRideListener = ({ isOnline }: { isOnline: boolean }) => {
  const navigate = useNavigate();
  const user = useCurrentUser();
  const [chamado, setChamado] = useState<Chamado | null>(null);

  // Polling e Realtime
  useEffect(() => {
    if (!isOnline) {
      setChamado(null);
      return;
    }

    const fetchActiveChamado = async () => {
      try {
        const ninetySecsAgo = new Date(Date.now() - 90000).toISOString();
        const { data, error } = await supabase
          .from("mototaxi_corridas")
          .select("*")
          .in("status", ["searching", "pending", "buscando", "solicitado"])
          .is("prestador_id", null)
          .gt("created_at", ninetySecsAgo)
          .order("created_at", { ascending: false })
          .limit(1);

        if (error) {
          console.error("[AUDIT Listener] Erro no polling de chamados:", error);
          return;
        }

        if (data && data.length > 0) {
          const c = data[0];
          const originObj = typeof c.origin === "string" ? JSON.parse(c.origin) : c.origin;
          const destObj = typeof c.destination === "string" ? JSON.parse(c.destination) : c.destination;

          setChamado((prev) => {
            if (prev && prev.id === c.id) return prev;
            playChamadoSound();
            return {
              id: c.id,
              type: c.type || "carona",
              origin: originObj?.address || (typeof originObj === "string" ? originObj : "Origem"),
              destination: destObj?.address || (typeof destObj === "string" ? destObj : "Destino"),
              distanceKm: Number(c.distance_km || 0),
              durationMin: Number(c.duration_min || 0),
              price: Number(c.estimated_price || 0),
            };
          });
        }
      } catch (err) {
        console.error("[AUDIT Listener] Exceção no polling de chamados:", err);
      }
    };

    fetchActiveChamado();
    const pollInterval = setInterval(fetchActiveChamado, 2000);
    return () => clearInterval(pollInterval);
  }, [isOnline, user.uid]);

  // Realtime Postgres Changes
  const handleNewCorrida = useCallback((payload: any) => {
    if (!isOnline) return;
    const c = payload.new;
    const isPending = c && ["searching", "pending", "buscando", "solicitado"].includes(c.status);
    const isTargetPrestador = c && (!c.prestador_id || c.prestador_id === user.uid);

    if (c && isPending && isTargetPrestador) {
      try {
        const originObj = typeof c.origin === "string" ? JSON.parse(c.origin) : c.origin;
        const destObj = typeof c.destination === "string" ? JSON.parse(c.destination) : c.destination;
        setChamado({
          id: c.id,
          type: c.type || "carona",
          origin: originObj?.address || (typeof originObj === "string" ? originObj : "Origem"),
          destination: destObj?.address || (typeof destObj === "string" ? destObj : "Destino"),
          distanceKm: Number(c.distance_km || 0),
          durationMin: Number(c.duration_min || 0),
          price: Number(c.estimated_price || 0),
        });
        playChamadoSound();
      } catch (err) {
        console.error("[AUDIT Listener] Erro ao parsear chamado realtime:", err);
      }
    } else if (c && !isPending) {
      setChamado((prev) => (prev && prev.id === c.id ? null : prev));
    }
  }, [isOnline, user.uid]);

  useRealtimeChannel(
    isOnline ? `public:mototaxi_corridas_listener_${user.uid || "online"}` : null,
    { event: "*", table: "mototaxi_corridas" },
    handleNewCorrida
  );

  // Contingency Broadcast Channel
  useEffect(() => {
    if (!isOnline) return;
    const broadcastChan = supabase
      .channel("mototaxi_chamados_broadcast")
      .on("broadcast", { event: "new_chamado" }, ({ payload }) => {
        if (payload && payload.id) {
          const originObj = typeof payload.origin === "string" ? JSON.parse(payload.origin) : payload.origin;
          const destObj = typeof payload.destination === "string" ? JSON.parse(payload.destination) : payload.destination;
          setChamado({
            id: payload.id,
            type: payload.type || "carona",
            origin: originObj?.address || (typeof originObj === "string" ? originObj : "Origem"),
            destination: destObj?.address || (typeof destObj === "string" ? destObj : "Destino"),
            distanceKm: Number(payload.distance_km || 0),
            durationMin: Number(payload.duration_min || 0),
            price: Number(payload.estimated_price || 0),
          });
          playChamadoSound();
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(broadcastChan);
    };
  }, [isOnline]);

  const accept = async () => {
    if (!chamado) return;
    let currentUid = user.uid;
    if (!currentUid) {
      const { data: authData } = await supabase.auth.getUser();
      currentUid = authData?.user?.id || "";
    }

    console.log("[AUDIT Listener] Aceitando corrida ID:", chamado.id, "prestador_uid:", currentUid);

    try {
      const { data, error } = await supabase
        .from("mototaxi_corridas")
        .update({
          status: "accepted",
          prestador_id: currentUid,
          accepted_at: new Date().toISOString(),
        })
        .eq("id", chamado.id)
        .select()
        .single();

      if (error || !data) {
        console.error("[AUDIT Listener] Falha ao aceitar corrida:", error);
        alert(`Erro ao aceitar corrida: ${error?.message || "Outro motorista pode ter aceitado."}`);
        setChamado(null);
        return;
      }

      sessionStorage.setItem("ubt_active_ride", JSON.stringify({ ...chamado, prestador_id: currentUid }));
      setChamado(null);
      navigate("/app/prestador/mototaxi/active");
    } catch (e) {
      console.error("[AUDIT Listener] Exceção ao aceitar corrida:", e);
      alert("Erro ao aceitar corrida! Tente novamente.");
      setChamado(null);
    }
  };

  const reject = () => {
    setChamado(null);
  };

  if (!chamado) return null;

  return <ChamadoModal chamado={chamado} onAccept={accept} onReject={reject} />;
};

export default MototaxiIncomingRideListener;
