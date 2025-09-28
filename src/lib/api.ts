// src/lib/api.ts
const API_BASE = (import.meta as any).env?.VITE_API_BASE ?? "/api";
const SB_URL  = (import.meta as any).env?.VITE_SUPABASE_URL;
const SB_ANON = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;

async function expectJson(r: Response) {
  const ct = r.headers.get('content-type') || '';
  if (!ct.includes('application/json')) {
    const text = await r.text();
    throw new Error(`Expected JSON from ${r.url}, got ${r.status} ${ct}: ${text.slice(0,200)}`);
  }
  return r.json();
}

export type Beer = {
  id: string;
  label: string;
  image_path: string;
  description: string | null; // <- required in the type
};

export async function getBeers(limit = 20): Promise<Beer[]> {
  // Dev path: fetch directly from Supabase RPC
  if (SB_URL && SB_ANON) {
    const r = await fetch(`${SB_URL}/rest/v1/rpc/get_beers_with_score`, {
      method: "POST",
      headers: { apikey: SB_ANON, Authorization: `Bearer ${SB_ANON}`, "content-type": "application/json" },
      body: JSON.stringify({ p_host: "ruda", p_limit: limit }),
    });
    const data = await expectJson(r);
    return (Array.isArray(data) ? data : []).map((b: any) => ({
      id: String(b?.id ?? ""),
      label: String(b?.label ?? ""),
      image_path: String(b?.image_path ?? ""),
      description: b?.description ?? null, // <- ensure present
    })) as Beer[];
  }

  // Default: go through your worker
  const r = await fetch(`${API_BASE}/beers?limit=${limit}`);
  const data = await expectJson(r);
  return (Array.isArray(data) ? data : []) as Beer[];
}

export async function submitResult(payload: { name: string; choices: Record<string, 0 | 1> }) {
  if (SB_URL && SB_ANON) {
    const r = await fetch(`${SB_URL}/rest/v1/rpc/submit_result`, {
      method: "POST",
      headers: { "apikey": SB_ANON, "Authorization": `Bearer ${SB_ANON}`, "content-type": "application/json" },
      body: JSON.stringify({ name_in: payload.name, choices: payload.choices })
    });
    if (!r.ok) throw new Error(`RPC submit_result failed: HTTP ${r.status} ${await r.text()}`);
    const arr = await expectJson(r);
    return ((Array.isArray(arr) && arr[0]) || { score_ruda: 0, score_marek: 0 }) as { score_ruda: number; score_marek: number };
  }
  const r = await fetch(`${API_BASE}/submit`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!r.ok) throw new Error(`Submit failed: HTTP ${r.status} ${await r.text()}`);
  return expectJson(r) as Promise<{ score_ruda: number; score_marek: number }>;
}

export async function getLeaderboard(host: "ruda" | "marek", limit = 10) {
  if (SB_URL && SB_ANON) {
    const col = host === "marek" ? "score_marek" : "score_ruda";

    // ✅ PostgREST syntax: <col>.<dir>.<nulls>
    const order = `${col}.desc.nullslast`;

    const qs = new URLSearchParams({
      select: "name,score_ruda,score_marek,created_at",
      order,
      limit: String(limit),
    }).toString();

    const url = `${SB_URL}/rest/v1/leaderboard_public?${qs}`;
    const r = await fetch(url, {
      headers: {
        apikey: SB_ANON,
        Authorization: `Bearer ${SB_ANON}`,
        // Optional (useful during dev for clearer errors):
        // "Accept-Profile": "public",
      },
    });

    if (!r.ok) {
      // Helpful during dev to see PostgREST's error description:
      const errText = await r.text();
      throw new Error(`HTTP ${r.status} for ${url}\n${errText}`);
    }

    const data = await r.json();
    // Normalize to { name, score, created_at }
    return (Array.isArray(data) ? data : []).map((row: any) => {
      const raw = host === "marek" ? row?.score_marek : row?.score_ruda;
      const score = Number.isFinite(Number(raw)) ? Number(raw) : 0;
      return {
        name: String(row?.name ?? ""),
        score,
        created_at: String(row?.created_at ?? ""),
      };
    }) as { name: string; score: number; created_at: string }[];
  }

  // Fallback: use your worker (when Wrangler/Pages functions are running)
  const r = await fetch(`${API_BASE}/leaderboard?host=${host}&limit=${limit}`);
  if (!r.ok) {
    const errText = await r.text();
    throw new Error(`HTTP ${r.status} for ${r.url}\n${errText}`);
  }
  const out = await r.json();

  // Ensure {score} exists even if worker returns raw fields (defensive)
  return (Array.isArray(out) ? out : []).map((row: any) => {
    if (typeof row?.score === "number") return row;
    const raw = host === "marek" ? row?.score_marek : row?.score_ruda;
    const score = Number.isFinite(Number(raw)) ? Number(raw) : 0;
    return { name: row?.name ?? "", score, created_at: row?.created_at ?? "" };
  }) as { name: string; score: number; created_at: string }[];
}




