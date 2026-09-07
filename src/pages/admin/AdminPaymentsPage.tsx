import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Search, CreditCard, ArrowRight, RefreshCw, QrCode } from "lucide-react";
import { Card, PageTitle, Pill } from "@/components/admin/ui";
import { useAdminToast } from "@/components/admin/AdminToast";
import { supabase } from "@/lib/supabase";

interface PaymentRecord {
  id: string;
  transaction_id: string;
  service_type: string;
  service_id: string;
  total_amount: number;
  provider_amount: number;
  ubt_amount: number;
  status: string;
  payment_method: string;
  created_at: string;
}

const PAGE_SIZE = 10;

export default function AdminPaymentsPage() {
  const navigate = useNavigate();
  const toast = useAdminToast();
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [page, setPage] = useState(0);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("pagamentos_split")
        .select("id, transaction_id, service_type, service_id, total_amount, ubt_amount, provider_amount, status, created_at")
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (data) {
        const mapped: PaymentRecord[] = data.map((d) => ({
          id: d.id,
          transaction_id: d.transaction_id,
          service_type: d.service_type || "mototaxi",
          service_id: d.service_id,
          total_amount: Number(d.total_amount),
          provider_amount: Number(d.provider_amount),
          ubt_amount: Number(d.ubt_amount),
          status: d.status,
          payment_method: "PIX",
          created_at: d.created_at,
        }));
        setPayments(mapped);
      }
    } catch (err) {
      console.error("Erro ao carregar pagamentos:", err);
      toast.show("Erro ao carregar pagamentos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const filtered = useMemo(() => {
    return payments.filter((p) => {
      const matchSearch =
        p.id.toLowerCase().includes(search.toLowerCase()) ||
        (p.transaction_id && p.transaction_id.toLowerCase().includes(search.toLowerCase())) ||
        (p.service_id && p.service_id.toLowerCase().includes(search.toLowerCase()));

      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "approved" && (p.status === "approved" || p.status === "captured")) ||
        p.status === statusFilter;

      const matchService = serviceFilter === "all" || p.service_type === serviceFilter;

      return matchSearch && matchStatus && matchService;
    });
  }, [payments, search, statusFilter, serviceFilter]);

  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  const formatBR = (n: number) =>
    "R$ " + n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const getStatusPill = (status: string) => {
    switch (status) {
      case "approved":
      case "captured":
      case "authorized":
        return (
          <Pill bg="rgba(13,184,126,0.15)" color="#0DB87E" border="rgba(13,184,126,0.3)">
            Aprovado
          </Pill>
        );
      case "pending":
        return (
          <Pill bg="rgba(245,166,35,0.15)" color="#F5A623" border="rgba(245,166,35,0.3)">
            Pendente
          </Pill>
        );
      case "refunded":
        return (
          <Pill bg="rgba(43,110,232,0.15)" color="#2B6EE8" border="rgba(43,110,232,0.3)">
            Estornado
          </Pill>
        );
      default:
        return (
          <Pill bg="rgba(232,64,64,0.12)" color="#E84040" border="rgba(232,64,64,0.3)">
            {status}
          </Pill>
        );
    }
  };

  const totalGMV = payments.reduce((acc, p) => acc + (p.total_amount || 0), 0);
  const totalUBT = payments.reduce((acc, p) => acc + (p.ubt_amount || 0), 0);

  return (
    <div className="p-6 md:p-8 min-h-screen bg-[#0B132B] text-zinc-100 font-sans">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <PageTitle sub="Registro completo de pagamentos capturados no Mercado Pago e distribuídos pelo Motor de Split">
          Pagamentos & Splits
        </PageTitle>

        <button
          onClick={fetchPayments}
          disabled={loading}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 font-semibold text-xs transition-colors self-start md:self-auto cursor-pointer"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Atualizar
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <Card className="p-5 bg-zinc-900/90 border border-zinc-800 rounded-2xl shadow-lg">
          <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">GMV Total Transacionado</div>
          <div className="text-3xl font-bold text-white mt-1.5">{formatBR(totalGMV)}</div>
          <div className="text-xs text-zinc-400 mt-1">{payments.length} transações registradas</div>
        </Card>

        <Card className="p-5 bg-zinc-900/90 border border-zinc-800 rounded-2xl shadow-lg">
          <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Receita UBT Retida (7,5%)</div>
          <div className="text-3xl font-bold text-emerald-400 mt-1.5">{formatBR(totalUBT)}</div>
          <div className="text-xs text-emerald-400/80 mt-1">Taxa da plataforma garantida</div>
        </Card>

        <Card className="p-5 bg-zinc-900/90 border border-zinc-800 rounded-2xl shadow-lg sm:col-span-2 lg:col-span-1">
          <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Líquido Repassado aos Prestadores</div>
          <div className="text-3xl font-bold text-amber-400 mt-1.5">
            {formatBR(payments.reduce((acc, p) => acc + (p.provider_amount || 0), 0))}
          </div>
          <div className="text-xs text-zinc-400 mt-1">90.0% do valor total das corridas</div>
        </Card>
      </div>

      {/* Filter panel with Dark Mode High Contrast */}
      <Card className="p-4 mb-6 bg-zinc-900/90 border border-zinc-800 rounded-2xl shadow-lg flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[240px]">
          <Search size={16} className="absolute left-3.5 top-3 text-zinc-400" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            placeholder="Buscar por ID, Código do Gateway..."
            className="w-full h-10 bg-zinc-950/80 border border-zinc-700 text-zinc-100 placeholder-zinc-500 rounded-xl pl-10 pr-3 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(0);
          }}
          className="h-10 bg-zinc-950/80 border border-zinc-700 text-zinc-200 rounded-xl px-3 text-sm focus:outline-none focus:border-emerald-500 transition-colors cursor-pointer"
        >
          <option value="all">Todos os Status</option>
          <option value="approved">Aprovado (Captured)</option>
          <option value="pending">Pendente</option>
          <option value="refunded">Estornado</option>
        </select>

        <select
          value={serviceFilter}
          onChange={(e) => {
            setServiceFilter(e.target.value);
            setPage(0);
          }}
          className="h-10 bg-zinc-950/80 border border-zinc-700 text-zinc-200 rounded-xl px-3 text-sm focus:outline-none focus:border-emerald-500 transition-colors cursor-pointer"
        >
          <option value="all">Todas as Verticais</option>
          <option value="mototaxi">Mototáxi</option>
          <option value="diarista">Diaristas</option>
          <option value="ambulante">Ambulantes</option>
        </select>
      </Card>

      {/* Payments Table */}
      <Card className="p-0 bg-zinc-900/90 border border-zinc-800 rounded-2xl shadow-lg overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-zinc-400 flex flex-col items-center justify-center">
            <RefreshCw className="w-6 h-6 text-emerald-500 animate-spin mb-3" />
            <span>Carregando transações financeiras...</span>
          </div>
        ) : paged.length === 0 ? (
          <div className="p-12 text-center text-zinc-400">
            Nenhum pagamento correspondente encontrado.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-zinc-950/70 border-b border-zinc-800 text-zinc-400 text-xs font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Código / Transação</th>
                  <th className="py-3 px-4">Data / Hora</th>
                  <th className="py-3 px-4">Vertical</th>
                  <th className="py-3 px-4">Método</th>
                  <th className="py-3 px-4 text-right">Valor Bruto</th>
                  <th className="py-3 px-4 text-right">Prestador (90%)</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 text-sm">
                {paged.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => navigate(`/admin/payments/${p.id}`)}
                    className="hover:bg-zinc-800/40 transition-colors cursor-pointer"
                  >
                    <td className="py-3.5 px-4">
                      <div className="font-mono text-xs font-semibold text-emerald-400">
                        {p.transaction_id || `mp_${p.id.slice(0, 8)}`}
                      </div>
                      <div className="text-[11px] text-zinc-400 font-mono">ID: #{p.id.slice(0, 8)}...</div>
                    </td>
                    <td className="py-3.5 px-4 text-zinc-300 text-xs">
                      {new Date(p.created_at).toLocaleString("pt-BR")}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="capitalize font-medium text-zinc-200">{p.service_type}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 font-semibold text-xs text-zinc-200">
                        <QrCode size={13} className="text-emerald-400" /> {p.payment_method}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-white">
                      {formatBR(p.total_amount)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-semibold text-emerald-400">
                      {formatBR(p.provider_amount)}
                    </td>
                    <td className="py-3.5 px-4 text-center">{getStatusPill(p.status)}</td>
                    <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => navigate(`/admin/payments/${p.id}`)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-emerald-600 text-zinc-100 hover:text-white border border-zinc-700 hover:border-emerald-500 font-semibold text-xs transition-all cursor-pointer"
                      >
                        Ver Detalhes <ArrowRight size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-zinc-950/70 border-t border-zinc-800 text-xs text-zinc-400">
          <span>Total de {filtered.length} pagamentos registrados</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-3 py-1.5 rounded-lg border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed font-medium text-zinc-200 cursor-pointer"
            >
              Anterior
            </button>
            <span className="px-2 font-medium text-zinc-300">
              Página {page + 1} de {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="px-3 py-1.5 rounded-lg border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed font-medium text-zinc-200 cursor-pointer"
            >
              Próxima
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}
