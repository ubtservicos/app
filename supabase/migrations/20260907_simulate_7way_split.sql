-- Migration: 20260907_simulate_7way_split.sql
-- Motor de Split Financeiro UBT (7 Vias) - RPC de Simulação e Liquidação

CREATE OR REPLACE FUNCTION public.simulate_mototaxi_split_payment(
  p_tomador_id uuid DEFAULT '4db6e8a4-535f-4a77-9dba-8f3861f8b4dd'::uuid,
  p_prestador_id uuid DEFAULT '0a5edf64-7585-401f-b310-126529607da0'::uuid,
  p_total_amount numeric DEFAULT 10.00
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_config RECORD;
  v_prestador_amount numeric;
  v_ubt_amount numeric;
  v_comunidade_amount numeric;
  v_premio_trab_amount numeric;
  v_premio_cons_amount numeric;
  v_padrinho_prest_amount numeric;
  v_padrinho_tom_amount numeric;
  v_app_fee numeric;
  v_sum_partials numeric;
  
  v_ride_id uuid;
  v_tx_id text;
  v_assoc_id uuid;
  v_assoc_name text;
  v_padrinho_prest_id uuid;
  v_padrinho_tom_id uuid;
  v_tomador_name text;
  v_prestador_name text;
  
  v_nominal_ledger jsonb;
  v_statement text;
  v_result jsonb;
BEGIN
  -- 1. Obter percentuais oficiais do split_config
  SELECT * INTO v_config FROM public.split_config WHERE id = 1;
  IF NOT FOUND THEN
    v_config.prestador_pct := 90.000;
    v_config.ubt_pct := 7.500;
    v_config.comunidade_pct := 0.500;
    v_config.premio_trabalhador_pct := 0.500;
    v_config.premio_consumidor_pct := 0.500;
    v_config.padrinho_prestador_pct := 0.500;
    v_config.padrinho_tomador_pct := 0.500;
  END IF;

  -- 2. Calcular montantes em BRL com precisão de centavos
  v_prestador_amount    := ROUND(p_total_amount * (v_config.prestador_pct / 100.0), 2);
  v_ubt_amount          := ROUND(p_total_amount * (v_config.ubt_pct / 100.0), 2);
  v_comunidade_amount   := ROUND(p_total_amount * (v_config.comunidade_pct / 100.0), 2);
  v_premio_trab_amount  := ROUND(p_total_amount * (v_config.premio_trabalhador_pct / 100.0), 2);
  v_premio_cons_amount  := ROUND(p_total_amount * (v_config.premio_consumidor_pct / 100.0), 2);
  v_padrinho_prest_amount := ROUND(p_total_amount * (v_config.padrinho_prestador_pct / 100.0), 2);
  
  -- Residual Bucket no Padrinho Tomador garante soma matemática exata
  v_sum_partials := v_prestador_amount + v_ubt_amount + v_comunidade_amount + v_premio_trab_amount + v_premio_cons_amount + v_padrinho_prest_amount;
  v_padrinho_tom_amount := ROUND(p_total_amount - v_sum_partials, 2);
  v_app_fee := ROUND(p_total_amount - v_prestador_amount, 2);

  -- 3. Resgatar nomes e vinculações
  SELECT name, padrinho_id INTO v_tomador_name, v_padrinho_tom_id FROM public.profiles WHERE id = p_tomador_id;
  SELECT name, padrinho_id INTO v_prestador_name, v_padrinho_prest_id FROM public.profiles WHERE id = p_prestador_id;
  
  v_tomador_name := COALESCE(v_tomador_name, 'Felipe Santander');
  v_prestador_name := COALESCE(v_prestador_name, 'Silvina Luz');

  -- Checar associação do prestador
  SELECT association_id INTO v_assoc_id 
  FROM public.provider_associations 
  WHERE provider_id = p_prestador_id AND service_type = 'mototaxi' 
  LIMIT 1;

  IF v_assoc_id IS NOT NULL THEN
    v_assoc_name := 'Associação (' || v_assoc_id::text || ')';
  ELSE
    v_assoc_name := 'caixinha-mototaxista-sem-associação';
  END IF;

  -- 4. Gerar / Registrar Corrida
  v_tx_id := 'sim_mp_' || floor(extract(epoch from now()))::text || '_' || substr(md5(random()::text), 1, 6);
  
  INSERT INTO public.mototaxi_corridas (
    tomador_id,
    prestador_id,
    status,
    type,
    origin,
    destination,
    distance_km,
    duration_min,
    estimated_price,
    final_price,
    payment_method,
    created_at,
    accepted_at
  ) VALUES (
    p_tomador_id,
    p_prestador_id,
    'completed',
    'carona',
    '{"lat": -23.4336, "lng": -45.0838, "address": "Rua das Toninhas, 120, Praia Grande"}'::jsonb,
    '{"lat": -23.4400, "lng": -45.0750, "address": "Av. Iperoig, 200, Centro, Ubatuba"}'::jsonb,
    2.4,
    7,
    p_total_amount,
    p_total_amount,
    'pix',
    NOW(),
    NOW()
  )
  RETURNING id INTO v_ride_id;

  -- 5. Registrar Split em pagamentos_split
  INSERT INTO public.pagamentos_split (
    transaction_id,
    status,
    service_type,
    service_id,
    total_amount,
    provider_amount,
    ubt_amount,
    entity_amount,
    entity_id,
    prize_worker_amount,
    prize_consumer_amount,
    godparent_tomador_amount,
    godparent_tomador_id,
    godparent_prestador_amount,
    godparent_prestador_id,
    godparent_amount,
    godparent_id,
    refunded_amount,
    created_at,
    updated_at
  ) VALUES (
    v_tx_id,
    'approved',
    'mototaxi',
    v_ride_id,
    p_total_amount,
    v_prestador_amount,
    v_ubt_amount,
    v_comunidade_amount,
    v_assoc_id,
    v_premio_trab_amount,
    v_premio_cons_amount,
    v_padrinho_tom_amount,
    v_padrinho_tom_id,
    v_padrinho_prest_amount,
    v_padrinho_prest_id,
    v_padrinho_tom_amount + v_padrinho_prest_amount,
    v_padrinho_tom_id,
    0.00,
    NOW(),
    NOW()
  );

  -- 6. Construir Ledger Nominal JSON
  v_nominal_ledger := jsonb_build_array(
    jsonb_build_object('dest', 1, 'category', 'prestador', 'name', 'Prestador (' || v_prestador_name || ')', 'wallet', p_prestador_id, 'pct', v_config.prestador_pct, 'amount', v_prestador_amount),
    jsonb_build_object('dest', 2, 'category', 'ubt', 'name', 'Plataforma UBT (Taxa da Casa)', 'wallet', 'ubt-platform-treasury', 'pct', v_config.ubt_pct, 'amount', v_ubt_amount),
    jsonb_build_object('dest', 3, 'category', 'padrinho_prestador', 'name', 'Padrinho Prestador (' || COALESCE(v_padrinho_prest_id::text, 'ubt-fundo-reserva-prestador') || ')', 'wallet', COALESCE(v_padrinho_prest_id::text, 'ubt-fundo-reserva-prestador'), 'pct', v_config.padrinho_prestador_pct, 'amount', v_padrinho_prest_amount),
    jsonb_build_object('dest', 4, 'category', 'padrinho_tomador', 'name', 'Padrinho Tomador (' || COALESCE(v_padrinho_tom_id::text, 'ubt-fundo-reserva-tomador') || ')', 'wallet', COALESCE(v_padrinho_tom_id::text, 'ubt-fundo-reserva-tomador'), 'pct', v_config.padrinho_tomador_pct, 'amount', v_padrinho_tom_amount),
    jsonb_build_object('dest', 5, 'category', 'associacao', 'name', 'Associação (' || v_assoc_name || ')', 'wallet', COALESCE(v_assoc_id::text, 'caixinha-mototaxista-sem-associação'), 'pct', v_config.comunidade_pct, 'amount', v_comunidade_amount),
    jsonb_build_object('dest', 6, 'category', 'premio_trabalhador', 'name', 'Fundo Prêmio-Trabalhador (premio-trabalhador-2026)', 'wallet', 'premio-trabalhador-2026', 'pct', v_config.premio_trabalhador_pct, 'amount', v_premio_trab_amount),
    jsonb_build_object('dest', 7, 'category', 'premio_consumidor', 'name', 'Fundo Prêmio-Consumidor (premio-consumidor-2026)', 'wallet', 'premio-consumidor-2026', 'pct', v_config.premio_consumidor_pct, 'amount', v_premio_cons_amount)
  );

  v_statement := E'========================================================================\n' ||
                 E'💰 EXTRATO NOMINAL DE REPASSE — MOTOR DE SPLIT UBT (7 VIAS)\n' ||
                 E'Total da Corrida: R$ ' || to_char(p_total_amount, 'FM999999990.00') || E'\n' ||
                 E'------------------------------------------------------------------------\n' ||
                 E'1. Prestador (' || v_prestador_name || E'): R$ ' || to_char(v_prestador_amount, 'FM999999990.00') || E' (' || to_char(v_config.prestador_pct, 'FM990.0') || E'%)\n' ||
                 E'2. Plataforma UBT (Taxa da Casa): R$ ' || to_char(v_ubt_amount, 'FM999999990.00') || E' (' || to_char(v_config.ubt_pct, 'FM990.0') || E'%)\n' ||
                 E'3. Padrinho Prestador: R$ ' || to_char(v_padrinho_prest_amount, 'FM999999990.00') || E' (' || to_char(v_config.padrinho_prestador_pct, 'FM990.0') || E'%)\n' ||
                 E'4. Padrinho Tomador: R$ ' || to_char(v_padrinho_tom_amount, 'FM999999990.00') || E' (' || to_char(v_config.padrinho_tomador_pct, 'FM990.0') || E'%)\n' ||
                 E'5. Associação (' || v_assoc_name || E'): R$ ' || to_char(v_comunidade_amount, 'FM999999990.00') || E' (' || to_char(v_config.comunidade_pct, 'FM990.0') || E'%)\n' ||
                 E'6. Fundo Prêmio-Trabalhador (premio-trabalhador-2026): R$ ' || to_char(v_premio_trab_amount, 'FM999999990.00') || E' (' || to_char(v_config.premio_trabalhador_pct, 'FM990.0') || E'%)\n' ||
                 E'7. Fundo Prêmio-Consumidor (premio-consumidor-2026): R$ ' || to_char(v_premio_cons_amount, 'FM999999990.00') || E' (' || to_char(v_config.premio_consumidor_pct, 'FM990.0') || E'%)\n' ||
                 E'------------------------------------------------------------------------\n' ||
                 E'SOMA TOTAL DAS 7 VIAS: R$ ' || to_char(p_total_amount, 'FM999999990.00') || E' (100.0%)\n' ||
                 E'========================================================================';

  -- 7. Gravar no log de auditoria financeira
  INSERT INTO public.financial_audit_logs (
    transaction_type,
    status,
    payload,
    created_at
  ) VALUES (
    'simulation_7way_split',
    'approved',
    jsonb_build_object(
      'transaction_id', v_tx_id,
      'ride_id', v_ride_id,
      'tomador_id', p_tomador_id,
      'prestador_id', p_prestador_id,
      'total_amount', p_total_amount,
      'application_fee', v_app_fee,
      'nominal_ledger', v_nominal_ledger,
      'statement', v_statement,
      'simulated_at', NOW()
    ),
    NOW()
  );

  -- 8. Montar retorno estruturado
  v_result := jsonb_build_object(
    'success', true,
    'transaction_id', v_tx_id,
    'ride_id', v_ride_id,
    'total_amount', p_total_amount,
    'application_fee', v_app_fee,
    'splits', jsonb_build_object(
      'prestador', v_prestador_amount,
      'ubt', v_ubt_amount,
      'padrinho_prestador', v_padrinho_prest_amount,
      'padrinho_tomador', v_padrinho_tom_amount,
      'associacao', v_comunidade_amount,
      'premio_trabalhador', v_premio_trab_amount,
      'premio_consumidor', v_premio_cons_amount
    ),
    'nominal_ledger', v_nominal_ledger,
    'statement', v_statement
  );

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.simulate_mototaxi_split_payment TO anon, authenticated, service_role;
