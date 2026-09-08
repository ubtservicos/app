import { useState, useEffect } from "react";
import {
  Sparkles,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  Search,
  Package,
} from "lucide-react";
import { Card, Pill } from "@/components/admin/ui";
import { useAdminToast } from "@/components/admin/AdminToast";
import { supabase } from "@/lib/supabase";

interface MaterialItem {
  id: string;
  nome: string;
  categoria: string;
  preco_medio: number;
  emoji?: string;
}

const DEFAULT_MOCK_MATERIAIS: MaterialItem[] = [
  { id: "mat-1", nome: "Detergente Neutro Concentrado 5L", categoria: "Químicos", preco_medio: 24.50, emoji: "🧴" },
  { id: "mat-2", nome: "Desinfetante Floral Antibactericida 2L", categoria: "Químicos", preco_medio: 14.90, emoji: "🌸" },
  { id: "mat-3", nome: "Mop Giratório com Balde Reforçado", categoria: "Equipamentos", preco_medio: 79.90, emoji: "🧹" },
  { id: "mat-4", nome: "Kit Panos de Microfibra (5 unidades)", categoria: "Descartáveis / Acessórios", preco_medio: 18.00, emoji: "🧽" },
  { id: "mat-5", nome: "Luvas de Látex Antiderrapantes (Par)", categoria: "EPI / Proteção", preco_medio: 8.50, emoji: "🧤" },
];

