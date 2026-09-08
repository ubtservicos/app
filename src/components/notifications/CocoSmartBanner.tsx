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

const normalizeBairro = (str?: string | null) => {
  if (!str) return "";
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\bii\b/g, "2")
    .replace(/\biii\b/g, "3")
    .replace(/\biv\b/g, "4")
    .replace(/[^a-z0-9]/g, "")
    .trim();
};

export default function CocoSmartBanner({ currentAddress, onCtaClick }: CocoSmartBannerProps) {
  const user = useCurrentUser();
  const navigate = useNavigate();
  const [schedule, setSchedule] = useState<{
    bairro_nome: string;
    dia_semana: string;
    horario_inicio: string;
    horario_fim: string;
    badgeLabel: string;
    title: string;
  } | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const checkSchedule = async () => {
      try {
        const todayIndex = new Date().getDay();
        const tomorrowIndex = (todayIndex + 1) % 7;
        const todayName = DIAS_MAP[todayIndex];
        const tomorrowName = DIAS_MAP[tomorrowIndex];

        // 1. Buscar todas as escalas ativas de coleta
        const { data: allSchedules, error } = await supabase
          .from("coco_agenda_bairros")
          .select("*")
          .eq("is_active", true);

        if (error || !allSchedules || allSchedules.length === 0) return;

        // 2. Determinar bairro do usuário priorizando profiles e usuarios
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
            }

            if (!userBairro) {
              const { data: userData } = await supabase
                .from("usuarios")
                .select("bairro_moradia, bairro_trabalho")
                .eq("id", user.uid)
                .maybeSingle();
              if (userData?.bairro_moradia) {
                userBairro = userData.bairro_moradia;
              } else if (userData?.bairro_trabalho) {
                userBairro = userData.bairro_trabalho;
              }
            }
          } catch (profileErr) {
            console.warn("Erro ao consultar bairro do perfil:", profileErr);
          }
        }

        if (!userBairro && currentAddress) {
          userBairro = currentAddress;
        }

        const normalizedUser = normalizeBairro(userBairro);

        // 3. Procurar match do bairro do usuário na agenda
        let matchedItem = allSchedules.find((item) => {
          const normItem = normalizeBairro(item.bairro_nome);
          return (
            normItem === normalizedUser ||
            normItem.includes(normalizedUser) ||
            (normalizedUser.length >= 3 && normalizedUser.includes(normItem))
          );
        });

        // 4. Se não houver match direto pelo bairro do usuário, buscar escalas de amanhã ou de hoje
        if (!matchedItem) {
          matchedItem = allSchedules.find((item) => item.dia_semana === tomorrowName) ||
                        allSchedules.find((item) => item.dia_semana === todayName) ||
                        allSchedules[0];
        }

        if (matchedItem) {
          const isToday = matchedItem.dia_semana === todayName;
          const isTomorrow = matchedItem.dia_semana === tomorrowName;
          const badgeLabel = isToday ? "Coleta Hoje" : isTomorrow ? "Coleta Amanhã" : `Coleta ${matchedItem.dia_semana}`;
          const titleTime = isToday ? "passa no seu bairro hoje" : isTomorrow ? "passa amanhã" : `passa toda ${matchedItem.dia_semana}`;

          setSchedule({
            bairro_nome: matchedItem.bairro_nome,
            dia_semana: matchedItem.dia_semana,
            horario_inicio: matchedItem.horario_inicio,
            horario_fim: matchedItem.horario_fim,
            badgeLabel,
            title: `O caminhão da coleta ${titleTime} em ${matchedItem.bairro_nome}! ♻️`,
          });
        }
      } catch (err) {
        console.warn("Erro ao consultar agenda inteligente da Côco & Cia:", err);
      }
    };

    checkSchedule();
  }, [user.uid, currentAddress]);

  if (!schedule || isDismissed) return null;

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
              <Calendar size={10} /> {schedule.badgeLabel}
            </span>
            <span className="text-xs text-white/50 font-sans flex items-center gap-1">
              <Clock size={11} /> {schedule.horario_inicio} às {schedule.horario_fim}
            </span>
          </div>

          <h4 className="font-display font-bold text-sm sm:text-base text-white mt-1">
            {schedule.title}
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
