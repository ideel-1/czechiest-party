import * as Dialog from "@radix-ui/react-dialog";
import { useState } from "react";
import type { CSSProperties } from "react";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (name: string) => Promise<void>;
  loading?: boolean;
  error?: string | null;
};

export default function NameDialog({ open, onOpenChange, onSubmit, loading, error }: Props) {
  const [name, setName] = useState("");

  const overlay: CSSProperties = { position:"fixed", inset:0, background:"rgba(0,0,0,0.8)", zIndex: "4" };
  const content: CSSProperties = { position:"fixed", left:"50%", top:"50%", transform:"translate(-50%,-50%)",
    width:"min(92vw,500px)", background: "#FAF9F6", borderRadius:0, padding:40, boxShadow:"0 20px 60px rgba(0,0,0,0.25)", zIndex: "5", 
    clipPath: "polygon(12px 0%, calc(100% - 12px) 0%, calc(100% - 12px) 6px, calc(100% - 6px) 6px, calc(100% - 6px) 12px, 100% 12px, 100% calc(100% - 12px), calc(100% - 6px) calc(100% - 12px), calc(100% - 6px) calc(100% - 6px), calc(100% - 12px) calc(100% - 6px), calc(100% - 12px) calc(100% - 12px), calc(100% - 12px) 100%, 12px 100%, 12px calc(100% - 12px), 6px calc(100% - 12px), 6px calc(100% - 6px), 12px calc(100% - 6px), 12px calc(100% - 12px), 0% calc(100% - 12px), 0% 12px, 6px 12px, 6px 6px, 12px 6px, 12px 12px)" };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay style={overlay} />
        <Dialog.Content style={content}>
          <Dialog.Title style={{ fontWeight:800, fontSize:30, lineHeight: 1, marginBottom:24, color: "black", fontFamily: "'Jersey 10', system-ui, sans-serif" }}>Enter your name below:</Dialog.Title>

          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            style={{ 
              fontFamily: "'Jersey 10', system-ui, sans-serif", 
              width:"100%", 
              padding:"10px 12px", 
              borderRadius:0, 
              fontSize:20,
              border: "1px solid #ddd",
              clipPath: "polygon(6px 0%, calc(100% - 6px) 0%, calc(100% - 6px) 6px, 100% 6px, 100% calc(100% - 6px), calc(100% - 6px) calc(100% - 6px), calc(100% - 6px) 100%, 6px 100%, 6px calc(100% - 6px), 0% calc(100% - 6px), 0% 6px, 6px 6px)"
            }}
          />

          {error ? <div style={{ color:"#b91c1c", marginTop:8, fontSize:13 }}>{error}</div> : null}

          <div style={{ display:"flex", justifyContent:"flex-end", gap:8, marginTop:24 }}>
            <button
              disabled={loading || !name.trim()}
              onClick={() => onSubmit(name.trim())}
              style={{ 
                padding:"10px 14px", 
                borderRadius:0, 
                background:"black", 
                color:"#fff",
                fontSize: "20px", 
                border:"1px solid transparent", 
                fontFamily: "'Jersey 10', system-ui, sans-serif",
                clipPath: "polygon(6px 0%, calc(100% - 6px) 0%, calc(100% - 6px) 6px, 100% 6px, 100% calc(100% - 6px), calc(100% - 6px) calc(100% - 6px), calc(100% - 6px) 100%, 6px 100%, 6px calc(100% - 6px), 0% calc(100% - 6px), 0% 6px, 6px 6px)"
              }}
            >
              {loading ? "Saving…" : "Proceed"}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
