import React, {
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
} from "react";
import type { ReactNode } from "react";

/* ---------------- Types ---------------- */

export type SwipeCardHandle = {
  animateOut: (dx: number, ms?: number, easing?: string) => Promise<void>;
  animateInFrom: (dx: number, ms?: number, easing?: string) => Promise<void>;
  reset: () => void;
};

type Props = {
  onSwipe: (dir: "left" | "right") => void;
  children: ReactNode;
  thresholdPx?: number; // px or 0..1 fraction of viewport width
  onDragProgress?: (p: number) => void; // 0..1: how “promoted” the next card is
  introLift?: boolean;
  progressCapPx?: number;
};

/* ---------------- Outer wrapper ---------------- */

export default forwardRef<SwipeCardHandle, Props>(function SwipeCard(
  { onSwipe, children, thresholdPx, onDragProgress, introLift, progressCapPx }: Props,
  ref
) {
  return (
    <div className="grid place-items-center">
      <SwipeCardInner
        ref={ref}
        onSwipe={onSwipe}
        thresholdPx={thresholdPx}
        onDragProgress={onDragProgress}
        introLift={introLift}
        progressCapPx={progressCapPx}
      >
        {children}
      </SwipeCardInner>
    </div>
  );
});

/* ---------------- Inner component ---------------- */

