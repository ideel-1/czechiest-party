import { useEffect, useState } from "react";
import type { BoardEvent } from "../api/events";
import { listEvents } from "../api/events";

export function AuditPanel({ boardId }: { boardId: string }) {
  const [events, setEvents] = useState<BoardEvent[]>([]);

  useEffect(() => {
    (async () => setEvents(await listEvents(boardId)))();
  }, [boardId]);

  return (
    <aside className="h-full overflow-auto border-l border-black/20 bg-white">
      <div className="p-3 font-bold">Activity</div>
      <ul className="px-3 pb-6 space-y-2">
        {events.map(ev => (
          <li key={ev.id} className="px-card" style={{ padding: 8 }}>
            <div className="text-xs opacity-70">{new Date(ev.occurred_at).toLocaleString()}</div>
            <div className="text-sm">{ev.event_type}</div>
            <div className="text-xs">
              {`item ${ev.item_id.slice(0,8)}… @ (${ev.snapshot?.x ?? "?"}, ${ev.snapshot?.y ?? "?"})`}
            </div>
          </li>
        ))}
      </ul>
    </aside>
  );
}


