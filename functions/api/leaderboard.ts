/// <reference types="@cloudflare/workers-types" />
import { corsHeaders } from "./_cors";
type Env = { SUPABASE_URL: string; SUPABASE_ANON_KEY: string };

type SubmissionRow = {
  name: string;
  score_ruda: number;
  score_marek: number;
  created_at: string;
};

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  // CORS preflight
  if (ctx.request.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders
    });
  }

  try {
    const url = new URL(ctx.request.url);
    const host = (url.searchParams.get("host") ?? "ruda").toLowerCase();
    const limit = Math.max(1, Math.min(100, Number(url.searchParams.get("limit") ?? "10")));
    const col = host === "marek" ? "score_marek" : "score_ruda";

    // order=<col>.desc,nullslast keeps nulls at the end if any older rows exist
    const qs = new URLSearchParams({
      select: "name,score_ruda,score_marek,created_at",
      order: `${col}.desc.nullslast`,
      limit: String(limit),
    }).toString();

    const resp = await fetch(`${ctx.env.SUPABASE_URL}/rest/v1/leaderboard_public?${qs}`, {
      headers: {
        ...corsHeaders,
        apikey: ctx.env.SUPABASE_ANON_KEY,
        Authorization: `Bearer ${ctx.env.SUPABASE_ANON_KEY}`,
      },
    });

    if (!resp.ok) {
      const text = await resp.text();
      return json(
        { error: `REST leaderboard failed: ${resp.status} ${text}` },
        500
      );
    }

    const rows = (await resp.json()) as SubmissionRow[];
    // Map to { name, score, created_at } and coerce score -> number
    const out = rows.map((r) => {
      const raw = (r as any)[col];
      const score = Number.isFinite(Number(raw)) ? Number(raw) : 0;
      return { name: r.name, score, created_at: r.created_at };
    });

    return json(out);
  } catch (e: any) {
    return json({ error: String(e?.message ?? e) }, 500);
  }
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders
  });
}
