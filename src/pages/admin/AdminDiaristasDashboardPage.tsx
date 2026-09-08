import { useState } from "react";
import {
  Sparkles,
  Calendar,
  CheckCircle2,
  TrendingUp,
  DollarSign,
  Star,
  Users,
  MapPin,
  Filter,
  ArrowUpRight,
  Activity,
} from "lucide-react";
import { Card, Pill } from "@/components/admin/ui";

type Period = "Hoje" | "Semana" | "Mês" | "Ano" | "Customizar";

export default function AdminDiaristasDashboardPage() {
  const [selectedPeriod, setSelectedPeriod] = useState<Period>("Mês");

  const periods: Period[] = ["Hoje", "Semana", "Mês", "Ano", "Customizar"];

  // Mock aggregated metrics depending on period
  const metrics = {
    servicosPeriodo: selectedPeriod === "Hoje" ? 14 : selectedPeriod === "Semana" ? 86 : selectedPeriod === "Mês" ? 342 : 2840,
    servicosOnline: 12,
    faturamentoTotal: selectedPeriod === "Hoje" ? "R$ 2.520,00" : selectedPeriod === "Semana" ? "R$ 15.480,00" : selectedPeriod === "Mês" ? "R$ 61.560,00" : "R$ 511.200,00",
    repassePrestadores: selectedPeriod === "Hoje" ? "R$ 2.268,00" : selectedPeriod === "Semana" ? "R$ 13.932,00" : selectedPeriod === "Mês" ? "R$ 55.404,00" : "R$ 460.080,00",
    ticketMedio: "R$ 180,00",
    avaliacaoMedia: "4.92 ★",
    taxaConclusao: "98.8%",
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 min-h-screen bg-[#0B132B] text-zinc-100 font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Sparkles size={22} />
            </div>
            <div>
              <h1 className="font-display text-2xl md:text-3xl font-bold text-white tracking-tight">
                Diaristas • Painel de Controle
              </h1>
              <p className="text-zinc-400 text-xs md:text-sm mt-0.5">
                Monitoramento operacional, volume de diárias e gestão de serviços domésticos UBT
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
        {/* Card 1: Serviços no Período */}
        <Card className="p-5 bg-zinc-900/90 border border-zinc-800 rounded-2xl shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Serviços no Período
            </span>
            <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Calendar size={16} />
            </span>
          </div>
          <div className="text-3xl font-bold text-white mt-2">{metrics.servicosPeriodo}</div>
          <div className="text-xs text-emerald-400 mt-2 flex items-center gap-1">
            <ArrowUpRight size={14} /> +14.2% em relação ao período anterior
          </div>
        </Card>

        {/* Card 2: Serviços no Momento (Online) */}
        <Card className="p-5 bg-zinc-900/90 border border-zinc-800 rounded-2xl shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Serviços no Momento (Online)
            </span>
            <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Activity size={16} className="animate-pulse" />
            </span>
          </div>
          <div className="text-3xl font-bold text-emerald-400 mt-2">{metrics.servicosOnline}</div>
          <div className="text-xs text-zinc-400 mt-2 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            Diárias em andamento agora em Ubatuba
          </div>
        </Card>

        {/* Card 3: Faturamento Total */}
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
            Repasse Prestador (90%): <strong className="text-emerald-400">{metrics.repassePrestadores}</strong>
          </div>
        </Card>

        {/* Card 4: Avaliação & Qualidade */}
        <Card className="p-5 bg-zinc-900/90 border border-zinc-800 rounded-2xl shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Avaliação & Conclusão
            </span>
            <span className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
              <Star size={16} />
            </span>
          </div>
          <div className="text-2xl font-bold text-white mt-2">{metrics.avaliacaoMedia}</div>
          <div className="text-xs text-emerald-400 mt-2 flex items-center gap-1">
            <CheckCircle2 size={13} /> {metrics.taxaConclusao} taxa de conclusão sem disputas
          </div>
        </Card>
      </div>

      {/* Analytics & Reports Placeholders Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Placeholder: Volume de Demandas por Dia/Semana */}
        <Card className="lg:col-span-2 p-6 bg-zinc-900/90 border border-zinc-800 rounded-2xl shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-display text-base font-bold text-white flex items-center gap-2">
                <TrendingUp size={18} className="text-emerald-400" /> Fluxo de Agendamentos ({selectedPeriod})
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">Demanda diária de diaristas e faxinas solicitadas</p>
            </div>
            <Pill bg="rgba(13,184,126,0.15)" color="#0DB87E">Em Alta</Pill>
          </div>

          {/* Styled Bar Chart Placeholder */}
          <div className="h-48 flex items-end justify-between gap-2 pt-6 px-2 border-b border-zinc-800">
            {[
              { day: "Seg", val: 40 },
              { day: "Ter", val: 65 },
              { day: "Qua", val: 55 },
              { day: "Qui", val: 80 },
              { day: "Sex", val: 95 },
              { day: "Sáb", val: 100 },
              { day: "Dom", val: 30 },
            ].map((bar, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                <span className="text-[11px] font-mono text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity">
                  {bar.val}%
                </span>
                <div
                  className="w-full bg-emerald-500/20 group-hover:bg-emerald-500/40 rounded-t-lg transition-all border-t border-x border-emerald-500/40"
                  style={{ height: `${bar.val}%` }}
                />
                <span className="text-xs text-zinc-400 font-medium">{bar.day}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between mt-4 text-xs text-zinc-400">
            <span>Picos de agendamento concentrados nas sextas-feiras e sábados.</span>
            <span className="text-emerald-400 font-semibold">Média: 11.4 atendimentos/dia</span>
          </div>
        </Card>

        {/* Categorias / Modalidades de Limpeza */}
        <Card className="p-6 bg-zinc-900/90 border border-zinc-800 rounded-2xl shadow-lg flex flex-col justify-between">
          <div>
            <h3 className="font-display text-base font-bold text-white mb-1 flex items-center gap-2">
              <Sparkles size={18} className="text-emerald-400" /> Modalidades Solicitadas
            </h3>
            <p className="text-xs text-zinc-400 mb-4">Divisão percentual por tipo de serviço</p>

            <div className="space-y-3 text-sm">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-zinc-300">Faxina Residencial Completa</span>
                  <span className="text-emerald-400 font-bold">58%</span>
                </div>
                <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: "58%" }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-zinc-300">Limpeza Pós-Praia / Temporada</span>
                  <span className="text-emerald-400 font-bold">24%</span>
                </div>
                <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-400 h-full rounded-full" style={{ width: "24%" }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-zinc-300">Pós-Obra & Reformas</span>
                  <span className="text-amber-400 font-bold">12%</span>
                </div>
                <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-amber-400 h-full rounded-full" style={{ width: "12%" }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-zinc-300">Limpeza Comercial / Escritórios</span>
                  <span className="text-indigo-400 font-bold">6%</span>
                </div>
                <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-indigo-400 h-full rounded-full" style={{ width: "6%" }} />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-400">
            <span>Total de diárias cadastradas</span>
            <span className="font-bold text-white">{metrics.servicosPeriodo}</span>
          </div>
        </Card>
      </div>

      {/* Bairros com Maior Atuação & Prestadores Destaque */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6 bg-zinc-900/90 border border-zinc-800 rounded-2xl shadow-lg">
          <h3 className="font-display text-base font-bold text-white mb-3 flex items-center gap-2">
            <MapPin size={18} className="text-emerald-400" /> Bairros com Maior Demanda
          </h3>
          <div className="space-y-2.5 text-sm">
            {[
              { bairro: "Praia Grande", percent: "34%", count: "116 diárias" },
              { bairro: "Itaguá", percent: "26%", count: "89 diárias" },
              { bairro: "Centro / Ubatuba", percent: "21%", count: "72 diárias" },
              { bairro: "Perequê-Açu", percent: "12%", count: "41 diárias" },
              { bairro: "Enseada", percent: "7%", count: "24 diárias" },
            ].map((b, idx) => (
              <div key={idx} className="flex justify-between items-center py-2 border-b border-zinc-800/60 last:border-0">
                <span className="text-zinc-200 font-medium">{b.bairro}</span>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-zinc-400">{b.count}</span>
                  <span className="font-mono font-bold text-emerald-400 text-xs">{b.percent}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6 bg-zinc-900/90 border border-zinc-800 rounded-2xl shadow-lg">
          <h3 className="font-display text-base font-bold text-white mb-3 flex items-center gap-2">
            <Users size={18} className="text-emerald-400" /> Prestadores Destaque no Período
          </h3>
          <div className="space-y-2.5 text-sm">
            {[
              { name: "Maria Aparecida Silva", rating: "5.0 ★", rides: "28 diárias", status: "Online" },
              { name: "Luciana dos Santos", rating: "4.9 ★", rides: "25 diárias", status: "Online" },
              { name: "Joana Dark de Souza", rating: "4.9 ★", rides: "22 diárias", status: "Ocupada" },
              { name: "Cláudia Ribeiro", rating: "4.8 ★", rides: "19 diárias", status: "Offline" },
            ].map((p, idx) => (
              <div key={idx} className="flex justify-between items-center py-2 border-b border-zinc-800/60 last:border-0">
                <div>
                  <div className="text-zinc-200 font-medium">{p.name}</div>
                  <div className="text-xs text-zinc-400">{p.rides} • {p.rating}</div>
                </div>
                <Pill
                  bg={p.status === "Online" ? "rgba(13,184,126,0.15)" : p.status === "Ocupada" ? "rgba(245,166,35,0.15)" : "rgba(255,255,255,0.05)"}
                  color={p.status === "Online" ? "#0DB87E" : p.status === "Ocupada" ? "#F5A623" : "#888"}
                  size="sm"
                >
                  {p.status}
                </Pill>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
