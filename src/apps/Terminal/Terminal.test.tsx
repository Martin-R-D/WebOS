import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Terminal } from "./Terminal";
import { useFileSystemStore } from "../../stores/useFileSystemStore";
import { useSystemStore } from "../../stores/useSystemStore";
import { useWindowStore } from "../../stores/useWindowStore";
import { resetAllStores } from "../../test/resetStores";

function setup() {
  const user = userEvent.setup();
  render(<Terminal windowId="t" />);
  const input = screen.getByRole("textbox");
  const run = async (cmd: string) => {
    await user.type(input, `${cmd}{Enter}`);
  };
  return { user, input, run };
}

const fs = () => useFileSystemStore.getState();
const named = (name: string) => Object.values(fs().nodes).find((n) => n.name === name);

describe("Terminal", () => {
  beforeEach(resetAllStores);

  it("greets the user and shows the prompt for the current user and directory", () => {
    useSystemStore.getState().setUsername("ada");
    setup();
    expect(screen.getByText(/WebOS Terminal v1.0/)).toBeInTheDocument();
    expect(screen.getByText("ada@webos:/$")).toBeInTheDocument();
  });

  it("echo prints its arguments and whoami prints the username", async () => {
    useSystemStore.getState().setUsername("ada");
    const { run } = setup();
    await run("echo hello   world");
    await run("whoami");
    expect(screen.getByText("hello world")).toBeInTheDocument();
    expect(screen.getByText("ada")).toBeInTheDocument();
  });

  it("ls lists folders with a trailing slash", async () => {
    const { run } = setup();
    await run("ls");
    expect(screen.getByText(/Desktop\/\s+Documents\/\s+Pictures\/\s+System Apps\/\s+About Me\.txt/)).toBeInTheDocument();
  });

  it("cd changes directory, updates the prompt and pwd, and cd .. goes back", async () => {
    const { run } = setup();
    await run("cd Documents");
    expect(screen.getByText("Guest@webos:/Documents$")).toBeInTheDocument();
    await run("pwd");
    expect(screen.getAllByText("/Documents").length).toBeGreaterThan(0);
    await run("cd ..");
    expect(screen.getByText("Guest@webos:/$")).toBeInTheDocument();
  });

  it("cd to a missing directory shows an error and keeps the directory", async () => {
    const { run } = setup();
    await run("cd nowhere");
    expect(screen.getByText("cd: no such directory: nowhere")).toBeInTheDocument();
    expect(screen.getByText("Guest@webos:/$")).toBeInTheDocument();
  });

  it("cat prints file content and reports missing files and directories", async () => {
    const { run } = setup();
    await run("cd Documents");
    await run("cat readme.txt");
    expect(screen.getByText(/virtual file system/)).toBeInTheDocument();
    await run("cat ghost.txt");
    expect(screen.getByText("cat: no such file: ghost.txt")).toBeInTheDocument();
    await run("cd ..");
    await run("cat Documents");
    expect(screen.getByText("cat: Documents: Is a directory")).toBeInTheDocument();
  });

  it("mkdir, touch and rm modify the real file system", async () => {
    const { run } = setup();
    await run("mkdir projects");
    await run("touch notes.txt");
    expect(named("projects")?.type).toBe("folder");
    expect(named("notes.txt")).toMatchObject({ type: "file", content: "" });
    await run("rm notes.txt");
    expect(named("notes.txt")).toBeUndefined();
  });

  it("rm reports a missing target", async () => {
    const { run } = setup();
    await run("rm ghost");
    expect(screen.getByText("rm: no such file or directory: ghost")).toBeInTheDocument();
  });

  it("commands without a required argument explain what is missing", async () => {
    const { run } = setup();
    await run("cat");
    await run("mkdir");
    await run("open");
    expect(screen.getByText("cat: missing file name")).toBeInTheDocument();
    expect(screen.getByText("mkdir: missing folder name")).toBeInTheDocument();
    expect(screen.getByText(/open: missing app name/)).toBeInTheDocument();
  });

  it("open launches an app by id or display name and rejects unknown apps", async () => {
    const { run } = setup();
    await run("open calculator");
    await run("open Task Manager");
    await run("open nothing");
    expect(useWindowStore.getState().windows.map((w) => w.appId)).toEqual(["calculator", "task-manager"]);
    expect(screen.getByText("open: no app named 'nothing'")).toBeInTheDocument();
  });

  it("reports unknown commands", async () => {
    const { run } = setup();
    await run("frobnicate");
    expect(screen.getByText("command not found: frobnicate")).toBeInTheDocument();
  });

  it("clear empties the output", async () => {
    const { run } = setup();
    await run("echo visible");
    await run("clear");
    expect(screen.queryByText("visible")).not.toBeInTheDocument();
    expect(screen.queryByText(/WebOS Terminal v1.0/)).not.toBeInTheDocument();
  });

  it("help lists every supported command", async () => {
    const { run } = setup();
    await run("help");
    for (const c of ["whoami", "ls", "cd", "cat", "mkdir", "touch", "rm", "open", "neofetch"]) {
      expect(screen.getByText(new RegExp(`^${c}\\s+\\S`))).toBeInTheDocument();
    }
  });

  it("neofetch shows the user and theme", async () => {
    useSystemStore.getState().setTheme("midnight");
    const { run } = setup();
    await run("neofetch");
    expect(screen.getByText(/Theme:\s+midnight/)).toBeInTheDocument();
    expect(screen.getByText(/User:\s+Guest/)).toBeInTheDocument();
  });

  it("ArrowUp/ArrowDown walk through the command history", async () => {
    const { user, input, run } = setup();
    await run("echo one");
    await run("echo two");
    await user.type(input, "{ArrowUp}");
    expect(input).toHaveValue("echo two");
    await user.type(input, "{ArrowUp}");
    expect(input).toHaveValue("echo one");
    await user.type(input, "{ArrowDown}");
    expect(input).toHaveValue("echo two");
    await user.type(input, "{ArrowDown}");
    expect(input).toHaveValue("");
  });

  it("Tab completes a unique command prefix and file names", async () => {
    const { user, input, run } = setup();
    await user.type(input, "neo{Tab}");
    expect(input).toHaveValue("neofetch ");
    await user.clear(input);
    await run("cd Documents");
    await user.type(input, "cat rea{Tab}");
    expect(input).toHaveValue("cat readme.txt");
  });

  it("Tab on an ambiguous prefix lists the candidates", async () => {
    const { user, input } = setup();
    await user.type(input, "c{Tab}");
    expect(screen.getByText("clear cd cat")).toBeInTheDocument();
    expect(input).toHaveValue("c");
  });
});
