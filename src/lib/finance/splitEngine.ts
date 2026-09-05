/**
 * UBT Finance — Split Engine (Pure Business Logic)
 *
 * This module is intentionally framework-agnostic (no Deno, no fetch, no Supabase).
 * It is the source of truth for all split calculations and can be imported
 * by both the Vitest test suite and the Deno Edge Function (payment-gateway).
 *
 * Rules sourced from public.split_config (id = 1).
 */

// ============================================================
// TYPES
// ============================================================

export interface SplitConfig {
  prestador_pct:          number; // e.g. 90.000
  ubt_pct:                number; // e.g.  7.500
  comunidade_pct:         number; // e.g.  0.500
  premio_trabalhador_pct: number; // e.g.  0.500
  premio_consumidor_pct:  number; // e.g.  0.500
  padrinho_tomador_pct:   number; // e.g.  0.500
  padrinho_prestador_pct: number; // e.g.  0.500
  padrinho_pct?:          number; // deprecated backwards-compat
}

export interface SplitAmounts {
  total_amount:              number;
  prestador_amount:          number; // Goes to the service provider (90%)
  ubt_amount:                number; // UBT platform cut (7.5%)
  comunidade_amount:         number; // Community social fund (0.5%)
  premio_trabalhador:        number; // Worker lottery pool (0.5%)
  premio_consumidor:         number; // Consumer loyalty pool (0.5%)
  padrinho_tomador_amount:   number; // Godparent tomador referral (0.5% - residual bucket)
  padrinho_prestador_amount: number; // Godparent prestador referral (0.5%)
  padrinho_amount?:          number; // Deprecated alias (= tomador + prestador)
  application_fee:           number; // Sum of all platform cuts (sent to Mercado Pago)
}

// ============================================================
// REGULATORY DEFAULTS (official PO rule — mirrors DB seed)
// Used as fallback when split_config cannot be read from the DB.
// ============================================================
export const REGULATORY_DEFAULTS: SplitConfig = {
  prestador_pct:          90.000,
  ubt_pct:                 7.500,
  comunidade_pct:          0.500,
  premio_trabalhador_pct:  0.500,
  premio_consumidor_pct:   0.500,
  padrinho_tomador_pct:    0.500,
  padrinho_prestador_pct:  0.500,
};

// ============================================================
// SPLIT CALCULATOR
//
// Design:
//  - Rounds each bucket to 2 decimal places (BRL cent precision).
//  - The `padrinho_tomador_amount` is calculated as a residual subtraction
//    to guarantee: Σ(all buckets) === total_amount, exactly.
//    This eliminates any floating-point drift from sequential rounding.
//  - application_fee = total_amount - prestador_amount
//    (the amount the marketplace withholds, sent to Mercado Pago)
// ============================================================
export function calculateSplitAmounts(
  totalAmount: number,
  config: SplitConfig = REGULATORY_DEFAULTS
): SplitAmounts {
  if (totalAmount <= 0) {
    throw new RangeError(`calculateSplitAmounts: totalAmount must be > 0, got ${totalAmount}`);
  }

  const r = (v: number): number => Math.round(v * 100) / 100;

  const prestador_pct = config.prestador_pct ?? 90.0;
  const ubt_pct = config.ubt_pct ?? 7.5;
  const comunidade_pct = config.comunidade_pct ?? 0.5;
  const premio_trabalhador_pct = config.premio_trabalhador_pct ?? 0.5;
  const premio_consumidor_pct = config.premio_consumidor_pct ?? 0.5;
  const padrinho_tomador_pct = config.padrinho_tomador_pct ?? (config.padrinho_pct ? config.padrinho_pct / 2 : 0.5);
  const padrinho_prestador_pct = config.padrinho_prestador_pct ?? (config.padrinho_pct ? config.padrinho_pct / 2 : 0.5);

  const prestador_amount          = r(totalAmount * (prestador_pct          / 100));
  const ubt_amount                = r(totalAmount * (ubt_pct                / 100));
  const comunidade_amount         = r(totalAmount * (comunidade_pct         / 100));
  const premio_trabalhador        = r(totalAmount * (premio_trabalhador_pct / 100));
  const premio_consumidor         = r(totalAmount * (premio_consumidor_pct  / 100));
  const padrinho_prestador_amount = r(totalAmount * (padrinho_prestador_pct / 100));

  // Residual bucket: absorbs all floating-point drift
  const sumBeforeResidual = r(
    prestador_amount + ubt_amount + comunidade_amount + premio_trabalhador + premio_consumidor + padrinho_prestador_amount
  );
  const padrinho_tomador_amount = r(Math.max(0, totalAmount - sumBeforeResidual));

  // application_fee sent to Mercado Pago = everything except the prestador's share
  const application_fee = r(totalAmount - prestador_amount);

  return {
    total_amount:              totalAmount,
    prestador_amount,
    ubt_amount,
    comunidade_amount,
    premio_trabalhador,
    premio_consumidor,
    padrinho_tomador_amount,
    padrinho_prestador_amount,
    padrinho_amount:           r(padrinho_tomador_amount + padrinho_prestador_amount),
    application_fee,
  };
}

// ============================================================
// VALIDATION HELPERS (used by Edge Function input validation)
// ============================================================

export function validateSplitConfig(config: SplitConfig): { valid: boolean; error?: string } {
  const sum =
    config.prestador_pct +
    config.ubt_pct +
    config.comunidade_pct +
    config.premio_trabalhador_pct +
    config.premio_consumidor_pct +
    (config.padrinho_tomador_pct ?? 0) +
    (config.padrinho_prestador_pct ?? 0);

  // Floating-point equality with epsilon tolerance
  if (Math.abs(sum - 100.0) > 0.001) {
    return {
      valid: false,
      error: `Split percentages must sum to 100.000%, got ${sum.toFixed(3)}%`,
    };
  }

  const values = Object.values(config).filter(v => typeof v === 'number');
  if (values.some((v) => v < 0 || v > 100)) {
    return {
      valid: false,
      error: "All split percentages must be between 0.000 and 100.000%",
    };
  }

  return { valid: true };
}
