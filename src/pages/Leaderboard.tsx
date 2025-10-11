import { useEffect, useState } from "react";
import { useLocation, useNavigate} from "react-router-dom";
import { getLeaderboard } from "../lib/api";
import CelebrationOverlay from "../components/CelebrationOverlay";


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


const fmtCount = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n.toString() : "0";
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
  const start = new Date("2025-11-08T21:00:00+03:00"); // Europe/Helsinki example
  const end = new Date("2025-11-09T04:00:00+03:00");
  const details = "Czechiest Part 4 - we have a few drinks, but also bring your own:)";
  const location = "Otakaari 20, 02150 Espoo, Finland";
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
        width: "min(94vw, 720px)",
        position: "relative",
        textDecoration: "none",
        userSelect: "none",
        transform: active ? "translateY(3px)" : hover ? "translateY(-1px)" : "none",
        transition: "transform 90ms steps(2,end)",
        marginTop: "20px",
        padding: "12px 20px",
        borderRadius: 10,
        fontSize: "1.5em",
        background: hover ? "#ba0f14" : "#d00b1a",
        color: "#fff",
        border: "4px solid #d00b1a",
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
  const [_recent, setRecent] = useState<Suggestion[]>([]);
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
        width: "min(94vw, 720px)",
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

      <div style={{ gap: 8, marginTop: 10, display: "grid", alignItems: "center",
        gridTemplateColumns: useWindowWidth() < 900 ? "1fr" : "4fr 1fr"}}>
        <input
          value={song}
          onChange={(e) => setSong(e.target.value)}
          placeholder="e.g. Black Eyed Peas - Pump it"
          style={{
            whiteSpace: "nowrap",
            padding: "14px 20px",
            border: "1px solid #ddd", 
            fontFamily: "'Jersey 10', system-ui, sans-serif", 
            fontSize: 16, 
            borderRadius: 10, 
            clipPath:
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

      {/*{recent.length > 0 && (
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
      )} */}

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
  avatarSrc,
  windowWidth
}: {
  title: string;
  rows: Row[];
  avatarSrc: string;
  windowWidth: number;
}) => {
  return (
    <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", alignItems: "stretch" }}>
      <div style={{ display: "grid", placeItems: "center", marginBottom: 12 }}>
        <img
          src={avatarSrc}
          alt="Avatar"
          loading="lazy"
          decoding="async"
          style={{
            width: "clamp(48px, 10vw, 72px)",
            height: "clamp(48px, 10vw, 72px)",
            borderRadius: "50%",
            border: "2px solid #d1d5db",
            objectFit: "cover",
            background: "#e5e7eb",
            display: "block"
          }}
        />
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
                <span style={{ fontWeight: 500, color: "black" }}>{fmtCount(r.score)}/15</span>
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
  const navigate = useNavigate();
  const location = useLocation();                           // keep full Location type
  const search = new URLSearchParams(location.search);
  const forceDemo =
  search.get("demo") === "1" || localStorage.getItem("celebrateDemo") === "1";

const celebrateFromState = (location.state as any)?.celebrate === true;

const shouldCelebrateInitial =
  celebrateFromState || search.get("c") === "1" || forceDemo;

const [celebrate, setCelebrate] = useState<boolean>(shouldCelebrateInitial);      // OK


   // A) one effect to scrub ?c and router state when celebrating
   useEffect(() => {
   if (!shouldCelebrateInitial) return;
     const clean = new URL(window.location.href);
     clean.searchParams.delete("demo");
     navigate(clean.pathname + clean.search + clean.hash, { replace: true });
   }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
  const isWide = windowWidth >= 680;
  const N = 12;          // notch size (outer)    // small notch steps
  const BORDER = 10;     // thickness of the white border

  const pixelClip = (n: number, h :number = n / 2) =>
    `polygon(
      ${n}px 0%, calc(100% - ${n}px) 0%,
      calc(100% - ${n}px) ${h}px, calc(100% - ${h}px) ${h}px,
      calc(100% - ${h}px) ${n}px, 100% ${n}px,
      100% calc(100% - ${n}px), calc(100% - ${h}px) calc(100% - ${n}px),
      calc(100% - ${h}px) calc(100% - ${h}px), calc(100% - ${n}px) calc(100% - ${h}px),
      calc(100% - ${n}px) calc(100% - ${n}px), calc(100% - ${n}px) 100%,
      ${n}px 100%, ${n}px calc(100% - ${n}px), ${h}px calc(100% - ${n}px),
      ${h}px calc(100% - ${h}px), ${n}px calc(100% - ${h}px), ${n}px calc(100% - ${n}px),
      0% calc(100% - ${n}px), 0% ${n}px, ${h}px ${n}px, ${h}px ${h}px, ${n}px ${h}px, ${n}px ${n}px
    )`;

  return (
    <>
    <div
    style={{
      display: "grid",
      placeItems: "center",
      opacity: celebrate ? 0 : 1,             // fade in after overlay
      transition: "opacity 280ms ease",       // match CelebrationOverlay fadeMs
    }}
  >
      <div
        style={{
          width: "100%",
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: 24,
          alignItems: "start",
        }}
      >
        {/* Leaderboard column */}
        <div style={{ width: "100%", display: "grid", placeItems: "center", marginTop: "5vh" }}>
        <h2 style={{ fontFamily: "'Pixelify Sans', system-ui, sans-serif", fontSize: "3em" }}>Leaderboard</h2>
          {u && (r > 0 || m > 0) && (
                        
            <div
              style={{
                width: "min(94vw, 720px)",
                marginLeft: "auto",
                marginRight: "auto",
                textAlign: "center",
                marginBottom: "5vh",
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
                  width: "100%",
                  margin: "0 0 8px 0",
                  fontSize: "3rem",
                  color: "black",
                  fontWeight: 700,
                  fontFamily: "'Pixelify Sans', system-ui, sans-serif",
                  textAlign: "center"
                }}
              >
                🏆 Your Score
              </h3>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr minmax(clamp(8px, 2vw, 20px), 40px) 1fr",
                  alignItems: "center",
                  justifyItems: "center",
                  textAlign: "center",
                  fontSize: "2rem",
                  color: "#374151",
                  width: "100%",
                }}
              >
                <div>{r}/15 &nbsp;same likes with Ruda</div>
                <div /> {/* spacer track */}
                <div>{m}/15 &nbsp;same likes with Marek</div>
              </div>
            </div>
          )}

          {/* Music suggestions (single input) */}

          {/* Grids */}
          {loading && <div style={{ textAlign: "center" }}>Loading…</div>}
          {err && <div style={{ color: "crimson", textAlign: "center" }}>{err}</div>}

          {!loading && !err && (
            <div
              style={{
                width: "min(92vw, 720px)",           // give a bit more room on desktop
                marginInline: "auto",
                display: "grid",
                alignContent: "center",
                // two tracks on wide, one track on narrow:
                gridTemplateColumns: isWide ? "1fr 1fr" : "1fr",
                // explicit gaps:
                columnGap: isWide ? "clamp(12px, 2.5vw, 28px)" : 0,
                rowGap: isWide ? 0 : "clamp(10px, 2.2vw, 18px)",
                alignItems: "start",
                minWidth: 0,
              }}
            >
              <LeaderboardSection
                title={"Most similar to Ruda's"}
                rows={rudaRows}
                avatarSrc="/images/profilepic_ruda.png"
                windowWidth={windowWidth}
              />
              <LeaderboardSection
                title={"Most similar to Marek's"}
                rows={marekRows}
                avatarSrc="/images/profilepic_marek.png"
                windowWidth={windowWidth}
              />
            </div>
          )}
        </div>
        {/* Poster column */}
        <div style={{ width: "100%", display: "grid", placeItems: "center" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, marginTop: "5vh" }}>
            <h2 style={{ fontFamily: "'Pixelify Sans', system-ui, sans-serif", fontSize: "3em" }}>Invite</h2>
        </div>
        <div
            style={{
              /* OUTER: creates the white “border” with same pixel-cut */
              display: "inline-block",
              background: "white",
              padding: BORDER,
              clipPath: pixelClip(N),
              boxShadow: "0 10px 20px rgba(0,0,0,0.15)",
            }}
          >
            <div
              /* INNER: clips the content again so the image corners follow the shape */
              style={{
                clipPath: pixelClip(N),
                overflow: "hidden",
              }}
            >
              <img
                src="/images/inviteimage.png"
                alt="Invite poster"
                style={{
                  display: "block",
                  width: "min(94vw, 720px)",
                  height: "auto",
                }}
              />
            </div>
          </div>
          <AddToCalendarButton />
          <MusicBox />
          <div style={{ marginBottom: "5vh" }}>
          </div>
        </div>
      
    </div>
    </div>
      {celebrate && (
      <CelebrationOverlay
        videoSrc="/videos/covervideo.mp4"       // put this file in public/videos/
        minDurationMs={4600}                   // tweak as you like
        fadeMs={600}
        onDone={() => {
          localStorage.removeItem("celebrateDemo"); // clear demo mode after showing
          setCelebrate(false);
        }}     // when finished, reveal content
      />
      )}
      </>
  );
}
