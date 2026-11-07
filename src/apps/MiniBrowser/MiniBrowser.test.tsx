import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MiniBrowser, normalize } from "./MiniBrowser";
import { useWindowStore } from "../../stores/useWindowStore";
import { resetAllStores } from "../../test/resetStores";

function renderBrowser() {
  const winId = useWindowStore.getState().openWindow({
    appId: "browser",
    title: "Browser",
    icon: "Globe",
    width: 800,
    height: 600,
  });
  return render(<MiniBrowser windowId={winId} />);
}

describe("normalize", () => {
  it("returns the start page for empty input", () => {
    expect(normalize("")).toBe("webos://start");
    expect(normalize("   ")).toBe("webos://start");
  });

  it("passes through full URLs unchanged", () => {
    expect(normalize("https://example.com")).toBe("https://example.com");
    expect(normalize("http://example.com/path")).toBe("http://example.com/path");
  });

  it("prepends https:// to domain-like input", () => {
    expect(normalize("example.com")).toBe("https://example.com");
    expect(normalize("docs.google.com/something")).toBe("https://docs.google.com/something");
  });

  it("returns a webos search URL for plain text queries", () => {
    expect(normalize("hello world")).toBe("webos://search?q=hello%20world");
    expect(normalize("what is javascript")).toBe("webos://search?q=what%20is%20javascript");
  });

  it("returns the start page for webos://start", () => {
    expect(normalize("webos://start")).toBe("webos://start");
  });
});

describe("MiniBrowser", () => {
  beforeEach(() => {
    resetAllStores();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the start page with clock, search box, and speed dial", () => {
    renderBrowser();
    expect(screen.getByPlaceholderText("Search the web…")).toBeInTheDocument();
    expect(screen.getByText("Wikipedia")).toBeInTheDocument();
    expect(screen.getByText("OpenStreetMap")).toBeInTheDocument();
    expect(screen.getByText("MDN Play")).toBeInTheDocument();
    expect(screen.getByText("Archive.org")).toBeInTheDocument();
    expect(screen.getByText("OpenLibrary")).toBeInTheDocument();
  });

  it("typing a search query calls /api/search and renders results", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [
          { title: "Test Result", url: "https://example.com", snippet: "A test snippet", source: "web" },
        ],
        query: "test query",
        source: "searxng",
      }),
    });
    vi.stubGlobal("fetch", mockFetch);

    renderBrowser();
    await userEvent.type(screen.getByPlaceholderText("Search the web…"), "test query{Enter}");

    await waitFor(() => {
      expect(screen.getByText("Test Result")).toBeInTheDocument();
    });
    expect(screen.getByText("A test snippet")).toBeInTheDocument();
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining("/api/search?q=test%20query"));
  });

  it("clicking a search result navigates the browser to that URL", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [
          { title: "Example Site", url: "https://example.com", snippet: "An example", source: "web" },
        ],
        query: "example",
        source: "searxng",
      }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const { container } = renderBrowser();
    await userEvent.type(screen.getByPlaceholderText("Search the web…"), "example{Enter}");

    await waitFor(() => {
      expect(screen.getByText("Example Site")).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText("Example Site"));

    await waitFor(() => {
      const iframe = container.querySelector("iframe");
      expect(iframe).not.toBeNull();
      expect(iframe!.src).toContain("https://example.com");
    });
  });

  it("falls back to Wikipedia when /api/search returns empty results", async () => {
    const mockFetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/api/search")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ results: [], query: "quantum", source: "searxng" }),
        });
      }
      // Wikipedia opensearch
      return Promise.resolve({
        ok: true,
        json: async () => [
          "quantum",
          ["Quantum mechanics"],
          ["Study of matter at atomic scales"],
          ["https://en.wikipedia.org/wiki/Quantum_mechanics"],
        ],
      });
    });
    vi.stubGlobal("fetch", mockFetch);

    renderBrowser();
    await userEvent.type(screen.getByPlaceholderText("Search the web…"), "quantum{Enter}");

    await waitFor(() => {
      expect(screen.getByText("Quantum mechanics")).toBeInTheDocument();
    });
  });

  it("falls back to Wikipedia when /api/search fails", async () => {
    const mockFetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/api/search")) {
        return Promise.reject(new Error("Network error"));
      }
      return Promise.resolve({
        ok: true,
        json: async () => [
          "cats",
          ["Cat"],
          ["A small domesticated carnivore"],
          ["https://en.wikipedia.org/wiki/Cat"],
        ],
      });
    });
    vi.stubGlobal("fetch", mockFetch);

    renderBrowser();
    await userEvent.type(screen.getByPlaceholderText("Search the web…"), "cats{Enter}");

    await waitFor(() => {
      expect(screen.getByText("Cat")).toBeInTheDocument();
    });
  });

  it("shows speed dial when no search is active", () => {
    renderBrowser();
    expect(screen.getByPlaceholderText("Search the web…")).toBeInTheDocument();
    expect(screen.getByText("Wikipedia")).toBeInTheDocument();
  });

  it("hides speed dial and shows results header when search is active", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [{ title: "Result", url: "https://r.com", snippet: "s", source: "web" }],
        query: "foo",
        source: "searxng",
      }),
    });
    vi.stubGlobal("fetch", mockFetch);

    renderBrowser();
    await userEvent.type(screen.getByPlaceholderText("Search the web…"), "foo{Enter}");

    await waitFor(() => {
      expect(screen.getByText(/Results for/i)).toBeInTheDocument();
    });
    expect(screen.queryByPlaceholderText("Search the web…")).not.toBeInTheDocument();
  });

  it("navigates via the URL bar", async () => {
    const { container } = renderBrowser();
    const urlBar = screen.getByPlaceholderText("Search or enter address");
    await userEvent.type(urlBar, "example.com{Enter}");
    const iframe = container.querySelector("iframe");
    expect(iframe!.src).toContain("https://example.com");
  });

  it("back button is disabled on the start page", () => {
    renderBrowser();
    const backBtn = screen.getByTitle("Back");
    expect(backBtn).toBeDisabled();
  });

  it("home button returns to start page", async () => {
    renderBrowser();
    const urlBar = screen.getByPlaceholderText("Search or enter address");
    await userEvent.type(urlBar, "example.com{Enter}");
    expect(screen.queryByPlaceholderText("Search the web…")).not.toBeInTheDocument();

    await userEvent.click(screen.getByTitle("Home"));
    expect(screen.getByPlaceholderText("Search the web…")).toBeInTheDocument();
  });

  it("clicking a speed dial tile navigates to that site", async () => {
    const { container } = renderBrowser();
    await userEvent.click(screen.getByText("Wikipedia"));
    const iframe = container.querySelector("iframe");
    expect(iframe!.src).toContain("https://www.wikipedia.org");
  });
});
