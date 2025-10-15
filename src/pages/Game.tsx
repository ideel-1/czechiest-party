import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import SwipeCard from "../components/SwipeCard"; 
import type { SwipeCardHandle } from "../components/SwipeCard";
import NameDialog from "../components/NameDialog";
import ProgressBar from "../components/ui/ProgressBar";
import { getBeers, submitResult } from "../lib/api";
import type { Beer } from "../lib/api";
import coverUrl from "../assets/covervideo.mp4?url";

const CELEBRATION_VIDEO_SRC = coverUrl; // hashed, immutable



type Dir = "left" | "right" | "up" | "down";

type Palette = {
  outline: string;
  fill1: string; // lighter
  fill2: string;
  grayer: string; // darker
};

const DEFAULT: Palette = {
  outline: "#000",
  fill1: "#D9D9D9",
  fill2: "#9E9E9E",
  grayer: "#000",
};


/**
 * 9x9 pixel arrow with a vertical edge and a stair-step diagonal.
 * Base glyph points LEFT. Rotation handles other directions.
 */
export function PixelMiniArrowV2({
  size = 28,
  direction = "left",
  palette = DEFAULT,
  hoverPalette,
  onClick,    
}: {
  size?: number;
  direction?: Dir;
  palette?: Partial<Palette>;
  hoverPalette?: Partial<Palette>;
  onClick?: () => void;  
}) {
  const [hover, setHover] = useState(false);
  const p = { ...DEFAULT, ...palette, ...(hover ? hoverPalette : {}) };

  // Explicit pixel map (y rows). 0=empty, 1=outline, 2=fill light, 3=fill dark
  // Coordinate system: x:0..8, y:0..8; base = LEFT arrow.
  const rows: number[][] = [
    // 0
    [0,0,0,0,0,0,0,0,0],
    // 1
    [0,0,0,0,0,0,0,0,0],   // diag at x=5, fill to 6, vertical edge x=7
    // 2
    [0,0,0,0,0,2,0,0,0],
    // 3
    [0,0,0,0,2,3,0,0,0],
    // 4 (middle with tip at x=1)
    [0,0,0,2,3,3,3,2,0],   // tip connected (no isolated dot)
    // 5
    [0,0,0,0,2,3,0,0,0],
    // 6
    [0,0,0,0,0,2,0,0,0],
    // 7
    [0,0,0,0,0,0,0,0,0],
    // 8
    [0,0,0,0,0,0,0,0,0],
  ];

  const rot =
    direction === "left" ? 0 : direction === "up" ? -90 : direction === "right" ? 180 : 90;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 9 9"
      shapeRendering="crispEdges"
      style={{ display: "inline-block", imageRendering: "pixelated", cursor: "pointer"  }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={onClick}     
    >
      <g transform={`rotate(${rot} 4.5 4.5)`}>
        {rows.map((row, y) =>
          row.map((v, x) => {
            if (!v) return null;
            const fill =
            v === 4 ? p.grayer : v === 1 ? p.outline : v === 2 ? p.fill1 : p.fill2;
            return <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={fill} />;
          })
        )}
      </g>
    </svg>
  );
}
export default function Game() {
  const navigate = useNavigate();
    // celebration video warmup
  const warmupRef = useRef<HTMLVideoElement | null>(null);
  

  const cardRef = useRef<SwipeCardHandle>(null);
  const [isRewinding, setIsRewinding] = useState(false);  

  // amount of beers in the game
  const maxBeers = 15

  // data
  const [beers, setBeers] = useState<Beer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // gameplay
  const [index, setIndex] = useState(0);
  const choicesRef = useRef<Record<string, 0 | 1>>({}); // { beerId: 0|1 }

  // dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // --- swipe help overlay state ---
const [helpMounted, setHelpMounted] = useState(true);  // keeps it in the DOM while fading
const [helpVisible, setHelpVisible] = useState(true);  // drives opacity


  const total = beers.length;
  const current = beers[index];
  const progress = useMemo(() => (total === 0 ? 0 : Math.round((index / total) * 100)), [index, total]);

  const handleSwipe = (dir: "left" | "right") => {
    // single source of truth for swipe → answer
    answer(dir === "right" ? 1 : 0);
  };
  
  const deckRef = useRef<HTMLDivElement>(null);
  const setDeckProgress = (p: number) => deckRef.current?.style.setProperty("--deck-p", p.toFixed(3));
  useEffect(() => { deckRef.current?.style.setProperty("--deck-p", "0"); }, [current?.id]);
  
  useEffect(() => {
    // show while index is 0 or 1; once index hits 2, fade out and unmount after animation
    const shouldShow = index < 2;
    if (shouldShow) {
      setHelpMounted(true);
      // tiny rAF to ensure the element is mounted before switching to visible
      requestAnimationFrame(() => setHelpVisible(true));
    } else {
      setHelpVisible(false);
      const t = setTimeout(() => setHelpMounted(false), 300); // keep in sync with transition below
      return () => clearTimeout(t);
    }
  }, [index]);

  // fetch beers on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getBeers(maxBeers); // adjust limit if you want
        if (!cancelled) {
          setBeers(data);
          setIndex(0);
          choicesRef.current = {};
        }
      } catch (e: any) {
        if (!cancelled) setError(String(e?.message ?? e) || "Failed to load beers");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function rewindOne() {
    if (index <= 0 || isRewinding) return;
    setIsRewinding(true);
  
    // optional: clear previously recorded choice
    const prev = beers[index - 1];
    if (prev) delete choicesRef.current[prev.id];
  
    // animate current out a bit to the RIGHT, then step back index
    await cardRef.current?.animateOut(40, 140, "steps(2,end)");
  
    setIndex(i => Math.max(0, i - 1));
    setDeckProgress(0);
  
    // wait for the new card to mount (key changes), then animate it in from LEFT
    requestAnimationFrame(async () => {
      await cardRef.current?.animateInFrom(-40, 160, "steps(2,end)");
      setIsRewinding(false);
    });
  }
    // When close to the end, create a hidden <video> to warm the decoder/cache
  useEffect(() => {
      const remaining = total - index;
      if (remaining > 0 && remaining <= 3 && !warmupRef.current) {
        const v = document.createElement("video");
        v.src = CELEBRATION_VIDEO_SRC;
        v.preload = "auto";
        v.muted = true;               // satisfies autoplay policy if needed
        (v as any).playsInline = true;
        Object.assign(v.style, {
          position: "absolute",
          width: "1px",
          height: "1px",
          opacity: "0",
          pointerEvents: "none",
          transform: "translate(-9999px, -9999px)",
        });
        document.body.appendChild(v);
        try { v.load(); } catch {}
        warmupRef.current = v;
      }
    }, [total, index]);
   

  // answer handler (0 = skip, 1 = drink)
  function answer(choice: 0 | 1) {
    if (!current) return;

    // record choice
    choicesRef.current[current.id] = choice;

    // last card → open name dialog
    if (index + 1 >= total) {
      setDialogOpen(true);
      return;
    }

    // else go next
    setIndex((i) => i + 1);

    // light haptic (if allowed)
    const n: any = navigator;
    if (n?.vibrate && n?.userActivation?.hasBeenActive) {
      try {
        n.vibrate(6);
      } catch {}
    }
  }

  // submission from dialog
  async function handleSubmitName(name: string) {
    try {
      setSaving(true);
      setSaveError(null);
      const res = await submitResult({ name, choices: choicesRef.current });
  
      // Build URL as you already do
      const url = `/leaderboard?r=${res.score_ruda}&m=${res.score_marek}&u=${encodeURIComponent(name)}&c=1`; // `c=1` as fallback
  
      // Navigate and ask the Leaderboard to celebrate
      navigate(url, { state: { celebrate: true } });
    } catch (e: any) {
      setSaveError(String(e?.message ?? e) || "Failed to submit");
    } finally {
      setSaving(false);
    }
  }
    // Cleanup warmup element
    useEffect(() => {
      return () => {
        const v = warmupRef.current;
        if (v) {
          try { v.pause(); } catch {}
          v.removeAttribute("src");
          try { v.load(); } catch {}
          v.remove();
          warmupRef.current = null;
        }
      };
    }, []);
  

  // UI renderers (keep your card style: title = label, text = description)
  function renderPreview(b: Beer) {
    return (
      <div
        style={{
          background: "white",
          border: "1px solid #eee",
          borderRadius: "10px 10px 10px 10px",
          padding: 16,
          boxShadow: "0 6px 24px rgba(0,0,0,0.08)",
          color: "#111",
          textAlign: "left",
          clipPath: "polygon(10px 0%, calc(100% - 10px) 0%, calc(100% - 10px) 5px, calc(100% - 5px) 5px, calc(100% - 5px) 10px, 100% 10px, 100% calc(100% - 10px), calc(100% - 5px) calc(100% - 10px), calc(100% - 5px) calc(100% - 5px), calc(100% - 10px) calc(100% - 5px), calc(100% - 10px) calc(100% - 10px), calc(100% - 10px) 100%, 10px 100%, 10px calc(100% - 10px), 5px calc(100% - 10px), 5px calc(100% - 5px), 10px calc(100% - 5px), 10px calc(100% - 10px), 0% calc(100% - 10px), 0% 10px, 5px 10px, 5px 5px, 10px 5px, 10px 10px)",
        }}
      >
        <img draggable={false} src={b.image_path} alt={b.label} loading="lazy" decoding="async" style={{ aspectRatio: "1 / 1", userSelect: "none", display: "block", width: "100%", borderRadius: 8, clipPath: "polygon(8px 0%, calc(100% - 8px) 0%, calc(100% - 8px) 4px, calc(100% - 4px) 4px, calc(100% - 4px) 8px, 100% 8px, 100% calc(100% - 8px), calc(100% - 4px) calc(100% - 8px), calc(100% - 4px) calc(100% - 4px), calc(100% - 8px) calc(100% - 4px), calc(100% - 8px) calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 8px calc(100% - 8px), 4px calc(100% - 8px), 4px calc(100% - 4px), 8px calc(100% - 4px), 8px calc(100% - 8px), 0% calc(100% - 8px), 0% 8px, 4px 8px, 4px 4px, 8px 4px, 8px 8px)" }} />
        <h2 style={{ marginTop: 24, fontSize: 36, fontWeight: 800, lineHeight: 0.8  }}>{b.label}</h2>
        {b.description ? <p style={{ marginTop: 12, fontSize: 20, lineHeight: 1, opacity: 0.7 }}>{b.description}</p> : null}
      </div>
    );
  }

  function renderActive(b: Beer) {
    return (
      <div
        style={{
          background: "white",
          border: "1px solid #ddd",
          borderRadius: "10px 10px 10px 10px",
          padding: 16,
          boxShadow: "0 6px 24px rgba(0,0,0,0.08)",
          color: "#111",
          textAlign: "left",
          position: "relative",
          clipPath: "polygon(10px 0%, calc(100% - 10px) 0%, calc(100% - 10px) 5px, calc(100% - 5px) 5px, calc(100% - 5px) 10px, 100% 10px, 100% calc(100% - 10px), calc(100% - 5px) calc(100% - 10px), calc(100% - 5px) calc(100% - 5px), calc(100% - 10px) calc(100% - 5px), calc(100% - 10px) calc(100% - 10px), calc(100% - 10px) 100%, 10px 100%, 10px calc(100% - 10px), 5px calc(100% - 10px), 5px calc(100% - 5px), 10px calc(100% - 5px), 10px calc(100% - 10px), 0% calc(100% - 10px), 0% 10px, 5px 10px, 5px 5px, 10px 5px, 10px 10px)",
        }}
      >
        <img 
            draggable={false}  
            src={b.image_path} 
            alt={b.label} 
            style={{ aspectRatio: "1 / 1", display: "block", width: "100%", borderRadius: 8, clipPath: "polygon(8px 0%, calc(100% - 8px) 0%, calc(100% - 8px) 4px, calc(100% - 4px) 4px, calc(100% - 4px) 8px, 100% 8px, 100% calc(100% - 8px), calc(100% - 4px) calc(100% - 8px), calc(100% - 4px) calc(100% - 4px), calc(100% - 8px) calc(100% - 4px), calc(100% - 8px) calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 8px calc(100% - 8px), 4px calc(100% - 8px), 4px calc(100% - 4px), 8px calc(100% - 4px), 8px calc(100% - 8px), 0% calc(100% - 8px), 0% 8px, 4px 8px, 4px 4px, 8px 4px, 8px 8px)" }} 
        />
        <h2 style={{ marginTop: 24, fontSize: 36, fontWeight: 800, lineHeight: 0.8
         }}>{b.label}</h2>
        {b.description ? <p style={{ marginTop: 12, fontSize: 20, lineHeight: 1, opacity: 0.7 }}>{b.description}</p> : null}

      </div>
    );
  }

  // loading / error / empty
  if (loading) {
    return (
      <div style={{ height: "100svh", width: "100vw", display: "grid", placeItems: "center" }}>
        <div style={{ fontSize: 28,opacity: 0.7 }}>Loading drinks…</div>
      </div>
    );
  }
  if (error) {
    return (
      <div style={{ height: "100svh", width: "100vw", display: "grid", placeItems: "center" }}>
        <div style={{ color: "#b91c1c" }}>{error}</div>
      </div>
    );
  }
  if (!current) {
    return (
      <div style={{ height: "100svh", width: "100vw", display: "grid", placeItems: "center" }}>
        <div>No drinks available.</div>
      </div>
    );
  }
  

  return (
    <div className="game-landing-lock"style={{ 
      height: "100svh", 
      width: "100vw", 
      display: "grid", 
      placeItems: "center", 
      padding: 24, 
      boxSizing: "border-box"
    }}>
      <div ref={deckRef} style={{ textAlign: "center", width: "100%", maxWidth: 420, position: "relative", marginTop: "calc(env(safe-area-inset-top, 0px) + 32px)",}}>
        {/* swipe help overlay (first two swipes only) */}
          {/* swipe help overlay (first two swipes only) */}
          {helpMounted && (
            <div
              style={{
                position: "absolute",
                zIndex: 3,                  // above preview & active card UI
                top: -100,                    // just above the progress bar/card stack
                left: "50%",
                transform: "translateX(-50%)",
                pointerEvents: "none",      // never intercept drags/taps
                opacity: helpVisible ? 1 : 0,
                transition: "opacity 300ms ease",
                width: "100%",
                maxWidth: 420,
                textAlign: "center",
              }}
            >
              <div
                style={{
                  lineHeight: 1,
                  fontSize: "42px",
                  fontWeight: 800,
                  color: "#fff",
                  // readable on any background, without a box:
                  textShadow:
                    "0 2px 4px rgba(0,0,0,0.55), 0 0 1px rgba(0,0,0,0.9)",
                  letterSpacing: 0.2,
                }}
              >
                Swipe <strong>right</strong> if you'd drink it, <strong>left</strong> to skip!
              </div>
            </div>
          )}


        {/* progress */}
        <div style={{ opacity: 0.8, marginBottom: 12 }}>
          <ProgressBar value={progress} />
        </div>

        {beers[index + 1] && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 0,
              paddingTop: "22px",
              pointerEvents: "none",
              // scale: 0.96 → 1.00 with progress
              transform: "scale(calc(0.92 + (0.08 * var(--deck-p, 0))))",
              transformOrigin: "50% 50%",
              opacity: "calc(0.20 + (0.75 * var(--deck-p, 0)))",
              filter: "blur(calc(0.2px * (1 - var(--deck-p, 0))))",
              transition: "transform 180ms ease, opacity 180ms ease, filter 180ms ease",
              willChange: "transform, opacity, filter",
              backfaceVisibility: "hidden",
            }}
          >
            {renderPreview(beers[index + 1])}
          </div>
        )}

        {/* active card on top */}
        <div style={{ position: "relative", zIndex: 1 }}>
        <SwipeCard
          ref={cardRef}    
          key={current.id}               // <-- forces a fresh mount per card
          onSwipe={handleSwipe}
          onDragProgress={setDeckProgress}
          introLift={index === 0}
          progressCapPx={200}  
          >
          {renderActive(current)}
        </SwipeCard>
        </div>
        <div style={{ marginTop: 30, zIndex: 1 }}>
        <PixelMiniArrowV2 
          size={48}
          hoverPalette={{ fill1: "#8a8a8a", fill2: "#474747" }}
          onClick={!isRewinding ? rewindOne : undefined} />
        </div>
      </div>

      {/* Name dialog after last swipe */}
      <NameDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmitName}
        loading={saving}
        error={saveError}
      />
    </div>
  );
}

