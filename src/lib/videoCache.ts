let blobUrl: string | null = null;
export async function warmupVideo(url: string): Promise<string> {
  if (blobUrl) return blobUrl;
  const res = await fetch(url, { cache: "force-cache" });
  if (!res.ok) throw new Error(`video warmup HTTP ${res.status}`);
  const b = await res.blob();
  blobUrl = URL.createObjectURL(b);
  return blobUrl;
}
export function getWarmUrl(): string | null { return blobUrl; }
export function clearWarmUrl() {
  if (blobUrl) { URL.revokeObjectURL(blobUrl); blobUrl = null; }
}
