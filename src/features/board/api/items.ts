import { supabase } from "@/lib/supabase";
import { getAnonSessionId } from "./session";

export type BoardItem = {
  id: string;
  board_id: string;
  created_by: string;
  type: "memo" | "image";
  x: number; y: number;
  width?: number | null;
  height?: number | null;
  payload: { text?: string; url?: string };
  created_at: string;
  updated_at: string;
};

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
    .on("postgres_changes", {
      event: "*", schema: "public", table: "board_items",
      filter: `board_id=eq.${boardId}`
    }, (payload: any) => cb(payload.new as BoardItem))
    .subscribe();
}

export async function addMemo(boardId: string, text: string, x = 100, y = 100) {
  const anonSession = getAnonSessionId();
  const { data, error } = await supabase.from("board_items")
    .insert([{ board_id: boardId, type: "memo", x, y, payload: { text }, created_by_session: anonSession }])
    .select().single();
  if (error) throw error;
  return data as BoardItem;
}

export async function addImage(boardId: string, url: string, x=120, y=120, width?: number) {
  const anonSession = getAnonSessionId();
  const { data, error } = await supabase.from("board_items")
    .insert([{ board_id: boardId, type: "image", x, y, width, payload: { url }, created_by_session: anonSession }])
    .select().single();
  if (error) throw error;
  return data as BoardItem;
}

export async function moveItem(id: string, x: number, y: number) {
  const clampedX = Math.max(0, Math.min(10000, x));
  const clampedY = Math.max(0, Math.min(10000, y));
  const { error } = await supabase.from("board_items").update({ x: clampedX, y: clampedY }).eq("id", id);
  if (error) throw error;
}


