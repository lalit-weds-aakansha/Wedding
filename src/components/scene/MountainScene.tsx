import { animate, motion, useMotionValue, useMotionValueEvent, type MotionValue } from "framer-motion";
import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { CarArt, Clouds, FarMountains, Ground, Layer, MidHills, Sky } from "./Landscape";
import { H, makeRoad } from "./geometry";
import { carDrive, unlockOnFirstGesture } from "../../lib/carSound";
import { InviteCard, type Tm } from "./InviteCard";

/** Test hook only: `window.__sceneSlow = 5` plays the opening five times slower so single frames can be inspected. */
export const slow = () => (typeof window !== "undefined" && Number((window as unknown as { __sceneSlow?: number }).__sceneSlow)) || 1;

/** Flock of dark bird silhouettes crossing the sky once. */
export function Birds({ W, go, tm }: { W: number; go: boolean; tm: Tm }) {
  const birds = useMemo(() => Array.from({ length: 9 }, (_, i) => ({ y: 330 + ((i * 53) % 90) + (i % 3) * 18, dx: (i % 3) * 38, s: 0.95 - (i % 4) * 0.1 })), []);
  return (
    <Layer W={W}>
      {birds.map((b, i) => (
        <motion.g
          key={i}
          initial={{ x: -140 - b.dx, y: b.y, opacity: 0, scale: b.s }}
          animate={go ? { x: [-140 - b.dx, W * 0.38, W * 0.75, W + 220], y: [b.y, b.y - 70, b.y - 130 - i * 4, b.y - 230], opacity: [0, 1, 1, 0], scale: [b.s, b.s * 0.9, b.s * 0.7, b.s * 0.45] } : {}}
          transition={{ ...(tm(1.6 + i * 0.16 + (i % 2) * 0.1, 8.5 + (i % 3) * 0.5) as object), times: [0, 0.35, 0.8, 1], ease: "easeInOut" }}
        >
          <g className="bird-flap" style={{ animationDelay: `${(i % 4) * 0.12}s` }}>
            <path d="M-15,0Q-8,-11 0,-1Q8,-11 15,0Q8,-5 0,4Q-8,-5 -15,0Z" fill="#2c2a31" transform="scale(1.7)" />
          </g>
        </motion.g>
      ))}
    </Layer>
  );
}

export type Parallax = { sky: MotionValue<number>; cloud: MotionValue<number>; far: MotionValue<number>; mid: MotionValue<number>; ground: MotionValue<number>; card: MotionValue<number>; cardFade: MotionValue<number> };
const Par = ({ mv, children, className = "" }: { mv?: MotionValue<number>; children: ReactNode; className?: string }) =>
  mv ? <motion.div className={`absolute inset-0 ${className}`} style={{ y: mv }}>{children}</motion.div> : <div className={`absolute inset-0 ${className}`}>{children}</div>;

/**
 * The painted mountain morning: sky, clouds, birds, mountains, hills, the road that draws itself, the car that drives up it, and the
 * floating invitation card. Used both as the first scene of the story and as the page's resting hero.
 */
