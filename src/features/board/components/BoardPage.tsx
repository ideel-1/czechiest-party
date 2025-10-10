import React from "react";
import "../styles/pixel.css";
import { BoardSurface } from "./BoardSurface";
import { BoardToolbar } from "./BoardToolbar";
import { AuditPanel } from "./AuditPanel";

const BOARD_ID = (import.meta as any).env?.VITE_DEFAULT_BOARD_ID as string;

export function BoardPage() {
  if (!BOARD_ID) {
    return (
      <div className="w-screen h-screen flex items-center justify-center">
        <div className="px-card" style={{ padding: 16 }}>
          <div className="font-bold mb-2">Board not configured</div>
          <div className="text-sm">Set VITE_DEFAULT_BOARD_ID in your env and reload.</div>
        </div>
      </div>
    );
  }
  return (
    <div className="w-screen h-screen grid" style={{ gridTemplateColumns: "1fr 340px" }}>
      <div className="relative">
        <BoardToolbar boardId={BOARD_ID} />
        <BoardSurface boardId={BOARD_ID} />
      </div>
      <AuditPanel boardId={BOARD_ID} />
    </div>
  );
}


