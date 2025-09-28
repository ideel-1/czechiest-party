import { useLocation } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import NameSubmission from "./NameSubmission";

export default function NameSubmissionWrapper() {
  const location = useLocation();
  const nav = useNavigate();
  
  const searchParams = new URLSearchParams(location.search);
  const choicesParam = searchParams.get("choices");
  
  if (!choicesParam) {
    // If no choices parameter, redirect to game
    nav("/game");
    return null;
  }
  
  let choices: Record<string, 0 | 1>;
  try {
    choices = JSON.parse(decodeURIComponent(choicesParam));
  } catch (e) {
    // If invalid choices parameter, redirect to game
    nav("/game");
    return null;
  }
  
  return <NameSubmission choices={choices} />;
}
