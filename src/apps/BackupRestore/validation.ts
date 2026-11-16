import type { FsNode } from "../../types";
import { appRegistry } from "../registry";
import {
  decodeDocument,
  officeKind,
  type OfficeKind,
} from "../Office/documents";
import { validateWriterContent } from "../Office/writerContent";
import { validateSlidesContent } from "../Office/slidesModel";
import { validateWorkbook } from "../Office/sheets/model";
import { categories } from "../UnitConverter/conversion";
import { audioId } from "../../lib/audioStorage";

type Check = (value: unknown) => boolean;
const record = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);
const text: Check = (value) =>
  typeof value === "string" && value.length <= 8_000_000;
const identifier: Check = (value) =>
  typeof value === "string" &&
  value.length > 0 &&
  value.length <= 200 &&
  !["__proto__", "constructor", "prototype"].includes(value);
const number: Check = (value) =>
  typeof value === "number" && Number.isFinite(value);
const title: Check = (value) =>
  typeof value === "string" && value.trim().length > 0 && value.length <= 200;
const bool: Check = (value) => typeof value === "boolean";
const choice =
  (...values: unknown[]): Check =>
  (value) =>
    values.includes(value);
const array =
  (check: Check): Check =>
  (value) =>
    Array.isArray(value) && value.length <= 10000 && value.every(check);
const shape =
  (fields: Record<string, Check>): Check =>
  (value) =>
    record(value) &&
    Object.keys(value).every((key) => Object.hasOwn(fields, key)) &&
    Object.entries(fields).every(([key, check]) => check(value[key]));
const optional =
  (check: Check): Check =>
  (value) =>
    value === undefined || check(value);
const idList = array(text);
const rows =
  (fields: Record<string, Check>): Check =>
  (value) =>
    array(shape(fields))(value) &&
    new Set((value as Record<string, unknown>[]).map((row) => row.id)).size ===
      (value as unknown[]).length;
const dictionary =
  (check: Check): Check =>
  (value) =>
    record(value) && Object.values(value).every(check);