export function MountainScene({ W, go, quick, calm, tm, par, drive = "rest", showCard = true }: { W: number; go: boolean; quick: boolean; calm: boolean; tm: Tm; par?: Parallax; drive?: "rest" | "away"; showCard?: boolean }) {
  // "away": the car follows the road to its end, shrinking with distance until it is gone. "rest": it stops in the foreground.
  const away = drive === "away" && !quick;
  const road = useMemo(() => makeRoad(W), [W]);
  const layer = (delay: number, dur: number, y = 26) => ({ initial: { opacity: 0, y }, animate: go ? { opacity: 1, y: 0 } : { opacity: 0, y }, transition: tm(delay, dur) });

  /* the car drives up the road, then rests in the foreground */
  const carRef = useRef<SVGGElement>(null);
  const u = useMotionValue(quick ? 1 : 0);
  const place = (v: number) => {
    const g = carRef.current;
    if (!g) return;
    const tt = -0.32 + v * (away ? 1.32 : 0.49);
    const p = road.P(tt);
    const s = (0.8 * road.w(tt)) / 300;
    const t2 = Math.min(tt + 0.01, 0.999), t1 = Math.min(tt, 0.989);
    const raw = Math.atan2(road.x(t2) - road.x(t1), road.y(t1) - road.y(t2)) * (180 / Math.PI) * 0.6;
    const ang = Number.isFinite(raw) ? Math.max(-5, Math.min(5, raw)) : 0;
    g.setAttribute("opacity", away ? String(Math.max(0, Math.min(1, (0.99 - tt) / 0.1))) : "1"); // fades out at the very end of the road
    g.setAttribute("transform", `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) rotate(${ang.toFixed(2)}) scale(${s.toFixed(3)})`);
  };
  useMotionValueEvent(u, "change", place);
  useEffect(() => {
    if (!go) { u.set(quick ? 1 : 0); place(quick ? 1 : 0); return; }
    if (quick) { u.set(1); place(1); return; }
    u.set(0); place(0);
    const c = away
      ? animate(u, 1, { delay: 2.6 * slow(), duration: 6.4 * slow(), ease: [0.3, 0.05, 0.5, 1] })
      : animate(u, 1, { delay: 3.0 * slow(), duration: 3.6 * slow(), ease: [0.45, 0.05, 0.3, 1] });
    // the engine sound follows the same journey; if sound is still locked it starts for the rest of the road once the guest taps
    let stopSound = () => {};
    const t0 = performance.now();
    const startSound = () => {
      stopSound();
      if (!away) return;
      const d0 = 2.6 * slow(), total = 6.4 * slow(), el = (performance.now() - t0) / 1000;
      const done = Math.max(0, el - d0) / total;
      if (done < 0.97) stopSound = carDrive(Math.max(0, d0 - el), total * (1 - done), done);
    };
    unlockOnFirstGesture();
    startSound();
    window.addEventListener("wedding-audio-unlocked", startSound);
    return () => { c.stop(); stopSound(); window.removeEventListener("wedding-audio-unlocked", startSound); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [go, quick, road, away]);

  return (
    <div className="absolute inset-0">
      <Par mv={par?.sky}><motion.div className="absolute inset-0" initial={{ opacity: 0 }} animate={go ? { opacity: 1 } : {}} transition={tm(0, 1.5)}><Sky W={W} /></motion.div></Par>
      <Par mv={par?.cloud}>
        <motion.div className="absolute inset-0" {...layer(0.4, 2, 0)}><div className="scene-drift absolute inset-y-0 -inset-x-10"><Clouds W={W} /></div></motion.div>
        <Birds W={W} go={go && !quick} tm={tm} />
      </Par>
      <Par mv={par?.far}><motion.div className="absolute inset-0" {...layer(0.9, 1.6, 30)}><FarMountains W={W} /></motion.div></Par>
      <Par mv={par?.mid}><motion.div className="absolute inset-0" {...layer(1.4, 1.6, 34)}><MidHills W={W} /></motion.div></Par>
      <Par mv={par?.ground}>
        <motion.div className="absolute inset-0" {...layer(1.9, 1.6, 40)}>
          <Ground
            ref={carRef}
            W={W}
            road={road}
            roadReveal={<motion.path d={road.centerPath} stroke="#fff" strokeWidth="1400" fill="none" initial={{ pathLength: 0 }} animate={go ? { pathLength: 1 } : { pathLength: 0 }} transition={tm(2.0, 2.7)} />}
          >
            <g className="car-bob"><CarArt /></g>
          </Ground>
        </motion.div>
      </Par>
      <Layer W={W}><rect width={W} height={H} filter="url(#grain)" opacity=".16" style={{ mixBlendMode: "multiply" }} /></Layer>
      {showCard && (
      <Par mv={par?.card}>
        {par ? <motion.div className="absolute inset-0" style={{ opacity: par.cardFade }}><InviteCard go={go} tm={tm} calm={calm} /></motion.div> : <InviteCard go={go} tm={tm} calm={calm} />}
      </Par>
      )}
    </div>
  );
}
