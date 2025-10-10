import { supabase } from "../../../lib/supabase";

export type BoardEvent = {
  id: number;
  board_id: string;
  item_id: string;
  actor: string;
  event_type: "item_created"|"item_moved"|"item_updated";
  snapshot: any;
  occurred_at: string;
};

export async function listEvents(boardId: string, limit=50) {
  const { data, error } = await supabase
    .from("board_events")
    .select("*")
    .eq("board_id", boardId)
    .order("occurred_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as BoardEvent[];
}


