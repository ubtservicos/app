import { useState } from "react";
import {
  Utensils,
  Plus,
  Pencil,
  Trash2,
  Search,
  Check,
  X,
  Layers,
  Sparkles,
  ShoppingBag,
  ExternalLink,
} from "lucide-react";
import { Card, Pill } from "@/components/admin/ui";
import { useAdminToast } from "@/components/admin/AdminToast";

interface CardapioCategory {
  id: string;
  name: string;
  emoji: string;
  description: string;
  sampleItems: string[];
  avgPriceRange: string;
  activeCount: number;
  status: "Ativo" | "Rascunho";
}

const DEFAULT_UBT_CATEGORIES: CardapioCategory[] = [
  {
    id: "cat-sorvete",
    name: "Sorvete",
    emoji: "🍦",
    description: "Picolés artesanais, paletas mexicanas, massas no copo e casquinha com frutas tropicais.",
    sampleItems: ["Picolé Frutas (Manga/Uva)", "Paleta Mexicana Recheada", "Copo 2 Bolas Artesanal"],
    avgPriceRange: "R$ 6,00 - R$ 18,00",
    activeCount: 16,
    status: "Ativo",
  },
  {
    id: "cat-churrasco",
    name: "Churrasco",
    emoji: "🍢",
    description: "Espetinhos grelhados na hora com farofa crocante, vinagrete caseiro e molhos especiais.",
    sampleItems: ["Espeto Alcatra / Maminha", "Queijo Coalho Grelhado c/ Melaço", "Espeto Frango com Bacon"],
    avgPriceRange: "R$ 10,00 - R$ 22,00",
    activeCount: 12,
    status: "Ativo",
  },
  {
    id: "cat-milho",
    name: "Milho",
    emoji: "🌽",
    description: "Milho verde cozido com manteiga na palha, pamonha fresca doce e salgada, curau e bolos.",
    sampleItems: ["Milho Verde no Prato / Palha", "Pamonha Tradicional de Milho", "Curau Cremoso com Canela"],
    avgPriceRange: "R$ 8,00 - R$ 15,00",
    activeCount: 9,
    status: "Ativo",
  },
  {
    id: "cat-acai",
    name: "Açaí",
    emoji: "🍧",
    description: "Tigelas e copos de açaí natural batido com banana, morango, granola, leite condensado e ninho.",
    sampleItems: ["Copo Açaí 300ml Montado", "Tigela Açaí 500ml Completa", "Barca de Açaí Especial"],
    avgPriceRange: "R$ 14,00 - R$ 32,00",
    activeCount: 22,
    status: "Ativo",
  },
  {
    id: "cat-bebidas",
    name: "Bebidas",
    emoji: "🥤",
    description: "Água mineral gelada, água de coco fresca na fruta, refrigerantes, sucos naturais e cervejas.",
    sampleItems: ["Água de Coco Gelada no Coco", "Água Mineral s/ Gás 500ml", "Lata Refrigerante / Suco Natural"],
    avgPriceRange: "R$ 5,00 - R$ 14,00",
    activeCount: 38,
    status: "Ativo",
  },
  {
    id: "cat-porcoes",
    name: "Porções",
    emoji: "🍤",
    description: "Frutos do mar e petiscos fritos na hora: camarão à milanesa, iscas de peixe, lula à doré e batata.",
    sampleItems: ["Porção Camarão 7 Barbas", "Isca de Peixe c/ Molho Tártaro", "Batata Frita Crocante"],
    avgPriceRange: "R$ 25,00 - R$ 85,00",
    activeCount: 28,
    status: "Ativo",
  },
  {
    id: "cat-sobremesas",
    name: "Sobremesas",
    emoji: "🍰",
    description: "Doces artesanais, salada de frutas com iogurte, churros recheados com doce de leite e tortas.",
    sampleItems: ["Churros Recheado Doce de Leite", "Salada de Frutas c/ Chantilly", "Torta Doce Caseira"],
    avgPriceRange: "R$ 7,00 - R$ 18,00",
    activeCount: 11,
    status: "Ativo",
  },
  {
    id: "cat-vestuario",
    name: "Vestuário",
    emoji: "🩳",
    description: "Moda praia e acessórios: cangas estampadas de Ubatuba, saídas de praia, biquínis, chapéus e bonés.",
    sampleItems: ["Canga Estampa Caiçara / Ubatuba", "Chapéu de Palha Praia", "Óculos de Sol c/ Proteção UV"],
    avgPriceRange: "R$ 20,00 - R$ 65,00",
    activeCount: 15,
    status: "Ativo",
  },
  {
    id: "cat-itens-praia",
    name: "Itens de Praia (Cadeiras, Mesas, Guarda-sóis)",
    emoji: "⛱️",
    description: "Aluguel diário e venda de itens de comodidade para banhistas: cadeiras de alumínio, mesas e guarda-sóis.",
    sampleItems: ["Aluguel Diária Guarda-sol Grande", "Aluguel Cadeira de Praia Alumínio", "Kit 2 Cadeiras + Mesa + Guarda-sol"],
    avgPriceRange: "R$ 15,00 - R$ 50,00",
    activeCount: 19,
    status: "Ativo",
  },
];

