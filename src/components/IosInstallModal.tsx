import React from "react";
import { X, Share, PlusSquare, ArrowUpRight, Smartphone } from "lucide-react";

interface IosInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function IosInstallModal({ isOpen, onClose }: IosInstallModalProps) {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-in fade-in duration-300 select-none"
    >
      <div className="relative z-10 w-full max-w-md bg-[#0E0F12]/95 border border-white/15 rounded-3xl p-6 sm:p-8 text-center shadow-2xl flex flex-col items-center animate-in slide-in-from-bottom sm:zoom-in-95 duration-300">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-white/50 hover:text-white transition-colors rounded-full hover:bg-white/10 cursor-pointer"
          aria-label="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-green mb-4 shadow-lg">
          <Smartphone className="w-7 h-7 text-green" />
        </div>

        <span className="text-[10px] tracking-[0.2em] font-mono text-green uppercase font-semibold block mb-1">
          Instalar no iPhone / iPad
        </span>

        <h3 className="font-display font-extrabold text-xl text-white mb-2">
          Adicionar UBT à Tela de Início
        </h3>

        <p className="text-xs text-white/70 leading-relaxed font-sans mb-6 text-center">
          O Safari no iOS não suporta a instalação em 1 clique automático, mas você pode adicionar o app em 3 passos rápidos:
        </p>

        <div className="w-full flex flex-col gap-3 text-left mb-6">
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/30">
              <Share className="w-5 h-5" />
            </div>
            <div className="text-xs text-white/80 font-sans leading-snug">
              <span className="font-bold text-white block">1. Toque em Compartilhar</span>
              Ícone de quadrado com seta para cima na barra inferior do Safari.
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-green/20 text-green flex items-center justify-center shrink-0 border border-green/30">
              <PlusSquare className="w-5 h-5" />
            </div>
            <div className="text-xs text-white/80 font-sans leading-snug">
              <span className="font-bold text-white block">2. Adicionar à Tela de Início</span>
              Role o menu de opções para baixo até encontrar essa opção.
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-yellow-500/20 text-yellow-400 flex items-center justify-center shrink-0 border border-yellow-500/30">
              <ArrowUpRight className="w-5 h-5" />
            </div>
            <div className="text-xs text-white/80 font-sans leading-snug">
              <span className="font-bold text-white block">3. Toque em "Adicionar"</span>
              No canto superior direito para confirmar o atalho oficial.
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full py-3.5 rounded-2xl font-display font-bold text-xs uppercase tracking-wider bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
        >
          Entendi, vou adicionar
        </button>
      </div>
    </div>
  );
}
