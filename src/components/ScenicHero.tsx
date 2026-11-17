import { MotionConfig, motion, useScroll, useTransform, type Transition } from "framer-motion";
import { ArrowRight, ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLang } from "../lib/i18n";
import { respectReducedMotion, useReduce } from "../lib/motion";
import { FloatingPetals } from "./FloatingPetals";
import { startMusic } from "./MusicPlayer";
import { SceneDefs } from "./scene/Landscape";
import { MountainScene, slow } from "./scene/MountainScene";
import { H } from "./scene/geometry";
import type { Tm } from "./scene/InviteCard";

/**
 * The page's hero: the painted mountain morning with the floating invitation card and the "Explore" button.
 *
 *  - `instant`: show the finished scene at once (used after the cinematic story has already played)
 *  - otherwise it plays its own ~8 s opening once per browser session; "Skip animation" jumps to the finished scene
 *  - reduced motion: the finished scene with soft fades, and a button to play the full animation
 */
const EASE = [0.22, 1, 0.36, 1] as const;
const SEEN = "wedding-scene-seen";
const seenBefore = () => { try { return !!window.sessionStorage.getItem(SEEN); } catch { return false; } };

export function ScenicHero({ onOpen, ready, instant = false }: { onOpen: () => void; ready: boolean; instant?: boolean }) {
  const { t } = useLang();
  const osReduced = useReduce();               // only true when the site is set to honour "reduce motion"
  const [skipped, setSkipped] = useState(seenBefore);
  const [round, setRound] = useState(0);           // bumps to replay from the start
  const calm = osReduced;
  const quick = calm || skipped || instant;     // no choreography: finished scene with a soft fade
  const go = ready;

  // the scene is as tall as ever but as wide as the screen, so nothing is stretched
  const [aspect, setAspect] = useState(() => (typeof window === "undefined" ? 0.5 : window.innerWidth / Math.max(1, window.innerHeight)));
  useEffect(() => {
    let raf = 0;
    const on = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => setAspect(window.innerWidth / Math.max(1, window.innerHeight))); };
    window.addEventListener("resize", on);
    return () => { window.removeEventListener("resize", on); cancelAnimationFrame(raf); };
  }, []);
  const W = Math.round(Math.min(3400, Math.max(780, H * aspect)) / 40) * 40;

  const tm: Tm = (delay, dur = 1): Transition =>
    quick ? { duration: calm ? 0.5 : 0.01, delay: calm ? Math.min(delay * 0.1, 0.7) : 0 } : { delay: delay * slow(), duration: dur * slow(), ease: EASE };

  /* skip button lives for the length of the opening, then the scene is marked as seen */
  const [showSkip, setShowSkip] = useState(false);
  useEffect(() => {
    if (!go || quick) return;
    setShowSkip(true);
    const a = window.setTimeout(() => { setShowSkip(false); try { window.sessionStorage.setItem(SEEN, "1"); } catch { /* ignore */ } }, 9500);
    return () => window.clearTimeout(a);
  }, [go, quick, round]);
  const skip = () => { setSkipped(true); setRound((n) => n + 1); setShowSkip(false); try { window.sessionStorage.setItem(SEEN, "1"); } catch { /* ignore */ } };

  /* parallax: farther layers drift down more slowly than the page scrolls */
  const box = useRef<HTMLElement>(null);
  const { scrollYProgress: p } = useScroll({ target: box, offset: ["start start", "end start"] });
  const k = calm ? 0 : 1;
  const par = {
    sky: useTransform(p, [0, 1], [0, 300 * k]),
    cloud: useTransform(p, [0, 1], [0, 250 * k]),
    far: useTransform(p, [0, 1], [0, 190 * k]),
    mid: useTransform(p, [0, 1], [0, 120 * k]),
    ground: useTransform(p, [0, 1], [0, 40 * k]),
    card: useTransform(p, [0, 1], [0, 110 * k]),
    cardFade: useTransform(p, [0.1, 0.7], [1, 0]),
  };
  const veil = useTransform(p, [0.45, 1], [0, 1]);

  const open = () => { startMusic(); onOpen(); }; // music starts inside this tap so mobile browsers allow it

  return (
    <MotionConfig reducedMotion={respectReducedMotion ? "user" : "never"}>
      <section ref={box} id="home" aria-label={t("heroSceneLabel")} className="relative h-[100svh] min-h-[560px] overflow-hidden bg-[#bcd9ee]" key={round}>
        <SceneDefs />
        <MountainScene W={W} go={go} quick={quick} calm={calm} tm={tm} par={par} />
        {go && !quick && <FloatingPetals count={6} contained />}

        {/* call to action and scroll cue */}
        <motion.div className="absolute inset-x-0 bottom-[34%] z-[4] flex flex-col items-center gap-2 px-4" initial={{ opacity: 0, y: 14 }} animate={go ? { opacity: 1, y: 0 } : {}} transition={tm(8.0, 0.9)}>
          <button type="button" onClick={open} className="btn btn-maroon pulse-ring min-h-[60px] w-[min(88vw,420px)] justify-center px-10 text-[1.05rem] shadow-xl">{t("exploreInvitation")} <ArrowRight size={16} aria-hidden /></button>
          {!calm && <ChevronDown aria-hidden className="scroll-cue text-white drop-shadow" size={26} />}
        </motion.div>

        {/* controls */}
        {showSkip && go && (
          <button type="button" onClick={skip} className="btn btn-ghost absolute right-3 top-[4.1rem] z-[6] !min-h-[40px] !bg-white/70 !px-4 !py-1.5 !text-[0.75rem]">{t("skipAnimation")}</button>
        )}
        {/* as the guest scrolls on, the scene melts into the ivory page */}
        <motion.div aria-hidden className="pointer-events-none absolute inset-0 z-[5] bg-ivory" style={{ opacity: veil }} />
      </section>
    </MotionConfig>
  );
}
