import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { submitResult } from "../lib/api";

type NameSubmissionProps = {
  choices: Record<string, 0 | 1>;
};

export default function NameSubmission({ choices }: NameSubmissionProps) {
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please enter your name");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const { score_ruda, score_marek } = await submitResult({
        name: name.trim(),
        choices,
      });
      nav(`/results?r=${score_ruda ?? 0}&m=${score_marek ?? 0}&u=${encodeURIComponent(name.trim())}`);
    } catch (e) {
      setError(`Submit failed: ${String(e)}`);
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{height:"80vh",width:"95vw",display:"grid",placeItems:"center",padding:24,overflow:"hidden"}}>
      <div style={{textAlign:"center", width:"100%", maxWidth: 420}}>
        <h2 style={{marginBottom: 24}}>Almost there!</h2>
        <p style={{marginBottom: 24, opacity: 0.8}}>
          Enter your name to see how you match with Ruda and Marek
        </p>
        
        <form onSubmit={handleSubmit} style={{display:"flex", flexDirection:"column", gap: 16, alignItems:"center"}}>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            style={{
              padding: "12px 16px",
              border: "1px solid #ddd",
              borderRadius: "8px",
              fontSize: "16px",
              width: "100%",
              maxWidth: 280,
              textAlign: "center"
            }}
            autoFocus
          />
          
          {error && (
            <div style={{color: "crimson", fontSize: "14px"}}>
              {error}
            </div>
          )}
          
          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              padding: "12px 24px",
              backgroundColor: isSubmitting ? "#ccc" : "#007bff",
              color: "white",
              border: "none",
              borderRadius: "8px",
              fontSize: "16px",
              cursor: isSubmitting ? "not-allowed" : "pointer",
              minWidth: 120
            }}
          >
            {isSubmitting ? "Submitting..." : "Submit"}
          </button>
        </form>
      </div>
    </div>
  );
}
