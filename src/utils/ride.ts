import { calculateSplitAmounts } from "@/lib/finance/splitEngine";

export const calcPrice = (distanceKm: number): number => {
  const BASE_FIXED = 4.0;
  const BASE_RATE = 2.5;
  return Math.round((BASE_FIXED + BASE_RATE * distanceKm) * 100) / 100;
};

export const calcSplit = (total: number) => {
  if (total <= 0) {
    return {
      prestador: 0,
      ubt: 0,
      padrinhoPrestador: 0,
      padrinhoTomador: 0,
      associacao: 0,
      premioTrabalhador: 0,
      premioConsumidor: 0,
      comunidade: 0,
      padrinho: 0,
    };
  }
  const split = calculateSplitAmounts(total);
  return {
    prestador: split.prestador_amount,
    ubt: split.ubt_amount,
    padrinhoPrestador: split.padrinho_prestador_amount,
    padrinhoTomador: split.padrinho_tomador_amount,
    associacao: split.comunidade_amount,
    premioTrabalhador: split.premio_trabalhador,
    premioConsumidor: split.premio_consumidor,
    // Backwards compatibility aliases
    comunidade: split.comunidade_amount,
    padrinho: split.padrinho_amount || +(split.padrinho_prestador_amount + split.padrinho_tomador_amount).toFixed(2),
  };
};

export type SplitKey =
  | "prestador"
  | "ubt"
  | "padrinhoPrestador"
  | "padrinhoTomador"
  | "associacao"
  | "premioTrabalhador"
  | "premioConsumidor";

export const SPLIT_META: Array<{
  key: SplitKey;
  label: string;
  icon: "User" | "Building2" | "Users" | "Gift" | "Star" | "Heart";
  color: string;
}> = [
  { key: "prestador", label: "Prestador (90%)", icon: "User", color: "#0DB87E" },
  { key: "ubt", label: "UBT Plataforma (7,5%)", icon: "Building2", color: "#F5A623" },
  { key: "padrinhoPrestador", label: "Padrinho Prestador (0,5%)", icon: "Heart", color: "#0DB87E" },
  { key: "padrinhoTomador", label: "Padrinho Tomador (0,5%)", icon: "Heart", color: "#10B981" },
  { key: "associacao", label: "Associação (0,5%)", icon: "Users", color: "#2B6EE8" },
  { key: "premioTrabalhador", label: "Prêmio Trabalhador (0,5%)", icon: "Gift", color: "#9B59B6" },
  { key: "premioConsumidor", label: "Prêmio Consumidor (0,5%)", icon: "Star", color: "#E84040" },
];

export const formatBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
