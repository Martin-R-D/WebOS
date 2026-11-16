import { useNotificationStore } from "../../stores/useNotificationStore";
import { useState } from "react";
import { Modal } from "../Modal/Modal";
import { appRegistry } from "../../apps/registry";
import { useFileSystemStore } from "../../stores/useFileSystemStore";
import { useNotesStore } from "../../stores/useNotesStore";
import { useTodoStore } from "../../stores/useTodoStore";
import { searchIndex } from "./searchIndex";
import type { SearchCategory } from "./searchIndex";
import { activateResult } from "./activateResult";
import "./SystemSearch.css";

const categories = {
  apps: "Apps",
  files: "Files",
  notes: "Notes",
  tasks: "Tasks",
};

export function SystemSearch({ onClose }: { onClose: () => void }) {
  const nodes = useFileSystemStore((state) => state.nodes);
  const notes = useNotesStore((state) => state.notes);
  const tasks = useTodoStore((state) => state.tasks);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<SearchCategory | "all">("all");
  const [limit, setLimit] = useState(50);
  const results = searchIndex(query, {
    apps: Object.values(appRegistry),
    nodes,
    notes,
    tasks,
  }).filter((result) => category === "all" || result.category === category);

  return (
    <Modal className="system-search" label="Search WebOS" onClose={onClose}>
      <header>
        <h1>Search WebOS</h1>
        <button onClick={onClose}>Close search</button>
      </header>
      <label>
        Search apps, files, notes and tasks
        <input
          autoFocus
          aria-label="Search WebOS content"
          placeholder="What are you looking for?"
          maxLength={200}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setLimit(50);
          }}
        />
      </label>
      <select
        aria-label="Search category"
        value={category}
        onChange={(event) => {
          setCategory(event.target.value as SearchCategory | "all");
          setLimit(50);
        }}
      >
        <option value="all">All categories</option>
        {Object.entries(categories).map(([id, label]) => (
          <option key={id} value={id}>
            {label}
          </option>
        ))}
      </select>
      {!query.trim() ? (
        <p>Type to search apps, filenames, note text and task titles.</p>
      ) : !results.length ? (
        <p role="status">No matching results.</p>
      ) : (
        <>
          <p role="status">{results.length} results</p>
          {(Object.keys(categories) as SearchCategory[]).map((category) => {
            const group = results.filter(
              (result) => result.category === category,
            );
            if (!group.length) return null;
            return (
              <section
                key={category}
                aria-label={`${categories[category]} results`}
              >
                <h2>
                  {categories[category]} ({group.length})
                </h2>
                <ul>
                  {group.slice(0, limit).map((result) => (
                    <li key={result.id}>
                      <button
                        onClick={() => {
                          onClose();
                          window.setTimeout(() => {
                            try {
                              activateResult(result);
                            } catch (cause) {
                              useNotificationStore.getState().push({
                                title: "Search",
                                message:
                                  cause instanceof Error
                                    ? cause.message
                                    : "Unable to open this result.",
                                icon: "Search",
                              });
                            }
                          }, 0);
                        }}
                      >
                        <strong>{result.title}</strong>
                        <span>{result.detail}</span>
                      </button>
                    </li>
                  ))}
                </ul>
                {group.length > limit && (
                  <button onClick={() => setLimit((value) => value + 50)}>
                    Show more {categories[category].toLowerCase()}
                  </button>
                )}
              </section>
            );
          })}
        </>
      )}
    </Modal>
  );
}