export default function AdminAmbulantesCardapiosPage() {
  const toast = useAdminToast();
  const [categories, setCategories] = useState<CardapioCategory[]>(DEFAULT_UBT_CATEGORIES);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<CardapioCategory | null>(null);

  // Form State
  const [formName, setFormName] = useState("");
  const [formEmoji, setFormEmoji] = useState("🍽️");
  const [formDesc, setFormDesc] = useState("");
  const [formPriceRange, setFormPriceRange] = useState("");

  const handleOpenAdd = () => {
    setEditingCat(null);
    setFormName("");
    setFormEmoji("🍽️");
    setFormDesc("");
    setFormPriceRange("R$ 10,00 - R$ 30,00");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (cat: CardapioCategory) => {
    setEditingCat(cat);
    setFormName(cat.name);
    setFormEmoji(cat.emoji);
    setFormDesc(cat.description);
    setFormPriceRange(cat.avgPriceRange);
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!formName.trim()) {
      toast.show("Preencha o nome da categoria.");
      return;
    }
    if (editingCat) {
      setCategories((prev) =>
        prev.map((c) =>
          c.id === editingCat.id
            ? { ...c, name: formName, emoji: formEmoji, description: formDesc, avgPriceRange: formPriceRange }
            : c
        )
      );
      toast.show("Categoria atualizada com sucesso!");
    } else {
      const newCat: CardapioCategory = {
        id: "cat-" + Date.now(),
        name: formName,
        emoji: formEmoji || "🍽️",
        description: formDesc,
        sampleItems: ["Item Padrão 1", "Item Padrão 2"],
        avgPriceRange: formPriceRange,
        activeCount: 0,
        status: "Ativo",
      };
      setCategories((prev) => [newCat, ...prev]);
      toast.show("Nova categoria criada no cardápio default!");
    }
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    setCategories((prev) => prev.filter((c) => c.id !== id));
    toast.show("Categoria removida do catálogo!");
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
                Definição dos 9 cardápios e categorias default homologadas para venda na praia
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition-all shadow-lg shadow-emerald-950 cursor-pointer shrink-0"
        >
          <Plus size={18} /> Adicionar Categoria
        </button>
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
          Exibindo {filtered.length} de {categories.length} categorias oficiais UBT
        </span>
      </div>

      {/* 9 Default Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((cat, idx) => (
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
                      {cat.avgPriceRange}
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
              <div className="space-y-1.5 mb-4">
                <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">
                  Exemplos Homologados:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {cat.sampleItems.map((item, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded-md bg-zinc-950 border border-zinc-800 text-[11px] text-zinc-300"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer & Actions */}
            <div className="pt-4 border-t border-zinc-800 flex items-center justify-between">
              <span className="text-xs text-zinc-400 flex items-center gap-1.5">
                <ShoppingBag size={13} className="text-emerald-400" />
                <strong className="text-zinc-200">{cat.activeCount}</strong> ambulantes ativos
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

      {/* Add / Edit Category Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-zinc-800">
              <h3 className="text-lg font-bold text-white">
                {editingCat ? "Editar Categoria de Cardápio" : "Adicionar Categoria Padrão"}
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
                  Descrição & Instruções ao Ambulante
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
                className="px-4 py-2 rounded-xl text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-all shadow-md shadow-emerald-950 cursor-pointer"
              >
                <Check size={14} /> Salvar Categoria
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
