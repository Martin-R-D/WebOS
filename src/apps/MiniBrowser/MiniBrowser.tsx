import { useState, useEffect } from "react";
import {
  ChevronLeft, ChevronRight, RotateCw, ExternalLink, Home, Search,
  Globe, BookOpen, Map, Code2, Archive, Loader2,
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
  { label: "Archive.org", url: "https://archive.org", icon: Archive },
  { label: "OpenLibrary", url: "https://openlibrary.org", icon: Globe },
];

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  source: "web" | "duckduckgo" | "wikipedia";
}

export function normalize(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return START;
  if (trimmed === START) return START;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^[\w-]+(\.[\w-]+)+(\/.*)?$/.test(trimmed)) return "https://" + trimmed;
  return "webos://search?q=" + encodeURIComponent(trimmed);
}

async function fetchWikipedia(query: string): Promise<SearchResult[]> {
  try {
    const res = await fetch(
      `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=5&format=json&origin=*`
    );
    if (!res.ok) return [];
    const data = await res.json();
    // data: [query, titles[], descriptions[], urls[]]
    const titles: string[] = data[1] ?? [];
    const descriptions: string[] = data[2] ?? [];
    const urls: string[] = data[3] ?? [];
    return titles.map((title, i) => ({
      title,
      url: urls[i] ?? "",
      snippet: descriptions[i] ?? "",
      source: "wikipedia" as const,
    }));
  } catch {
    return [];
  }
}

async function fetchSearchResults(query: string): Promise<SearchResult[]> {
  try {
    const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
    if (res.ok) {
      const data = await res.json();
      const results: SearchResult[] = (data.results ?? []).map(
        (r: { title: string; url: string; snippet: string; source: string }) => ({
          ...r,
          source: r.source as "web" | "duckduckgo",
        })
      );
      if (results.length > 0) return results;
    }
  } catch {
    // fall through to Wikipedia
  }
  // Wikipedia fallback
  return fetchWikipedia(query);
}

export function MiniBrowser({}: AppProps) {
  const [history, setHistory] = useState<string[]>([START]);
  const [index, setIndex] = useState(0);
  const [inputUrl, setInputUrl] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [loading, setLoading] = useState(false);

  // Search results state
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchError, setSearchError] = useState<string | null>(null);

  const url = history[index];
  const onStartPage = url === START;
  const showResults = searchQuery !== "";

  // clock for the start page
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    if (!onStartPage) return;
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, [onStartPage]);

  function navigate(raw: string) {
    const next = normalize(raw);
    if (next.startsWith("webos://search?q=")) {
      const q = decodeURIComponent(next.slice("webos://search?q=".length));
      // Show inline search results
      setSearchQuery(q);
      setSearchResults([]);
      setSearchError(null);
      setSearching(true);
      fetchSearchResults(q).then((results) => {
        setSearching(false);
        if (results.length === 0) {
          setSearchError("No results found");
        } else {
          setSearchResults(results);
        }
      });
      return;
    }
    // Clear search when navigating to a URL
    setSearchQuery("");
    setSearchResults([]);
    setSearchError(null);
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

  function handleResultClick(resultUrl: string) {
    navigate(resultUrl);
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
        <button className="browser__btn" onClick={() => navigate(START)} disabled={onStartPage && !showResults} title="Home">
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
          disabled={onStartPage && !showResults}
          title="Open in a real tab"
        >
          <ExternalLink size={14} />
        </button>
      </div>

      {loading && !onStartPage && <div className="browser__progress" />}

      {showResults ? (
        <div className="browser__results">
          <div className="browser__results-header">
            Results for <strong>{searchQuery}</strong>
          </div>
          {searching ? (
            <div className="browser__results-loading" aria-label="Searching">
              <Loader2 size={24} className="browser__spin" />
              <span>Searching…</span>
            </div>
          ) : searchError && searchResults.length === 0 ? (
            <div className="browser__results-empty">
              {searchError === "No results found"
                ? `No results for "${searchQuery}"`
                : "Search unavailable — try a URL directly"}
            </div>
          ) : (
            <ul className="browser__results-list">
              {searchResults.map((result, i) => (
                <li key={i} className="browser__result-item">
                  <button
                    className="browser__result-title"
                    onClick={() => handleResultClick(result.url)}
                  >
                    {result.title}
                  </button>
                  <div className="browser__result-url">{result.url}</div>
                  {result.snippet && (
                    <div className="browser__result-snippet">{result.snippet}</div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : onStartPage ? (
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
