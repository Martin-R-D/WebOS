import { useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import { Plugin, PluginKey, TextSelection } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { closeHistory } from "@tiptap/pm/history";
import { findMatches } from "./matches";

const key = new PluginKey("writerFind");

export function FindReplace({
  editor,
  onClose,
}: {
  editor: Editor;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [replacement, setReplacement] = useState("");
  const [matchCase, setMatchCase] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [index, setIndex] = useState(0);
  const [, setRevision] = useState(0);
  const options = useRef({ query, matchCase, wholeWord, index });
  options.current = { query, matchCase, wholeWord, index };
  const matches = findMatches(editor.state.doc, {
    query,
    matchCase,
    wholeWord,
  });
  const currentIndex = matches.length ? Math.min(index, matches.length - 1) : 0;

  useEffect(() => {
    editor.registerPlugin(
      new Plugin({
        key,
        props: {
          decorations(state) {
            const current = options.current;
            const found = findMatches(state.doc, current);
            return DecorationSet.create(
              state.doc,
              found.map((match, position) =>
                Decoration.inline(match.from, match.to, {
                  class:
                    position === Math.min(current.index, found.length - 1)
                      ? "writer__match writer__match--current"
                      : "writer__match",
                }),
              ),
            );
          },
        },
      }),
    );
    const refresh = ({
      transaction,
    }: {
      transaction: { docChanged: boolean };
    }) => {
      if (transaction.docChanged) setRevision((value) => value + 1);
    };
    editor.on("transaction", refresh);
    return () => {
      editor.off("transaction", refresh);
      editor.unregisterPlugin(key);
    };
  }, [editor]);

  useEffect(() => {
    editor.view.dispatch(editor.state.tr.setMeta(key, true));
  }, [editor, query, matchCase, wholeWord, index]);

  function navigate(direction: number) {
    if (!matches.length) return;
    const next = (currentIndex + direction + matches.length) % matches.length;
    setIndex(next);
    const match = matches[next];
    editor.view.dispatch(
      editor.state.tr
        .setSelection(
          TextSelection.create(editor.state.doc, match.from, match.to),
        )
        .scrollIntoView(),
    );
  }

  function replace(all: boolean) {
    const selected = all
      ? matches
      : matches.slice(currentIndex, currentIndex + 1);
    if (!selected.length) return;
    let transaction = closeHistory(editor.state.tr);
    for (const match of [...selected].reverse()) {
      if (replacement)
        transaction = transaction.replaceWith(
          match.from,
          match.to,
          editor.schema.text(
            replacement,
            editor.state.doc.resolve(match.from).marks(),
          ),
        );
      else transaction = transaction.delete(match.from, match.to);
    }
    editor.view.dispatch(transaction);
    editor.view.dispatch(closeHistory(editor.state.tr));
  }

  return (
    <div className="office__toolbar writer__find" aria-label="Find and replace">
      <label>
        Find{" "}
        <input
          autoFocus
          aria-label="Find text"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setIndex(0);
          }}
        />
      </label>
      <label>
        <input
          type="checkbox"
          checked={matchCase}
          onChange={(event) => {
            setMatchCase(event.target.checked);
            setIndex(0);
          }}
        />
        Match case
      </label>
      <label>
        <input
          type="checkbox"
          checked={wholeWord}
          onChange={(event) => {
            setWholeWord(event.target.checked);
            setIndex(0);
          }}
        />
        Whole word
      </label>
      <span role="status">
        {matches.length
          ? `${currentIndex + 1} of ${matches.length}`
          : "0 matches"}
      </span>
      <button disabled={!matches.length} onClick={() => navigate(-1)}>
        Previous match
      </button>
      <button disabled={!matches.length} onClick={() => navigate(1)}>
        Next match
      </button>
      <label>
        Replace with{" "}
        <input
          aria-label="Replacement text"
          value={replacement}
          onChange={(event) => setReplacement(event.target.value)}
        />
      </label>
      <button disabled={!matches.length} onClick={() => replace(false)}>
        Replace
      </button>
      <button disabled={!matches.length} onClick={() => replace(true)}>
        Replace All
      </button>
      <button onClick={onClose}>Close search</button>
    </div>
  );
}
