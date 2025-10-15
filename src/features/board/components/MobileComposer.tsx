// src/features/board/components/MobileComposer.tsx
import React, { useEffect, useRef, useState } from "react";
import { uploadImageFile } from "../api/uploads";
import { addPhoto, listItems } from "../api/items";
import { CARD_W, computeCols } from "../constants";
import { estimateTextHeight, buildColumnHeights, organicNextPosition, randomTilt } from "../layout";

type Props = { boardId: string; isOpen: boolean; onClose: () => void };

export function MobileComposer({ boardId, isOpen, onClose }: Props) {
  const [caption, setCaption] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const cameraRef = useRef<HTMLInputElement>(null);
  const libraryRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setCaption("");
      setFile(null);
      setPreview(null);
      setBusy(false);
    }
  }, [isOpen]);

  function pickFromLibrary() { libraryRef.current?.click(); }
  function openCamera()      { cameraRef.current?.click(); }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] || null;
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : null);
  }

  async function submitCard(kind: "image" | "text") {
    try {
      setBusy(true);

      let url: string | undefined;
      const W = CARD_W;

      // upload if image (we render square; no need to read natural size)
      if (kind === "image") {
        if (!file) throw new Error("No image selected");
        url = await uploadImageFile(file);
      }

      // square image → height = W; plus caption height
      const imgH = url ? W : 0;
      const textH = estimateTextHeight(caption || undefined, undefined);
      const height = imgH + textH + 12;

      // organic masonry placement
      const current = await listItems(boardId);
      const cols = computeCols();
      const heights = buildColumnHeights(current, cols);
      const pos = organicNextPosition(heights, cols, height, {
        jitterX: 12,
        jitterY: 6,
        sigma: cols / 3,    // center bias spread
        biasSecond: 0.3,    // occasional 2nd-best
      });
      const rotate = randomTilt(7);

      await addPhoto(boardId, {
        url,
        caption: caption || undefined,
        text: caption || undefined,
        x: pos.x,
        y: pos.y,
        width: W,
        height,
        rotate,
        draggable: false,
      });

      onClose();
    } catch (err: any) {
      alert(err?.message || String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {/* hidden inputs */}
      <input ref={cameraRef}  type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={onFileChange}/>
      <input ref={libraryRef} type="file" accept="image/*"                       style={{ display: "none" }} onChange={onFileChange}/>

      {/* overlay */}
      <div aria-hidden={!isOpen} style={{ display: isOpen ? "block" : "none", position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 60 }} onClick={onClose} />

      {/* bottom sheet */}
      <div role="dialog" aria-modal="true" style={{
        position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 61, background: "#fff",
        borderTop: "2px solid #000", boxShadow: "0 -6px 24px rgba(0,0,0,0.12)",
        borderRadius: "12px 12px 0 0", padding: 12,
        transform: isOpen ? "translateY(0)" : "translateY(100%)", transition: "transform 160ms ease-out",
      }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: "#ddd" }} />
        </div>

        <div style={{ display: "grid", gap: 10 }}>
          <label style={{ fontSize: 14, fontWeight: 700 }}>Caption (optional)</label>
          <input
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="e.g., Kozel 11°"
            style={{ border: "2px solid #000", borderRadius: 8, padding: "10px 12px", fontSize: 16 }}
          />

          {preview && (
            <div style={{ marginTop: 8 }}>
              <img src={preview} alt="preview" loading="lazy" decoding="async" style={{ display: "block", width: "100%", height: "auto", borderRadius: 8 }} />
              <button onClick={() => { setFile(null); setPreview(null); }} className="px-button" style={{ marginTop: 8 }}>
                Remove Selected Image
              </button>
            </div>
          )}

          <div style={{ display: "flex", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
            <button className="px-button" onClick={openCamera}>Take Photo</button>
            <button className="px-button" onClick={pickFromLibrary}>Choose from Library</button>
            <button className="px-button" onClick={() => submitCard("text")}  disabled={busy}>Add Text Card</button>
            <button className="px-button" onClick={() => submitCard("image")} disabled={busy || !file}>Add Photo Card</button>
          </div>
        </div>
      </div>
    </>
  );
}