const durations = shape({ focus: number, short: number, long: number });
const storeChecks: Record<string, { version: number; check: Check }> = {
  "webos-notes": {
    version: 2,
    check: shape({
      notes: rows({
        id: identifier,
        text,
        color: text,
        createdAt: number,
        pinned: bool,
      }),
    }),
  },
  "webos-todos": {
    version: 1,
    check: shape({
      tasks: rows({
        id: identifier,
        title,
        completed: bool,
        createdAt: number,
      }),
    }),
  },
  "webos-calendar": {
    version: 0,
    check: shape({
      events: rows({
        id: identifier,
        title: text,
        date: (value) =>
          typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value),
        color: text,
        startTime: optional(text),
        endTime: optional(text),
        description: optional(text),
      }),
    }),
  },
  "webos-system": {
    version: 1,
    check: shape({
      theme: choice("dark", "light", "midnight"),
      followSystemTheme: bool,
      wallpaper: text,
      username: text,
      accentColor: text,
      soundEnabled: bool,
      locked: bool,
      pinnedApps: array(
        (value) =>
          typeof value === "string" && Object.hasOwn(appRegistry, value),
      ),
      desktopIconPos: dictionary(shape({ x: number, y: number })),
    }),
  },
  "webos-weather": {
    version: 0,
    check: shape({
      city: text,
      country: text,
      latitude: number,
      longitude: number,
      unit: choice("C", "F"),
    }),
  },
  "webos-editor-settings": {
    version: 0,
    check: shape({
      fontSize: choice(12, 14, 16, 18),
      fontFamily: choice("monospace", "sans-serif"),
      lineWrap: bool,
    }),
  },
  "webos-explorer-settings": {
    version: 1,
    check: shape({
      sort: choice("name", "type", "modified"),
      descending: bool,
    }),
  },
  "webos-recent-files": {
    version: 1,
    check: shape({
      entries: array(shape({ fileId: text, accessedAt: number })),
    }),
  },
  "webos-bookmarks": {
    version: 1,
    check: shape({
      bookmarks: rows({
        id: identifier,
        title: text,
        url: (value) =>
          typeof value === "string" && /^https?:\/\//i.test(value),
      }),
    }),
  },
  "webos-calculator-history": {
    version: 1,
    check: shape({
      entries: rows({
        id: identifier,
        expression: text,
        result: number,
        createdAt: number,
      }),
    }),
  },
  "webos-converter": {
    version: 1,
    check: shape({
      category: (value) =>
        typeof value === "string" && Object.hasOwn(categories, value),
      pairs: (value) =>
        record(value) &&
        Object.entries(value).every(
          ([key, pair]) =>
            record(pair) &&
            categories[key]?.units.some((unit) => unit.id === pair.from) ===
              true &&
            categories[key]?.units.some((unit) => unit.id === pair.to) === true,
        ),
    }),
  },
  "webos-profile": {
    version: 1,
    check: shape({
      profile: shape({
        name: text,
        initials: text,
        tagline: text,
        bio: text,
        email: text,
        socials: array(shape({ label: text, url: text })),
        skills: idList,
        projects: array(
          shape({ title: text, description: text, tags: idList, url: text }),
        ),
      }),
    }),
  },
  "webos-focus": {
    version: 0,
    check: (value) =>
      shape({
        phase: choice("focus", "short", "long"),
        status: choice("idle", "running", "paused"),
        durations,
        remaining: number,
        endsAt: (item) => item === null || number(item),
        sound: bool,
        completed: array(shape({ day: text, minutes: number })),
        cycle: number,
      })(value) &&
      record(value) &&
      record(value.durations) &&
      Object.values(value.durations).every(
        (item) => typeof item === "number" && item >= 1 && item <= 180,
      ),
  },
  "webos-widgets": {
    version: 0,
    check: shape({
      widgets: rows({
        id: identifier,
        kind: choice("clock", "calendar", "tasks", "weather"),
        x: number,
        y: number,
        large: bool,
        hour12: bool,
      }),
    }),
  },
  "webos-music": {
    version: 0,
    check: (value) =>
      shape({
        playlists: rows({ id: identifier, name: text, files: idList }),
        volume: (item) => typeof item === "number" && item >= 0 && item <= 1,
        repeat: choice("off", "all", "one"),
        shuffle: bool,
      })(value),
  },
};

