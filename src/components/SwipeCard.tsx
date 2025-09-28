import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

type Props = {
  onSwipe: (dir: "left" | "right") => void;
  children: ReactNode;
  thresholdPx?: number;                 // px or 0..1 fraction of viewport width
  onDragProgress?: (p: number) => void; // 0..1: how “promoted” the next card is
  introLift?: boolean; // <- NEW: animate 0.96→1 only for the very first card
  progressCapPx?: number;               // <- NEW: cap scaling progress (default 200px)
};

export default function SwipeCard({ onSwipe, children, thresholdPx, onDragProgress, introLift, progressCapPx }: Props) {
  return (
    <div className="grid place-items-center">
      <SwipeCardInner
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
}

function SwipeCardInner({ onSwipe, children, thresholdPx = 0.28, onDragProgress, introLift, progressCapPx }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  const pos = useRef({ x: 0 });
  const sample = useRef({
    dragging: false,
    active: false,
    startX: 0,
    baseX: 0,
    lastX: 0,
    lastT: 0,
    vx: 0, // px/ms
  });
  const anim = useRef<Animation | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const el: HTMLDivElement = node;

    // Reset visuals on mount
    el.style.visibility = "visible";
    el.style.opacity = "1";
    el.style.transform = transformStr(0, 0, 0.96); // start slightly smaller
    el.style.setProperty("--like", "0");
    el.style.setProperty("--nope", "0");
    el.style.setProperty("--dim", "0");

    // ensure deck starts at 0
    onDragProgress?.(0);

    // Intro lift 0.96 -> 1.00
    if (introLift) {
        el.style.transform = transformStr(0, 0, 0.96);
        const intro = runTransformAnim(el, currentTransform(el), transformStr(0, 0, 1), 0.22);
        intro.finished.catch(() => undefined);
      } else {
        el.style.transform = transformStr(0, 0, 1);
      }

    function killActiveAnimation() {
      if (!anim.current) return;
      try {
        const computed = getComputedStyle(el).transform;
        safeCancel(anim);
        el.style.transform = computed === "none" ? transformStr(0, 0, 1) : computed;
        pos.current.x = txFromComputedMatrix(computed);
      } catch {}
      anim.current = null;
    }

    function onDown(e: PointerEvent) {
      killActiveAnimation();
      try { el.setPointerCapture(e.pointerId); } catch {}
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
      sample.current.vx = (nx - sample.current.lastX) / dt; // px/ms
      sample.current.lastX = nx;
      sample.current.lastT = now;

      const rot = clamp((nx / 300) * 12, -14, 14);
      el.style.transform = transformStr(nx, rot, 1);

      // overlays
      const overlayCap = 140; // px to reach full opacity
      el.style.setProperty("--like", String(Math.max(0, Math.min(1, nx / overlayCap))));
      el.style.setProperty("--nope", String(Math.max(0, Math.min(1, -nx / overlayCap))));
      el.style.setProperty("--dim", String(Math.min(0.4, Math.abs(nx) / 200)));

      // report progress 0..1 to deck (based on commit distance)
      const width = window.innerWidth;
      const commitDist = (typeof thresholdPx === "number"
        ? (thresholdPx > 1 ? thresholdPx : width * thresholdPx)
        : width * 0.28) as number;
      const cap = (typeof progressCapPx === "number" && progressCapPx > 0)
        ? progressCapPx
        : 200; // default 200px
      const promoteDist = Math.min(commitDist, cap);
      const p = Math.max(0, Math.min(1, Math.abs(nx) / promoteDist));
      onDragProgress?.(p);
    }

    function commitSwipe(direction: "left" | "right") {
      onSwipe(direction);
    }

    function snapBack() {
      onDragProgress?.(0); // tell deck to return
      anim.current = runTransformAnim(el, currentTransform(el), transformStr(0, 0, 1), 0.24);
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
      try { el.releasePointerCapture(e.pointerId); } catch {}
      const width = window.innerWidth;

      const x = pos.current.x;
      const v = sample.current.vx * 1000; // px/s
      const commitDist = typeof thresholdPx === "number" && thresholdPx <= 1 ? width * thresholdPx : Number(thresholdPx || 0);
      const passDistance = Math.abs(x) > (commitDist || width * 0.28);
      const passVelocity = Math.abs(v) > 900;

      sample.current.dragging = false;
      const rot = clamp((x / 300) * 12, -14, 14);

      if (passDistance || passVelocity) {
        const dir = x > 0 ? "right" : "left";
        const endX = (x > 0 ? 1 : -1) * (width + 200);

        onDragProgress?.(1); // fully promoted

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

    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
    window.addEventListener("pointerup", onWindowUp);

    return () => {
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
      window.removeEventListener("pointerup", onWindowUp);
      safeCancel(anim);
      onDragProgress?.(0); // reset deck
    };
  }, [onSwipe, thresholdPx, onDragProgress]);

  return (
    <div
      ref={ref}
      className="relative touch-pan-y will-change-transform select-none"
      style={{
        transform: "none",
        backfaceVisibility: "hidden",
        transformStyle: "preserve-3d",
        zIndex: 1,
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
      {/* like/nope overlays (optional) */}
      <img
        data-overlay="pass"
        src="/images/pass.png"
        alt="pass"
        style={{
            position: "absolute",
            top: 12,
            left: 12,
            width: "100%",
            opacity: "var(--nope, 0)",
            transform: "rotate(-12deg) scale(calc(0.9 + 0.1 * var(--nope, 0)))",
            pointerEvents: "none",
            zIndex: 3
        }}
        />
        <img
        src="/images/drink.png"
        alt="drink"
        style={{
            position: "absolute",
            top: 12,
            right: 12,
            width: "100%",
            opacity: "var(--like, 0)",
            transform: "rotate(12deg) scale(calc(0.9 + 0.1 * var(--like, 0)))",
            pointerEvents: "none",
            zIndex: 3
        }}
        />
      {/* ... */}
    </div>
  );
}

/* helpers */

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
    const m = matrix.slice(9, -1).split(",").map(parseFloat);
    return m[12] || 0;
  }
  if (matrix.startsWith("matrix(")) {
    const m = matrix.slice(7, -1).split(",").map(parseFloat);
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
  a.finished.catch(() => undefined); // swallow AbortError on cancel()
  return a;
}

function safeCancel(animRef: React.MutableRefObject<Animation | null>) {
  try { animRef.current?.cancel(); } catch {}
  animRef.current = null;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
