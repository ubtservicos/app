import { useState, useEffect } from "react";
import {
  Utensils,
  Plus,
  Pencil,
  Trash2,
  Search,
  Check,
  X,
  ShoppingBag,
  RefreshCw,
} from "lucide-react";
import { Card, Pill } from "@/components/admin/ui";
import { useAdminToast } from "@/components/admin/AdminToast";
import { supabase } from "@/lib/supabase";

interface CardapioCategory {
  id: string;
  name: string;
  emoji: string;
  description: string;
  sample_items?: string[];
  avg_price_range: string;
  active_count: number;
  status: "Ativo" | "Rascunho" | string;
}

export default function AdminAmbulantesCardapiosPage() {
  const toast = useAdminToast();
  const [categories, setCategories] = useState<CardapioCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<CardapioCategory | null>(null);
  const [saving, setSaving] = useState(false);

  // Form State
  const [formId, setFormId] = useState("");
  const [formName, setFormName] = useState("");
  const [formEmoji, setFormEmoji] = useState("🍽️");
  const [formDesc, setFormDesc] = useState("");
  const [formPriceRange, setFormPriceRange] = useState("");
  const [formSamples, setFormSamples] = useState("");

  useEffect(() => {
    loadCategories();
  }, []);

  async function loadCategories() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("ambulante_cardapios_padrao")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;
      if (data) {
        setCategories(data.map((d: any) => ({
          id: d.id,
          name: d.name,
          emoji: d.emoji || "🍽️",
          description: d.description || "",
          sample_items: Array.isArray(d.sample_items) ? d.sample_items : (typeof d.sample_items === "string" ? JSON.parse(d.sample_items) : []),
          avg_price_range: d.avg_price_range || "R$ 10,00 - R$ 30,00",
          active_count: Number(d.active_count) || 0,
          status: d.status || "Ativo",
        })));
      }
    } catch (err: any) {
      console.error("Erro ao carregar cardápios do Supabase:", err);
      toast.show("Erro ao carregar cardápios: " + (err.message || "Falha na conexão"));
    } finally {
      setLoading(false);
    }
  }

  const handleOpenAdd = () => {
    setEditingCat(null);
    setFormId("");
    setFormName("");
    setFormEmoji("🍽️");
    setFormDesc("");
    setFormPriceRange("R$ 10,00 - R$ 30,00");
    setFormSamples("Item 1, Item 2");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (cat: CardapioCategory) => {
    setEditingCat(cat);
    setFormId(cat.id);
    setFormName(cat.name);
    setFormEmoji(cat.emoji);
    setFormDesc(cat.description);
    setFormPriceRange(cat.avg_price_range);
    setFormSamples((cat.sample_items || []).join(", "));
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      toast.show("Preencha o nome da categoria.");
      return;
    }
    const samplesArray = formSamples
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const generatedId = formId.trim() || "cat-" + formName.toLowerCase().trim().replace(/[^a-z0-9]/g, "-");

    try {
      setSaving(true);
      if (editingCat) {
        const { error } = await supabase
          .from("ambulante_cardapios_padrao")
          .update({
            name: formName.trim(),
            emoji: formEmoji || "🍽️",
            description: formDesc.trim(),
            avg_price_range: formPriceRange.trim(),
            sample_items: samplesArray,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingCat.id);

        if (error) throw error;
        toast.show("Categoria atualizada no banco com sucesso!");
      } else {
        const { error } = await supabase
          .from("ambulante_cardapios_padrao")
          .insert({
            id: generatedId,
            name: formName.trim(),
            emoji: formEmoji || "🍽️",
            description: formDesc.trim(),
            avg_price_range: formPriceRange.trim(),
            sample_items: samplesArray,
            status: "Ativo",
          });

        if (error) throw error;
        toast.show("Nova categoria salva no Supabase com sucesso!");
      }

      setIsModalOpen(false);
      await loadCategories();
    } catch (err: any) {
      console.error("Erro ao salvar categoria no banco:", err);
      toast.show("Erro ao salvar: " + (err.message || "Falha na gravação"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta categoria do cardápio padrão?")) return;
    try {
      const { error } = await supabase
        .from("ambulante_cardapios_padrao")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.show("Categoria excluída com sucesso!");
      setCategories((prev) => prev.filter((c) => c.id !== id));
    } catch (err: any) {
      console.error("Erro ao deletar categoria:", err);
      toast.show("Erro ao excluir: " + (err.message || "Falha na exclusão"));
    }
  };

  const filtered = categories.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 sm:p-6 md:p-8 min-h-screen bg-[#0B132B] text-zinc-100 font-sans">
      {/* Header & Primary Action Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Utensils size={22} />
            </div>
            <div>
              <h1 className="font-display text-2xl md:text-3xl font-bold text-white tracking-tight">
                Cardápios & Categorias Padrão • Ambulantes
              </h1>
              <p className="text-zinc-400 text-xs md:text-sm mt-0.5">
                Base oficial conectada em tempo real à tabela <code>ambulante_cardapios_padrao</code>
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadCategories}
            title="Atualizar dados do banco"
            className="p-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 transition-colors cursor-pointer"
          >
            <RefreshCw size={16} className={loading ? "animate-spin text-emerald-400" : ""} />
          </button>
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition-all shadow-lg shadow-emerald-950 cursor-pointer shrink-0"
          >
            <Plus size={18} /> Adicionar Categoria
          </button>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Buscar por categoria ou descrição..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-zinc-900/90 border border-zinc-800 rounded-xl text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>
        <span className="text-xs text-zinc-400 hidden sm:inline-block">
          Exibindo {filtered.length} de {categories.length} categorias cadastradas no Supabase
        </span>
      </div>

      {/* Categories Grid */}
      {loading ? (
        <div className="py-20 text-center text-zinc-400">
          <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin mx-auto mb-3" />
          Carregando cardápios homologados do banco de dados...
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center bg-zinc-900/90 border border-zinc-800 text-zinc-400">
          Nenhuma categoria encontrada no banco de dados.
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((cat) => (
            <Card
              key={cat.id}
              className="p-6 bg-zinc-900/90 border border-zinc-800 rounded-2xl shadow-xl flex flex-col justify-between hover:border-zinc-700 transition-all group"
            >
              <div>
                {/* Category Header */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center text-2xl shrink-0 group-hover:scale-105 transition-transform">
                      {cat.emoji}
                    </div>
                    <div>
                      <h3 className="font-display text-lg font-bold text-white tracking-tight flex items-center gap-2">
                        {cat.name}
                      </h3>
                      <span className="text-xs text-emerald-400 font-mono">
                        {cat.avg_price_range}
                      </span>
                    </div>
                  </div>

                  <Pill bg="rgba(13,184,126,0.15)" color="#0DB87E" size="sm">
                    {cat.status}
                  </Pill>
                </div>

                {/* Description */}
                <p className="text-zinc-300 text-xs leading-relaxed mb-4">
                  {cat.description}
                </p>

                {/* Sample Items Chips */}
                {cat.sample_items && cat.sample_items.length > 0 && (
                  <div className="space-y-1.5 mb-4">
                    <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">
                      Exemplos Homologados:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {cat.sample_items.map((item, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded-md bg-zinc-950 border border-zinc-800 text-[11px] text-zinc-300"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer & Actions */}
              <div className="pt-4 border-t border-zinc-800 flex items-center justify-between">
                <span className="text-xs text-zinc-400 flex items-center gap-1.5">
                  <ShoppingBag size={13} className="text-emerald-400" />
                  <strong className="text-zinc-200">{cat.active_count}</strong> ambulantes ativos
                </span>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEdit(cat)}
                    title="Editar categoria"
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all cursor-pointer"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => handleDelete(cat.id)}
                    title="Excluir categoria"
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-rose-950/40 transition-all cursor-pointer"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add / Edit Category Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-zinc-800">
              <h3 className="text-lg font-bold text-white">
                {editingCat ? "Editar Categoria no Banco" : "Adicionar Categoria no Supabase"}
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
                  Emoji Representativo
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
                  Nome da Categoria
                </label>
                <input
                  type="text"
                  placeholder="Ex: Sorvete, Churrasco, Vestuário"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                  Faixa de Preço Sugerida
                </label>
                <input
                  type="text"
                  placeholder="Ex: R$ 8,00 - R$ 25,00"
                  value={formPriceRange}
                  onChange={(e) => setFormPriceRange(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 font-mono placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                  Itens de Exemplo (separados por vírgula)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Picolé de Fruta, Paleta Recheada"
                  value={formSamples}
                  onChange={(e) => setFormSamples(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                  Descrição & Detalhes
                </label>
                <textarea
                  rows={3}
                  placeholder="Descreva os produtos aceitos nesta categoria padrão..."
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 mt-6 pt-4 border-t border-zinc-800">
              <button
                onClick={() => setIsModalOpen(false)}
                disabled={saving}
                className="px-4 py-2 rounded-xl text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-all shadow-md shadow-emerald-950 cursor-pointer disabled:opacity-50"
              >
                {saving ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
                {saving ? "Salvando..." : "Salvar no Supabase"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
