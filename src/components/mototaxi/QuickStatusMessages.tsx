import React from "react";
import { MessageSquare, Send, Check } from "lucide-react";

export const PRESTADOR_QUICK_PHRASES = [
  "Já estou chegando 🏍",
  "A caminho 🏍",
  "Quase lá ✅",
  "Estou no ponto de embarque 📍",
  "Aguarde 1 min ⏱",
  "Estou no trânsito 🚦",
  "Cheguei no destino 🏁",
];

export const TOMADOR_QUICK_PHRASES = [
  "Já estou aqui 📍",
  "Aguardando no portão 🏠",
  "A caminho do ponto 🚶",
  "Onde exatamente? 🗺",
  "Ok, pode ir 👍",
  "Preciso parar 🛑",
  "Estou no destino ✅",
];

export interface QuickMessageItem {
  id?: string;
  text: string;
  from: "tomador" | "prestador";
  ts?: number;
}

interface QuickStatusMessagesProps {
  role: "tomador" | "prestador";
  onSendMessage: (phrase: string) => void;
  lastSentPhrase?: string | null;
  className?: string;
}

export const QuickStatusMessages: React.FC<QuickStatusMessagesProps> = ({
  role,
  onSendMessage,
  lastSentPhrase,
  className = "",
}) => {
  const phrases = role === "prestador" ? PRESTADOR_QUICK_PHRASES : TOMADOR_QUICK_PHRASES;

  return (
    <div className={`w-full ${className}`}>
      <div className="flex items-center gap-1.5 mb-2">
        <MessageSquare size={13} className="text-[#0DB87E]" />
        <span
          className="font-sans text-[11px] font-semibold uppercase tracking-wider"
          style={{ color: "rgba(255,255,255,0.50)" }}
        >
          Mensagem rápida ({role === "prestador" ? "Motorista" : "Passageiro"})
        </span>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1.5 scrollbar-none">
        {phrases.map((phrase) => {
          const isSelected = lastSentPhrase === phrase;
          return (
            <button
              key={phrase}
              type="button"
              onClick={() => onSendMessage(phrase)}
              className="shrink-0 px-3 py-1.5 rounded-full font-sans text-[12px] font-medium transition-all active:scale-95 flex items-center gap-1.5 shadow-sm"
              style={{
                background: isSelected
                  ? "rgba(13,184,126,0.20)"
                  : "rgba(255,255,255,0.06)",
                border: isSelected
                  ? "1px solid #0DB87E"
                  : "1px solid rgba(255,255,255,0.10)",
                color: isSelected ? "#0DB87E" : "#FFFFFF",
              }}
            >
              {phrase}
              {isSelected && <Check size={12} className="text-[#0DB87E]" />}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default QuickStatusMessages;
