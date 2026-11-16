import { AudienceView } from "./apps/Office/presentation/AudienceView";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/tokens.css";
import "./styles/global.css";
import App from "./App.tsx";
import "./styles/mobile.css";

const audienceSession = new URLSearchParams(location.search).get(
  "office-presentation",
);

try {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      {audienceSession ? <AudienceView session={audienceSession} /> : <App />}
    </StrictMode>,
  );
} catch {
  if (!sessionStorage.getItem("webos-recovered")) {
    sessionStorage.setItem("webos-recovered", "1");
    Object.keys(localStorage)
      .filter((k) => k.startsWith("webos-"))
      .forEach((k) => localStorage.removeItem(k));
    location.reload();
  }
}
