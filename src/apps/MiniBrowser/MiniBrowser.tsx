import { useState, useEffect } from "react";
import {
  ChevronLeft, ChevronRight, RotateCw, ExternalLink, Home, Search,
  Globe, BookOpen, Map, Code2, FlaskConical, Newspaper,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { AppProps } from "../../types";
import "./MiniBrowser.css";

// Internal start page — rendered natively, no iframe cost at all.
const START = "webos://start";

// Sites known to allow iframe embedding. Most big sites (google, youtube,
// twitter…) send X-Frame-Options / CSP and will refuse to render in a frame.
const SPEED_DIAL: { label: string; url: string; icon: LucideIcon }[] = [
  { label: "Wikipedia", url: "https://www.wikipedia.org", icon: BookOpen },
  { label: "OpenStreetMap", url: "https://www.openstreetmap.org", icon: Map },
  { label: "MDN Play", url: "https://developer.mozilla.org/en-US/play", icon: Code2 },
  { label: "Example", url: "https://example.com", icon: FlaskConical },
  { label: "Wiktionary", url: "https://www.wiktionary.org", icon: Newspaper },
  { label: "OpenLibrary", url: "https://openlibrary.org", icon: Globe },
];

function normalize(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return START;
  if (trimmed === START) return START;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  // looks like a domain -> url, otherwise -> search wikipedia (frame-friendly)
  if (/^[\w-]+(\.[\w-]+)+(\/.*)?$/.test(trimmed)) return "https://" + trimmed;
  return "https://en.wikipedia.org/w/index.php?search=" + encodeURIComponent(trimmed);
}

export function MiniBrowser({}: AppProps) {
  const [history, setHistory] = useState<string[]>([START]);
  const [index, setIndex] = useState(0);
  const [inputUrl, setInputUrl] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [loading, setLoading] = useState(false);

  const url = history[index];
  const onStartPage = url === START;

  // clock for the start page
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    if (!onStartPage) return;
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, [onStartPage]);

  function navigate(raw: string) {
    const next = normalize(raw);
    const newHistory = history.slice(0, index + 1);
    newHistory.push(next);
    setHistory(newHistory);
    setIndex(newHistory.length - 1);
    setInputUrl(next === START ? "" : next);
    if (next !== START) setLoading(true);
  }

  function jumpTo(i: number) {
    setIndex(i);
    const target = history[i];
    setInputUrl(target === START ? "" : target);
    if (target !== START) setLoading(true);
  }

  function reload() {
    if (onStartPage) return;
    setLoading(true);
    setReloadKey((k) => k + 1);
  }

  return (
    <div className="browser">
      <div className="browser__bar">
        <button className="browser__btn" disabled={index <= 0} onClick={() => jumpTo(index - 1)} title="Back">
          <ChevronLeft size={16} />
        </button>
        <button
          className="browser__btn"
          disabled={index >= history.length - 1}
          onClick={() => jumpTo(index + 1)}
          title="Forward"
        >
          <ChevronRight size={16} />
        </button>
        <button className="browser__btn" onClick={reload} disabled={onStartPage} title="Reload">
          <RotateCw size={14} className={loading ? "browser__spin" : undefined} />
        </button>
        <button className="browser__btn" onClick={() => navigate(START)} disabled={onStartPage} title="Home">
          <Home size={14} />
        </button>
        <input
          className="browser__url"
          value={inputUrl}
          placeholder="Search or enter address"
          onChange={(e) => setInputUrl(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") navigate(inputUrl); }}
          spellCheck={false}
        />
        <button
          className="browser__btn"
          onClick={() => window.open(url, "_blank")}
          disabled={onStartPage}
          title="Open in a real tab"
        >
          <ExternalLink size={14} />
        </button>
      </div>

      {loading && !onStartPage && <div className="browser__progress" />}

      {onStartPage ? (
        <div className="browser__start">
          <div className="browser__start-clock">
            {now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
          </div>
          <div className="browser__search">
            <Search size={16} />
            <input
              placeholder="Search the web…"
              onKeyDown={(e) => {
                if (e.key === "Enter") navigate((e.target as HTMLInputElement).value);
              }}
              autoFocus
              spellCheck={false}
            />
          </div>
          <div className="browser__dial">
            {SPEED_DIAL.map((site) => (
              <button key={site.url} className="browser__tile" onClick={() => navigate(site.url)}>
                <site.icon size={22} />
                <span>{site.label}</span>
              </button>
            ))}
          </div>
          <div className="browser__start-note">
            Tiles above are iframe-friendly. Sites that block embedding can be opened
            in a real tab with the <ExternalLink size={11} style={{ verticalAlign: "-1px" }} /> button.
          </div>
        </div>
      ) : (
        <iframe
          key={`${index}-${reloadKey}`}
          className="browser__frame"
          src={url}
          title="mini-browser"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          onLoad={() => setLoading(false)}
        />
      )}
    </div>
  );
}
