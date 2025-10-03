import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { getLeaderboard } from "../lib/api";

/* ---------------- responsive hook ---------------- */

function useWindowWidth() {
  const [width, setWidth] = useState(window.innerWidth);
  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  return width;
}

/* ---------------- types / utils ---------------- */

type Row = { name: string; score: number; created_at: string };
type Suggestion = { name: string; song: string; created_at: string };

const fmtPercent = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? `${n}%` : "0%";
};

function useQuery() {
  const q = new URLSearchParams(useLocation().search);
  return { r: Number(q.get("r") || 0), m: Number(q.get("m") || 0), u: q.get("u") || "" };
}

/* ---------------- calendar helpers ---------------- */

function toGCalDate(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    d.getUTCFullYear().toString() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    "T" +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    "Z"
  );
}
function buildGoogleUrl(opts: { title: string; start: Date; end: Date; details?: string; location?: string }) {
  const dates = `${toGCalDate(opts.start)}/${toGCalDate(opts.end)}`;
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: opts.title,
    dates,
    details: opts.details ?? "",
    location: opts.location ?? "",
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
function downloadICS(opts: { title: string; start: Date; end: Date; details?: string; location?: string }) {
  const esc = (s: string) => (s || "").replace(/,/g, "\\,").replace(/;/g, "\\;").replace(/\n/g, "\\n");
  const now = new Date();
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Czechiest Party//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${now.getTime()}@czechiest.party`,
    `DTSTAMP:${toGCalDate(now)}`,
    `DTSTART:${toGCalDate(opts.start)}`,
    `DTEND:${toGCalDate(opts.end)}`,
    `SUMMARY:${esc(opts.title)}`,
    opts.location ? `LOCATION:${esc(opts.location)}` : "",
    opts.details ? `DESCRIPTION:${esc(opts.details)}` : "",
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\r\n");
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "party.ics";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/* ---------------- direct-to-Supabase (music only) ---------------- */

const SUPA_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPA_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

async function directSupa(path: string, init?: RequestInit) {
  if (!SUPA_URL || !SUPA_KEY) throw new Error("Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY");
  return fetch(`${SUPA_URL}${path}`, {
    ...init,
    headers: {
      apikey: SUPA_KEY,
      Authorization: `Bearer ${SUPA_KEY}`,
      "content-type": "application/json",
      ...(init?.headers || {}),
    },
  });
}
async function listSongSuggestions(limit = 8): Promise<Suggestion[]> {
  const r = await directSupa(`/rest/v1/music_suggestions?select=name,song,created_at&order=created_at.desc&limit=${limit}`);
  if (!r.ok) throw new Error(`music list HTTP ${r.status}`);
  return r.json();
}
async function submitSongSuggestion(song: string) {
  const r = await directSupa(`/rest/v1/rpc/submit_music_suggestion`, {
    method: "POST",
    body: JSON.stringify({ song_in: song }),
  });
  if (!r.ok) {
    const t = await r.text().catch(() => "");
    throw new Error(`music submit HTTP ${r.status} ${t || ""}`.trim());
  }
  return { ok: true as const };
}

/* ---------------- small UI blocks ---------------- */

function AddToCalendarButton() {
  // TODO: replace with your real event info
  const title = "Czechiest Party";
  const start = new Date("2025-10-31T20:00:00+03:00"); // Europe/Helsinki example
  const end = new Date("2025-10-31T23:00:00+03:00");
  const details = "Bring your friends. Dress code: Czech chic.";
  const location = "Prague, CZ";
  const [hover, setHover] = useState(false);
  const [active, setActive] = useState(false);

  const handleClick = () => {
    try {
      const url = buildGoogleUrl({ title, start, end, details, location });
      const w = window.open(url, "_blank", "noopener,noreferrer");
      if (!w || w.closed) downloadICS({ title, start, end, details, location });
    } catch {
      downloadICS({ title, start, end, details, location });
    }
  };

  return (
    <button
      onClick={handleClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => { setHover(false); setActive(false); }}
      onMouseDown={() => setActive(true)}
      onMouseUp={() => setActive(false)}
      style={{
        width: "50%",
        position: "relative",
        textDecoration: "none",
        userSelect: "none",
        transform: active ? "translateY(3px)" : hover ? "translateY(-1px)" : "none",
        transition: "transform 90ms steps(2,end)",
        marginTop: "20px",
        padding: "12px 20px",
        borderRadius: 10,
        fontSize: "1.5em",
        background: hover ? "#0f46ba" : "#0b57d0",
        color: "#fff",
        border: "4px solid #0b57d0",
        clipPath:
              "polygon(8px 0%, calc(100% - 8px) 0%, calc(100% - 8px) 4px, calc(100% - 4px) 4px, calc(100% - 4px) 8px, 100% 8px, 100% calc(100% - 8px), calc(100% - 4px) calc(100% - 8px), calc(100% - 4px) calc(100% - 4px), calc(100% - 8px) calc(100% - 4px), calc(100% - 8px) calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 8px calc(100% - 8px), 4px calc(100% - 8px), 4px calc(100% - 4px), 8px calc(100% - 4px), 8px calc(100% - 8px), 0% calc(100% - 8px), 0% 8px, 4px 8px, 4px 4px, 8px 4px, 8px 8px)",
      }}
    >
      Add to Calendar
    </button>
  );
}

function MusicBox() {
  const [song, setSong] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [recent, setRecent] = useState<Suggestion[]>([]);
  const [disabled, setDisabled] = useState(false);

  async function refresh() {
    try {
      if (!SUPA_URL || !SUPA_KEY) {
        setDisabled(true);
        return;
      }
      setRecent(await listSongSuggestions(8));
    } catch {
      // keep quiet on read errors; box still usable
    }
  }
  useEffect(() => {
    refresh();
  }, []);

  async function submit() {
    const s = song.trim();
    if (!s || disabled) return;
    setSubmitting(true);
    setMsg(null);
    try {
      await submitSongSuggestion(s);
      setMsg("Added—thank you!");
      setSong("");
      refresh();
    } catch (e: any) {
      setMsg(e?.message ?? "Submit failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      style={{
        width: "50%",
        border: "1px solid #eee",
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        marginTop: 24,
        background: "#fff",
        clipPath:
              "polygon(8px 0%, calc(100% - 8px) 0%, calc(100% - 8px) 4px, calc(100% - 4px) 4px, calc(100% - 4px) 8px, 100% 8px, 100% calc(100% - 8px), calc(100% - 4px) calc(100% - 8px), calc(100% - 4px) calc(100% - 4px), calc(100% - 8px) calc(100% - 4px), calc(100% - 8px) calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 8px calc(100% - 8px), 4px calc(100% - 8px), 4px calc(100% - 4px), 8px calc(100% - 4px), 8px calc(100% - 8px), 0% calc(100% - 8px), 0% 8px, 4px 8px, 4px 4px, 8px 4px, 8px 8px)",
      }}
    >
      <h3 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: "black",
       }}>
        Add your music suggestion for the party: <span style={{ fontWeight: 600 }}>(artist + song name)</span>
      </h3>

      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <input
          value={song}
          onChange={(e) => setSong(e.target.value)}
          placeholder="e.g. Black Eyed Peas - Pump it"
          style={{ flex: 1, paddingLeft: 8, padding: "14x 20px", border: "1px solid #ddd", fontFamily: "'Pixelify Sans', system-ui, sans-serif", fontSize: 16, borderRadius: 10, clipPath:
            "polygon(8px 0%, calc(100% - 8px) 0%, calc(100% - 8px) 4px, calc(100% - 4px) 4px, calc(100% - 4px) 8px, 100% 8px, 100% calc(100% - 8px), calc(100% - 4px) calc(100% - 8px), calc(100% - 4px) calc(100% - 4px), calc(100% - 8px) calc(100% - 4px), calc(100% - 8px) calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 8px calc(100% - 8px), 4px calc(100% - 8px), 4px calc(100% - 4px), 8px calc(100% - 4px), 8px calc(100% - 8px), 0% calc(100% - 8px), 0% 8px, 4px 8px, 4px 4px, 8px 4px, 8px 8px)",}}
          disabled={disabled}
        />
        <button
          onClick={submit}
          disabled={disabled || submitting || !song.trim()}
          style={{
            padding: "14px 18px",
            borderRadius: 10,
            background: "#111",
            color: "#fff",
            border: "1px solid #111",
            whiteSpace: "nowrap",
            opacity: disabled ? 0.5 : 1,
            clipPath:
              "polygon(8px 0%, calc(100% - 8px) 0%, calc(100% - 8px) 4px, calc(100% - 4px) 4px, calc(100% - 4px) 8px, 100% 8px, 100% calc(100% - 8px), calc(100% - 4px) calc(100% - 8px), calc(100% - 4px) calc(100% - 4px), calc(100% - 8px) calc(100% - 4px), calc(100% - 8px) calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 8px calc(100% - 8px), 4px calc(100% - 8px), 4px calc(100% - 4px), 8px calc(100% - 4px), 8px calc(100% - 8px), 0% calc(100% - 8px), 0% 8px, 4px 8px, 4px 4px, 8px 4px, 8px 8px)",
          }}
        >
          {submitting ? "Submitting…" : "Submit"}
        </button>
      </div>

      {msg ? <div style={{ marginTop: 8, fontSize: 13, opacity: 0.8 }}>{msg}</div> : null}

      {recent.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 20, opacity: 0.7, marginBottom: 6, color: "black"}}>Recent requests</div>
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              display: "grid",
              gap: 4,
            }}
          >
            {recent.map((r, i) => (
              <li
                key={i}
                style={{
                  fontSize: 16,
                  padding: "6px 8px",
                  borderRadius: 8,
                  background: "#fafafa",
                  border: "1px solid #f0f0f0",
                  color: "black",
                  clipPath:
              "polygon(8px 0%, calc(100% - 8px) 0%, calc(100% - 8px) 4px, calc(100% - 4px) 4px, calc(100% - 4px) 8px, 100% 8px, 100% calc(100% - 8px), calc(100% - 4px) calc(100% - 8px), calc(100% - 4px) calc(100% - 4px), calc(100% - 8px) calc(100% - 4px), calc(100% - 8px) calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 8px calc(100% - 8px), 4px calc(100% - 8px), 4px calc(100% - 4px), 8px calc(100% - 4px), 8px calc(100% - 8px), 0% calc(100% - 8px), 0% 8px, 4px 8px, 4px 4px, 8px 4px, 8px 8px)",
                }}
              >
                <strong>{r.song}</strong>
              </li>
            ))}
          </ul>
        </div>
      )}

      {disabled && (
        <div style={{ marginTop: 8, fontSize: 13, opacity: 0.7 }}>
          Music suggestions disabled: missing <code>VITE_SUPABASE_URL</code>/<code>VITE_SUPABASE_ANON_KEY</code>.
        </div>
      )}
    </div>
  );
}

