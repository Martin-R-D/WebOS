import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
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

  it("searches DuckDuckGo Lite for plain text queries", () => {
    expect(normalize("hello world")).toBe("https://lite.duckduckgo.com/lite/?q=hello%20world");
    expect(normalize("what is javascript")).toBe("https://lite.duckduckgo.com/lite/?q=what%20is%20javascript");
  });

  it("returns the start page for webos://start", () => {
    expect(normalize("webos://start")).toBe("webos://start");
  });
});

describe("MiniBrowser", () => {
  beforeEach(resetAllStores);

  it("renders the start page with clock, search box, and speed dial", () => {
    renderBrowser();
    expect(screen.getByPlaceholderText("Search the web…")).toBeInTheDocument();
    expect(screen.getByText("Wikipedia")).toBeInTheDocument();
    expect(screen.getByText("OpenStreetMap")).toBeInTheDocument();
    expect(screen.getByText("MDN Play")).toBeInTheDocument();
    expect(screen.getByText("Archive.org")).toBeInTheDocument();
    expect(screen.getByText("OpenLibrary")).toBeInTheDocument();
  });

  it("navigates to DuckDuckGo Lite when typing a search query", async () => {
    const { container } = renderBrowser();
    const searchBox = screen.getByPlaceholderText("Search the web…");
    await userEvent.type(searchBox, "test query{Enter}");
    const iframe = container.querySelector("iframe");
    expect(iframe).toBeInTheDocument();
    expect(iframe!.src).toBe("https://lite.duckduckgo.com/lite/?q=test%20query");
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
    const searchBox = screen.getByPlaceholderText("Search the web…");
    await userEvent.type(searchBox, "test{Enter}");
    expect(screen.queryByPlaceholderText("Search the web…")).not.toBeInTheDocument();

    const homeBtn = screen.getByTitle("Home");
    await userEvent.click(homeBtn);
    expect(screen.getByPlaceholderText("Search the web…")).toBeInTheDocument();
  });

  it("clicking a speed dial tile navigates to that site", async () => {
    const { container } = renderBrowser();
    await userEvent.click(screen.getByText("Wikipedia"));
    const iframe = container.querySelector("iframe");
    expect(iframe!.src).toContain("https://www.wikipedia.org");
  });
});
