import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

// Minimal mock types for VercelRequest and VercelResponse
interface MockRequest {
  query: Record<string, string | string[]>;
}

interface MockResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: unknown;
  status: (code: number) => MockResponse;
  json: (body: unknown) => MockResponse;
  setHeader: (key: string, value: string) => MockResponse;
}

function makeRes(): MockResponse {
  const res: MockResponse = {
    statusCode: 200,
    headers: {},
    body: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
    setHeader(key, value) {
      this.headers[key] = value;
      return this;
    },
  };
  return res;
}

describe("api/search handler", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 400 when query is missing", async () => {
    const { default: handler } = await import("./search.js");
    const req = { query: {} } as MockRequest;
    const res = makeRes();
    await handler(req as never, res as never);
    expect(res.statusCode).toBe(400);
    expect((res.body as { error: string }).error).toMatch(/missing query/i);
  });

  it("tries SearXNG first and returns results on success", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [
          { title: "SearX Result", url: "https://example.com", content: "Great snippet" },
        ],
      }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const { default: handler } = await import("./search.js");
    const req = { query: { q: "test" } } as MockRequest;
    const res = makeRes();
    await handler(req as never, res as never);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("searx.be"),
      expect.any(Object)
    );
    const body = res.body as { results: Array<{ title: string }>; source: string };
    expect(body.results[0].title).toBe("SearX Result");
    expect(body.source).toBe("searxng");
  });

  it("falls back to next SearXNG instance when first fails", async () => {
    let callCount = 0;
    const mockFetch = vi.fn().mockImplementation((url: string) => {
      callCount++;
      if (url.includes("searx.be")) {
        return Promise.reject(new Error("timeout"));
      }
      if (url.includes("search.mdosch.de")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            results: [{ title: "Second Instance", url: "https://r.com", content: "snip" }],
          }),
        });
      }
      return Promise.reject(new Error("unexpected"));
    });
    vi.stubGlobal("fetch", mockFetch);

    const { default: handler } = await import("./search.js");
    const req = { query: { q: "fallback" } } as MockRequest;
    const res = makeRes();
    await handler(req as never, res as never);

    expect(callCount).toBeGreaterThanOrEqual(2);
    const body = res.body as { results: Array<{ title: string }>; source: string };
    expect(body.results[0].title).toBe("Second Instance");
    expect(body.source).toBe("searxng");
  });

  it("falls back to DuckDuckGo when all SearXNG instances fail", async () => {
    const SEARXNG_HOSTS = ["searx.be", "search.mdosch.de", "searx.tiekoetter.com"];
    const mockFetch = vi.fn().mockImplementation((url: string) => {
      if (SEARXNG_HOSTS.some((h) => url.includes(h))) {
        return Promise.reject(new Error("timeout"));
      }
      // DDG response
      return Promise.resolve({
        ok: true,
        json: async () => ({
          AbstractText: "Duck abstract",
          Heading: "Duck Heading",
          AbstractURL: "https://ddg.example.com",
          RelatedTopics: [],
        }),
      });
    });
    vi.stubGlobal("fetch", mockFetch);

    const { default: handler } = await import("./search.js");
    const req = { query: { q: "ddg fallback" } } as MockRequest;
    const res = makeRes();
    await handler(req as never, res as never);

    const body = res.body as { results: Array<{ title: string; source: string }>; source: string };
    expect(body.source).toBe("duckduckgo");
    expect(body.results[0].title).toBe("Duck Heading");
    expect(body.results[0].source).toBe("duckduckgo");
  });

  it("sets Cache-Control header on successful SearXNG response", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [{ title: "T", url: "https://u.com", content: "s" }],
      }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const { default: handler } = await import("./search.js");
    const req = { query: { q: "cache test" } } as MockRequest;
    const res = makeRes();
    await handler(req as never, res as never);

    expect(res.headers["Cache-Control"]).toContain("s-maxage=60");
  });

  it("sets Cache-Control header on successful DuckDuckGo response", async () => {
    const SEARXNG_HOSTS = ["searx.be", "search.mdosch.de", "searx.tiekoetter.com"];
    const mockFetch = vi.fn().mockImplementation((url: string) => {
      if (SEARXNG_HOSTS.some((h) => url.includes(h))) return Promise.reject(new Error("fail"));
      return Promise.resolve({
        ok: true,
        json: async () => ({
          AbstractText: "text",
          Heading: "head",
          AbstractURL: "https://u.com",
          RelatedTopics: [],
        }),
      });
    });
    vi.stubGlobal("fetch", mockFetch);

    const { default: handler } = await import("./search.js");
    const req = { query: { q: "ddg cache" } } as MockRequest;
    const res = makeRes();
    await handler(req as never, res as never);

    expect(res.headers["Cache-Control"]).toContain("s-maxage=60");
  });
});
