import { motion, useInView } from "framer-motion";
import { useId, useRef, type CSSProperties } from "react";
import { Blossom, Bud, Defs, Leaf } from "./Ornaments";

/** Hidden SVG filter that gives the flowers a soft, hand-painted watercolor edge. Mount once near the app root. */
export function WatercolorFilter() {
  return (
    <svg width="0" height="0" className="absolute" aria-hidden focusable="false">
      <filter id="wc" x="-5%" y="-5%" width="110%" height="110%">
        <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="3" seed="4" result="n" />
        <feDisplacementMap in="SourceGraphic" in2="n" scale="5" xChannelSelector="R" yChannelSelector="G" result="d" />
        <feGaussianBlur in="d" stdDeviation="0.35" />
      </filter>
    </svg>
  );
}

const d = (s: number): CSSProperties => ({ ["--d" as string]: `${s}s` });
const breeze = (s: number, b: number): CSSProperties => ({ ["--d" as string]: `${s}s`, ["--b" as string]: `${b}s` });

/**
 * A spray of blush / peach / cream blossoms with sage leaves, drawn in the top-left of a 240 × 240 box.
 * Inside a `.corner.in` wrapper the blossoms unfold one after another and every leaf drifts on its own slow breeze.
 */
export function FlowerSpray({ className = "", style }: { className?: string; style?: CSSProperties }) {
  const gid = useId().replace(/:/g, "");
  const leaves: { x: number; y: number; s: number; rot: number; light?: boolean; delay: number; period: number }[] = [
    { x: 14, y: 118, s: 1.9, rot: 72, delay: 0.0, period: 7.5 },
    { x: 20, y: 150, s: 1.5, rot: 98, light: true, delay: 0.15, period: 6.2 },
    { x: 120, y: 16, s: 1.7, rot: 8, delay: 0.1, period: 8.1 },
    { x: 150, y: 30, s: 1.4, rot: 26, light: true, delay: 0.25, period: 6.8 },
    { x: 70, y: 96, s: 1.5, rot: 40, delay: 0.2, period: 7.2 },
    { x: 96, y: 70, s: 1.3, rot: -4, light: true, delay: 0.3, period: 9 },
    { x: 150, y: 92, s: 1.2, rot: 28, delay: 0.35, period: 6.5 },
  ];
  const blossoms: { x: number; y: number; r: number; rot: number; tone: number; delay: number }[] = [
    { x: 64, y: 62, r: 58, rot: 12, tone: 0, delay: 0.5 },
    { x: 150, y: 44, r: 40, rot: 36, tone: 2, delay: 0.85 },
    { x: 38, y: 150, r: 40, rot: -18, tone: 1, delay: 1.1 },
    { x: 118, y: 120, r: 32, rot: 74, tone: 2, delay: 1.35 },
    { x: 196, y: 108, r: 24, rot: 8, tone: 0, delay: 1.6 },
    { x: 96, y: 172, r: 20, rot: 50, tone: 1, delay: 1.8 },
  ];
  return (
    <svg viewBox="0 0 240 240" className={className} style={style} aria-hidden>
      <Defs gid={gid} />
      <g style={{ filter: "url(#wc)" }}>
        {/* sage leaves and sprigs behind the flowers */}
        {leaves.map((l, i) => (
          <g key={i} className="leaf-item" style={breeze(l.delay, l.period)}>
            <Leaf x={l.x} y={l.y} s={l.s} rot={l.rot} light={l.light} />
          </g>
        ))}
        <path d="M6 232C28 190 40 170 70 150" fill="none" stroke="#9bae8c" strokeWidth="1.6" opacity=".8" />
        <path d="M232 6C200 28 180 40 150 70" fill="none" stroke="#9bae8c" strokeWidth="1.6" opacity=".8" />
        {[[176, 20, 64, 1.9], [18, 186, 168, 2.0], [128, 92, 40, 1.5]].map(([x, y, rot, delay], i) => (
          <g key={`b${i}`} className="bloom-item" style={d(delay)}><Bud x={x} y={y} rot={rot} /></g>
        ))}
        {/* blossoms: large blush, peach, cream, then small accents */}
        {blossoms.map((b, i) => (
          <g key={`f${i}`} className="bloom-item" style={d(b.delay)}>
            <Blossom gid={gid} x={b.x} y={b.y} r={b.r} rot={b.rot} tone={b.tone} />
          </g>
        ))}
        {[[186, 28], [28, 202], [150, 150], [214, 62], [60, 210]].map(([x, y], i) => (
          <g key={`s${i}`} className="bloom-item" style={d(2 + i * 0.15)}>
            <g transform={`translate(${x} ${y})`}>
              {Array.from({ length: 5 }, (_, k) => <circle key={k} cx="0" cy="-3" r="2.6" fill="#fff" stroke="#efe3d6" strokeWidth=".4" transform={`rotate(${k * 72})`} />)}
              <circle r="1.3" fill="#e8c36a" />
            </g>
          </g>
        ))}
      </g>
    </svg>
  );
}

type Pos = "tl" | "tr" | "bl" | "br";
const flip: Record<Pos, string> = { tl: "none", tr: "scaleX(-1)", bl: "scaleY(-1)", br: "rotate(180deg)" };
const place: Record<Pos, string> = { tl: "left-0 top-0", tr: "right-0 top-0", bl: "bottom-0 left-0", br: "bottom-0 right-0" };
const origin: Record<Pos, string> = { tl: "0% 0%", tr: "100% 0%", bl: "0% 100%", br: "100% 100%" };

/**
 * A flower spray tucked into a corner of the nearest `relative` parent.
 * It starts when scrolled into view (once) — or, with `hold`, only after the caller says so (e.g. after the opening animation).
 */
export function Corner({ pos, size = "clamp(8rem, 38vw, 19rem)", delay = 0, className = "", hold = false, speed = 1 }: { pos: Pos; size?: string; delay?: number; className?: string; hold?: boolean; speed?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const seen = useInView(ref, { once: true, amount: 0.15 });
  const on = seen && !hold;
  return (
    <motion.div
      ref={ref}
      aria-hidden
      className={`corner ${on ? "in" : ""} pointer-events-none absolute z-[1] ${place[pos]} ${className}`}
      style={{ width: size, aspectRatio: "1", transformOrigin: origin[pos], ["--corner-delay" as string]: `${delay}s`, ["--speed" as string]: speed }}
      initial={{ opacity: 0, scale: 0.92 }}
      animate={on ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.92 }}
      transition={{ duration: 1.6 * speed, delay: delay * speed, ease: [0.2, 0.7, 0.2, 1] }}
    >
      <div className="h-full w-full" style={{ transform: flip[pos] }}>
        <FlowerSpray className="h-full w-full" />
      </div>
    </motion.div>
  );
}
