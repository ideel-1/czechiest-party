import React from "react";
import type { BoardItem } from "../api/items";
import { polaroid } from "../styles/polaroidStyles";

export function BoardItemView({ item }: { item: BoardItem }) {
  const p = item.payload ?? {};
  const caption = p.caption ?? p.text ?? "";
  const hasImage = !!p.url;
  const rotate = Number(p.rotate ?? 0);     

  return (
    <div
      className="absolute"
      style={{
        left: item.x,
        top: item.y,
        width: item.width ?? 260,
        ...polaroid.container,
        transform: `rotate(${rotate}deg)`,
        transformOrigin: "50% 50%",
        cursor: "default",
      }}
    >
      {hasImage && (
        <div style={polaroid.squareFrame}>
          <img
            src={p.url}
            alt={caption || "photo"}
            loading="lazy"
            style={polaroid.image}   // objectFit: 'cover'
            draggable={false}
          />
        </div>
      )}
      {caption && <h2 style={polaroid.title}>{caption}</h2>}
      {p.description && <p style={polaroid.desc}>{p.description}</p>}
    </div>
  );
}
