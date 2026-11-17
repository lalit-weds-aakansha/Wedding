import { AnimatePresence, motion } from "framer-motion";
import { Pause, Play, Volume1, Volume2, VolumeX, X } from "lucide-react";
import { useEffect, useSyncExternalStore } from "react";
import { wedding } from "../config/wedding";
import { setCarMuted } from "../lib/carSound";
import { Monogram } from "./Ornaments";

/**
 * Background music singleton. `startMusic()` is called synchronously inside the
 * "Open Invitation" tap so iOS/Android allow playback. A missing file hides all controls.
 */
let audio: HTMLAudioElement | null = null;
let wantPlay = false;
let userPaused = false; // the guest pressed pause: never start the music again on its own
const VOLUME = 0.5;     // a comfortable level
let fade: number | undefined;
let available = Boolean(wedding.music.src);
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function getAudio() {
  if (!audio && available && typeof Audio !== "undefined") {
    audio = new Audio(wedding.music.src);
    audio.loop = true;
    audio.preload = "auto";
    audio.volume = VOLUME;
    audio.addEventListener("error", () => { available = false; emit(); });
    ["play", "pause", "volumechange"].forEach((ev) => audio!.addEventListener(ev, emit));
    // Pause in the background (locked phone / switched app), resume when back if the guest had it on.
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) audio?.pause();
      else if (wantPlay) audio?.play().catch(() => {});
    });
  }
  return audio;
}

/** Ease the volume up (or down) so the song never starts with a jolt. */
function fadeTo(a: HTMLAudioElement, to: number, ms: number) {
  window.clearInterval(fade);
  const from = a.volume, t0 = performance.now();
  fade = window.setInterval(() => {
    const k = Math.min(1, (performance.now() - t0) / ms);
    a.volume = from + (to - from) * k;
    if (k >= 1) window.clearInterval(fade);
  }, 50);
}

/** Call from inside a tap or key press (browsers refuse sound otherwise). Safe to call again: it never restarts a song that is playing. */
export function startMusic() {
  const a = getAudio();
  if (!a) return;
  userPaused = false;
  if (!a.paused) { wantPlay = true; return; }
  wantPlay = true;
  a.volume = 0;
  a.play().then(() => fadeTo(a, VOLUME, 1600)).catch(() => { wantPlay = false; a.volume = VOLUME; emit(); }); // blocked or failed: stay quietly paused
}

let armed = false;
let musicArmed = false;
/**
 * "Music may begin now" (the story calls this when it reaches its second page; the site calls it straight away when there is no story).
 * It tries to start the song by itself; if the browser blocks sound until a first touch, it starts on the visitor's first tap or key press.
 */
export function armMusic() {
  if (musicArmed) return;
  musicArmed = true;
  if (!getAudio()) return;
  startMusic();
  startMusicOnFirstGesture();
}

/** Start the music on the visitor's first tap or key press anywhere (not on the music button itself, which has its own job). */
export function startMusicOnFirstGesture() {
  if (armed || typeof window === "undefined") return;
  armed = true;
  const events = ["pointerup", "click", "keydown", "touchend"];
  const on = (e: Event) => {
    if ((e.target as Element | null)?.closest?.("[data-music-control]")) return;
    if (e.type === "keydown" && (e as KeyboardEvent).key === "Escape") return;
    events.forEach((n) => window.removeEventListener(n, on, true));
    if (!userPaused && !wantPlay) startMusic();
  };
  events.forEach((n) => window.addEventListener(n, on, true));
}

export function toggleMusic() {
  const a = getAudio();
  if (!a) return;
  if (a.paused) { setCarMuted(false); startMusic(); }
  else { setCarMuted(true); userPaused = true; wantPlay = false; window.clearInterval(fade); a.pause(); a.volume = VOLUME; }
}

const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
const snap = () => `${available}|${audio ? !audio.paused : false}|${audio?.volume ?? 0.6}|${audio?.muted ?? false}`;

export function useMusic() {
  const s = useSyncExternalStore(subscribe, snap).split("|");
  // Create the element early so a missing file hides the button before guests see it.
  useEffect(() => { getAudio(); }, []);
  return { available: s[0] === "true", playing: s[1] === "true", volume: Number(s[2]), muted: s[3] === "true" };
}

/** Small animated equaliser / note icon for the header button. */
export function MusicIcon({ playing }: { playing: boolean }) {
  return playing ? (
    <span className="flex h-4 items-end gap-[3px]" aria-hidden>
      {[0, 1, 2].map((i) => (
        <motion.span key={i} className="w-[3px] rounded bg-current"
          animate={{ height: [5, 15, 7, 12, 5] }} transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.18 }} />
      ))}
    </span>
  ) : (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <path d="M9 18V5l11-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="17" cy="16" r="3" />
    </svg>
  );
}

export function MusicPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { playing, volume, muted } = useMusic();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const setVolume = (v: number) => { if (audio) { audio.volume = v; audio.muted = v === 0; } };
  const VolIcon = muted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-label="Music player"
          initial={{ opacity: 0, y: -8, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.97 }}
          transition={{ duration: 0.2 }}
          className="fixed right-3 top-16 z-50 w-[min(19rem,calc(100vw-1.5rem))] rounded-2xl bg-[#2b2622] p-4 text-[#f6efe4] shadow-2xl"
        >
          <button type="button" onClick={onClose} aria-label="Close music player" className="absolute right-2 top-2 grid h-9 w-9 place-items-center rounded-full hover:bg-white/10">
            <X size={16} />
          </button>
          <div className="flex items-center gap-3 pr-8">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-[#f3d3c8] to-[#d9a59c]">
              <Monogram className="text-xl text-accent" />
            </div>
            <div className="min-w-0">
              <p className="truncate font-display text-base font-semibold">{wedding.music.title}</p>
              <p className="truncate text-sm opacity-70">{wedding.music.artist}</p>
            </div>
          </div>
          <div className="mt-3 flex justify-center">
            <button type="button" onClick={toggleMusic} aria-label={playing ? "Pause music" : "Play music"}
              className="grid h-12 w-12 place-items-center rounded-full bg-[#f6efe4] text-[#2b2622] transition hover:scale-105">
              {playing ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-0.5" />}
            </button>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <button type="button" onClick={() => audio && (audio.muted = !audio.muted)} aria-label={muted ? "Unmute" : "Mute"} aria-pressed={muted}
              className="grid h-9 w-9 place-items-center rounded-full hover:bg-white/10">
              <VolIcon size={18} />
            </button>
            <input type="range" min={0} max={1} step={0.05} value={muted ? 0 : volume} aria-label="Volume"
              onChange={(e) => setVolume(Number(e.target.value))} className="range h-1 flex-1" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
