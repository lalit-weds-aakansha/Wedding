import { motion, type Transition } from "framer-motion";
import { useMemo } from "react";
import { coupleNames } from "../../config/wedding";
import { fmtLong, fmtTime } from "../../lib/dates";
import { useLang } from "../../lib/i18n";

const EASE = [0.22, 1, 0.36, 1] as const;
const rise = (calm: boolean, delay: number, y = 12) => ({
  initial: { opacity: 0, y: calm ? 0 : y },
  animate: { opacity: 1, y: 0 },
  transition: { duration: calm ? 0.5 : 0.9, delay: calm ? delay * 0.3 : delay, ease: EASE } as Transition,
});

/** A rectangle outline with postage-stamp perforations: half-circles cut into every edge. */
function perforated(w: number, h: number, r: number, step: number) {
  const nx = Math.max(2, Math.floor((w - 4 * r) / step)), ny = Math.max(2, Math.floor((h - 4 * r) / step));
  const sx = (w - 2 * r) / nx, sy = (h - 2 * r) / ny;
  let d = `M${r},0`;
  for (let i = 0; i < nx; i++) { const x = r + sx * (i + 0.5); d += `L${x - r * 0.9},0A${r * 0.9},${r * 0.9} 0 0 0 ${x + r * 0.9},0`; }
  d += `L${w - r},0L${w},${r}`;
  for (let i = 0; i < ny; i++) { const y = r + sy * (i + 0.5); d += `L${w},${y - r * 0.9}A${r * 0.9},${r * 0.9} 0 0 0 ${w},${y + r * 0.9}`; }
  d += `L${w},${h - r}L${w - r},${h}`;
  for (let i = nx - 1; i >= 0; i--) { const x = r + sx * (i + 0.5); d += `L${x + r * 0.9},${h}A${r * 0.9},${r * 0.9} 0 0 0 ${x - r * 0.9},${h}`; }
  d += `L${r},${h}L0,${h - r}`;
  for (let i = ny - 1; i >= 0; i--) { const y = r + sy * (i + 0.5); d += `L0,${y + r * 0.9}A${r * 0.9},${r * 0.9} 0 0 0 0,${y - r * 0.9}`; }
  return d + `L0,${r}Z`;
}

/** The gold Ganesha mark from the template (public/images/ganesha.png). */
function Ganesha({ className = "" }: { className?: string }) {
  return <img src="/images/ganesha.png" alt="" aria-hidden draggable={false} className={className} />;
}

/**
 * The formal invitation: a tall paper card with postage-stamp perforations, laid out like the template (Ganesha and blessing line at the
 * top, a tree stamp with a gold seal in the corner, the names in script with their families beneath). All wording is yours, from the config.
 */
export function FormalCard({ calm }: { calm: boolean }) {
  const { w } = useLang();
  const [a, b] = coupleNames(w);
  const wed = w.events.find((e) => e.id === "wedding") ?? w.events[w.events.length - 1];
  const path = useMemo(() => perforated(600, 1060, 11, 26), []);
  const fam = (name: string) => (name === w.couple.groom ? w.family.groom : w.family.bride);
  return (
    <div className="absolute inset-0 grid place-items-center px-3">
      <motion.div
        className="relative"
        style={{ width: "min(90vw, 440px, calc((100svh - 100px) * 0.57))", aspectRatio: "0.566", containerType: "inline-size" }}
        initial={{ opacity: 0, scale: calm ? 1 : 0.92, y: calm ? 0 : 26 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: calm ? 0.6 : 1.4, ease: EASE }}
      >
        <svg viewBox="0 0 600 1060" className="absolute inset-0 h-full w-full drop-shadow-[0_22px_26px_rgba(40,50,60,.38)]" aria-hidden>
          <defs>
            <filter id="grainF" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".55 .9" numOctaves="3" seed="9" /><feColorMatrix values="0 0 0 0 .5  0 0 0 0 .44  0 0 0 0 .38  0 0 0 .34 0" /></filter>
            <linearGradient id="paperG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fbf9f6" /><stop offset="1" stopColor="#efeae3" /></linearGradient>
          </defs>
          <path d={path} fill="url(#paperG)" />
          <path d={path} fill="#fff" filter="url(#grainF)" opacity=".85" />
        </svg>

        <div className="absolute inset-x-[9%] top-[9%] bottom-[5%] flex flex-col items-center justify-center text-center" style={{ color: "#9a6b5c" }}>
          <motion.div {...rise(calm, 0.7)} className="flex flex-col items-center">
            <Ganesha className="h-auto w-[15cqw]" />
            {w.greeting.text && <p className="mt-[1cqw] text-[2.8cqw] tracking-wide" lang="sa">{w.greeting.text}</p>}
          </motion.div>

          <motion.p {...rise(calm, 1.2)} className="mt-[5cqw] max-w-[84cqw] text-[3.5cqw] leading-[1.45] tracking-wide">
            {w.wording.familyBlessing}<br />{w.wording.familyInvite}
          </motion.p>

          <motion.div {...rise(calm, 1.8)} className="mt-[4.5cqw]">
            <h2 className="script text-[11cqw] leading-[1.05]" style={{ color: "#b0566e" }}>{a}</h2>
            <p className="mt-[1cqw] text-[3.3cqw] leading-[1.4]">{fam(a).detail}</p>
          </motion.div>

          <motion.p {...rise(calm, 2.4)} className="script my-[2.2cqw] text-[8.5cqw] leading-none" style={{ color: "#b0566e" }}>&amp;</motion.p>

          <motion.div {...rise(calm, 2.8)}>
            <h2 className="script text-[11cqw] leading-[1.05]" style={{ color: "#b0566e" }}>{b}</h2>
            <p className="mt-[1cqw] text-[3.3cqw] leading-[1.4]">{fam(b).detail}</p>
          </motion.div>

          <motion.p {...rise(calm, 3.4)} className="caps mt-[5.5cqw] text-[3cqw] tracking-[0.16em]">{fmtLong(wed.start)} · {fmtTime(wed.start)}</motion.p>
          <motion.p {...rise(calm, 3.7)} className="mt-[1.2cqw] text-[3.3cqw] leading-[1.4]">{wed.venue.name}{wed.venue.area ? `, ${wed.venue.area}` : ""}</motion.p>
          <motion.p {...rise(calm, 4.0)} className="mt-[4cqw] text-[3.3cqw] italic">{w.wording.familyPresence}</motion.p>
        </div>
      </motion.div>
    </div>
  );
}