export default function AdminDiaristasMateriaisPage() {
  const toast = useAdminToast();
  const [materiais, setMateriais] = useState<MaterialItem[]>(DEFAULT_MOCK_MATERIAIS);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MaterialItem | null>(null);

  // Form state
  const [formNome, setFormNome] = useState("");
  const [formCategoria, setFormCategoria] = useState("Químicos");
  const [formPreco, setFormPreco] = useState("");
  const [formEmoji, setFormEmoji] = useState("✨");

  useEffect(() => {
    loadDbMateriais();
  }, []);

  async function loadDbMateriais() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("diarista_materiais_padrao")
        .select("*")
        .order("categoria", { ascending: true });

      if (data && data.length > 0) {
        setMateriais(data.map((d: any) => ({
          id: d.id,
          nome: d.nome,
          categoria: d.categoria || "Geral",
          preco_medio: Number(d.preco_medio) || 0,
          emoji: d.emoji || "✨"
        })));
      }
    } catch (e) {
      console.warn("Usando catálogo padrão de materiais:", e);
    } finally {
      setLoading(false);
    }
  }

  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormNome("");
    setFormCategoria("Químicos");
    setFormPreco("");
    setFormEmoji("✨");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: MaterialItem) => {
    setEditingItem(item);
    setFormNome(item.nome);
    setFormCategoria(item.categoria);
    setFormPreco(item.preco_medio.toString());
    setFormEmoji(item.emoji || "✨");
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!formNome.trim()) {
      toast.show("Preencha o nome do item.");
      return;
    }
    const preco = parseFloat(formPreco.replace(",", ".")) || 0;

    if (editingItem) {
      setMateriais((prev) =>
        prev.map((m) =>
          m.id === editingItem.id
            ? { ...m, nome: formNome, categoria: formCategoria, preco_medio: preco, emoji: formEmoji }
            : m
        )
      );
      toast.show("Material atualizado com sucesso!");
    } else {
      const newItem: MaterialItem = {
        id: "mat-" + Date.now(),
        nome: formNome,
        categoria: formCategoria,
        preco_medio: preco,
        emoji: formEmoji || "✨",
      };
      setMateriais((prev) => [newItem, ...prev]);
      toast.show("Novo material adicionado com sucesso!");
    }
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    setMateriais((prev) => prev.filter((m) => m.id !== id));
    toast.show("Item removido com sucesso!");
  };

  const filtered = materiais.filter(
    (m) =>
      m.nome.toLowerCase().includes(search.toLowerCase()) ||
      m.categoria.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 sm:p-6 md:p-8 min-h-screen bg-[#0B132B] text-zinc-100 font-sans">
      {/* Header & Primary Action Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Package size={22} />
            </div>
            <div>
              <h1 className="font-display text-2xl md:text-3xl font-bold text-white tracking-tight">
                Gestão de Materiais • Diaristas
              </h1>
              <p className="text-zinc-400 text-xs md:text-sm mt-0.5">
                Catálogo referencial de insumos, equipamentos e preços médios praticados
              </p>
            </div>
          </div>
        </div>

        {/* Primary Emerald Button */}
        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition-all shadow-lg shadow-emerald-950 cursor-pointer shrink-0"
        >
          <Plus size={18} /> Adicionar item
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Buscar por nome do item ou categoria..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-zinc-900/90 border border-zinc-800 rounded-xl text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>
        <span className="text-xs text-zinc-400 hidden sm:inline-block">
          Total de {filtered.length} itens cadastrados
        </span>
      </div>

      {/* Table Card */}
      <Card className="w-full bg-zinc-900/90 border border-zinc-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-950/40 text-zinc-400 text-xs uppercase tracking-wider">
                <th className="py-3.5 px-4 font-semibold">Item</th>
                <th className="py-3.5 px-4 font-semibold">Categoria</th>
                <th className="py-3.5 px-4 font-semibold text-right">Preço Médio</th>
                <th className="py-3.5 px-4 font-semibold text-center w-28">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 text-sm">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-zinc-800/30 transition-colors group">
                  {/* Item (Emoji + Nome) */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-base shrink-0">
                        {item.emoji || "✨"}
                      </div>
                      <span className="font-medium text-zinc-100">{item.nome}</span>
                    </div>
                  </td>

                  {/* Categoria */}
                  <td className="py-3.5 px-4">
                    <Pill
                      bg={
                        item.categoria.toLowerCase().includes("químico")
                          ? "rgba(13,184,126,0.15)"
                          : item.categoria.toLowerCase().includes("equipamento")
                          ? "rgba(43,110,232,0.15)"
                          : "rgba(245,166,35,0.15)"
                      }
                      color={
                        item.categoria.toLowerCase().includes("químico")
                          ? "#0DB87E"
                          : item.categoria.toLowerCase().includes("equipamento")
                          ? "#2B6EE8"
                          : "#F5A623"
                      }
                      size="sm"
                    >
                      {item.categoria}
                    </Pill>
                  </td>

                  {/* Preço Médio */}
                  <td className="py-3.5 px-4 text-right">
                    <span className="font-mono font-bold text-emerald-400">
                      R$ {item.preco_medio.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </td>

                  {/* Ações (Editar & Deletar) */}
                  <td className="py-3.5 px-4 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => handleOpenEdit(item)}
                        title="Editar item"
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all cursor-pointer"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        title="Excluir item"
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-rose-950/40 transition-all cursor-pointer"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-zinc-400 text-sm">
                    Nenhum material encontrado para o filtro informado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-zinc-800">
              <h3 className="text-lg font-bold text-white">
                {editingItem ? "Editar Material" : "Adicionar Novo Material"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                  Ícone / Emoji
                </label>
                <input
                  type="text"
                  maxLength={4}
                  value={formEmoji}
                  onChange={(e) => setFormEmoji(e.target.value)}
                  className="w-16 px-3 py-2 text-center bg-zinc-950 border border-zinc-800 rounded-xl text-base text-zinc-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                  Nome do Item / Material
                </label>
                <input
                  type="text"
                  placeholder="Ex: Água Sanitária 2L"
                  value={formNome}
                  onChange={(e) => setFormNome(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                  Categoria
                </label>
                <select
                  value={formCategoria}
                  onChange={(e) => setFormCategoria(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 focus:outline-none focus:border-emerald-500"
                >
                  <option value="Químicos">Químicos</option>
                  <option value="Equipamentos">Equipamentos</option>
                  <option value="Descartáveis / Acessórios">Descartáveis / Acessórios</option>
                  <option value="EPI / Proteção">EPI / Proteção</option>
                  <option value="Geral">Geral</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                  Preço Médio (R$)
                </label>
                <input
                  type="text"
                  placeholder="Ex: 15.50"
                  value={formPreco}
                  onChange={(e) => setFormPreco(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 font-mono placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 mt-6 pt-4 border-t border-zinc-800">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-xl text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-all shadow-md shadow-emerald-950 cursor-pointer"
              >
                <Check size={14} /> Salvar Item
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
