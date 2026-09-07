-- Migration: 20260907_fix_approve_waitlist_leads_ambiguity.sql
-- Fix: SQL Ambiguity (Error 42702) on column reference "id" in approve_waitlist_leads RPC
-- Fix: Safe admin metadata resolution in log_admin_action RPC

-- 1. Robust log_admin_action RPC
CREATE OR REPLACE FUNCTION public.log_admin_action(
  p_admin_id uuid DEFAULT NULL,
  p_admin_nome text DEFAULT NULL,
  p_admin_email text DEFAULT NULL,
  p_acao text DEFAULT 'acao_administrativa',
  p_categoria text DEFAULT 'Sistema',
  p_modulo text DEFAULT NULL,
  p_entidade text DEFAULT NULL,
  p_registro_id text DEFAULT NULL,
  p_valor_anterior jsonb DEFAULT NULL,
  p_valor_novo jsonb DEFAULT NULL,
  p_motivo text DEFAULT NULL,
  p_ip text DEFAULT NULL,
  p_user_agent text DEFAULT NULL,
  p_session_id text DEFAULT NULL,
  p_resultado text DEFAULT 'sucesso',
  p_criticidade text DEFAULT 'INFO',
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_log_id uuid;
  v_real_admin_id uuid := COALESCE(p_admin_id, auth.uid());
  v_admin_nome text := p_admin_nome;
  v_admin_email text := p_admin_email;
BEGIN
  IF (v_admin_nome IS NULL OR v_admin_email IS NULL) AND v_real_admin_id IS NOT NULL THEN
    SELECT u.nome INTO v_admin_nome
      FROM public.usuarios u
     WHERE u.id = v_real_admin_id;
    
    v_admin_email := COALESCE(v_admin_email, auth.jwt() ->> 'email', 'admin@ubtsuperapp.com.br');
  END IF;

  INSERT INTO public.admin_audit_logs (
    admin_id, admin_nome, admin_email, acao, categoria, modulo, entidade,
    registro_id, valor_anterior, valor_novo, motivo, ip, user_agent,
    session_id, resultado, criticidade, metadata
  ) VALUES (
    v_real_admin_id,
    COALESCE(v_admin_nome, 'Operador Admin'),
    COALESCE(v_admin_email, 'admin@ubtsuperapp.com.br'),
    p_acao, p_categoria, p_modulo, p_entidade, p_registro_id,
    p_valor_anterior, p_valor_novo, p_motivo, p_ip, p_user_agent,
    p_session_id, p_resultado, p_criticidade, p_metadata
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_admin_action TO authenticated, service_role, anon;

-- 2. Ambiguity-free approve_waitlist_leads RPC
CREATE OR REPLACE FUNCTION public.approve_waitlist_leads(
  p_lead_ids uuid[],
  p_admin_id uuid DEFAULT NULL,
  p_motivo text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  nome text,
  email text,
  telefone text,
  onboarding_url text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_lead_id uuid;
  v_real_admin_id uuid := COALESCE(p_admin_id, auth.uid());
  v_lead_record RECORD;
  v_onboarding_url text;
BEGIN
  -- Verify requester is admin or superadmin with qualified table aliases
  IF NOT EXISTS (
    SELECT 1 FROM public.usuarios u
    WHERE u.id = v_real_admin_id AND u.role IN ('super_admin', 'admin')
  ) AND COALESCE(auth.jwt() ->> 'email', '') != 'ubt.servicos@gmail.com' THEN
    RAISE EXCEPTION 'Acesso negado: Apenas administradores podem aprovar a waitlist.';
  END IF;

  -- Create temporary table with distinct column names to prevent any variable/column collisions
  CREATE TEMP TABLE temp_approved_leads (
    res_id uuid,
    res_nome text,
    res_email text,
    res_telefone text,
    res_onboarding_url text
  ) ON COMMIT DROP;

  -- Iterate through lead IDs
  FOREACH v_lead_id IN ARRAY p_lead_ids
  LOOP
    -- 1. Fetch lead info with explicit alias qualification
    SELECT w.* INTO v_lead_record 
    FROM public.waitlist w 
    WHERE w.id = v_lead_id;
    
    IF FOUND AND v_lead_record.status != 'approved' AND v_lead_record.status != 'WAITLIST_APPROVED' THEN
      
      -- 2. Update status in waitlist table with explicit alias qualification
      UPDATE public.waitlist w
      SET status = 'approved'
      WHERE w.id = v_lead_id;

      -- 3. Define token-based onboarding URL
      v_onboarding_url := 'https://ubtsuperapp.com.br/onboarding?token=' || v_lead_id::text;

      -- 4. Upsert user_onboarding row
      INSERT INTO public.user_onboarding (waitlist_id, status, approved_by, approved_at, onboarding_url)
      VALUES (v_lead_id, 'WAITLIST_APPROVED', v_real_admin_id, NOW(), v_onboarding_url)
      ON CONFLICT (waitlist_id) DO UPDATE
      SET status = 'WAITLIST_APPROVED',
          approved_by = v_real_admin_id,
          approved_at = NOW(),
          onboarding_url = v_onboarding_url;

      -- 5. Insert into temp table for return
      INSERT INTO temp_approved_leads (res_id, res_nome, res_email, res_telefone, res_onboarding_url)
      VALUES (v_lead_record.id, v_lead_record.nome, v_lead_record.email, v_lead_record.telefone, v_onboarding_url);

      -- 6. Log admin audit event
      PERFORM log_admin_action(
        p_admin_id => v_real_admin_id,
        p_acao => 'waitlist_lead_approved',
        p_categoria => 'Waitlist',
        p_modulo => 'Onboarding Manager',
        p_entidade => 'waitlist',
        p_registro_id => v_lead_id::text,
        p_valor_anterior => jsonb_build_object('status', v_lead_record.status),
        p_valor_novo => jsonb_build_object('status', 'approved', 'onboarding_url', v_onboarding_url),
        p_motivo => p_motivo,
        p_criticidade => 'MEDIA',
        p_metadata => jsonb_build_object('nome', v_lead_record.nome, 'email', v_lead_record.email)
      );

    END IF;
  END LOOP;

  -- Return qualified result set matching output table schema
  RETURN QUERY 
  SELECT t.res_id, t.res_nome, t.res_email, t.res_telefone, t.res_onboarding_url 
  FROM temp_approved_leads t;
END;
$$;

-- Grant execution permissions to authenticated and service_role
GRANT EXECUTE ON FUNCTION public.approve_waitlist_leads(uuid[], uuid, text) TO authenticated, service_role;

-- Reload postgrest schema cache
NOTIFY pgrst, 'reload schema';
