import { useState } from "react";
import { ChevronLeft, ChevronRight, RotateCw, ExternalLink } from "lucide-react";
import type { AppProps } from "../../types";
import "./MiniBrowser.css";

const HOME = "https://www.wikipedia.org";

// Many popular sites (google.com, twitter.com, etc.) block iframe embedding via
// X-Frame-Options or CSP. These bookmarks use sites known to allow embedding.
const BOOKMARKS = [
  { label: "Wikipedia", url: "https://www.wikipedia.org" },
  { label: "OpenStreetMap", url: "https://www.openstreetmap.org" },
  { label: "Example", url: "https://example.com" },
];

function normalize(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return HOME;
  if (!/^https?:\/\//i.test(trimmed)) return "https://" + trimmed;
  return trimmed;
}

export function MiniBrowser({}: AppProps) {
  const [history, setHistory] = useState<string[]>([HOME]);
  const [index, setIndex] = useState(0);
  const [inputUrl, setInputUrl] = useState(HOME);
  const [reloadKey, setReloadKey] = useState(0);

  const url = history[index];

  function navigate(raw: string) {
    const next = normalize(raw);
    const newHistory = history.slice(0, index + 1);
    newHistory.push(next);
    setHistory(newHistory);
    setIndex(newHistory.length - 1);
    setInputUrl(next);
  }

  function goBack() {
    if (index > 0) {
      setIndex(index - 1);
      setInputUrl(history[index - 1]);
    }
  }

  function goForward() {
    if (index < history.length - 1) {
      setIndex(index + 1);
      setInputUrl(history[index + 1]);
    }
  }

  function reload() {
    setReloadKey((k) => k + 1);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      navigate(inputUrl);
    }
  }

  return (
    <div className="browser">
      <div className="browser__bar">
        <button className="browser__btn" disabled={index <= 0} onClick={goBack}>
          <ChevronLeft size={16} />
        </button>
        <button className="browser__btn" disabled={index >= history.length - 1} onClick={goForward}>
          <ChevronRight size={16} />
        </button>
        <button className="browser__btn" onClick={reload}>
          <RotateCw size={14} />
        </button>
        <input
          className="browser__url"
          value={inputUrl}
          onChange={(e) => setInputUrl(e.target.value)}
          onKeyDown={handleKeyDown}
          spellCheck={false}
        />
        <button className="browser__btn" onClick={() => window.open(url, "_blank")}>
          <ExternalLink size={14} />
        </button>
      </div>

      <div className="browser__bookmarks">
        {BOOKMARKS.map((b) => (
          <button key={b.url} className="browser__bookmark" onClick={() => navigate(b.url)}>
            {b.label}
          </button>
        ))}
      </div>

      <div className="browser__hint">
        If the page is blank, the site blocked embedding —
        <button onClick={() => window.open(url, "_blank")}>open in a new tab</button>
      </div>

      <iframe
        key={reloadKey}
        className="browser__frame"
        src={url}
        title="mini-browser"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
      />
    </div>
  );
}
