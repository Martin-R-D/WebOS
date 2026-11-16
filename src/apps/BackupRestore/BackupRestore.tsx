import { useState } from "react";
import { createBackup, downloadBackup, restoreBackup } from "./backup";
import { validateBackup, type Backup } from "./validation";
import "./BackupRestore.css";
export function BackupRestore() {
  const [backup, setBackup] = useState<Backup | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  async function exportWorkspace() {
    setBusy(true);
    setMessage("");
    try {
      downloadBackup(await createBackup());
      setMessage("Backup downloaded.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not export workspace.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function inspect(file?: File) {
    if (!file) return;
    setBusy(true);
    setBackup(null);
    setConfirmed(false);
    setMessage("");
    try {
      if (file.size > 200 * 1024 * 1024)
        throw new Error("Backup files must be smaller than 200 MB.");
      setBackup(validateBackup(JSON.parse(await file.text())));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Invalid backup.");
    } finally {
      setBusy(false);
    }
  }
  async function restore() {
    if (!backup || !confirmed) return;
    setBusy(true);
    setMessage("");
    try {
      await restoreBackup(backup);
      location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Restore failed.");
      setBusy(false);
    }
  }
  const fs = backup
    ? JSON.parse(backup.stores["webos-filesystem"]).state
    : null;
  function count(key: string, field: string): number {
    return backup?.stores[key]
      ? JSON.parse(backup.stores[key]).state[field].length
      : 0;
  }
  return (
    <section className="backup-restore">
      <h2>Backup &amp; Restore</h2>
      <p>
        Download files, Office recovery drafts, notes, tasks, calendar events,
        playlists, audio, widgets, and saved preferences in one backup. Open
        window layouts and notifications are excluded.
      </p>
      <button disabled={busy} onClick={() => void exportWorkspace()}>
        Download current workspace
      </button>
      <label>
        Choose backup
        <input
          type="file"
          accept=".json,application/json"
          disabled={busy}
          onChange={(event) => {
            void inspect(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
      </label>
      {backup && (
        <div className="backup-restore__preview">
          <h3>Restore preview</h3>
          <dl>
            <dt>Created</dt>
            <dd>{new Date(backup.createdAt).toLocaleString()}</dd>
            <dt>Format</dt>
            <dd>WebOS backup version {backup.version}</dd>
            <dt>Saved files and folders</dt>
            <dd>{Object.keys(fs.nodes).length}</dd>
            <dt>Deleted items</dt>
            <dd>{Object.keys(fs.deletedNodes).length}</dd>
            <dt>Notes</dt>
            <dd>{count("webos-notes", "notes")}</dd>
            <dt>Tasks</dt>
            <dd>{count("webos-todos", "tasks")}</dd>
            <dt>Audio files</dt>
            <dd>{backup.audio.length}</dd>
            <dt>Data sections</dt>
            <dd>{Object.keys(backup.stores).length}</dd>
          </dl>
          <p>
            Restoring replaces your current saved workspace. Download it first
            if you want to keep a copy. Save and close document editors, Paint,
            and Music before restoring.
          </p>
          <label>
            <input
              type="checkbox"
              checked={confirmed}
              disabled={busy}
              onChange={(event) => setConfirmed(event.target.checked)}
            />
            I understand this replaces my current workspace.
          </label>
          <div>
            <button
              disabled={busy || !confirmed}
              onClick={() => void restore()}
            >
              Replace workspace and reload
            </button>
            <button
              disabled={busy}
              onClick={() => {
                setBackup(null);
                setConfirmed(false);
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      {message && <p role="status">{message}</p>}
      {busy && <p role="status">Working…</p>}
    </section>
  );
}
