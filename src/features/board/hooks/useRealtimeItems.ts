import { useEffect, useState } from "react";
import type { BoardItem } from "../api/items";
import { listItems, subscribeItems } from "../api/items";

export function useRealtimeItems(boardId: string) {
  const [items, setItems] = useState<BoardItem[]>([]);

  useEffect(() => {
    let unsub: any;
    let mounted = true;

    (async () => {
      const initial = await listItems(boardId);
      if (!mounted) return;
      setItems(initial);
      unsub = subscribeItems(boardId, (row) => {
        setItems((prev) => {
          const i = prev.findIndex(p => p.id === row.id);
          if (i === -1) return [...prev, row];
          const copy = prev.slice();
          copy[i] = row;
          return copy;
        });
      });
    })();

    return () => { mounted = false; unsub?.unsubscribe?.(); };
  }, [boardId]);

  return items;
}


