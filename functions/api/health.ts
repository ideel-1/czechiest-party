/// <reference types="@cloudflare/workers-types" />
export const onRequestGet: PagesFunction = async () => {
    return new Response(JSON.stringify({ ok: true, ts: new Date().toISOString() }), {
      headers: { "content-type": "application/json" }
    });
  };
  