/* ---------------- leaderboard section ---------------- */

const LeaderboardSection = ({
  title,
  rows,
  avatarLabel,
  windowWidth
}: {
  title: string;
  rows: Row[];
  avatarLabel: string;
  windowWidth: number;
}) => {
  return (
    <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", alignItems: "stretch" }}>
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
            color: "#374151",
          }}
        >
          {avatarLabel}
        </div>
      </div>
      <h3 style={{ textAlign: "center", marginBottom: 16, fontSize: "1.4rem", fontWeight: 800 }}>{title}</h3>
      {rows.length === 0 ? (
        <div style={{ opacity: 0.7, textAlign: "center" }}>No entries yet.</div>
      ) : (
        <ol
          style={{
            listStyle: "none",
            padding: 0,
            margin: 0,
            borderRadius: 0,
            overflow: "hidden",
            boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.05)",
            border: "1px solid #e5e7eb",
            background: "#fff",
            clipPath:
              "polygon(8px 0%, calc(100% - 8px) 0%, calc(100% - 8px) 4px, calc(100% - 4px) 4px, calc(100% - 4px) 8px, 100% 8px, 100% calc(100% - 8px), calc(100% - 4px) calc(100% - 8px), calc(100% - 4px) calc(100% - 4px), calc(100% - 8px) calc(100% - 4px), calc(100% - 8px) calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 8px calc(100% - 8px), 4px calc(100% - 8px), 4px calc(100% - 4px), 8px calc(100% - 4px), 8px calc(100% - 8px), 0% calc(100% - 8px), 0% 8px, 4px 8px, 4px 4px, 8px 4px, 8px 8px)",
          }}
        >
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
                  background: place <= 3 ? "#fffbeb" : "#fff",
                }}
              >
                <span
                  style={{
                    color: "black",
                    width: 36,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {trophy && <span title={`Rank ${place}`}>{trophy}</span>}
                  <span>{place}.</span>
                </span>
                <span
                  style={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: windowWidth < 420 ? "normal" : "nowrap",
                    wordBreak: windowWidth < 420 ? "break-word" : "normal",
                    color: "black",
                  }}
                >
                  {r.name}
                </span>
                <span style={{ fontWeight: 500, color: "black" }}>{fmtPercent(r.score)}</span>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
};

