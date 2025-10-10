// src/features/board/hooks/useDraggable.ts
import { useCallback, useLayoutEffect, useRef } from "react";
import throttle from "lodash.throttle";
import { moveItem } from "../api/items";

type Options = { getScale?: () => number; onLocalMove?: (x: number, y: number) => void };

export function useDraggable(itemId: string, start: { x: number; y: number }, opts: Options = {}) {
  const getScale = opts.getScale ?? (() => 1);

  const targetRef = useRef<HTMLElement | null>(null);
  const pos = useRef({ x: start.x, y: start.y });
  const startPos = useRef({ x: 0, y: 0 });
  const startClient = useRef({ x: 0, y: 0 });
  const dragging = useRef(false);

  useLayoutEffect(() => {
    if (!targetRef.current) return;
    const el = targetRef.current;
    el.style.position = "absolute";
    el.style.left = `${pos.current.x}px`;
    el.style.top = `${pos.current.y}px`;
    el.style.touchAction = "none"; // avoid browser gestures
  }, []);

  const applyLocal = (x: number, y: number) => {
    const el = targetRef.current!;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    opts.onLocalMove?.(x, y);
  };

  const send = useRef(
    throttle((x: number, y: number) => { moveItem(itemId, x, y).catch(() => {}); }, 140)
  );

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLElement>) => {
    e.stopPropagation(); // prevents background pan
    const el = e.currentTarget as HTMLElement;
    targetRef.current = el;
    dragging.current = true;
    el.setPointerCapture(e.pointerId);

    startPos.current = { ...pos.current };
    startClient.current = { x: e.clientX, y: e.clientY };

    const prevSelect = document.body.style.userSelect;
    document.body.style.userSelect = "none";

    const move = (ev: PointerEvent) => {
      if (!dragging.current || !targetRef.current) return;
      const s = getScale() || 1;
      const dx = (ev.clientX - startClient.current.x) / s;
      const dy = (ev.clientY - startClient.current.y) / s;
      const nx = startPos.current.x + dx;
      const ny = startPos.current.y + dy;
      pos.current = { x: nx, y: ny };
      applyLocal(nx, ny);
      send.current(nx, ny);
    };

    const up = () => {
      dragging.current = false;
      try { el.releasePointerCapture(e.pointerId); } catch {}
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      document.body.style.userSelect = prevSelect;
      moveItem(itemId, pos.current.x, pos.current.y).catch(() => {});
    };

    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerup", up, { passive: true });
  }, [itemId, getScale]);

  return { ref: targetRef, onPointerDown, setPosition: (x: number, y: number) => applyLocal(x, y) };
}