export interface Backup {
  format: "webos-backup";
  version: 1;
  createdAt: number;
  stores: Record<string, string>;
  audio: { id: string; type: string; data: string }[];
}
const recoveryPrefix = "webos-office-recovery:";
export function eligible(key: string) {
  return (
    key === "webos-filesystem" ||
    Object.hasOwn(storeChecks, key) ||
    key.startsWith(recoveryPrefix)
  );
}
function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
function validateOffice(raw: string, expected?: OfficeKind) {
  const parsed: unknown = JSON.parse(raw);
  assert(
    record(parsed) && choice("writer", "slides", "sheets")(parsed.kind),
    "Invalid Office document.",
  );
  const doc = decodeDocument(raw, expected ?? (parsed.kind as OfficeKind));
  ({
    writer: validateWriterContent,
    slides: validateSlidesContent,
    sheets: validateWorkbook,
  })[doc.kind](doc.content);
}
export function validateBackup(value: unknown): Backup {
  assert(
    record(value) &&
      value.format === "webos-backup" &&
      value.version === 1 &&
      number(value.createdAt) &&
      record(value.stores) &&
      Array.isArray(value.audio),
    "Unsupported or invalid WebOS backup.",
  );
  const stores = value.stores;
  assert(Object.keys(stores).length <= 1000, "Too many backup sections.");
  let fs: Record<string, unknown> | null = null;
  for (const [key, raw] of Object.entries(stores)) {
    assert(eligible(key) && typeof raw === "string", "Unknown backup section.");
    const wrapper: unknown = JSON.parse(raw);
    if (key.startsWith(recoveryPrefix)) {
      assert(
        shape({
          key: text,
          name: text,
          document: text,
          fileId: (item) => item === null || text(item),
          updatedAt: number,
        })(wrapper) &&
          record(wrapper) &&
          key === recoveryPrefix + wrapper.key,
        "Invalid recovery draft.",
      );
      validateOffice(wrapper.document as string);
      continue;
    }
    assert(
      record(wrapper) &&
        record(wrapper.state) &&
        Number.isInteger(wrapper.version ?? 0),
      `Invalid ${key} section.`,
    );
    if (key === "webos-filesystem") {
      assert(
        wrapper.version === 16,
        "This backup uses an unsupported filesystem version.",
      );
      fs = wrapper.state;
    } else {
      const rule = storeChecks[key];
      assert(
        (wrapper.version ?? 0) === rule.version && rule.check(wrapper.state),
        `Invalid ${key} data.`,
      );
    }
  }
  assert(
    fs &&
      typeof fs.rootId === "string" &&
      record(fs.nodes) &&
      record(fs.deletedNodes),
    "Backup filesystem is missing or invalid.",
  );
  assert(
    Object.keys(fs).every((key) =>
      ["nodes", "rootId", "deletedNodes"].includes(key),
    ),
    "Unexpected filesystem fields.",
  );
  const nodes = fs.nodes;
  const deleted = fs.deletedNodes;
  const all: Record<string, FsNode> = {};
  const nodeCheck = shape({
    id: identifier,
    name: text,
    type: choice("file", "folder"),
    parentId: (item) => item === null || text(item),
    content: optional(text),
    createdAt: number,
    updatedAt: number,
  });
  for (const [id, entry] of Object.entries(deleted)) {
    assert(
      shape({
        node: nodeCheck,
        originalParentId: text,
        originalPath: text,
        deletedAt: number,
      })(entry) && record(entry),
      "Invalid deleted file.",
    );
    all[id] = entry.node as FsNode;
  }
  for (const [id, node] of Object.entries(nodes)) {
    assert(
      nodeCheck(node) && !Object.hasOwn(all, id),
      "Invalid or duplicate file.",
    );
    all[id] = node as unknown as FsNode;
  }
  assert(
    Object.keys(all).length <= 10000 &&
      all[fs.rootId]?.type === "folder" &&
      all[fs.rootId]?.parentId === null,
    "Invalid filesystem root.",
  );
  const media = new Set<string>();
  for (const [id, node] of Object.entries(all)) {
    assert(node.id === id && identifier(id), "Invalid file ID.");
    if (Object.hasOwn(nodes, id) && id !== fs.rootId)
      assert(
        node.parentId &&
          Object.hasOwn(nodes, node.parentId) &&
          all[node.parentId].type === "folder",
        "File has a missing parent folder.",
      );
    const seen = new Set<string>();
    let current: FsNode | undefined = node;
    while (current) {
      assert(!seen.has(current.id), "Cyclic folder structure.");
      seen.add(current.id);
      current = all[current.parentId ?? ""];
    }
    const kind = officeKind(node.name);
    if (kind && node.type === "file") validateOffice(node.content ?? "", kind);
    const reference = audioId(node.content);
    if (reference) media.add(reference);
  }
  assert(value.audio.length <= 1000, "Too many audio files.");
  let bytes = 0;
  const audioSeen = new Set<string>();
  for (const item of value.audio) {
    assert(
      record(item) &&
        typeof item.id === "string" &&
        media.has(item.id) &&
        !audioSeen.has(item.id) &&
        typeof item.type === "string" &&
        item.type.length < 100 &&
        typeof item.data === "string" &&
        /^[A-Za-z0-9+/]*={0,2}$/.test(item.data) &&
        item.data.length % 4 === 0,
      "Invalid audio entry.",
    );
    const size = atob(item.data).length;
    assert(size > 0 && size <= 20 * 1024 * 1024, "Invalid audio file size.");
    bytes += size;
    audioSeen.add(item.id);
  }
  assert(
    bytes <= 128 * 1024 * 1024 && media.size === audioSeen.size,
    "Missing audio files or backup exceeds audio storage limit.",
  );
  return value as unknown as Backup;
}
