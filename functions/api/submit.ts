/// <reference types="@cloudflare/workers-types" />
import { corsHeaders } from "./_cors";
type Env = { SUPABASE_URL: string; SUPABASE_ANON_KEY: string };
type Payload = { name: string; choices: Record<string, 0 | 1> };
type SubmitResultRow = { score_ruda: number; score_marek: number };

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  try {
    const body = (await ctx.request.json().catch(() => null)) as Payload | null;
    if (!body || typeof body.name !== "string" || typeof body.choices !== "object") {
      return new Response(JSON.stringify({ error: "Invalid payload" }), {
        status: 400, headers: { "content-type": "application/json" }
      });
    }

    const resp = await fetch(`${ctx.env.SUPABASE_URL}/rest/v1/rpc/submit_result`, {
      method: "POST",
      headers: {
        ...corsHeaders,
        "apikey": ctx.env.SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${ctx.env.SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ name_in: body.name.trim().slice(0, 32), choices: body.choices })
    });

    if (!resp.ok) {
      const text = await resp.text();
      return new Response(JSON.stringify({ error: `RPC submit_result failed: ${resp.status} ${text}` }), {
        status: 500, headers: corsHeaders
      });
    }

    const data = await resp.json(); // PostgREST will return [{"score_ruda":..,"score_marek":..}]
    const row = (Array.isArray(data) && data[0]) || { score_ruda: 0, score_marek: 0 };

    return new Response(JSON.stringify(row), { headers: corsHeaders });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      status: 500, headers: corsHeaders
    });
  }
};
