import { useSystemStore } from "../stores/useSystemStore";

type SoundName = "open" | "close" | "click" | "error" | "chime";

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  try {
    if (!ctx) ctx = new AudioContext();
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

const TONES: Record<SoundName, { freq: number; dur: number; type: OscillatorType }> = {
  open:  { freq: 660, dur: 0.1,  type: "sine" },
  close: { freq: 440, dur: 0.08, type: "sine" },
  click: { freq: 520, dur: 0.06, type: "triangle" },
  error: { freq: 200, dur: 0.12, type: "square" },
  chime: { freq: 880, dur: 0.35, type: "sine" },
};

export function playSound(name: SoundName) {
  if (!useSystemStore.getState().soundEnabled) return;

  const audio = getCtx();
  if (!audio) return;

  try {
    const { freq, dur, type } = TONES[name];
    const osc = audio.createOscillator();
    const gain = audio.createGain();

    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.15, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + dur);

    osc.connect(gain).connect(audio.destination);
    osc.start(audio.currentTime);
    osc.stop(audio.currentTime + dur);
  } catch {
    // blocked by browser autoplay policy — silently ignore
  }
}
