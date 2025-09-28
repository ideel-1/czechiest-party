import { Link, useLocation } from "react-router-dom";

function useQuery() {
  const q = new URLSearchParams(useLocation().search);
  return { r: Number(q.get("r") || 0), m: Number(q.get("m") || 0), u: q.get("u") || "" };
}

export default function Results() {
  const { r, m, u } = useQuery();
  return (
    <div style={{height:"80vh",width:"95vw",display:"grid",placeItems:"center",padding:24,overflow:"hidden"}}>
      <div style={{textAlign:"center", width:"100%", maxWidth: 520}}>
        <h2>Results</h2>
        <p>Match with <b>Ruda</b>: {r}%</p>
        <p>Match with <b>Marek</b>: {m}%</p>

        <div style={{margin:"16px 0", padding:12, border:"1px solid #ddd"}}>
          <h3 style={{marginTop:0}}>Invite</h3>
          <div>Ruda & Marek Birthday</div>
          <div>18 Oct 2025, 19:00</div>
          <div>Helsinki</div>
          <div style={{marginTop:8}}>
            <a href="#" target="_blank" rel="noreferrer">Open map</a>
          </div>
        </div>

        <div style={{display:"flex", gap:12, justifyContent:"center"}}>
          <Link to="/leaderboard">View Leaderboards</Link>
          <Link to="/">Play again</Link>
        </div>

        <div style={{opacity:0.6, marginTop:8}}>Saved as: {u || "Anonymous"}</div>
      </div>
    </div>
  );
}
