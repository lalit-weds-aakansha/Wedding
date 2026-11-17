/**
 * The sound of the wedding car driving away: a small synthesised engine (a low saw/square pair plus a little road noise) whose pitch
 * climbs as the car picks up speed and whose volume falls away as it disappears down the road. Nothing is downloaded.
 *
 * Browsers only allow sound after a tap or key press, so the audio context is created on the first gesture. Until then the story is silent
 * and `audioReady()` is false (the story shows a "Tap for sound" hint); when the gesture arrives a `wedding-audio-unlocked` event is sent
 * so a drive that is already under way can start its sound for the part of the road that is left.
 */
let ctx: AudioContext | null = null;
let hooked = false;
let muted = false;
const masters = new Set<GainNode>();

/** The sound on/off button silences (or restores) the engine too. */
export function setCarMuted(m: boolean) {
  muted = m;
  masters.forEach((g) => { try { g.gain.value = m ? 0 : 1; } catch { /* ignore */ } });
}

const Ctor = () => (typeof window === "undefined" ? undefined : window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext);

export const audioReady = () => ctx?.state === "running";

/** Call from inside a tap/click/key handler. */
export async function unlockAudio(): Promise<boolean> {
  const C = Ctor();
  if (!C) return false;
  try {
    ctx ??= new C();
    await ctx.resume();
  } catch { return false; }
  const ok = ctx.state === "running";
  if (ok) window.dispatchEvent(new Event("wedding-audio-unlocked"));
  return ok;
}

/** Unlock automatically on the guest's first tap or key press anywhere. */
export function unlockOnFirstGesture() {
  if (hooked || typeof window === "undefined") return;
  hooked = true;
  void unlockAudio(); // works on its own where the browser allows sound (e.g. a returning visitor); otherwise the first tap below does it
  const on = () => { void unlockAudio(); };
  for (const e of ["pointerdown", "keydown", "touchstart"]) window.addEventListener(e, on, { once: true, passive: true });
}

/**
 * Plays the drive-away sound over `duration` seconds starting after `delay`; `from` (0..1) is how much of the road is already behind the car.
 * Returns a function that stops it. Does nothing (and returns a no-op) while audio is still locked.
 */
export function carDrive(delay: number, duration: number, from = 0): () => void {
  if (!ctx || ctx.state !== "running" || duration <= 0.2) return () => {};
  const c = ctx;
  const t0 = c.currentTime + Math.max(0, delay);
  const N = 48;
  const curve = (fn: (p: number) => number) => Float32Array.from({ length: N }, (_, i) => fn(from + (1 - from) * (i / (N - 1))));
  const smooth = (x: number) => x * x * (3 - 2 * x);
  const fSaw = curve((p) => 62 + 64 * Math.pow(p, 0.65) - 16 * smooth(Math.min(1, Math.max(0, (p - 0.78) / 0.22)))); // revs up, eases off (a little "doppler") as it leaves
  const fSqr = curve((p) => 31 + 32 * Math.pow(p, 0.65));
  const lp = curve((p) => 520 - 340 * p);                                  // gets duller with distance
  const vol = curve((p) => 0.2 * Math.pow(1 - p, 1.7) * Math.min(1, p * 14 + 0.25)); // quiet start, then fades into the distance

  const master = c.createGain();
  master.gain.value = muted ? 0 : 1;
  masters.add(master);
  const filter = c.createBiquadFilter();
  filter.type = "lowpass";
  const out = c.createGain();
  out.gain.value = 0;
  filter.connect(out); out.connect(master); master.connect(c.destination);

  const saw = c.createOscillator(); saw.type = "sawtooth";
  const sqr = c.createOscillator(); sqr.type = "square";
  const sawG = c.createGain(); sawG.gain.value = 0.55;
  const sqrG = c.createGain(); sqrG.gain.value = 0.35;
  saw.connect(sawG); sqr.connect(sqrG); sawG.connect(filter); sqrG.connect(filter);

  // a trickle of road noise
  const buf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const noise = c.createBufferSource(); noise.buffer = buf; noise.loop = true;
  const nf = c.createBiquadFilter(); nf.type = "bandpass"; nf.frequency.value = 900; nf.Q.value = 0.6;
  const ng = c.createGain(); ng.gain.value = 0.12;
  noise.connect(nf); nf.connect(ng); ng.connect(filter);

  saw.frequency.setValueCurveAtTime(fSaw, t0, duration);
  sqr.frequency.setValueCurveAtTime(fSqr, t0, duration);
  filter.frequency.setValueCurveAtTime(lp, t0, duration);
  out.gain.setValueCurveAtTime(vol, t0, duration);
  for (const n of [saw, sqr, noise]) n.start(t0);
  const end = t0 + duration + 0.1;
  for (const n of [saw, sqr, noise]) n.stop(end);

  let stopped = false;
  return () => {
    if (stopped) return;
    stopped = true;
    try { out.gain.cancelScheduledValues(c.currentTime); out.gain.setTargetAtTime(0, c.currentTime, 0.05); } catch { /* ignore */ }
    window.setTimeout(() => { for (const n of [saw, sqr, noise]) { try { n.stop(); } catch { /* already stopped */ } } master.disconnect(); masters.delete(master); }, 300);
  };
}
