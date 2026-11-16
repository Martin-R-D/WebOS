import { useEffect, useRef, useState } from "react";
import type { AppProps } from "../../types";
import { useTodoStore } from "../../stores/useTodoStore";
import { Modal } from "../../shell/Modal/Modal";
import "../../shell/FileDialogs/FileDialogs.css";
import "./TodoList.css";

const filters = ["All", "Active", "Completed"] as const;

export function TodoList({ launchProps }: AppProps) {
  const { tasks, add, edit, toggle, remove, clearCompleted } = useTodoStore();
  const [title, setTitle] = useState("");
  const [filter, setFilter] = useState<(typeof filters)[number]>("All");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [confirmation, setConfirmation] = useState<
    { id: string } | "completed" | null
  >(null);
  const [message, setMessage] = useState("");
  const rows = useRef(new Map<string, HTMLLIElement>());
  const pendingFocus = useRef<string | null>(null);
  useEffect(() => {
    const id = launchProps?.taskId;
    if (
      typeof id !== "string" ||
      !useTodoStore.getState().tasks.some((task) => task.id === id)
    )
      return;
    pendingFocus.current = id;
    setFilter("All");
  }, [launchProps?.taskId, launchProps?.navigationToken]);

  useEffect(() => {
    if (filter !== "All" || !pendingFocus.current) return;
    const row = rows.current.get(pendingFocus.current);
    if (!row) return;
    pendingFocus.current = null;
    row.scrollIntoView({ block: "center" });
    row.focus();
  }, [filter, launchProps?.navigationToken]);
  const completed = tasks.filter((task) => task.completed).length;
  const visible = tasks
    .filter(
      (task) => filter === "All" || task.completed === (filter === "Completed"),
    )
    .sort((a, b) => Number(a.completed) - Number(b.completed));

  function addTask(event: React.FormEvent) {
    event.preventDefault();
    if (!add(title)) {
      setMessage("Enter a task with 1–200 characters.");
      return;
    }
    setTitle("");
    setMessage("");
    if (filter === "Completed") setFilter("Active");
  }

  function saveTask(id: string) {
    if (!edit(id, draft)) {
      setMessage("Enter a task with 1–200 characters.");
      return;
    }
    setEditingId(null);
    setMessage("");
  }

  function confirmDelete() {
    if (confirmation === "completed") clearCompleted();
    else if (confirmation) {
      remove(confirmation.id);
      if (editingId === confirmation.id) setEditingId(null);
    }
    setConfirmation(null);
  }

  return (
    <section className="todos" aria-label="To-Do List">
      <form className="todos__add" onSubmit={addTask}>
        <label>
          New task
          <input
            value={title}
            maxLength={200}
            placeholder="What needs to be done?"
            onChange={(event) => setTitle(event.target.value)}
          />
        </label>
        <button type="submit">Add task</button>
      </form>
      <nav className="todos__filters" aria-label="Task filters">
        {filters.map((name) => (
          <button
            key={name}
            aria-pressed={name === filter}
            onClick={() => setFilter(name)}
          >
            {name} (
            {name === "All"
              ? tasks.length
              : name === "Active"
                ? tasks.length - completed
                : completed}
            )
          </button>
        ))}
      </nav>
      <p>
        {completed} of {tasks.length} tasks completed
      </p>
      <p role="status">{message}</p>
      <ul className="todos__list">
        {visible.map((task) => (
          <li
            key={task.id}
            className="todos__row"
            tabIndex={-1}
            data-search-target={
              launchProps?.taskId === task.id ? "true" : undefined
            }
            ref={(element) => {
              if (element) rows.current.set(task.id, element);
              else rows.current.delete(task.id);
            }}
          >
            <input
              type="checkbox"
              aria-label={`Complete ${task.title}`}
              checked={task.completed}
              onChange={() => toggle(task.id)}
            />
            {editingId === task.id ? (
              <div className="todos__edit">
                <label>
                  Edit task
                  <input
                    autoFocus
                    value={draft}
                    maxLength={200}
                    onChange={(event) => setDraft(event.target.value)}
                  />
                </label>
                <button onClick={() => saveTask(task.id)}>Save</button>
                <button onClick={() => setEditingId(null)}>Cancel</button>
              </div>
            ) : (
              <>
                <span className={task.completed ? "todos__done" : ""}>
                  {task.title}
                </span>
                <button
                  aria-label={`Edit ${task.title}`}
                  onClick={() => {
                    setEditingId(task.id);
                    setDraft(task.title);
                    setMessage("");
                  }}
                >
                  Edit
                </button>
              </>
            )}
            <button
              aria-label={`Delete ${task.title}`}
              onClick={() => setConfirmation({ id: task.id })}
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
      {visible.length === 0 && (
        <p>
          {tasks.length === 0
            ? "No tasks yet. Add your first task above."
            : filter === "Completed"
              ? "No completed tasks."
              : "No active tasks."}
        </p>
      )}
      {completed > 0 && (
        <button onClick={() => setConfirmation("completed")}>
          Clear completed
        </button>
      )}
      {confirmation && (
        <Modal
          className="fd-overlay"
          label="Confirm task deletion"
          onClose={() => setConfirmation(null)}
        >
          <section
            className="fd-dialog"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="fd-content">
              <p>
                {confirmation === "completed"
                  ? `Delete ${completed} completed tasks?`
                  : "Delete this task?"}
              </p>
              <button className="fd-btn" onClick={confirmDelete}>
                Confirm delete
              </button>
              <button className="fd-btn" onClick={() => setConfirmation(null)}>
                Cancel
              </button>
            </div>
          </section>
        </Modal>
      )}
    </section>
  );
}
