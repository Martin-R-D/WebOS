import type { VercelRequest, VercelResponse } from '@vercel/node';

const SEARXNG_INSTANCES = [
  "https://searx.be",
  "https://search.mdosch.de",
  "https://searx.tiekoetter.com",
  "https://searxng.site",
  "https://priv.au",
];

interface SearXResult {
  title: string;
  url: string;
  content?: string;
  engine?: string;
}

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  source: "web" | "duckduckgo";
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const q = req.query.q as string;
  if (!q) return res.status(400).json({ error: "Missing query" });

  // Try SearXNG instances
  for (const instance of SEARXNG_INSTANCES) {
    try {
      const response = await fetch(
        `${instance}/search?q=${encodeURIComponent(q)}&format=json`,
        { signal: AbortSignal.timeout(4000) }
      );
      if (response.ok) {
        const data = await response.json();
        const results: SearchResult[] = (data.results ?? []).slice(0, 10).map((r: SearXResult) => ({
          title: r.title,
          url: r.url,
          snippet: r.content ?? "",
          source: "web" as const,
        }));
        if (results.length === 0) continue; // instance responded but returned nothing — try next
        res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=120");
        return res.json({ results, query: q, source: "searxng" });
      }
    } catch {
      continue;
    }
  }

  // Fallback: DuckDuckGo Instant Answer API
  try {
    const ddgRes = await fetch(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(q)}&format=json&no_html=1&skip_disambig=1`,
      { signal: AbortSignal.timeout(4000) }
    );
    if (ddgRes.ok) {
      const ddg = await ddgRes.json();
      const results: SearchResult[] = [];
      if (ddg.AbstractText) {
        results.push({ title: ddg.Heading ?? q, url: ddg.AbstractURL ?? "", snippet: ddg.AbstractText, source: "duckduckgo" });
      }
      (ddg.RelatedTopics ?? []).slice(0, 8).forEach((t: { Text?: string; FirstURL?: string }) => {
        if (t.Text && t.FirstURL) {
          results.push({ title: t.Text.split(" - ")[0], url: t.FirstURL, snippet: t.Text, source: "duckduckgo" });
        }
      });
      res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=120");
      return res.json({ results, query: q, source: "duckduckgo" });
    }
  } catch { /* fall through */ }

  res.status(500).json({ error: "All search sources failed" });
}
