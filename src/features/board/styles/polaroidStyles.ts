// src/features/board/styles/polaroidStyles.ts
export const polaroid = {
  container: {
    background: "white",
    border: "1px solid #eee",
    borderRadius: "10px",
    padding: 16,
    boxShadow: "0 6px 24px rgba(0,0,0,0.08)",
    color: "#111",
    textAlign: "left" as const,
    clipPath:
      "polygon(10px 0%, calc(100% - 10px) 0%, calc(100% - 10px) 5px, calc(100% - 5px) 5px, calc(100% - 5px) 10px, 100% 10px, 100% calc(100% - 10px), calc(100% - 5px) calc(100% - 10px), calc(100% - 5px) calc(100% - 5px), calc(100% - 10px) calc(100% - 5px), calc(100% - 10px) calc(100% - 10px), calc(100% - 10px) 100%, 10px 100%, 10px calc(100% - 10px), 5px calc(100% - 10px), 5px calc(100% - 5px), 10px calc(100% - 5px), 10px calc(100% - 10px), 0% calc(100% - 10px), 0% 10px, 5px 10px, 5px 5px, 10px 5px, 10px 10px)",
    userSelect: "none" as const,
  },
  // NEW: a square frame that crops the image to center
  squareFrame: {
    width: "100%",
    aspectRatio: "1 / 1",
    overflow: "hidden",
    borderRadius: 8,
    clipPath:
      "polygon(8px 0%, calc(100% - 8px) 0%, calc(100% - 8px) 4px, calc(100% - 4px) 4px, calc(100% - 4px) 8px, 100% 8px, 100% calc(100% - 8px), calc(100% - 4px) calc(100% - 8px), calc(100% - 4px) calc(100% - 4px), calc(100% - 8px) calc(100% - 4px), calc(100% - 8px) calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 8px calc(100% - 8px), 4px calc(100% - 8px), 4px calc(100% - 4px), 8px calc(100% - 4px), 8px calc(100% - 8px), 0% calc(100% - 8px), 0% 8px, 4px 8px, 4px 4px, 8px 4px, 8px 8px)",
  },
  image: {
    width: "100%",
    height: "100%",
    objectFit: "cover" as const,   // <- center-crop
    objectPosition: "50% 50%",
    display: "block",
    imageRendering: "auto" as const,
  },
  title: { marginTop: 20, fontSize: 20, fontWeight: 800 },
  desc:  { marginTop: 6, fontSize: 16, lineHeight: 1.5 },
};
