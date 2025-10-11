import { supabase } from "@/lib/supabase";
import { getAnonSessionId } from "./session";

/* ─────────────────────────────────────────────
   TYPES
────────────────────────────────────────────── */

export type PhotoPayload = {
  url?: string;
  caption?: string;
  text?: string;
  description?: string;
  draggable?: boolean;
  rotate?: number;        // optional tilt
};

export type BoardItem = {
  id: string;
  board_id: string;
  created_by: string | null;
  type: "memo" | "image";
  x: number;
  y: number;
  width?: number | null;
  height?: number | null;
  payload: PhotoPayload;
  created_at: string;
  updated_at: string;
};

/* ─────────────────────────────────────────────
   HELPERS
────────────────────────────────────────────── */

export async function getImageNaturalSize(file: File): Promise<{ w: number; h: number }> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
    });
    return { w: img.naturalWidth, h: img.naturalHeight };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/* ─────────────────────────────────────────────
   CRUD
────────────────────────────────────────────── */

export async function listItems(boardId: string): Promise<BoardItem[]> {
  const { data, error } = await supabase
    .from("board_items")
    .select("*")
    .eq("board_id", boardId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as BoardItem[];
}

export function subscribeItems(boardId: string, cb: (row: BoardItem) => void) {
  return supabase
    .channel(`board_items:${boardId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "board_items", filter: `board_id=eq.${boardId}` },
      (payload: any) => cb(payload.new as BoardItem)
    )
    .subscribe();
}

/* ─────────────────────────────────────────────
   ADD PHOTO (UNIFIED)
────────────────────────────────────────────── */

export async function addPhoto(
  boardId: string,
  opts: {
    x: number;
    y: number;
    width: number;
    height: number;
    url?: string;
    caption?: string;
    description?: string;
    text?: string;
    rotate?: number;
    draggable?: boolean;
  }
) {
  const anonSession = getAnonSessionId();

  const payload: PhotoPayload = {
    url: opts.url,
    caption: opts.caption ?? opts.text,
    description: opts.description,
    draggable: opts.draggable ?? false,
    rotate: opts.rotate,
  };

  const { data, error } = await supabase
    .from("board_items")
    .insert([
      {
        board_id: boardId,
        type: "image", // schema expects 'image'
        x: opts.x,
        y: opts.y,
        width: opts.width,
        height: opts.height,
        payload,
        created_by_session: anonSession,
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data as BoardItem;
}

/* ─────────────────────────────────────────────
   MOVE ITEM (still used by legacy)
────────────────────────────────────────────── */

export async function moveItem(id: string, x: number, y: number) {
  const clampedX = Math.max(0, Math.min(10000, x));
  const clampedY = Math.max(0, Math.min(10000, y));
  const { error } = await supabase.from("board_items").update({ x: clampedX, y: clampedY }).eq("id", id);
  if (error) throw error;
}
