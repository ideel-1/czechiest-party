/// <reference types="@cloudflare/workers-types" />
type Env = { SUPABASE_URL: string; SUPABASE_ANON_KEY: string };

const corsHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization,content-type,apikey,x-client-info",
  "access-control-allow-methods": "GET,POST,OPTIONS",
  "content-type": "application/json",
};

export const onRequestOptions: PagesFunction<Env> = async () =>
  new Response(null, { headers: corsHeaders });

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  try {
    const url = new URL(ctx.request.url);
    const limit = Math.max(1, Math.min(40, Number(url.searchParams.get("limit") ?? "20")));
    const host = (url.searchParams.get("host") ?? "ruda").toLowerCase();

    const resp = await fetch(`${ctx.env.SUPABASE_URL}/rest/v1/rpc/get_beers_with_score`, {
      method: "POST",
      headers: {
        apikey: ctx.env.SUPABASE_ANON_KEY,
        Authorization: `Bearer ${ctx.env.SUPABASE_ANON_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ p_host: host, p_limit: limit }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      return new Response(JSON.stringify({ error: `get_beers_with_score failed: ${resp.status} ${text}` }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    const data = await resp.json();
    const items = (Array.isArray(data) ? data : []).map((b: any) => ({
      id: String(b?.id ?? ""),
      label: String(b?.label ?? ""),
      image_path: String(b?.image_path ?? ""),
      description: b?.description ?? null,   // <- normalized
    }));

    return new Response(JSON.stringify(items), { headers: corsHeaders });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      status: 500,
      headers: corsHeaders,
    });
  }
};
