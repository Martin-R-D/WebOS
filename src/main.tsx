import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/tokens.css";
import "./styles/global.css";
import App from "./App.tsx";
import "./styles/mobile.css";

try {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App />
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
