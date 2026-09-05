-- Migration: 20260904_split_padrinho_split.sql
-- Refatoração do Split: Desmembramento de Padrinho Tomador e Prestador + Novos Defaults UBT (7.5%) e Fundos (0.5%)

-- 1. split_config
ALTER TABLE public.split_config
  ADD COLUMN IF NOT EXISTS padrinho_tomador_pct numeric NOT NULL DEFAULT 0.500,
  ADD COLUMN IF NOT EXISTS padrinho_prestador_pct numeric NOT NULL DEFAULT 0.500;

ALTER TABLE public.split_config
  ALTER COLUMN ubt_pct SET DEFAULT 7.500,
  ALTER COLUMN comunidade_pct SET DEFAULT 0.500,
  ALTER COLUMN premio_trabalhador_pct SET DEFAULT 0.500,
  ALTER COLUMN premio_consumidor_pct SET DEFAULT 0.500,
  ALTER COLUMN prestador_pct SET DEFAULT 90.000;

-- Update default singleton row id=1
UPDATE public.split_config
SET 
  prestador_pct = 90.000,
  ubt_pct = 7.500,
  comunidade_pct = 0.500,
  premio_trabalhador_pct = 0.500,
  premio_consumidor_pct = 0.500,
  padrinho_tomador_pct = 0.500,
  padrinho_prestador_pct = 0.500,
  updated_at = NOW()
WHERE id = 1;

-- 2. pagamentos_split
ALTER TABLE public.pagamentos_split
  ADD COLUMN IF NOT EXISTS godparent_tomador_amount numeric DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS godparent_tomador_id uuid,
  ADD COLUMN IF NOT EXISTS godparent_prestador_amount numeric DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS godparent_prestador_id uuid;

ALTER TABLE public.pagamentos_split
  ALTER COLUMN godparent_amount DROP NOT NULL,
  ALTER COLUMN godparent_id DROP NOT NULL;
