import { useRef } from "react";
import { addMemo, addImage } from "../api/items";
import { uploadImageFile } from "../api/uploads";

export function BoardToolbar({ boardId }: { boardId: string }) {
  const fileRef = useRef<HTMLInputElement>(null);

  async function onAddMemo() {
    try {
      await addMemo(boardId, "New memo", 120, 120);
    } catch (e: any) {
      alert(e?.message || String(e));
    }
  }

  async function onPickImage() {
    fileRef.current?.click();
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const url = await uploadImageFile(f);
      await addImage(boardId, url, 160, 160);
    } catch (err: any) {
      alert(err?.message || String(err));
    } finally {
      e.target.value = "";
    }
  }

  return (
    <div className="absolute left-4 top-4 flex gap-8 items-center px-card" style={{ padding: 8 }}>
      <button className="px-button" onClick={onAddMemo}>Add Post-it</button>
      <button className="px-button" onClick={onPickImage}>Add Photo</button>
      <input ref={fileRef} type="file" accept="image/*" onChange={onFile} style={{ display:"none" }} />
    </div>
  );
}


