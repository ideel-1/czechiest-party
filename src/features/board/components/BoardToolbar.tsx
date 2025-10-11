import React, { useRef, useState } from "react";
import { addPhoto, getImageNaturalSize } from "../api/items"; // getImageNaturalSize was added in items.ts
import { uploadImageFile } from "../api/uploads";

export function BoardToolbar({ boardId }: { boardId: string }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [caption, setCaption] = useState("");

  // constants
const W = 260;

function estimateCaptionHeight(text?: string) {
  if (!text) return 0;
  const lines = Math.ceil(text.length / 18); // rough fit for 260px
  return lines * 24 + 6;                      // 20px font + margin
}

async function onAddTextOnly() {
  try {
    const capH = estimateCaptionHeight(caption || "Untitled");
    const totalH = Math.max(64, capH + 12);
    await addPhoto(boardId, {
      x: 120,
      y: 120,
      width: W,
      height: totalH,
      caption: caption || "Untitled",
      text: caption || "Untitled",
      draggable: false,
      rotate: 0,
    });
    setCaption("");
  } catch (e: any) {
    alert(e?.message || String(e));
  }
}

async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
  const f = e.target.files?.[0];
  if (!f) return;
  try {
    // 1) Upload
    const url = await uploadImageFile(f);

    // 2) Square image area + caption height
    const imgH = W; // square
    const capH = estimateCaptionHeight(caption);
    const totalH = imgH + capH + 12;

    // 3) Insert
    await addPhoto(boardId, {
      x: 160,
      y: 160,
      width: W,
      height: totalH,
      url,
      caption: caption || "",
      text: caption || "",
      draggable: false,
      rotate: 0,
    });

    setCaption("");
  } catch (err: any) {
    alert(err?.message || String(err));
  } finally {
    e.target.value = "";
  }
}

  function onPickImage() {
    fileRef.current?.click();
  }

  return (
    <div className="absolute left-4 top-4 flex items-center gap-3 px-card" style={{ padding: 8 }}>
      <input
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        placeholder="Caption (optional)"
        className="px-2 py-1 border border-black"
        style={{ minWidth: 200 }}
      />
      <button className="px-button" onClick={onAddTextOnly}>Add Text Card</button>
      <button className="px-button" onClick={onPickImage}>Add Photo</button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={onFile}
        style={{ display: "none" }}
      />
    </div>
  );
}
