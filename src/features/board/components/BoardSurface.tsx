import React from "react";
import { usePanZoom } from "../hooks/usePanZoom";
import { useRealtimeItems } from "../hooks/useRealtimeItems";
import { BoardItemView } from "./BoardItem";
import { BoardScaleCtx } from "../hooks/useBoardScale";

export function BoardSurface({ boardId }: { boardId: string }) {
  const items = useRealtimeItems(boardId);
  const { containerRef, onWheel, onPanStart, getScale } = usePanZoom();

  return (
    <div className="w-full h-full overflow-hidden px-bg" onWheel={onWheel} onPointerDown={onPanStart}>
      <div ref={containerRef} className="absolute top-0 left-0" style={{ width: 10000, height: 10000 }}>
        <BoardScaleCtx.Provider value={getScale}>
          {items.map((it) => <BoardItemView key={it.id} item={it} />)}
        </BoardScaleCtx.Provider>
      </div>
    </div>
  );
}


