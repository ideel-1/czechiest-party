import { useState } from "react";
import { Link } from "react-router-dom";
// import inviteImageUrl from "../../images/invite.png"; //

export default function Landing() {
  const [isHover, setIsHover] = useState(false);
  const [isActive, setIsActive] = useState(false);
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
      {/* Pixel overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `
            repeating-linear-gradient(
              0deg,
              transparent 0gitpx,
              transparent 29px,
              rgba(0,0,0,0.1) 29px,
              rgba(0,0,0,0.1) 30px
            ),
            repeating-linear-gradient(
              90deg,
              transparent 0px,
              transparent 29px,
              rgba(0,0,0,0.1) 29px,
              rgba(0,0,0,0.1) 30px
            )
          `,
          zIndex: 0,
        }}
      />
      {/* Background image layer at 50% opacity */}
      
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
          }}
        >
          Do you like the same stuff as we do?
        </h1>
        <Link
          to="/game"
          onMouseEnter={() => setIsHover(true)}
          onMouseLeave={() => {
            setIsHover(false);
            setIsActive(false);
          }}
          onMouseDown={() => setIsActive(true)}
          onMouseUp={() => setIsActive(false)}
          style={{
            display: "inline-block",
            marginTop: 28,
            padding: "18px 40px",
            minWidth: 260,
            borderRadius: 14,
            textDecoration: "none",
            fontFamily: "'Pixelify Sans', system-ui, sans-serif",
            fontOpticalSizing: "auto",
            color: "#fff",
            fontWeight: 700,
            fontSize: "1.25rem",
            letterSpacing: 1,
            textTransform: "uppercase",
            background: `linear-gradient(#686e76, #555b63 55%, #4a5058)`,
            border: "2px solid #2a2f35",
            boxShadow: `${isActive ? "inset 0 3px 0 #777d86, inset 0 -2px 0 #2a2f35, 0 2px 0 #1f2328, 0 8px 18px rgba(0,0,0,0.35)" : "inset 0 4px 0 #7f858e, inset 0 -6px 0 #2a2f35, 0 8px 0 #1f2328, 0 14px 24px rgba(0,0,0,0.38)"}`,
            transform: isActive ? "translateY(6px)" : isHover ? "translateY(-4px)" : "none",
            transition: "transform 0.12s ease, box-shadow 0.12s ease",
            textShadow:
              "0 2px 0 #2a2f35, -1px 0 0 #2a2f35, 1px 0 0 #2a2f35, 0 -1px 0 #2a2f35, 0 0 6px rgba(0,0,0,0.25)",
            filter: isHover ? "brightness(1.02)" : undefined,
          }}
        >
          PLAY
        </Link>
      </div>
    </div>
  );
}
