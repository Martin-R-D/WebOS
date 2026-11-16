import { useEffect, useRef, useState } from "react";
import type { AppProps } from "../../types";
import { useFileSystemStore } from "../../stores/useFileSystemStore";
import { useMusicStore } from "../../stores/useMusicStore";
import {
  audioEntries,
  audioId,
  deleteAudio,
  getAudio,
  putAudio,
} from "../../lib/audioStorage";
import "./Music.css";

export function Music({ launchProps }: AppProps) {
  const { nodes, rootId } = useFileSystemStore();
  const preferences = useMusicStore();
  const [selected, setSelected] = useState<string | null>(
    typeof launchProps?.fileId === "string" ? launchProps.fileId : null,
  );
  const [playlist, setPlaylist] = useState("all");
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [muted, setMuted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const audio = useRef<HTMLAudioElement>(null);
  const autoplay = useRef(false);
  const tracks = Object.values(nodes).filter(
    (node) => node.type === "file" && audioId(node.content),
  );
  const list = preferences.playlists.find((item) => item.id === playlist);
  const queue = tracks.filter(
    (track) => playlist === "all" || list?.files.includes(track.id),
  );
  const current = nodes[selected ?? ""];
  const mediaId = audioId(current?.content);

  useEffect(() => {
    if (typeof launchProps?.fileId === "string") {
      autoplay.current = false;
      setSelected(launchProps.fileId);
    }
  }, [launchProps?.fileId]);
  useEffect(() => {
    const element = audio.current;
    if (!element) return;
    let disposed = false;
    let url: string | null = null;
    element.pause();
    element.removeAttribute("src");
    element.load();
    setDuration(0);
    setPosition(0);
    setPlaying(false);
    if (mediaId)
      getAudio(mediaId)
        .then((blob) => {
          if (disposed) return;
          if (!blob) {
            setMessage("This audio file is unavailable. Import it again.");
            return;
          }
          url = URL.createObjectURL(blob);
          element.src = url;
          if (autoplay.current)
            void element
              .play()
              .catch(() => setMessage("Press Play to start playback."));
        })
        .catch(() => {
          if (!disposed) setMessage("Could not read audio storage.");
        });
    return () => {
      disposed = true;
      element.pause();
      element.removeAttribute("src");
      element.load();
      if (url) URL.revokeObjectURL(url);
    };
  }, [mediaId]);
  useEffect(() => {
    if (audio.current) {
      audio.current.volume = preferences.volume;
      audio.current.muted = muted;
    }
  }, [preferences.volume, muted]);

  function choose(id: string) {
    setMessage("");
    autoplay.current = true;
    if (id === selected)
      void audio.current
        ?.play()
        .catch(() => setMessage("Unable to play this audio format."));
    else setSelected(id);
  }
  function advance(direction: number, ended = false) {
    if (!queue.length) return;
    const index = queue.findIndex((track) => track.id === selected);
    if (ended && preferences.repeat === "one") {
      if (audio.current) {
        audio.current.currentTime = 0;
        void audio.current
          .play()
          .catch(() => setMessage("Press Play to continue."));
      }
      return;
    }
    if (
      ended &&
      preferences.repeat === "off" &&
      !preferences.shuffle &&
      index === queue.length - 1
    )
      return;
    let next =
      index < 0 ? 0 : (index + direction + queue.length) % queue.length;
    if (preferences.shuffle && queue.length > 1)
      next =
        (Math.max(0, index) +
          1 +
          Math.floor(Math.random() * (queue.length - 1))) %
        queue.length;
    choose(queue[next].id);
  }
  async function importFiles(files: FileList | null) {
    if (!files) return;
    const selectedFiles = Array.from(files);
    setBusy(true);
    setMessage("");
    let imported = 0;
    try {
      let total = (await audioEntries()).reduce(
        (sum, entry) => sum + entry.blob.size,
        0,
      );
      for (const file of selectedFiles) {
        if (
          !/\.(mp3|wav|ogg|m4a|aac|webm|flac)$/i.test(file.name) ||
          file.size === 0 ||
          file.size > 20 * 1024 * 1024
        )
          throw new Error(
            "Choose audio files up to 20 MB each (MP3, WAV, OGG, M4A, AAC, WebM or FLAC).",
          );
        if (total + file.size > 128 * 1024 * 1024)
          throw new Error(
            "Audio storage limit is 128 MB. Remove unused tracks from the Recycle Bin to free space.",
          );
        const fs = useFileSystemStore.getState();
        const folder = Object.values(fs.nodes).find(
          (node) =>
            node.type === "folder" &&
            node.parentId === rootId &&
            node.name === "Music",
        );
        const folderId = folder?.id ?? fs.createNode(rootId, "Music", "folder");
        if (!folderId)
          throw new Error(
            "A file named Music prevents creating the Music folder.",
          );
        if (
          Object.values(fs.nodes).some(
            (node) => node.parentId === folderId && node.name === file.name,
          )
        )
          throw new Error(`“${file.name}” already exists in Music.`);
        const id = crypto.randomUUID();
        await putAudio(id, file);
        const before = useFileSystemStore.getState().nodes;
        try {
          const fileId = fs.createNode(
            folderId,
            file.name,
            "file",
            `webos-audio:${id}`,
          );
          if (!fileId) throw new Error("A file with this name already exists.");
        } catch (error) {
          try {
            useFileSystemStore.setState({ nodes: before });
          } catch {
            /* Memory is restored even if persistence remains full. */
          }
          await deleteAudio([id]);
          throw error;
        }
        total += file.size;
        imported++;
      }
      setMessage(`Imported ${imported} track(s).`);
    } catch (error) {
      setMessage(
        `${imported ? `Imported ${imported} track(s). ` : ""}${error instanceof Error ? error.message : "Import failed. Storage may be full."}`,
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="music">
      <div className="music__toolbar">
        <label>
          Import audio
          <input
            aria-label="Import audio"
            type="file"
            accept="audio/*,.mp3,.wav,.ogg,.m4a,.flac"
            multiple
            disabled={busy}
            onChange={(event) => {
              void importFiles(event.target.files);
              event.target.value = "";
            }}
          />
        </label>
        <label>
          Library
          <select
            aria-label="Music playlist"
            value={playlist}
            onChange={(event) => setPlaylist(event.target.value)}
          >
            <option value="all">All tracks</option>
            {preferences.playlists.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="music__toolbar">
        <input
          aria-label="Playlist name"
          placeholder="Playlist name"
          maxLength={80}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <button
          disabled={!name.trim()}
          onClick={() => {
            preferences.create(name);
            setName("");
          }}
        >
          Create playlist
        </button>
        {list && (
          <>
            <button
              disabled={!name.trim()}
              onClick={() => {
                preferences.rename(list.id, name);
                setName("");
              }}
            >
              Rename playlist
            </button>
            <button
              onClick={() => {
                preferences.remove(list.id);
                setPlaylist("all");
              }}
            >
              Delete playlist
            </button>
          </>
        )}
      </div>
      <div className="music__library">
        {!queue.length && (
          <p>No tracks here. Import audio or add tracks to this playlist.</p>
        )}
        {queue.map((track) => (
          <div className="music__track" key={track.id}>
            <button
              aria-pressed={selected === track.id}
              onClick={() => choose(track.id)}
            >
              {track.name}
            </button>
            {list ? (
              <button
                aria-label={`Remove ${track.name} from playlist`}
                onClick={() => preferences.removeTrack(list.id, track.id)}
              >
                Remove
              </button>
            ) : (
              <select
                aria-label={`Add ${track.name} to playlist`}
                value=""
                onChange={(event) =>
                  preferences.addTrack(event.target.value, track.id)
                }
              >
                <option value="">Add to playlist…</option>
                {preferences.playlists.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        ))}
      </div>
      <div className="music__player">
        <strong>{current?.name ?? "Choose a track"}</strong>
        <audio
          ref={audio}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onLoadedMetadata={() =>
            setDuration(
              Number.isFinite(audio.current?.duration)
                ? audio.current!.duration
                : 0,
            )
          }
          onTimeUpdate={() => setPosition(audio.current?.currentTime ?? 0)}
          onEnded={() => {
            setPlaying(false);
            advance(1, true);
          }}
          onError={() =>
            setMessage("Unable to play this audio format in this browser.")
          }
        />
        <label>
          Position
          <input
            aria-label="Playback position"
            type="range"
            min="0"
            max={duration || 1}
            step="0.1"
            value={Math.min(position, duration || 1)}
            disabled={!duration}
            onChange={(event) => {
              if (audio.current) {
                audio.current.currentTime = Number(event.target.value);
                setPosition(Number(event.target.value));
              }
            }}
          />
        </label>
        <span>
          {Math.floor(position)} / {Math.floor(duration)} seconds
        </span>
        <div className="music__toolbar">
          <button disabled={!queue.length} onClick={() => advance(-1)}>
            Previous
          </button>
          <button
            disabled={!mediaId}
            onClick={() => {
              if (playing) audio.current?.pause();
              else
                void audio.current
                  ?.play()
                  .catch(() =>
                    setMessage(
                      "Unable to start playback. Choose a supported audio file.",
                    ),
                  );
            }}
          >
            {playing ? "Pause" : "Play"}
          </button>
          <button disabled={!queue.length} onClick={() => advance(1)}>
            Next
          </button>
          <button aria-pressed={muted} onClick={() => setMuted(!muted)}>
            Mute
          </button>
          <label>
            Volume
            <input
              aria-label="Volume"
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={preferences.volume}
              onChange={(event) =>
                preferences.settings({ volume: Number(event.target.value) })
              }
            />
          </label>
          <label>
            Repeat
            <select
              value={preferences.repeat}
              onChange={(event) =>
                preferences.settings({
                  repeat: event.target.value as "off" | "all" | "one",
                })
              }
            >
              <option value="off">Off</option>
              <option value="all">All</option>
              <option value="one">One</option>
            </select>
          </label>
          <label>
            <input
              type="checkbox"
              checked={preferences.shuffle}
              onChange={(event) =>
                preferences.settings({ shuffle: event.target.checked })
              }
            />
            Shuffle
          </label>
        </div>
      </div>
      {message && <p role="status">{message}</p>}
    </div>
  );
}