const SwipeCardInner = forwardRef<SwipeCardHandle, Props>(function SwipeCardInner(
  { onSwipe, children, thresholdPx = 0.28, onDragProgress, introLift, progressCapPx }: Props,
  ref
) {
  const refEl = useRef<HTMLDivElement>(null);
  const pos = useRef({ x: 0 });
  const sample = useRef({
    dragging: false,
    active: false,
    startX: 0,
    baseX: 0,
    lastX: 0,
    lastT: 0,
    vx: 0,
  });
  const anim = useRef<Animation | null>(null);

  /* ---------- Imperative API for rewind ---------- */
  useImperativeHandle(ref, () => ({
    animateOut: (dx: number, ms = 140, easing = "steps(2,end)") => {
      const el = refEl.current!;
      if (!el?.animate) return Promise.resolve();
      safeCancel(anim);
      const a = el.animate(
        [
          { transform: currentTransform(el), opacity: 1 },
          { transform: transformStr(dx, 0, 1), opacity: 0.75 },
        ],
        { duration: ms, easing, fill: "none" }
      );
      anim.current = a;
      return a.finished.catch(() => undefined).then(() => safeCancel(anim));
    },
    animateInFrom: (dx: number, ms = 160, easing = "steps(2,end)") => {
      const el = refEl.current!;
      if (!el?.animate) return Promise.resolve();
      safeCancel(anim);
      el.style.transform = transformStr(dx, 0, 1);
      const a = el.animate(
        [
          { transform: transformStr(dx, 0, 1), opacity: 0.75 },
          { transform: transformStr(0, 0, 1), opacity: 1 },
        ],
        { duration: ms, easing, fill: "forwards" }
      );
      anim.current = a;
      return a.finished.catch(() => undefined).then(() => safeCancel(anim));
    },
    reset: () => {
      const el = refEl.current!;
      if (!el) return;
      safeCancel(anim);
      pos.current.x = 0;
      setTransform(el, 0, 0, 1);
      el.style.setProperty("--like", "0");
      el.style.setProperty("--nope", "0");
      el.style.setProperty("--dim", "0");
      onDragProgress?.(0);
    },
  }));

  /* ---------- Pointer / swipe logic ---------- */
  useEffect(() => {
    const el = refEl.current!;
    if (!el) return;

    // Reset visuals on mount
    el.style.visibility = "visible";
    el.style.opacity = "1";
    el.style.transform = transformStr(0, 0, 0.96);
    el.style.setProperty("--like", "0");
    el.style.setProperty("--nope", "0");
    el.style.setProperty("--dim", "0");
    onDragProgress?.(0);

    // Intro lift 0.96 -> 1.00
    if (introLift) {
      const intro = runTransformAnim(
        el,
        currentTransform(el),
        transformStr(0, 0, 1),
        0.22
      );
      intro.finished.catch(() => undefined);
    } else {
      el.style.transform = transformStr(0, 0, 1);
    }

    function killActiveAnimation() {
      if (!anim.current) return;
      try {
        const computed = getComputedStyle(el).transform;
        safeCancel(anim);
        el.style.transform =
          computed === "none" ? transformStr(0, 0, 1) : computed;
        pos.current.x = txFromComputedMatrix(computed);
      } catch {}
      anim.current = null;
    }

    function onDown(e: PointerEvent) {
      killActiveAnimation();
      try {
        el.setPointerCapture(e.pointerId);
      } catch {}
      const x = (e as any).clientX as number;
      sample.current.dragging = true;
      sample.current.active = false;
      sample.current.startX = x;
      sample.current.baseX = pos.current.x;
      sample.current.lastX = pos.current.x;
      sample.current.lastT = performance.now();
      sample.current.vx = 0;
      (e as any).preventDefault?.();
    }

    function onMove(e: PointerEvent) {
      if (!sample.current.dragging) return;
      const now = performance.now();
      const pointerX = (e as any).clientX as number;
      const dxFromStart = pointerX - sample.current.startX;
      if (!sample.current.active) {
        if (Math.abs(dxFromStart) < 6) return;
        sample.current.active = true;
        const nx0 = sample.current.baseX + dxFromStart;
        sample.current.lastX = nx0;
        sample.current.lastT = now;
      }
      const nx = sample.current.baseX + dxFromStart;
      pos.current.x = nx;
      const dt = Math.max(8, now - sample.current.lastT);
      sample.current.vx = (nx - sample.current.lastX) / dt;
      sample.current.lastX = nx;
      sample.current.lastT = now;
      const rot = clamp((nx / 300) * 12, -14, 14);
      el.style.transform = transformStr(nx, rot, 1);
      const overlayCap = 140;
      el.style.setProperty(
        "--like",
        String(Math.max(0, Math.min(1, nx / overlayCap)))
      );
      el.style.setProperty(
        "--nope",
        String(Math.max(0, Math.min(1, -nx / overlayCap)))
      );
      el.style.setProperty("--dim", String(Math.min(0.4, Math.abs(nx) / 200)));
      const width = window.innerWidth;
      const commitDist =
        typeof thresholdPx === "number"
          ? thresholdPx > 1
            ? thresholdPx
            : width * thresholdPx
          : width * 0.28;
      const cap =
        typeof progressCapPx === "number" && progressCapPx > 0
          ? progressCapPx
          : 200;
      const promoteDist = Math.min(commitDist, cap);
      const p = Math.max(0, Math.min(1, Math.abs(nx) / promoteDist));
      onDragProgress?.(p);
    }

    function commitSwipe(direction: "left" | "right") {
      onSwipe(direction);
    }

    function snapBack() {
      onDragProgress?.(0);
      anim.current = runTransformAnim(
        el,
        currentTransform(el),
        transformStr(0, 0, 1),
        0.24
      );
      anim.current.finished
        .catch(() => undefined)
        .finally(() => {
          safeCancel(anim);
          pos.current.x = 0;
          setTransform(el, 0, 0, 1);
          el.style.setProperty("--like", "0");
          el.style.setProperty("--nope", "0");
          el.style.setProperty("--dim", "0");
        });
    }

    function onUp(e: PointerEvent) {
      try {
        el.releasePointerCapture(e.pointerId);
      } catch {}
      const width = window.innerWidth;
      const x = pos.current.x;
      const v = sample.current.vx * 1000;
      const commitDist =
        typeof thresholdPx === "number" && thresholdPx <= 1
          ? width * thresholdPx
          : Number(thresholdPx || 0);
      const passDistance = Math.abs(x) > (commitDist || width * 0.28);
      const passVelocity = Math.abs(v) > 900;
      sample.current.dragging = false;
      const rot = clamp((x / 300) * 12, -14, 14);
      if (passDistance || passVelocity) {
        const dir = x > 0 ? "right" : "left";
        const endX = (x > 0 ? 1 : -1) * (width + 200);
        onDragProgress?.(1);
        anim.current = runTransformAnim(
          el,
          currentTransform(el),
          transformStr(endX, rot, 1),
          0.35,
          { fill: "forwards" }
        );
        anim.current.finished
          .catch(() => undefined)
          .finally(() => {
            el.style.visibility = "hidden";
            el.style.opacity = "0";
            commitSwipe(dir);
          });
      } else {
        onDragProgress?.(0);
        snapBack();
      }
      sample.current.active = false;
    }

    function onWindowUp() {
      if (!sample.current.dragging) return;
      sample.current.dragging = false;
      snapBack();
    }
    function onTouchStart(ev: TouchEvent) {
      // guard: ignore near screen edges to avoid iOS back-swipe gesture conflicts
      const x0 = tClientX(ev);
      if (x0 < 16 || x0 > window.innerWidth - 16) return;
    
      // emulate onDown
      try { (refEl.current as any)?.focus?.(); } catch {}
      killActiveAnimation();
    
      sample.current.dragging = true;
      sample.current.active = false;
      sample.current.startX = x0;
      sample.current.baseX = pos.current.x;
      sample.current.lastX = pos.current.x;
      sample.current.lastT = performance.now();
      sample.current.vx = 0;
    }
    
    function onTouchMove(ev: TouchEvent) {
      if (!sample.current.dragging) return;
      // IMPORTANT: passive: false on listener so preventDefault works
      ev.preventDefault()
    
      const now = performance.now();
      const pointerX = tClientX(ev);
      const dxFromStart = pointerX - sample.current.startX;
    
      if (!sample.current.active) {
        if (Math.abs(dxFromStart) < 6) return;
        sample.current.active = true;
        const nx0 = sample.current.baseX + dxFromStart;
        sample.current.lastX = nx0;
        sample.current.lastT = now;
      }
    
      const nx = sample.current.baseX + dxFromStart;
      pos.current.x = nx;
    
      const dt = Math.max(8, now - sample.current.lastT);
      sample.current.vx = (nx - sample.current.lastX) / dt; // px/ms
      sample.current.lastX = nx;
      sample.current.lastT = now;
    
      const rot = clamp((nx / 300) * 12, -14, 14);
      const el = refEl.current!;
      el.style.transform = transformStr(nx, rot, 1);
    
      const overlayCap = 140;
      el.style.setProperty("--like", String(Math.max(0, Math.min(1, nx / overlayCap))));
      el.style.setProperty("--nope", String(Math.max(0, Math.min(1, -nx / overlayCap))));
      el.style.setProperty("--dim", String(Math.min(0.4, Math.abs(nx) / 200)));
    
      const width = window.innerWidth;
      const commitDist = (typeof thresholdPx === "number"
        ? (thresholdPx > 1 ? thresholdPx : width * thresholdPx)
        : width * 0.28) as number;
      const cap = (typeof progressCapPx === "number" && progressCapPx > 0) ? progressCapPx : 200;
      const promoteDist = Math.min(commitDist, cap);
      const p = Math.max(0, Math.min(1, Math.abs(nx) / promoteDist));
      onDragProgress?.(p);
    }
    
    function onTouchEnd(ev: TouchEvent) {
      if (!sample.current.dragging) return;
      const el = refEl.current!;
      const width = window.innerWidth;
    
      const x = pos.current.x;
      const v = sample.current.vx * 1000; // px/s
      const commitDist = typeof thresholdPx === "number" && thresholdPx <= 1
        ? width * thresholdPx
        : Number(thresholdPx || 0);
      const passDistance = Math.abs(x) > (commitDist || width * 0.28);
      const passVelocity = Math.abs(v) > 900;
    
      sample.current.dragging = false;
      const rot = clamp((x / 300) * 12, -14, 14);
    
      if (passDistance || passVelocity) {
        const dir = x > 0 ? "right" : "left";
        const endX = (x > 0 ? 1 : -1) * (width + 200);
        onDragProgress?.(1);
        anim.current = runTransformAnim(el, currentTransform(el), transformStr(endX, rot, 1), 0.35, { fill: "forwards" });
        anim.current.finished.catch(() => undefined).finally(() => {
          el.style.visibility = "hidden";
          el.style.opacity = "0";
          onSwipe(dir);
        });
      } else {
        onDragProgress?.(0);
        snapBack();
      }
    }
    function tClientX(ev: TouchEvent) {
      const t = ev.touches[0] || ev.changedTouches[0];
      return t ? t.clientX : 0;
    }

    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
    window.addEventListener("pointerup", onWindowUp);

    // NEW: touch listeners with passive:false on move to allow preventDefault
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    el.addEventListener("touchcancel", onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
      window.removeEventListener("pointerup", onWindowUp);

      // NEW: clean up touch fallback
      el.removeEventListener("touchstart", onTouchStart as any);
      el.removeEventListener("touchmove", onTouchMove as any);
      el.removeEventListener("touchend", onTouchEnd as any);
      el.removeEventListener("touchcancel", onTouchEnd as any);

      safeCancel(anim);
      onDragProgress?.(0);
    };
  }, [onSwipe, thresholdPx, onDragProgress, introLift, progressCapPx]);

  return (
    <div
      ref={refEl}
      className="relative touch-pan-y will-change-transform select-none"
      style={{
        transform: "none",
        backfaceVisibility: "hidden",
        transformStyle: "preserve-3d",
        zIndex: 1,
        touchAction: "pan-y",            // allow vertical scrolling, we handle horizontal
        WebkitUserSelect: "none",
        userSelect: "none",
        WebkitTouchCallout: "none",
        WebkitTapHighlightColor: "rgba(0,0,0,0)",
      }}
    >
      {/* dim overlay */}
      <div
        data-overlay="dim"
        style={{
          position: "absolute",
          inset: 0,
          background: "#000",
          opacity: "var(--dim, 0)",
          transition: "opacity 0.2s ease-out",
          pointerEvents: "none",
          zIndex: 2,
          borderRadius: 10,
        }}
      />
      {/* content */}
      <div style={{ position: "relative", zIndex: 1 }}>{children}</div>
      {/* like/nope overlays */}
      <img
        data-overlay="pass"
        src="/public/images/pass.png"
        alt="pass"
        className="no-drag"
        draggable={false}
        style={{
          position: "absolute",
          top: 60,
          right: 80,
          // responsive stamp size, not full width
          width: "300px",
          height: "auto",
          // animate via CSS variable
          opacity: "var(--nope, 0)",
          transform:
            "translate3d(0,0,0) rotate(-12deg) scale(calc(0.88 + 0.12 * var(--nope, 0)))",
          transformOrigin: "top left",
          // visual polish
          filter: "drop-shadow(0 2px 0 rgba(0,0,0,0.35))",
          imageRendering: "auto",
          // touch safety
          pointerEvents: "none",
          zIndex: 3,
        }}
      />
      <img
        src="/public/images/drink.png"
        alt="drink"
        draggable={false}
        className="no-drag"
        style={{
          position: "absolute",
          top: 80,
          left: 80,
          width: "300px",
          height: "auto",
          opacity: "var(--like, 0)",
          transform:
            "translate3d(0,0,0) rotate(12deg) scale(calc(0.88 + 0.12 * var(--like, 0)))",
          transformOrigin: "top right",
          filter: "drop-shadow(0 2px 0 rgba(0,0,0,0.35))",
          imageRendering: "auto",
          pointerEvents: "none",
          zIndex: 3,
        }}
      />
    </div>
  );
});

