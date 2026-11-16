import { useEffect, useRef, useState } from "react";
import type { Slide } from "../slidesModel";
import { audienceMessage } from "./audience";

interface Connection {
  channel: BroadcastChannel;
  popup: Window;
}

function dispose(connection: Connection | null) {
  if (!connection) return;
  try {
    connection.channel.postMessage({ type: "end" });
  } catch {
    /* The other window may already be closed. */
  }
  connection.channel.close();
  if (!connection.popup.closed) connection.popup.close();
}

export function useAudience(slide: Slide, index: number, count: number) {
  const connection = useRef<Connection | null>(null);
  const latest = useRef(audienceMessage(slide, index, count));
  const [connected, setConnected] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    latest.current = audienceMessage(slide, index, count);
    connection.current?.channel.postMessage(latest.current);
  }, [slide, index, count]);

  useEffect(() => () => dispose(connection.current), []);

  useEffect(() => {
    if (!connected) return;
    const interval = window.setInterval(() => {
      if (!connection.current?.popup.closed) return;
      dispose(connection.current);
      connection.current = null;
      setConnected(false);
      setStatus("Audience window closed.");
    }, 500);
    return () => clearInterval(interval);
  }, [connected]);

  function open() {
    if (!window.BroadcastChannel) {
      setStatus("Audience synchronization is unavailable in this browser.");
      return;
    }
    dispose(connection.current);
    connection.current = null;
    const session = crypto.randomUUID();
    const channel = new BroadcastChannel(`webos-presentation:${session}`);
    channel.onmessage = (event) => {
      if (event.data?.type === "ready") channel.postMessage(latest.current);
    };
    const url = new URL(window.location.href);
    url.search = "";
    url.hash = "";
    url.searchParams.set("office-presentation", session);
    const popup = window.open(
      url.href,
      `webos-audience-${session}`,
      "popup,width=1100,height=750",
    );
    if (!popup) {
      channel.close();
      setConnected(false);
      setStatus(
        "The browser blocked the audience window. Allow popups and try again.",
      );
      return;
    }
    connection.current = { channel, popup };
    setConnected(true);
    setStatus("Audience window connected. Notes stay in presenter view.");
  }

  return { open, connected, status };
}
