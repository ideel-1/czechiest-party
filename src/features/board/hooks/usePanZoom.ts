import { useCallback, useRef } from "react";

export function usePanZoom() {
  const ref = useRef<HTMLDivElement>(null);
  const state = useRef({ x: 0, y: 0, s: 1 });

  const apply = () => {
    const el = ref.current!;
    el.style.transform = `translate(${state.current.x}px, ${state.current.y}px) scale(${state.current.s})`;
    el.style.transformOrigin = "0 0";
  };

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const factor = Math.exp((-e.deltaY) * 0.001);
    state.current.s = Math.min(3, Math.max(0.2, state.current.s * factor));
    apply();
  }, []);

  const onPanStart = useCallback((e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const start = { sx: e.clientX - state.current.x, sy: e.clientY - state.current.y };
    const move = (ev: PointerEvent) => {
      state.current.x = ev.clientX - start.sx;
      state.current.y = ev.clientY - start.sy;
      apply();
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }, []);

  return { containerRef: ref, onWheel, onPanStart };
}


