import { animate, motion, MotionConfig, useMotionValue, useMotionValueEvent, useTransform, type MotionValue, type Transition } from "framer-motion";
import { memo, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useLang } from "../../lib/i18n";
import { respectReducedMotion, useReduce } from "../../lib/motion";
import { LanguageToggle } from "../LanguageToggle";
import { MusicPill } from "../Header";
import { armMusic } from "../MusicPlayer";
import { SceneDefs } from "../scene/Landscape";
import { MountainScene, slow } from "../scene/MountainScene";
import { H } from "../scene/geometry";
import type { Tm } from "../scene/InviteCard";
import { EventCard } from "./Cards";
import { FormalCard } from "./FormalCard";
import { StoryDefs } from "./art";
import { BlushScene, CarnivalScene, MandapScene, NightScene } from "./EventScenes";
import { ImageScene } from "./ImageScene";
import { gardenFrames, GardenScene } from "./GardenScene";

/**
 * The cinematic story, driven by ONE clock (`time`, in seconds). Every scene is just a window on that clock:
 *
 *   0-9.6    painted mountain road, birds, car, floating card         (the mountain scene)
 *   9.2-13.8 the formal invitation card
 *   13.4+    the hanging-photo garden; the camera glides to one frame and zooms in; that frame becomes the next full scene
 *            -> Mehendi (blush room)  -> Sangeet (night stage)  -> Haldi (carnival)  -> Wedding (mandap + closing card)
 *
 * Skip (or Esc) leaves at once. With reduced motion each scene is shown still, with short cross-fades, one after another.
 */
const EASE = [0.22, 1, 0.36, 1] as const;
export const STORY_SEEN = "wedding-story-seen";
const CAR_SOUND_END = 9.0; // the engine starts at 2.6 s and runs 6.4 s (see MountainScene), so the song begins right after it
const TOTAL = 56; // the clock stops here, on the closing card

const WIN = {
  s1: [0, 10.8], s2: [10.4, 17.4],
  g1: [17.0, 22.0], e1: [19.2, 27.4],
  g2: [27.0, 32.0], e2: [29.2, 37.4],
  g3: [37.0, 42.0], e3: [39.2, 47.4],
  g4: [47.0, 52.0], e4: [49.2, 1e9],
} as const;
type Key = keyof typeof WIN;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const ramp = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
const ease = (x: number) => x * x * (3 - 2 * x); // smoothstep

/** When the camera finishes flying into the chosen picture (just as the next scene starts to grow out of it). */
const ZOOM_END: Partial<Record<Key, number>> = { g1: 19.3, g2: 29.3, g3: 39.3, g4: 49.3 };

type Kind = "plain" | "mountain" | "garden" | "event";
/** One scene on the clock: fades in and out, and (for gardens/events) moves the camera. */
function SceneLayer({ time, k, kind, origin, calm, children, fadeIn = 0.9 }: { time: MotionValue<number>; k: Key; kind: Kind; origin: [number, number]; calm: boolean; children: ReactNode; fadeIn?: number }) {
  const [a, b] = WIN[k];
  const mv = calm ? 0 : 1;
  const opacity = useTransform(time, (t) => (k === "s1" ? 1 : ease(ramp(t, a, a + fadeIn))) * (b > 1e8 ? 1 : 1 - ease(ramp(t, b - (kind === "mountain" ? 0.8 : 0.9), b))));
  const scale = useTransform(time, (t) => {
    // once the car has driven out of sight the camera magnifies the card, which becomes the formal invitation
    if (kind === "mountain") return (1 + 1.6 * ease(ramp(t, 8.9, b))) * mv + (1 - mv);
    if (kind === "event") return 1 + (0.3 - 1) * (1 - ease(ramp(t, a, a + 1.5))) * mv; // grows out of the picture frame
    if (kind === "garden") {
      const ze = ZOOM_END[k] ?? b - 0.5, zs = ze - 1.7;
      const drift = 1.04 + 0.07 * ramp(t, a, zs);
      return (drift + (6.2 - drift) * ease(ramp(t, zs, ze)) ** 1.15) * mv + (1 - mv);
    }
    return 1;
  });
  // the camera drifts, then glides so the chosen frame ends up in the middle of the screen as it zooms in
  const ze0 = ZOOM_END[k] ?? b - 0.5;
  const zoomP = (t: number) => ease(ramp(t, ze0 - 1.7, ze0));
  const x = useTransform(time, (t) => (kind === "garden" && !calm ? 26 - 52 * ramp(t, a, ze0 - 1.7) + ((50 - origin[0]) / 100) * window.innerWidth * zoomP(t) : 0));
  const y = useTransform(time, (t) => (kind === "garden" && !calm ? ((50 - origin[1]) / 100) * window.innerHeight * zoomP(t) : 0));
  return (
    <motion.div className="absolute inset-0" style={{ opacity, scale, x, y, transformOrigin: `${origin[0]}% ${origin[1]}%` }}>
      {children}
    </motion.div>
  );
}

