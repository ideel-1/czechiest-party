import React, { useEffect } from "react";
import type { BoardItem } from "../api/items";
import { useDraggable } from "../hooks/useDraggable";
import { useBoardScale } from "../hooks/useBoardScale"; // tiny helper below

export function BoardItemView({ item }: { item: BoardItem }) {
  const getScale = useBoardScale(); // returns () => current scale
  const { ref, onPointerDown, setPosition } = useDraggable(
    item.id,
    { x: item.x, y: item.y },
    { getScale }
  );

  // If another client moves the item, reflect it locally
  useEffect(() => { setPosition(item.x, item.y); }, [item.x, item.y]);

  if (item.type === "memo") {
    return (
      <div
        ref={ref as any}
        onPointerDown={onPointerDown}
        className="absolute px-postit"
        style={{ left: item.x, top: item.y, width: item.width ?? 240 }}
      >
        <div style={{ padding: 10, fontWeight: 700 }}>{item.payload.text}</div>
      </div>
    );
  }

  if (item.type === "image") {
    const w = item.width ?? 260;
    return (
      <div
        ref={ref as any}
        onPointerDown={onPointerDown}
        className="absolute px-photo"
        style={{ left: item.x, top: item.y, width: w }}
      >
        <img src={item.payload.url} loading="lazy" style={{ display: "block", width: "100%", height: "auto" }} />
        {/* optional handle square for the pixel aesthetic */}
        {/* <div className="px-handle" style={{ position:'absolute', left:-6, top:-6 }} /> */}
      </div>
    );
  }

  return null;
}
