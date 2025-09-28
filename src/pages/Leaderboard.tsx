import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { getLeaderboard } from "../lib/api";

// Hook for responsive design
function useWindowWidth() {
  const [width, setWidth] = useState(window.innerWidth);
  
  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  return width;
}

type Row = { name: string; score: number; created_at: string };

const fmtPercent = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? `${n}%` : "0%";
  // If you want locale-aware formatting instead:
  // return Number.isFinite(n) ? new Intl.NumberFormat(undefined, { style: 'percent' }).format(n / 100) : '0%';
};

function useQuery() {
  const q = new URLSearchParams(useLocation().search);
  return { r: Number(q.get("r") || 0), m: Number(q.get("m") || 0), u: q.get("u") || "" };
}

export default function Leaderboard() {
  const [rudaRows, setRudaRows] = useState<Row[]>([]);
  const [marekRows, setMarekRows] = useState<Row[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const windowWidth = useWindowWidth();
  const { r, m, u } = useQuery();

  useEffect(() => {
    setErr(null);
    setLoading(true);
    setRudaRows([]);
    setMarekRows([]);

    const loadLeaderboards = async () => {
      try {
        const [rudaData, marekData] = await Promise.all([
          getLeaderboard("ruda", 10),
          getLeaderboard("marek", 10)
        ]);

        const safeRuda = rudaData.map(r => ({
          ...r,
          score: Number.isFinite(Number(r.score)) ? Number(r.score) : 0
        }));

        const safeMarek = marekData.map(r => ({
          ...r,
          score: Number.isFinite(Number(r.score)) ? Number(r.score) : 0
        }));

        setRudaRows(safeRuda);
        setMarekRows(safeMarek);
      } catch (e) {
        setErr(String(e));
      } finally {
        setLoading(false);
      }
    };

    loadLeaderboards();
  }, []);

  const LeaderboardSection = ({ title, rows, avatarLabel }: { title: string; rows: Row[]; avatarLabel: string }) => (
    <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", alignItems: "stretch" }}>
      {/* Avatar placeholder */}
      <div style={{ display: "grid", placeItems: "center", marginBottom: 12 }}>
        <div
          aria-label={`${avatarLabel} avatar placeholder`}
          style={{
            width: "clamp(48px, 10vw, 72px)",
            height: "clamp(48px, 10vw, 72px)",
            borderRadius: "50%",
            background: "#e5e7eb",
            border: "2px solid #d1d5db",
            display: "grid",
            placeItems: "center",
            fontWeight: 700,
            color: "#374151"
          }}
        >
          {avatarLabel}
        </div>
      </div>
      <h3 style={{ textAlign: "center", marginBottom: 16, fontSize: "1.4rem", fontWeight: 800 }}>{title}</h3>
      {rows.length === 0 ? (
        <div style={{ opacity: 0.7, textAlign: "center" }}>No entries yet.</div>
      ) : (
        <ol style={{ 
          listStyle: "none", 
          padding: 0, 
          margin: 0, 
          borderRadius: 0, 
          overflow: "hidden", 
          boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.05)", 
          border: "1px solid #e5e7eb", 
          background: "#fff",
          clipPath: "polygon(8px 0%, calc(100% - 8px) 0%, calc(100% - 8px) 4px, calc(100% - 4px) 4px, calc(100% - 4px) 8px, 100% 8px, 100% calc(100% - 8px), calc(100% - 4px) calc(100% - 8px), calc(100% - 4px) calc(100% - 4px), calc(100% - 8px) calc(100% - 4px), calc(100% - 8px) calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 8px calc(100% - 8px), 4px calc(100% - 8px), 4px calc(100% - 4px), 8px calc(100% - 4px), 8px calc(100% - 8px), 0% calc(100% - 8px), 0% 8px, 4px 8px, 4px 4px, 8px 4px, 8px 8px)"
        }}>
          {rows.slice(0, 10).map((r, i) => {
            const place = i + 1;
            const trophy = place === 1 ? "🥇" : place === 2 ? "🥈" : place === 3 ? "🥉" : null;
            return (
              <li
                key={`${r.name}-${r.created_at}-${i}`}
                style={{
                  display: "grid",
                  gridTemplateColumns: "auto 1fr auto",
                  alignItems: "center",
                  gap: "clamp(6px, 2vw, 12px)",
                  padding: "clamp(8px, 2.4vw, 12px) clamp(10px, 3vw, 14px)",
                  borderBottom: i === rows.slice(0, 10).length - 1 ? "none" : "1px solid #eee",
                  background: place <= 3 ? "#fffbeb" : "#fff"
                }}
              >
                <span style={{ color: "black",width: 36, display: "flex", alignItems: "center", gap: 6, fontVariantNumeric: "tabular-nums" }}>
                  {trophy && <span title={`Rank ${place}`}>{trophy}</span>}
                  <span>{place}.</span>
                </span>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: windowWidth < 420 ? "normal" : "nowrap", wordBreak: windowWidth < 420 ? "break-word" : "normal", color: "black" }}>{r.name}</span>
                <span style={{ fontWeight: 500, color: "black" }}>{fmtPercent(r.score)}</span>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );

  return (
    <div style={{ display: "grid", placeItems: "center", padding: 24 }}>
      <div
        style={{
          width: "100%",
          display: "grid",
          gridTemplateColumns: windowWidth < 900 ? "1fr" : "1fr 1.2fr",
          gap: 24,
          alignItems: "start"
        }}
      >
        {/* Poster column */}
        <div style={{ width: "100%", display: "grid", placeItems: "center" }}>
          <img
            src="/images/invite.png"
            alt="Invite poster"
            style={{ 
              width: "min(100%, 720px)", 
              height: "auto", 
              borderRadius: 0, 
              boxShadow: "0 10px 20px rgba(0,0,0,0.15)",
              clipPath: "polygon(12px 0%, calc(100% - 12px) 0%, calc(100% - 12px) 6px, calc(100% - 6px) 6px, calc(100% - 6px) 12px, 100% 12px, 100% calc(100% - 12px), calc(100% - 6px) calc(100% - 12px), calc(100% - 6px) calc(100% - 6px), calc(100% - 12px) calc(100% - 6px), calc(100% - 12px) calc(100% - 12px), calc(100% - 12px) 100%, 12px 100%, 12px calc(100% - 12px), 6px calc(100% - 12px), 6px calc(100% - 6px), 12px calc(100% - 6px), 12px calc(100% - 12px), 0% calc(100% - 12px), 0% 12px, 6px 12px, 6px 6px, 12px 6px, 12px 12px)"
            }}
          />
        </div>

        {/* Leaderboard column */}
        <div style={{ width: "100%" }}>
          {u && (r > 0 || m > 0) && (
            <div style={{ 
              width: "min(92vw, 500px)",
              marginLeft: "auto",
              marginTop: "5vh",
              marginRight: "auto",
              textAlign: "center", 
              marginBottom: "10vh", 
              padding: "16px 20px", 
              background: "#feee8c", 
              border: "1px solid #e5e7eb",
              borderRadius: 0,
              clipPath: "polygon(8px 0%, calc(100% - 8px) 0%, calc(100% - 8px) 4px, calc(100% - 4px) 4px, calc(100% - 4px) 8px, 100% 8px, 100% calc(100% - 8px), calc(100% - 4px) calc(100% - 8px), calc(100% - 4px) calc(100% - 4px), calc(100% - 8px) calc(100% - 4px), calc(100% - 8px) calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 8px calc(100% - 8px), 4px calc(100% - 8px), 4px calc(100% - 4px), 8px calc(100% - 4px), 8px calc(100% - 8px), 0% calc(100% - 8px), 0% 8px, 4px 8px, 4px 4px, 8px 4px, 8px 8px)"
            }}>
              <h3 style={{ margin: "0 0 8px 0", fontSize: "3rem", color: "black", fontWeight: 700, fontFamily: "'Pixelify Sans', system-ui, sans-serif" }}>
                Your Score
              </h3>
              <div style={{ fontSize: "2rem", color: "#374151", display: "grid", gridTemplateColumns: "1fr 1fr" }}>
                <div style={{ textAlign: "center"}}>{m}% &nbsp; Marek</div><div style={{ textAlign: "center"}}>{r}% &nbsp;Ruda</div>
              </div>
            </div>
          )}
          <h2 style={{ textAlign: "center", marginBottom: 16, fontFamily: "'Pixelify Sans', system-ui, sans-serif" }}>Leaderboard</h2>

          {loading && <div style={{ textAlign: "center" }}>Loading…</div>}
          {err && <div style={{ color: "crimson", textAlign: "center" }}>{err}</div>}

          {!loading && !err && (
            <div
              style={{
                width: "100%",
                display: "grid",
                gridTemplateColumns: windowWidth < 900 ? "1fr" : "1fr 1fr",
                gap: 24,
                alignItems: "start",   
                minWidth: 0,    
              }}
            >
              <LeaderboardSection title={"Most similar to Ruda's"} rows={rudaRows} avatarLabel="R" />
              <LeaderboardSection title={"Most similar to Marek's"} rows={marekRows} avatarLabel="M" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