/** The pictures as they hang in the tree: the four events in story order, then the pre-wedding portrait. Each shows the part with the couple. */
const EVENT_PICS = ["mehendi", "sangeet", "haldi", "wedding", "prewedding"].map((n) => ({ src: `/images/story/${n}.jpg`, w: 1536, h: 2304, vb: "0 230 1536 1900" }));

const Memo = {
  Garden: memo(GardenScene), Blush: memo(BlushScene), Night: memo(NightScene), Carnival: memo(CarnivalScene), Mandap: memo(MandapScene),
};

export function StoryIntro({ onLeaving, onDone }: { onLeaving: () => void; onDone: () => void }) {
  const { w, t } = useLang();
  const calm = useReduce(); // only true when the site is set to honour "reduce motion" (see opening.respectReducedMotion)

  const [aspect, setAspect] = useState(() => window.innerWidth / Math.max(1, window.innerHeight));
  useEffect(() => {
    let raf = 0;
    const on = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => setAspect(window.innerWidth / Math.max(1, window.innerHeight))); };
    window.addEventListener("resize", on);
    return () => { window.removeEventListener("resize", on); cancelAnimationFrame(raf); };
  }, []);
  const W = Math.round(Math.min(3400, Math.max(780, H * aspect)) / 40) * 40;
  const frames = useMemo(() => gardenFrames(W).focus, [W]);
  const picture = w.opening.sceneArt === "frames"; // picture files instead of the painted scenes
  const cover = aspect < 0.75;

  /* the one clock */
  const time = useMotionValue(0);
  const [now, setNow] = useState(0);
  const last = useRef(-1);
  useMotionValueEvent(time, "change", (v) => { const q = Math.floor(v * 4); if (q !== last.current) { last.current = q; setNow(v); } });
  useEffect(() => {
    const at = import.meta.env.DEV ? new URLSearchParams(window.location.search).get("storyAt") : null; // dev-only: freeze the clock to look at one moment
    if (at) { time.set(Number(at)); setNow(Number(at)); return; }
    if (!calm) {
      time.set(0);
      const c = animate(time, TOTAL, { duration: TOTAL * slow(), ease: "linear" });
      return () => c.stop();
    }
    // reduced motion: hold each scene still, cross-fade to the next
    let alive = true;
    const timers: number[] = [];
    const sleep = (ms: number) => new Promise<void>((r) => timers.push(window.setTimeout(r, ms)));
    (async () => {
      const holds = [8.8, 14.0, 24.0, 34.0, 44.0, TOTAL];
      for (let i = 0; i < holds.length; i++) {
        if (!alive) return;
        await animate(time, holds[i], { duration: i ? 0.9 : 0, ease: "linear" });
        if (i < holds.length - 1) await sleep(7000); // long enough to read each card
      }
    })();
    return () => { alive = false; timers.forEach(window.clearTimeout); };
  }, [calm, time]);

  /* leaving */
  const [leaving, setLeaving] = useState(false);
  const left = useRef(false);
  const leaveTimer = useRef<number>();
  const leave = useCallback(() => {
    if (left.current) return;
    left.current = true;
    setLeaving(true);
    onLeaving();
    try { window.sessionStorage.setItem(STORY_SEEN, "1"); window.sessionStorage.setItem("wedding-scene-seen", "1"); } catch { /* ignore */ }
    leaveTimer.current = window.setTimeout(onDone, 800);
  }, [onLeaving, onDone]);
  useEffect(() => () => window.clearTimeout(leaveTimer.current), []);
  // no button at the end: after the Wedding scene has been on screen a while, the story hands over to the page's first screen ("Explore Invitation")
  useEffect(() => {
    if (now < TOTAL) return;
    const id = window.setTimeout(leave, 6000 * slow());
    return () => window.clearTimeout(id);
  }, [now, leave]);

  const sorted = useMemo(() => [...w.events].sort((p, q) => p.start.localeCompare(q.start)), [w.events]);
  const ev = (id: string, i: number) => w.events.find((e) => e.id === id) ?? sorted[Math.min(i, sorted.length - 1)];

  useEffect(() => { if (now >= CAR_SOUND_END) armMusic(); }, [now]); // the song starts the moment the car engine has faded out (~9 s) and plays on through the site
  const on = (k: Key) => now >= WIN[k][0] - 0.6 && now <= WIN[k][1] + 0.6;
  const quick = calm; // scenes inside show their finished state with soft fades
  const tm: Tm = useCallback((delay: number, dur = 1): Transition => (calm ? { duration: 0.5, delay: Math.min(delay * 0.1, 0.7) } : { delay: delay * slow(), duration: dur * slow(), ease: EASE }), [calm]);
  const org = (i: number): [number, number] => [frames[i].ox, frames[i].oy];

  return (
    <MotionConfig reducedMotion={respectReducedMotion ? "user" : "never"}>
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={t("storyLabel")}
        className="fixed inset-0 z-[60] overflow-hidden bg-[#bcd9ee]"
        initial={{ opacity: 0 }}
        animate={{ opacity: leaving ? 0 : 1 }}
        transition={{ duration: leaving ? 0.8 : 0.6 }}
      >
        <SceneDefs /><StoryDefs />
        {on("s1") && <SceneLayer time={time} k="s1" kind="mountain" origin={[50, 33]} calm={calm}><MountainScene W={W} go quick={quick} calm={calm} tm={tm} drive="away" /></SceneLayer>}
        {on("s2") && (
          <SceneLayer time={time} k="s2" kind="plain" origin={[50, 50]} calm={calm} fadeIn={1.1}>
            <MountainScene W={W} go quick tm={tm} calm={calm} showCard={false} />
            <FormalCard calm={calm} />
          </SceneLayer>
        )}
        {(["g1", "g2", "g3", "g4"] as const).map((k, i) => on(k) && <SceneLayer key={k} time={time} k={k} kind="garden" origin={org(i)} calm={calm}><Memo.Garden W={W} pics={picture ? EVENT_PICS : undefined} /></SceneLayer>)}
        {on("e1") && <SceneLayer time={time} k="e1" kind="event" origin={[50, 50]} calm={calm}>{picture ? <ImageScene src="/images/story/mehendi.jpg" focus={26} alt={ev("mehendi", 0).title} cover={cover} /> : <Memo.Blush W={W} />}<EventCard event={ev("mehendi", 0)} calm={calm} /></SceneLayer>}
        {on("e2") && <SceneLayer time={time} k="e2" kind="event" origin={[50, 50]} calm={calm}>{picture ? <ImageScene src="/images/story/sangeet.jpg" focus={26} alt={ev("sangeet", 1).title} cover={cover} /> : <Memo.Night W={W} />}<EventCard event={ev("sangeet", 1)} calm={calm} dark /></SceneLayer>}
        {on("e3") && <SceneLayer time={time} k="e3" kind="event" origin={[50, 50]} calm={calm}>{picture ? <ImageScene src="/images/story/haldi.jpg" focus={26} alt={ev("haldi", 2).title} cover={cover} /> : <Memo.Carnival W={W} />}<EventCard event={ev("haldi", 2)} calm={calm} /></SceneLayer>}
        {on("e4") && <SceneLayer time={time} k="e4" kind="event" origin={[50, 50]} calm={calm}>{picture ? <ImageScene src="/images/story/wedding.jpg" focus={26} alt={ev("wedding", 3).title} cover={cover} /> : <Memo.Mandap W={W} />}<EventCard event={ev("wedding", 3)} calm={calm} /></SceneLayer>}

        <LanguageToggle />
        <MusicPill className="fixed right-3 top-3 z-[70]" />
        <p className="sr-only" aria-live="polite">{t("storyLabel")}</p>
      </motion.div>
    </MotionConfig>
  );
}
