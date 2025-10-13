import _React, { useEffect, useRef, useState } from "react";
import { getWarmUrl} from "../lib/videoCache";
import coverUrl from "../assets/covervideo.mp4?url";

const CELEBRATION_VIDEO_SRC = coverUrl; // hashed, immutable
/**
 * Fullscreen celebration overlay: plays a short video, runs confetti,
 * then fades out and calls onDone().
 *
 * Put your video file at: public/videos/covervideo.mp4 (or change src below)
 */
export default function CelebrationOverlay({
  onDone,
  videoSrc = CELEBRATION_VIDEO_SRC,
  minDurationMs = 1600,   // minimum time to keep overlay before fade
  fadeMs = 280,           // fade-out duration
}: {
  onDone: () => void;
  videoSrc?: string;
  minDurationMs?: number;
  fadeMs?: number;
}) {
  const effectiveSrc = getWarmUrl() || videoSrc;
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fade, setFade] = useState(false);

  // Simple confetti engine (no deps)
  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    let raf = 0;
    let running = true;

    // fit canvas
    const fit = () => {
      const dpr = Math.max(1, window.devicePixelRatio || 1);
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      canvas.style.width = "100%";
      canvas.style.height = "100%";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    fit();
    window.addEventListener("resize", fit);

    type P = { x: number; y: number; vx: number; vy: number; size: number; rot: number; vr: number; color: string; life: number; };
    const colors = ["#ffd166", "#06d6a0", "#ef476f", "#118ab2", "#ff9f1c", "#8338ec"];
    let parts: P[] = [];

    const W = window.innerWidth, H = window.innerHeight;
    const timers = scheduleBursts([
    { x: W * 0.5, y: H * 0.35, n: 140 }, // main
    { x: W * 0.12, y: H * 0.18, n: 100 }, // top-left
    { x: W * 0.88, y: H * 0.22, n: 100 }, // top-right
    { x: W * 0.16, y: H * 0.72, n: 90  }, // bottom-left
    { x: W * 0.84, y: H * 0.70, n: 90  }, // bottom-right
    ]);

    function spawnBurstAt(x: number, y: number, n = 90) {
        for (let i = 0; i < n; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 2 + Math.random() * 8;
          parts.push({
            x, y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 2,
            size: 4 + Math.random() * 12,
            rot: Math.random() * Math.PI,
            vr: (Math.random() - 0.5) * 0.3,
            color: colors[(Math.random() * colors.length) | 0],
            life: 160 + ((Math.random() * 120) | 0),
          });
        }
      }
      
      /** schedule multiple time-staggered bursts at given origins */
      function scheduleBursts(origins: Array<{x: number; y: number; n?: number}>) {
        const handles: number[] = [];
        const baseDelays = [80, 280, 520, 820]; // ms
        for (let i = 0; i < origins.length; i++) {
          const { x, y, n } = origins[i];
          const d = baseDelays[i % baseDelays.length] + Math.round(Math.random() * 120);
          handles.push(
            window.setTimeout(() => spawnBurstAt(x, y, n ?? 110), d)
          );
        }
        return handles;
      }
    

    // a couple of bursts staggered
    const trickle = window.setInterval(() => {
        const W = window.innerWidth, H = window.innerHeight;
        spawnBurstAt(W * (0.3 + Math.random() * 0.4), H * 0.15, 12); // high-ish, near top-center
    }, 450);

    function tick() {
      if (!running) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      // physics
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.vy += 0.15; // gravity
        p.vx *= 0.996;
        p.vy *= 0.996;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        p.life--;

        // draw
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size * 0.5, -p.size * 0.5, p.size, p.size);
        ctx.restore();

        if (p.life <= 0 || p.y > window.innerHeight + 60) parts.splice(i, 1);
      }
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);

    return () => {
        running = false;
        cancelAnimationFrame(raf);
        timers?.forEach(id => clearTimeout(id));
        clearInterval(trickle);        // if you added a trickle interval
        window.removeEventListener("resize", fit);
    };

  }, []);

  useEffect(() => {
    const v = videoRef.current!;
    let done = false;

    // try to autoplay; must be muted + playsInline for mobile
    const playPromise = v.play?.();
    if (playPromise && typeof playPromise.then === "function") {
      playPromise.catch(() => {
        // ignore autoplay failures; the overlay still shows + confetti plays
      });
    }

    const startAt = performance.now();

    const finish = () => {
      if (done) return;
      done = true;
      setFade(true);
      setTimeout(onDone, fadeMs);
    };

    const onEnded = () => {
      const elapsed = performance.now() - startAt;
      if (elapsed < minDurationMs) {
        setTimeout(finish, minDurationMs - elapsed);
      } else {
        finish();
      }
    };

    v.addEventListener("ended", onEnded);
    // safety timeout in case 'ended' never fires (e.g., file missing)
    const safety = setTimeout(onEnded, Math.max(minDurationMs, 2500));

    return () => {
      v.removeEventListener("ended", onEnded);
      clearTimeout(safety);
    };
  }, [onDone, fadeMs, minDurationMs]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "#000",
        display: "grid",
        placeItems: "center",
        transition: `opacity ${fadeMs}ms ease`,
        opacity: fade ? 0 : 1,
      }}
    >
      {/* the video sits behind the confetti canvas */}
      <video
        ref={videoRef}
        muted
        playsInline
        autoPlay
        preload="auto"
        crossOrigin="anonymous"
        style={{
          width: "min(94vw, 720px)",
          height: "auto",
        }}
        >
        <source src={effectiveSrc} type="video/mp4" />
      </video>

      {/* confetti */}
      <canvas
        ref={canvasRef}
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
        }}
      />
    </div>
  );
}
