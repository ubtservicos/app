import React, { useEffect, useState } from "react";
import { Recycle, ArrowRight, X, Calendar, Clock, MapPin } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useNavigate } from "react-router-dom";

interface CocoSmartBannerProps {
  currentAddress?: string;
  onCtaClick?: () => void;
}

const DIAS_MAP: Record<number, string> = {
  0: "Domingo",
  1: "Segunda-feira",
  2: "Terça-feira",
  3: "Quarta-feira",
  4: "Quinta-feira",
  5: "Sexta-feira",
  6: "Sábado",
};

export default function CocoSmartBanner({ currentAddress, onCtaClick }: CocoSmartBannerProps) {
  const user = useCurrentUser();
  const navigate = useNavigate();
  const [scheduleTomorrow, setScheduleTomorrow] = useState<{
    bairro_nome: string;
    dia_semana: string;
    horario_inicio: string;
    horario_fim: string;
  } | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const checkSchedule = async () => {
      try {
        const tomorrowIndex = (new Date().getDay() + 1) % 7;
        const tomorrowName = DIAS_MAP[tomorrowIndex];

        // Fetch all active schedules for tomorrow
        const { data, error } = await supabase
          .from("coco_agenda_bairros")
          .select("*")
          .eq("dia_semana", tomorrowName)
          .eq("is_active", true);

        if (error || !data || data.length === 0) return;

        // Determine user neighborhood prioritizing bairro_moradia from profiles
        let userBairro = "";
        if (user.uid) {
          try {
            const { data: profData } = await supabase
              .from("profiles")
              .select("bairro_moradia, bairro_trabalho")
              .eq("id", user.uid)
              .maybeSingle();

            if (profData?.bairro_moradia) {
              userBairro = profData.bairro_moradia;
            } else if (profData?.bairro_trabalho) {
              userBairro = profData.bairro_trabalho;
            } else {
              const { data: userData } = await supabase
                .from("usuarios")
                .select("bairro_moradia, bairro_trabalho")
                .eq("id", user.uid)
                .maybeSingle();
              if (userData?.bairro_moradia) {
                userBairro = userData.bairro_moradia;
              }
            }
          } catch (profileErr) {
            console.warn("Erro ao consultar bairro do perfil:", profileErr);
          }
        }

        if (!userBairro && currentAddress) {
          userBairro = currentAddress;
        }

        if (!userBairro) {
          setScheduleTomorrow(data[0]);
          return;
        }

        const cleanUserBairro = userBairro
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase();

        const matched = data.find((item) => {
          const cleanItemBairro = item.bairro_nome
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase();
          return cleanUserBairro.includes(cleanItemBairro) || cleanItemBairro.includes(cleanUserBairro);
        });

        if (matched) {
          setScheduleTomorrow(matched);
        } else if (data.length > 0) {
          setScheduleTomorrow(data[0]);
        }
      } catch (err) {
        console.warn("Erro ao consultar agenda inteligente da Côco & Cia:", err);
      }
    };

    checkSchedule();
  }, [user.uid, currentAddress]);

  if (!scheduleTomorrow || isDismissed) return null;

  const handleAction = () => {
    if (onCtaClick) {
      onCtaClick();
    } else {
      navigate("/app/coco");
    }
  };

  return (
    <div className="w-full bg-gradient-to-r from-[#0DB87E]/20 via-[#1C3261]/40 to-[#0DB87E]/10 border border-[#0DB87E]/40 rounded-2xl p-4 my-3 text-white shadow-lg shadow-[#0DB87E]/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in slide-in-from-top-2 duration-300">
      
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#0DB87E]/20 border border-[#0DB87E]/40 flex items-center justify-center text-[#0DB87E] shrink-0 mt-0.5 sm:mt-0 animate-pulse">
          <Recycle size={22} />
        </div>

        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#0DB87E]/20 text-[#0DB87E] text-[10px] font-mono font-bold uppercase tracking-wider">
              <Calendar size={10} /> Coleta Amanhã
            </span>
            <span className="text-xs text-white/50 font-sans flex items-center gap-1">
              <Clock size={11} /> {scheduleTomorrow.horario_inicio} às {scheduleTomorrow.horario_fim}
            </span>
          </div>

          <h4 className="font-display font-bold text-sm sm:text-base text-white mt-1">
            O caminhão da coleta passa em <strong>{scheduleTomorrow.bairro_nome}</strong> amanhã! ♻️
          </h4>
          <p className="text-xs text-white/70 font-sans mt-0.5">
            Separe seus plásticos, vidros, latinhas e óleos usados para o recolhimento.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0 mt-2 sm:mt-0">
        <button
          type="button"
          onClick={handleAction}
          className="flex-1 sm:flex-initial py-2 px-4 rounded-xl bg-[#0DB87E] hover:bg-[#0ca36e] active:scale-95 text-[#090A0C] font-display font-bold text-xs shadow-md shadow-[#0DB87E]/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <span>Marcar Ponto</span>
          <ArrowRight size={14} />
        </button>

        <button
          type="button"
          onClick={() => setIsDismissed(true)}
          aria-label="Fechar aviso"
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors"
        >
          <X size={16} />
        </button>
      </div>

    </div>
  );
}