/* ---------------- page ---------------- */

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

    (async () => {
      try {
        const [rudaData, marekData] = await Promise.all([getLeaderboard("ruda", 10), getLeaderboard("marek", 10)]);
        const safeRuda = rudaData.map((r) => ({ ...r, score: Number.isFinite(Number(r.score)) ? Number(r.score) : 0 }));
        const safeMarek = marekData.map((r) => ({ ...r, score: Number.isFinite(Number(r.score)) ? Number(r.score) : 0 }));
        setRudaRows(safeRuda);
        setMarekRows(safeMarek);
      } catch (e: any) {
        setErr(String(e?.message ?? e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div style={{ display: "grid", placeItems: "center", padding: 24 }}>
      <div
        style={{
          width: "100%",
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: 24,
          alignItems: "start",
        }}
      >
        {/* Poster column */}
        <div style={{ width: "100%", display: "grid", placeItems: "center" }}>
          <img
            src="/images/invite.png"
            alt="Invite poster"
            style={{
              width: "50%",
              height: "auto",
              borderRadius: 0,
              boxShadow: "0 10px 20px rgba(0,0,0,0.15)",
              clipPath:
                "polygon(12px 0%, calc(100% - 12px) 0%, calc(100% - 12px) 6px, calc(100% - 6px) 6px, calc(100% - 6px) 12px, 100% 12px, 100% calc(100% - 12px), calc(100% - 6px) calc(100% - 12px), calc(100% - 6px) calc(100% - 6px), calc(100% - 12px) calc(100% - 6px), calc(100% - 12px) calc(100% - 12px), calc(100% - 12px) 100%, 12px 100%, 12px calc(100% - 12px), 6px calc(100% - 12px), 6px calc(100% - 6px), 12px calc(100% - 6px), 12px calc(100% - 12px), 0% calc(100% - 12px), 0% 12px, 6px 12px, 6px 6px, 12px 6px, 12px 12px)",
            }}
          />
          <AddToCalendarButton />
          <MusicBox />
        </div>
            
        {/* Leaderboard column */}
        <div style={{ width: "100%", display: "grid", placeItems: "center", marginTop: "15vh" }}>
          {u && (r > 0 || m > 0) && (
            <div
              style={{
                width: "min(50%, 720px)",
                marginLeft: "auto",
                marginTop: "5vh",
                marginRight: "auto",
                textAlign: "center",
                marginBottom: "10vh",
                padding: "16px 20px",
                background: "#feee8c",
                border: "1px solid #e5e7eb",
                borderRadius: 0,
                clipPath:
                  "polygon(8px 0%, calc(100% - 8px) 0%, calc(100% - 8px) 4px, calc(100% - 4px) 4px, calc(100% - 4px) 8px, 100% 8px, 100% calc(100% - 8px), calc(100% - 4px) calc(100% - 8px), calc(100% - 4px) calc(100% - 4px), calc(100% - 8px) calc(100% - 4px), calc(100% - 8px) calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 8px calc(100% - 8px), 4px calc(100% - 8px), 4px calc(100% - 4px), 8px calc(100% - 4px), 8px calc(100% - 8px), 0% calc(100% - 8px), 0% 8px, 4px 8px, 4px 4px, 8px 4px, 8px 8px)",
              }}
            >
              <h3
                style={{
                  margin: "0 0 8px 0",
                  fontSize: "3rem",
                  color: "black",
                  fontWeight: 700,
                  fontFamily: "'Pixelify Sans', system-ui, sans-serif",
                }}
              >
                Your Score
              </h3>
              <div style={{ fontSize: "2rem", color: "#374151", display: "grid", gridTemplateColumns: "1fr 1fr" }}>
                <div style={{ textAlign: "center" }}>{m}% &nbsp; Marek</div>
                <div style={{ textAlign: "center" }}>{r}% &nbsp;Ruda</div>
              </div>
            </div>
          )}

          {/* Header + calendar */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h2 style={{ fontFamily: "'Pixelify Sans', system-ui, sans-serif", fontSize: "3em" }}>Leaderboard</h2>
          </div>

          {/* Music suggestions (single input) */}

          {/* Grids */}
          {loading && <div style={{ textAlign: "center" }}>Loading…</div>}
          {err && <div style={{ color: "crimson", textAlign: "center" }}>{err}</div>}

          {!loading && !err && (
            <div
              style={{
                width: "50%",
                display: "grid",
                gridTemplateColumns: windowWidth < 900 ? "1fr" : "1fr 1fr",
                gap: 24,
                alignItems: "start",
                minWidth: 0,
              }}
            >
              <LeaderboardSection title={"Most similar to Ruda's"} rows={rudaRows} avatarLabel="R" windowWidth={windowWidth} />
              <LeaderboardSection title={"Most similar to Marek's"} rows={marekRows} avatarLabel="M" windowWidth={windowWidth} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
