import { useState, useMemo } from "react";
import { Link } from "react-router-dom";

export function PixelStairButton({
  to = "/game",
  children = "PLAY",
  step = 6,            // stair size in px
  border = 3,          // border (outline) thickness in px
}: {
  to?: string;
  children?: React.ReactNode;
  step?: number;
  border?: number;
}) {
  const [hover, setHover] = useState(false);
  const [active, setActive] = useState(false);

  const clip = useMemo(() => {
    const s = `${step}px`;
    return `polygon(
      0 ${s}, ${s} ${s}, ${s} 0, calc(100% - ${s}) 0,
      calc(100% - ${s}) ${s}, 100% ${s}, 100% calc(100% - ${s}),
      calc(100% - ${s}) calc(100% - ${s}), calc(100% - ${s}) 100%,
      ${s} 100%, ${s} calc(100% - ${s}), 0 calc(100% - ${s})
    )`;
  }, [step]);

  // palette similar to your reference
  const colors = {
    outer: "#0f1c3a",      // dark outer outline
    inner: "#2b2d6c",      // inner outline
    faceTop: "#fff",    // face
    faceBot: "#fff",
  };

  return (
    <Link
      to={to}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => { setHover(false); setActive(false); }}
      onMouseDown={() => setActive(true)}
      onMouseUp={() => setActive(false)}
      style={{
        position: "relative",
        display: "inline-block",
        textDecoration: "none",
        userSelect: "none",
        transform: active ? "translateY(3px)" : hover ? "translateY(-1px)" : "none",
        transition: "transform 90ms steps(2,end)",
      }}
    >
      {/* OUTER BORDER (dark) */}
      <span
        aria-hidden
        style={{
          display: "block",
          padding: border,                 // thickness of outer outline
          background: colors.outer,
          clipPath: clip,
        }}
      >
        {/* INNER BORDER (mid) */}
        <span
          aria-hidden
          style={{
            display: "block",
            padding: border,               // thickness of inner outline
            background: colors.inner,
            clipPath: clip,
          }}
        >
          {/* FACE */}
          <span
            style={{
              display: "inline-block",
              minWidth: 240,
              padding: "16px 36px",
              color: "#0f1c3a",
              fontFamily: "'Pixelify Sans', system-ui, sans-serif",
              fontWeight: 800,
              letterSpacing: 1,
              fontSize: "1.5em",
              textTransform: "uppercase",
              textAlign: "center",
              background: `linear-gradient(${active ? 180 : 180}deg, ${colors.faceTop}, ${colors.faceBot})`,
              clipPath: clip,
              position: "relative",
              // subtle inner bevel
              boxShadow: active
                ? "inset 0 2px 0 rgba(255,255,255,0.35), inset 0 -2px 0 rgba(0,0,0,0.25)"
                : "inset 0 3px 0 rgba(255,255,255,0.45), inset 0 -4px 0 rgba(0,0,0,0.25)",
            }}
          >
 

            {children}
          </span>
        </span>
      </span>
    </Link>
  );
}

export default function Landing() {
  return (
    <div
      style={{
        width: "100vw",
        minHeight: "100vh",
        position: "relative",
        display: "grid",
        placeItems: "center",
        overflow: "hidden",
      }}
    >
      {/* Gradient layer */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(135deg, rgba(255,120,120,0.6), rgba(255,255,255,0.7) 45%, rgba(120,160,255,0.6))",
          zIndex: 0,
        }}
      />

      {/* Pixel grid overlay (fixed typo 0gitpx -> 0px) */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `
            repeating-linear-gradient(
              0deg,
              transparent 0px,
              transparent 29px,
              rgba(0,0,0,0.08) 29px,
              rgba(0,0,0,0.08) 30px
            ),
            repeating-linear-gradient(
              90deg,
              transparent 0px,
              transparent 29px,
              rgba(0,0,0,0.08) 29px,
              rgba(0,0,0,0.08) 30px
            )
          `,
          zIndex: 0,
          pointerEvents: "none",
        }}
      />

      {/* Background image layer */}
      <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
        <img
          src="/images/czech_flag.png"
          alt="Czech flag"
          style={{ opacity: 0.5, maxWidth: "100%", height: "auto", userSelect: "none" }}
        />
      </div>

      {/* Foreground content */}
      <div style={{ textAlign: "center", maxWidth: 720, padding: 24, position: "relative", zIndex: 1 }}>
        <h1
          style={{
            fontSize: "clamp(2.5rem, 6vw, 4rem)",
            lineHeight: 1.1,
            margin: 0,
            letterSpacing: -0.5,
            fontFamily: "'Pixelify Sans', system-ui, sans-serif",
            fontWeight: 700,
            color: "#000",
            textShadow: "0 1px 0 rgba(255,255,255,0.35)",
          }}
        >
          Do you like the same stuff as we do?
        </h1>

        <div style={{ marginTop: 28 }}>
          <PixelStairButton to="/game">PLAY</PixelStairButton>
        </div>
      </div>
    </div>
  );
}