/* ---------------- Helpers ---------------- */

function transformStr(xPx: number, rotDeg: number, scale = 1) {
  return `translate3d(${xPx}px,0,0) rotate(${rotDeg}deg) scale(${scale})`;
}

function setTransform(el: HTMLElement, xPx: number, rotDeg: number, scale = 1) {
  el.style.transform = transformStr(xPx, rotDeg, scale);
}

function currentTransform(el: HTMLElement) {
  const inline = el.style.transform;
  if (inline && inline !== "none") return inline;
  const computed = getComputedStyle(el).transform;
  return computed === "none" ? transformStr(0, 0, 1) : computed;
}

function txFromComputedMatrix(matrix: string) {
  if (!matrix || matrix === "none") return 0;
  if (matrix.startsWith("matrix3d(")) {
    const m = matrix
      .slice(9, -1)
      .split(",")
      .map(parseFloat);
    return m[12] || 0;
  }
  if (matrix.startsWith("matrix(")) {
    const m = matrix
      .slice(7, -1)
      .split(",")
      .map(parseFloat);
    return m[4] || 0;
  }
  return 0;
}

function runTransformAnim(
  el: HTMLElement,
  from: string,
  to: string,
  durationSec: number,
  opts: KeyframeAnimationOptions = {}
) {
  const a = el.animate([{ transform: from }, { transform: to }], {
    duration: Math.max(0, durationSec * 1000),
    easing: "ease-out",
    fill: "none",
    ...opts,
  });
  a.finished.catch(() => undefined);
  return a;
}

function safeCancel(animRef: React.MutableRefObject<Animation | null>) {
  try {
    animRef.current?.cancel();
  } catch {}
  animRef.current = null;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
