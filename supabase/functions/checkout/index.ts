import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS, PUT, DELETE",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, Authorization, Content-Type, Accept",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const supabaseAdmin = (supabaseUrl && supabaseServiceRoleKey)
  ? createClient(supabaseUrl, supabaseServiceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })
  : null;

function calcSplit(total: number) {
  const prestador = Math.round(total * 0.90 * 100) / 100;
  const ubt = Math.round(total * 0.04 * 100) / 100;
  const premios = Math.round(total * 0.03 * 100) / 100;
  const comunidade = Math.round(total * 0.02 * 100) / 100;
  const padrinho = Math.max(0, Math.round((total - prestador - ubt - premios - comunidade) * 100) / 100);

  return {
    prestador,
    ubt,
    premios,
    comunidade,
    padrinho,
    premio_trabalhador: Math.round((premios / 2) * 100) / 100,
    premio_consumidor: Math.round((premios / 2) * 100) / 100,
  };
}

serve(async (req: Request): Promise<Response> => {
  // 1. Intercept OPTIONS preflight immediately
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const {
      service_type = "mototaxi",
      service_id,
      customer_id,
      provider_id,
      amount = 10.0,
      payment_method = "pix",
      metadata = {},
    } = body;

    const numAmount = Number(amount) || 10.0;
    const split = calcSplit(numAmount);
    const transactionId = metadata?.external_reference || `chk_${service_id || crypto.randomUUID()}`;

    // If Supabase client is available, persist financial records
    if (supabaseAdmin && service_id) {
      // 1. Insert/Upsert into pagamentos_split
      try {
        await supabaseAdmin.from("pagamentos_split").upsert(
          {
            transaction_id: transactionId,
            status: "approved",
            service_type,
            service_id,
            total_amount: numAmount,
            provider_amount: split.prestador,
            ubt_amount: split.ubt,
            entity_amount: split.comunidade,
            prize_worker_amount: split.premio_trabalhador,
            prize_consumer_amount: split.premio_consumidor,
            godparent_amount: split.padrinho,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "transaction_id" }
        );
      } catch (e) {
        console.error("[checkout] Error writing pagamentos_split:", e);
      }

      // 2. Insert into payments table
      try {
        await supabaseAdmin.from("payments").insert({
          service_type,
          service_id,
          customer_id: customer_id || null,
          provider_id: provider_id || null,
          gateway: "mercadopago",
          gateway_payment_id: transactionId,
          amount: numAmount,
          currency: "BRL",
          payment_method: payment_method.toUpperCase(),
          status: "approved",
          metadata: { ...metadata, split },
          created_at: new Date().toISOString(),
        });
      } catch (e) {
        console.error("[checkout] Error writing payments:", e);
      }

      // 3. Update mototaxi_corridas status if applicable
      if (service_type === "mototaxi") {
        try {
          await supabaseAdmin
            .from("mototaxi_corridas")
            .update({
              status: "completed",
              final_price: numAmount,
              updated_at: new Date().toISOString(),
            })
            .eq("id", service_id);
        } catch (e) {
          console.error("[checkout] Error updating mototaxi_corridas:", e);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Checkout intent processed and approved successfully",
        transaction_id: transactionId,
        amount: numAmount,
        split,
        data: body,
        qr_code: "00020101021243650016COM.MERCADOLIBRE02013063638f1192a-5fd1-4180-a180-8bcae3556bc35204000053039865802BR5925PAGAMENTO MOCK PIX SANDBOX6009SAO PAULO62070503***6304A1B2",
        qr_code_base64: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message || "Internal server error in checkout function" }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
