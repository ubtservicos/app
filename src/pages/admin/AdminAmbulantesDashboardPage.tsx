import { useState } from "react";
import {
  ShoppingBag,
  Calendar,
  Activity,
  DollarSign,
  TrendingUp,
  MapPin,
  Filter,
  ArrowUpRight,
  Store,
  CheckCircle2,
  Users,
} from "lucide-react";
import { Card, Pill } from "@/components/admin/ui";

type Period = "Hoje" | "Semana" | "Mês" | "Ano" | "Customizar";

export default function AdminAmbulantesDashboardPage() {
  const [selectedPeriod, setSelectedPeriod] = useState<Period>("Mês");

  const periods: Period[] = ["Hoje", "Semana", "Mês", "Ano", "Customizar"];

  // Mock aggregated metrics depending on period
  const metrics = {
    atendimentosPeriodo: selectedPeriod === "Hoje" ? 64 : selectedPeriod === "Semana" ? 418 : selectedPeriod === "Mês" ? 1860 : 21400,
    atendimentosOnline: 24,
    faturamentoTotal: selectedPeriod === "Hoje" ? "R$ 1.824,00" : selectedPeriod === "Semana" ? "R$ 11.913,00" : selectedPeriod === "Mês" ? "R$ 53.010,00" : "R$ 609.900,00",
    repasseAmbulantes: selectedPeriod === "Hoje" ? "R$ 1.641,60" : selectedPeriod === "Semana" ? "R$ 10.721,70" : selectedPeriod === "Mês" ? "R$ 47.709,00" : "R$ 548.910,00",
    ticketMedio: "R$ 28,50",
    tempoMedioEntrega: "6.5 min na areia",
    taxaSatisfacao: "99.1%",
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 min-h-screen bg-[#0B132B] text-zinc-100 font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <ShoppingBag size={22} />
            </div>
            <div>
              <h1 className="font-display text-2xl md:text-3xl font-bold text-white tracking-tight">
                Ambulantes • Painel de Controle
              </h1>
              <p className="text-zinc-400 text-xs md:text-sm mt-0.5">
                Monitoramento de vendas na orla, barracas cadastradas e produtos transacionados UBT
              </p>
            </div>
          </div>
        </div>

        {/* Period Selector Pills */}
        <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-zinc-900/90 rounded-xl border border-zinc-800">
          <Filter size={15} className="text-zinc-400 ml-2 mr-1 shrink-0" />
          {periods.map((p) => {
            const isActive = selectedPeriod === p;
            return (
              <button
                key={p}
                onClick={() => setSelectedPeriod(p)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-950"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                }`}
              >
                {p}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Card 1: Atendimentos no Período */}
        <Card className="p-5 bg-zinc-900/90 border border-zinc-800 rounded-2xl shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Atendimentos no Período
            </span>
            <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Calendar size={16} />
            </span>
          </div>
          <div className="text-3xl font-bold text-white mt-2">{metrics.atendimentosPeriodo}</div>
          <div className="text-xs text-emerald-400 mt-2 flex items-center gap-1">
            <ArrowUpRight size={14} /> +22.8% de vendas no período
          </div>
        </Card>

        {/* Card 2: Atendimentos no Momento (Online) */}
        <Card className="p-5 bg-zinc-900/90 border border-zinc-800 rounded-2xl shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Atendimentos no Momento (Online)
            </span>
            <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Activity size={16} className="animate-pulse" />
            </span>
          </div>
          <div className="text-3xl font-bold text-emerald-400 mt-2">{metrics.atendimentosOnline}</div>
          <div className="text-xs text-zinc-400 mt-2 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            Carrinhos e barracas com atendimento ativo
          </div>
        </Card>

        {/* Card 3: Faturamento Bruto */}
        <Card className="p-5 bg-zinc-900/90 border border-zinc-800 rounded-2xl shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Faturamento Bruto
            </span>
            <span className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
              <DollarSign size={16} />
            </span>
          </div>
          <div className="text-2xl font-bold text-white mt-2">{metrics.faturamentoTotal}</div>
          <div className="text-xs text-zinc-400 mt-2">
            Líquido Vendedores (90%): <strong className="text-emerald-400">{metrics.repasseAmbulantes}</strong>
          </div>
        </Card>

        {/* Card 4: Ticket Médio & Qualidade */}
        <Card className="p-5 bg-zinc-900/90 border border-zinc-800 rounded-2xl shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Ticket Médio
            </span>
            <span className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
              <Store size={16} />
            </span>
          </div>
          <div className="text-2xl font-bold text-white mt-2">{metrics.ticketMedio}</div>
          <div className="text-xs text-emerald-400 mt-2 flex items-center gap-1">
            <CheckCircle2 size={13} /> {metrics.taxaSatisfacao} satisfação do cliente na praia
          </div>
        </Card>
      </div>

      {/* Analytics & Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Vendas por Praia / Orla */}
        <Card className="lg:col-span-2 p-6 bg-zinc-900/90 border border-zinc-800 rounded-2xl shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-display text-base font-bold text-white flex items-center gap-2">
                <TrendingUp size={18} className="text-emerald-400" /> Vendas por Praia ({selectedPeriod})
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">Distribuição geográfica dos pedidos na orla de Ubatuba</p>
            </div>
            <Pill bg="rgba(13,184,126,0.15)" color="#0DB87E">Alta Estação</Pill>
          </div>

          {/* Styled Bar Chart */}
          <div className="h-48 flex items-end justify-between gap-2 pt-6 px-2 border-b border-zinc-800">
            {[
              { beach: "Praia Grande", val: 100 },
              { beach: "Tenório", val: 65 },
              { beach: "Enseada", val: 75 },
              { beach: "Maranduba", val: 85 },
              { beach: "Perequê-Açu", val: 50 },
              { beach: "Itamambuca", val: 70 },
              { beach: "Toninhas", val: 60 },
            ].map((bar, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                <span className="text-[10px] font-mono text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity">
                  {bar.val}%
                </span>
                <div
                  className="w-full bg-emerald-500/20 group-hover:bg-emerald-500/40 rounded-t-lg transition-all border-t border-x border-emerald-500/40"
                  style={{ height: `${bar.val}%` }}
                />
                <span className="text-[11px] text-zinc-400 font-medium truncate max-w-full text-center">{bar.beach}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between mt-4 text-xs text-zinc-400">
            <span>Praia Grande e Maranduba lideram com maior volume de pedidos por QR Code e app.</span>
            <span className="text-emerald-400 font-semibold">Entrega média: {metrics.tempoMedioEntrega}</span>
          </div>
        </Card>

        {/* Categorias Mais Vendidas */}
        <Card className="p-6 bg-zinc-900/90 border border-zinc-800 rounded-2xl shadow-lg flex flex-col justify-between">
          <div>
            <h3 className="font-display text-base font-bold text-white mb-1 flex items-center gap-2">
              <ShoppingBag size={18} className="text-emerald-400" /> Categorias Principais
            </h3>
            <p className="text-xs text-zinc-400 mb-4">Itens mais pedidos na areia</p>

            <div className="space-y-3 text-sm">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-zinc-300">🥤 Bebidas & Água de Coco</span>
                  <span className="text-emerald-400 font-bold">38%</span>
                </div>
                <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: "38%" }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-zinc-300">🍤 Porções & Frutos do Mar</span>
                  <span className="text-emerald-400 font-bold">25%</span>
                </div>
                <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-400 h-full rounded-full" style={{ width: "25%" }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-zinc-300">🍧 Açaí & Sorvetes</span>
                  <span className="text-amber-400 font-bold">20%</span>
                </div>
                <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-amber-400 h-full rounded-full" style={{ width: "20%" }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-zinc-300">🌽 Milho & Churrasco</span>
                  <span className="text-indigo-400 font-bold">17%</span>
                </div>
                <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-indigo-400 h-full rounded-full" style={{ width: "17%" }} />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-400">
            <span>Total de itens vendidos</span>
            <span className="font-bold text-white">{metrics.atendimentosPeriodo * 2.4 | 0} unidades</span>
          </div>
        </Card>
      </div>

      {/* Ambulantes Destaque & Praias Ativas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6 bg-zinc-900/90 border border-zinc-800 rounded-2xl shadow-lg">
          <h3 className="font-display text-base font-bold text-white mb-3 flex items-center gap-2">
            <MapPin size={18} className="text-emerald-400" /> Postos e Praias em Atividade
          </h3>
          <div className="space-y-2.5 text-sm">
            {[
              { beach: "Praia Grande (Posto 2 e 3)", barracas: "12 ambulantes ativos", status: "Em Operação" },
              { beach: "Praia do Tenório (Canto Sul)", barracas: "6 ambulantes ativos", status: "Em Operação" },
              { beach: "Maranduba (Orla Central)", barracas: "8 ambulantes ativos", status: "Em Operação" },
              { beach: "Enseada (Praça Central)", barracas: "5 ambulantes ativos", status: "Em Operação" },
            ].map((p, idx) => (
              <div key={idx} className="flex justify-between items-center py-2 border-b border-zinc-800/60 last:border-0">
                <div>
                  <div className="text-zinc-200 font-medium">{p.beach}</div>
                  <div className="text-xs text-zinc-400">{p.barracas}</div>
                </div>
                <Pill bg="rgba(13,184,126,0.15)" color="#0DB87E" size="sm">
                  {p.status}
                </Pill>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6 bg-zinc-900/90 border border-zinc-800 rounded-2xl shadow-lg">
          <h3 className="font-display text-base font-bold text-white mb-3 flex items-center gap-2">
            <Users size={18} className="text-emerald-400" /> Ambulantes com Maior Volume
          </h3>
          <div className="space-y-2.5 text-sm">
            {[
              { name: "Barraca do Zé do Coco", items: "184 vendas", rating: "5.0 ★", status: "Online" },
              { name: "Maria do Milho & Pamonha", items: "156 vendas", rating: "4.9 ★", status: "Online" },
              { name: "Açaí da Praia Ubatuba", items: "142 vendas", rating: "4.9 ★", status: "Online" },
              { name: "Espetinhos do Caiçara", items: "119 vendas", rating: "4.8 ★", status: "Offline" },
            ].map((a, idx) => (
              <div key={idx} className="flex justify-between items-center py-2 border-b border-zinc-800/60 last:border-0">
                <div>
                  <div className="text-zinc-200 font-medium">{a.name}</div>
                  <div className="text-xs text-zinc-400">{a.items} • {a.rating}</div>
                </div>
                <Pill
                  bg={a.status === "Online" ? "rgba(13,184,126,0.15)" : "rgba(255,255,255,0.05)"}
                  color={a.status === "Online" ? "#0DB87E" : "#888"}
                  size="sm"
                >
                  {a.status}
                </Pill>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
