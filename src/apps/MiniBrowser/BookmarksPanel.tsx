import { useState } from "react";
import { useBookmarksStore } from "../../stores/useBookmarksStore";
import "./BookmarksPanel.css";

export function BookmarksPanel({
  currentUrl,
  onNavigate,
  onClose,
}: {
  currentUrl: string;
  onNavigate: (url: string) => void;
  onClose: () => void;
}) {
  const { bookmarks, save, remove } = useBookmarksStore();
  const [editingId, setEditingId] = useState<string | undefined>();
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState(
    currentUrl.startsWith("http") ? currentUrl : "",
  );
  const [error, setError] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  function clearForm() {
    setEditingId(undefined);
    setTitle("");
    setUrl("");
    setError("");
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const problem = save(title, url, editingId);
    if (problem) {
      setError(problem);
      return;
    }
    clearForm();
  }

  return (
    <section className="bookmarks" aria-label="Bookmarks">
      <header>
        <h2>Bookmarks</h2>
        <button onClick={onClose}>Close bookmarks</button>
      </header>
      <form onSubmit={submit}>
        <label>
          Bookmark name
          <input
            value={title}
            maxLength={80}
            onChange={(event) => setTitle(event.target.value)}
          />
        </label>
        <label>
          Website address
          <input
            type="text"
            inputMode="url"
            value={url}
            maxLength={2048}
            placeholder="https://example.com"
            onChange={(event) => setUrl(event.target.value)}
          />
        </label>
        <p role="status">{error}</p>
        <div>
          <button type="submit">
            {editingId ? "Save bookmark" : "Add bookmark"}
          </button>
          {editingId && (
            <button type="button" onClick={clearForm}>
              Cancel edit
            </button>
          )}
        </div>
      </form>
      {bookmarks.length === 0 && <p>No bookmarks yet.</p>}
      <ul>
        {bookmarks.map((item) => (
          <li key={item.id}>
            <button
              className="bookmarks__open"
              onClick={() => {
                onNavigate(item.url);
                onClose();
              }}
            >
              <strong>{item.title}</strong>
              <span>{item.url}</span>
            </button>
            <div className="bookmarks__actions">
              <button
                aria-label={`Edit ${item.title}`}
                onClick={() => {
                  setEditingId(item.id);
                  setTitle(item.title);
                  setUrl(item.url);
                  setError("");
                }}
              >
                Edit
              </button>
              <button
                aria-label={`Remove ${item.title}`}
                onClick={() => setDeleteId(item.id)}
              >
                Remove
              </button>
            </div>
            {deleteId === item.id && (
              <div>
                <p>Remove this bookmark?</p>
                <button
                  onClick={() => {
                    remove(item.id);
                    setDeleteId(null);
                    if (editingId === item.id) clearForm();
                  }}
                >
                  Confirm remove
                </button>
                <button onClick={() => setDeleteId(null)}>
                  Cancel removal
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
