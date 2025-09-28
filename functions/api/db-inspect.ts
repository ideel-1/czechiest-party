/// <reference types="@cloudflare/workers-types" />

async function getColumns(db: D1Database, table: string) {
    const res = await db.prepare(`PRAGMA table_info(${table});`).all();
    return (res.results ?? []).map((r: any) => r.name as string);
  }
  
  export const onRequestGet: PagesFunction<{ D1_DB: D1Database }> = async (ctx) => {
    try {
      const tables = await ctx.env.D1_DB
        .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;")
        .all();
  
      const names = (tables.results ?? []).map((r: any) => r.name as string);
      const details: Record<string, string[]> = {};
      for (const t of names) {
        try { details[t] = await getColumns(ctx.env.D1_DB, t); } catch { /* ignore */ }
      }
  
      return new Response(JSON.stringify({ tables: names, columns: details }, null, 2), {
        headers: { "content-type": "application/json" }
      });
    } catch (e: any) {
      return new Response(JSON.stringify({ error: String(e?.message ?? e) }), { status: 500 });
    }
  };
  