import { useState } from "react";
import {
  Bike,
  Calendar,
  Activity,
  DollarSign,
  Clock,
  TrendingUp,
  MapPin,
  Filter,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
  Users,
} from "lucide-react";
import { Card, Pill } from "@/components/admin/ui";

type Period = "Hoje" | "Semana" | "Mês" | "Ano" | "Customizar";

export default function AdminMototaxistasDashboardPage() {
  const [selectedPeriod, setSelectedPeriod] = useState<Period>("Mês");

  const periods: Period[] = ["Hoje", "Semana", "Mês", "Ano", "Customizar"];

  // Mock aggregated metrics depending on period
  const metrics = {
    corridasPeriodo: selectedPeriod === "Hoje" ? 48 : selectedPeriod === "Semana" ? 312 : selectedPeriod === "Mês" ? 1420 : 16500,
    corridasOnline: 18,
    faturamentoTotal: selectedPeriod === "Hoje" ? "R$ 680,00" : selectedPeriod === "Semana" ? "R$ 4.420,00" : selectedPeriod === "Mês" ? "R$ 20.150,00" : "R$ 234.300,00",
    repasseMototaxistas: selectedPeriod === "Hoje" ? "R$ 612,00" : selectedPeriod === "Semana" ? "R$ 3.978,00" : selectedPeriod === "Mês" ? "R$ 18.135,00" : "R$ 210.870,00",
    tempoMedioEspera: "3.8 min",
    taxaAceitacao: "98.4%",
    distanciaMedia: "3.2 km",
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 min-h-screen bg-[#0B132B] text-zinc-100 font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Bike size={22} />
            </div>
            <div>
              <h1 className="font-display text-2xl md:text-3xl font-bold text-white tracking-tight">
                Mototaxistas • Painel de Controle
              </h1>
              <p className="text-zinc-400 text-xs md:text-sm mt-0.5">
                Monitoramento de corridas, entregas, motoristas online e faturamento UBT
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
        {/* Card 1: Corridas no Período */}
        <Card className="p-5 bg-zinc-900/90 border border-zinc-800 rounded-2xl shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Corridas no Período
            </span>
            <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Calendar size={16} />
            </span>
          </div>
          <div className="text-3xl font-bold text-white mt-2">{metrics.corridasPeriodo}</div>
          <div className="text-xs text-emerald-400 mt-2 flex items-center gap-1">
            <ArrowUpRight size={14} /> +18.5% de crescimento no período
          </div>
        </Card>

        {/* Card 2: Corridas no Momento (Online) */}
        <Card className="p-5 bg-zinc-900/90 border border-zinc-800 rounded-2xl shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Corridas no Momento (Online)
            </span>
            <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Activity size={16} className="animate-pulse" />
            </span>
          </div>
          <div className="text-3xl font-bold text-emerald-400 mt-2">{metrics.corridasOnline}</div>
          <div className="text-xs text-zinc-400 mt-2 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            Condutores ativos e viagens em curso
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
            Líquido Mototaxistas (90%): <strong className="text-emerald-400">{metrics.repasseMototaxistas}</strong>
          </div>
        </Card>

        {/* Card 4: Tempo Médio & Eficiência */}
        <Card className="p-5 bg-zinc-900/90 border border-zinc-800 rounded-2xl shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Tempo Médio de Espera
            </span>
            <span className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
              <Clock size={16} />
            </span>
          </div>
          <div className="text-2xl font-bold text-white mt-2">{metrics.tempoMedioEspera}</div>
          <div className="text-xs text-emerald-400 mt-2 flex items-center gap-1">
            <CheckCircle2 size={13} /> {metrics.taxaAceitacao} taxa de aceitação imediata
          </div>
        </Card>
      </div>

      {/* Analytics & Reports Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Gráfico de Picos Horários / Demanda */}
        <Card className="lg:col-span-2 p-6 bg-zinc-900/90 border border-zinc-800 rounded-2xl shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-display text-base font-bold text-white flex items-center gap-2">
                <TrendingUp size={18} className="text-emerald-400" /> Fluxo Horário de Viagens ({selectedPeriod})
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">Distribuição do volume de corridas ao longo do dia</p>
            </div>
            <Pill bg="rgba(13,184,126,0.15)" color="#0DB87E">Pico Ativo</Pill>
          </div>

          {/* Styled Bar Chart Placeholder */}
          <div className="h-48 flex items-end justify-between gap-2 pt-6 px-2 border-b border-zinc-800">
            {[
              { time: "06h", val: 25 },
              { time: "08h", val: 85 },
              { time: "10h", val: 50 },
              { time: "12h", val: 90 },
              { time: "14h", val: 60 },
              { time: "16h", val: 75 },
              { time: "18h", val: 100 },
              { time: "20h", val: 65 },
              { time: "22h", val: 35 },
            ].map((bar, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                <span className="text-[10px] font-mono text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity">
                  {bar.val}%
                </span>
                <div
                  className="w-full bg-emerald-500/20 group-hover:bg-emerald-500/40 rounded-t-lg transition-all border-t border-x border-emerald-500/40"
                  style={{ height: `${bar.val}%` }}
                />
                <span className="text-xs text-zinc-400 font-medium">{bar.time}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between mt-4 text-xs text-zinc-400">
            <span>Picos de maior volume: Entrada comercial (08h) e Saída de trabalho/escola (18h).</span>
            <span className="text-emerald-400 font-semibold">Distância média: {metrics.distanciaMedia}</span>
          </div>
        </Card>

        {/* Modalidade de Serviço */}
        <Card className="p-6 bg-zinc-900/90 border border-zinc-800 rounded-2xl shadow-lg flex flex-col justify-between">
          <div>
            <h3 className="font-display text-base font-bold text-white mb-1 flex items-center gap-2">
              <Bike size={18} className="text-emerald-400" /> Modalidades Ativas
            </h3>
            <p className="text-xs text-zinc-400 mb-4">Divisão entre passageiros e entregas expressas</p>

            <div className="space-y-4 text-sm">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-zinc-300">Corrida com Passageiro</span>
                  <span className="text-emerald-400 font-bold">78%</span>
                </div>
                <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: "78%" }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-zinc-300">Entregas Rápidas & Encomendas</span>
                  <span className="text-amber-400 font-bold">22%</span>
                </div>
                <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-amber-400 h-full rounded-full" style={{ width: "22%" }} />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-zinc-800 space-y-2 text-xs text-zinc-400">
            <div className="flex justify-between">
              <span>Auditoria de Rotas</span>
              <span className="text-emerald-400 font-semibold">100% Rastreável GPS</span>
            </div>
            <div className="flex justify-between">
              <span>Total no Período</span>
              <span className="font-bold text-white">{metrics.corridasPeriodo} viagens</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Principais Rotas e Motoristas Líderes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6 bg-zinc-900/90 border border-zinc-800 rounded-2xl shadow-lg">
          <h3 className="font-display text-base font-bold text-white mb-3 flex items-center gap-2">
            <MapPin size={18} className="text-emerald-400" /> Principais Destinos / Bairros
          </h3>
          <div className="space-y-2.5 text-sm">
            {[
              { origem: "Centro", destino: "Praia Grande", percent: "31%", count: "440 viagens" },
              { origem: "Itaguá", destino: "Perequê-Açu", percent: "24%", count: "341 viagens" },
              { origem: "Estufa II", destino: "Centro", percent: "19%", count: "270 viagens" },
              { origem: "Ipiranguinha", destino: "Itaguá", percent: "15%", count: "213 viagens" },
              { origem: "Enseada", destino: "Praia Grande", percent: "11%", count: "156 viagens" },
            ].map((r, idx) => (
              <div key={idx} className="flex justify-between items-center py-2 border-b border-zinc-800/60 last:border-0">
                <div>
                  <span className="text-zinc-200 font-medium">{r.origem}</span>
                  <span className="text-zinc-500 mx-1.5">➔</span>
                  <span className="text-zinc-300">{r.destino}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-zinc-400">{r.count}</span>
                  <span className="font-mono font-bold text-emerald-400 text-xs">{r.percent}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6 bg-zinc-900/90 border border-zinc-800 rounded-2xl shadow-lg">
          <h3 className="font-display text-base font-bold text-white mb-3 flex items-center gap-2">
            <Users size={18} className="text-emerald-400" /> Condutores com Maior Volume
          </h3>
          <div className="space-y-2.5 text-sm">
            {[
              { name: "Silvina Luz", rides: "142 corridas", rating: "5.0 ★", status: "Em Corrida" },
              { name: "Carlos Eduardo Motta", rides: "128 corridas", rating: "4.9 ★", status: "Online" },
              { name: "Roberto Pires", rides: "115 corridas", rating: "4.9 ★", status: "Online" },
              { name: "Marcos Vinicius", rides: "98 corridas", rating: "4.8 ★", status: "Offline" },
            ].map((m, idx) => (
              <div key={idx} className="flex justify-between items-center py-2 border-b border-zinc-800/60 last:border-0">
                <div>
                  <div className="text-zinc-200 font-medium">{m.name}</div>
                  <div className="text-xs text-zinc-400">{m.rides} • {m.rating}</div>
                </div>
                <Pill
                  bg={m.status === "Online" ? "rgba(13,184,126,0.15)" : m.status === "Em Corrida" ? "rgba(43,110,232,0.15)" : "rgba(255,255,255,0.05)"}
                  color={m.status === "Online" ? "#0DB87E" : m.status === "Em Corrida" ? "#2B6EE8" : "#888"}
                  size="sm"
                >
                  {m.status}
                </Pill>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
