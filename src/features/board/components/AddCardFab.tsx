import _React, { useState } from "react";
import { MobileComposer } from "./MobileComposer";

export function AddCardFab({ boardId }: { boardId: string }) {
  const [open, setOpen] = useState(false);

  // pixel-cut corners, same as your beer/polaroid cards
  const clipPath = `
    polygon(
      8px 0%, calc(100% - 8px) 0%, calc(100% - 8px) 4px,
      calc(100% - 4px) 4px, calc(100% - 4px) 8px, 100% 8px,
      100% calc(100% - 8px), calc(100% - 4px) calc(100% - 8px),
      calc(100% - 4px) calc(100% - 4px), calc(100% - 8px) calc(100% - 4px),
      calc(100% - 8px) calc(100% - 8px), calc(100% - 8px) 100%,
      8px 100%, 8px calc(100% - 8px), 4px calc(100% - 8px),
      4px calc(100% - 4px), 8px calc(100% - 4px), 8px calc(100% - 8px),
      0% calc(100% - 8px), 0% 8px, 4px 8px, 4px 4px, 8px 4px, 8px 8px
    )
  `;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Add new card"
        style={{
          position: "fixed",
          bottom: 20,
          right: 20,
          zIndex: 62,
          width: 64,
          height: 64,
          background: "#000",
          color: "#fff",
          fontWeight: 900,
          fontSize: 42,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          clipPath,
          cursor: "pointer",
          userSelect: "none",
          transition: "transform 0.15s ease",
        }}
        onMouseDown={(e) => (e.currentTarget.style.transform = "translate(2px,2px)")}
        onMouseUp={(e) => (e.currentTarget.style.transform = "translate(0,0)")}
        onTouchStart={(e) => (e.currentTarget.style.transform = "translate(2px,2px)")}
        onTouchEnd={(e) => (e.currentTarget.style.transform = "translate(0,0)")}
      >
        +
      </button>

      <MobileComposer
        boardId={boardId}
        isOpen={open}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
