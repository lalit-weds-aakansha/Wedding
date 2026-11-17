import { useMemo, type ReactNode } from "react";
import { rng } from "../scene/geometry";

/** Your real couple photos, cropped differently for each frame (viewBox = the part of the photo that stays in view). */
export const PHOTOS = [
  { src: "/images/couple/invitation.jpg", w: 999, h: 1500, vb: "90 60 820 1060" },
  { src: "/images/couple/story.jpg", w: 854, h: 1280, vb: "50 80 760 980" },
  { src: "/images/couple/invitation.jpg", w: 999, h: 1500, vb: "180 120 640 830" },
  { src: "/images/couple/story.jpg", w: 854, h: 1280, vb: "110 110 640 820" },
];

/** Shared gradients: champagne gold, blush petals, warm glow. Mount once per scene. */
export function StoryDefs() {
  return (
    <svg width="0" height="0" className="absolute" aria-hidden focusable="false">
      <defs>
        <linearGradient id="goldF" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#8a6424" /><stop offset=".3" stopColor="#e9c872" /><stop offset=".55" stopColor="#b88a38" /><stop offset=".8" stopColor="#f0d588" /><stop offset="1" stopColor="#92692a" /></linearGradient>
        <radialGradient id="glowW" cx=".5" cy=".5" r=".5"><stop offset="0" stopColor="#fff2c4" stopOpacity=".95" /><stop offset=".4" stopColor="#ffd98a" stopOpacity=".4" /><stop offset="1" stopColor="#ffd98a" stopOpacity="0" /></radialGradient>
        <radialGradient id="glowP" cx=".5" cy=".5" r=".5"><stop offset="0" stopColor="#fff6f0" stopOpacity=".9" /><stop offset="1" stopColor="#ffe3e0" stopOpacity="0" /></radialGradient>
        <filter id="soft" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation="2.2" /></filter>
        <filter id="bokeh" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6" /></filter>
      </defs>
    </svg>
  );
}

/** A hanging picture: string, gold frame and one of the real photos. `x,y` is the top of the string; `len` is how far it hangs. */
export type Pic = { src: string; w: number; h: number; vb: string };
export function HangingFrame({ x, y, len, w, h, photo, delay = 0, id, pics }: { x: number; y: number; len: number; w: number; h: number; photo: number; delay?: number; id: string; pics?: Pic[] }) {
  const list = pics ?? PHOTOS;
  const p = list[photo % list.length];
  const top = y + len;
  const inset = Math.max(5, w * 0.07);
  return (
    <g>
      <path d={`M${x},${y}L${x - w * 0.36},${top}M${x},${y}L${x + w * 0.36},${top}`} stroke="#e8e0cc" strokeWidth="1.8" fill="none" opacity=".9" />
      <g className="frame-sway" style={{ transformOrigin: `${x}px ${y}px`, animationDelay: `${delay}s` }} data-frame={id}>
        <rect x={x - w / 2 + 4} y={top + 6} width={w} height={h} fill="#000" opacity=".22" filter="url(#soft)" />
        <rect x={x - w / 2} y={top} width={w} height={h} rx="3" fill="url(#goldF)" />
        <rect x={x - w / 2 + inset * 0.55} y={top + inset * 0.55} width={w - inset * 1.1} height={h - inset * 1.1} fill="#f7eedb" />
        <svg x={x - w / 2 + inset} y={top + inset} width={w - inset * 2} height={h - inset * 2} viewBox={p.vb} preserveAspectRatio="xMidYMid slice">
          <image href={p.src} width={p.w} height={p.h} />
        </svg>
        <rect x={x - w / 2 + inset} y={top + inset} width={w - inset * 2} height={h - inset * 2} fill="none" stroke="#b88a38" strokeOpacity=".8" strokeWidth="1.4" />
        <circle cx={x} cy={top - 2} r="4" fill="url(#goldF)" />
      </g>
    </g>
  );
}

const BLOOM = ["#f4a9b8", "#f8c9d0", "#fff4ee", "#f2b7a2", "#e98aa2", "#fbd9dc"];
export function Blooms({ x0, x1, y0, y1, n, rMin, rMax, seed, palette = BLOOM, leaves = true }: { x0: number; x1: number; y0: number; y1: number; n: number; rMin: number; rMax: number; seed: number; palette?: string[]; leaves?: boolean }) {
  const items = useMemo(() => {
    const r = rng(seed);
    return Array.from({ length: n }, () => ({ x: x0 + r() * (x1 - x0), y: y0 + r() * (y1 - y0), r: rMin + r() * (rMax - rMin), c: palette[Math.floor(r() * palette.length)], a: r() * 180 }));
  }, [x0, x1, y0, y1, n, rMin, rMax, seed, palette]);
  return (
    <g>
      {leaves && items.filter((_, i) => i % 2 === 0).map((b, i) => <ellipse key={`l${i}`} cx={b.x + b.r * 0.8} cy={b.y + b.r * 0.5} rx={b.r * 1.1} ry={b.r * 0.42} fill="#6aa65c" transform={`rotate(${b.a} ${b.x} ${b.y})`} opacity=".92" />)}
      {items.map((b, i) => (
        <g key={i}>
          <circle cx={b.x} cy={b.y} r={b.r} fill={b.c} />
          <circle cx={b.x - b.r * 0.2} cy={b.y - b.r * 0.2} r={b.r * 0.55} fill="#fff" opacity=".28" />
          <circle cx={b.x} cy={b.y} r={b.r * 0.2} fill="#e8b84a" opacity=".9" />
        </g>
      ))}
    </g>
  );
}

/** Twinkling bulbs along a curve. */
export function Lights({ pts, color = "#ffe39a", r = 5, glow = 16 }: { pts: [number, number][]; color?: string; r?: number; glow?: number }) {
  return (
    <g>
      {pts.map(([x, y], i) => (
        <g key={i} className="twinkle" style={{ animationDelay: `${(i % 7) * 0.31}s` }}>
          <circle cx={x} cy={y} r={glow} fill="url(#glowW)" />
          <circle cx={x} cy={y} r={r} fill={color} />
        </g>
      ))}
    </g>
  );
}
export const along = (x0: number, y0: number, x1: number, y1: number, sag: number, n: number): [number, number][] =>
  Array.from({ length: n }, (_, i) => { const t = i / (n - 1); return [x0 + (x1 - x0) * t, y0 + (y1 - y0) * t + Math.sin(Math.PI * t) * sag] as [number, number]; });

/** Hanging paper lantern. */
export function Lantern({ x, y, len, r, c = "#f6b8c4", delay = 0 }: { x: number; y: number; len: number; r: number; c?: string; delay?: number }) {
  return (
    <g className="frame-sway" style={{ transformOrigin: `${x}px ${y}px`, animationDelay: `${delay}s` }}>
      <line x1={x} y1={y} x2={x} y2={y + len} stroke="#d8cdb4" strokeWidth="1.6" />
      <ellipse cx={x} cy={y + len + r * 0.9} rx={r * 1.6} ry={r * 1.6} fill="url(#glowW)" opacity=".7" />
      <path d={`M${x - r * 0.5},${y + len}H${x + r * 0.5}L${x + r},${y + len + r * 1.6}Q${x},${y + len + r * 2.2} ${x - r},${y + len + r * 1.6}Z`} fill={c} />
      <path d={`M${x - r * 0.5},${y + len}H${x + r * 0.5}L${x + r * 0.6},${y + len + r * 0.5}H${x - r * 0.6}Z`} fill="url(#goldF)" />
      <path d={`M${x - r * 0.45},${y + len + r * 0.5}L${x - r * 0.7},${y + len + r * 1.7}M${x},${y + len + r * 0.5}V${y + len + r * 2}M${x + r * 0.45},${y + len + r * 0.5}L${x + r * 0.7},${y + len + r * 1.7}`} stroke="#fff" strokeOpacity=".45" strokeWidth="1.2" fill="none" />
    </g>
  );
}

/** Deterministic painted-leaf foliage blobs inside an ellipse. */
export function foliage(cx: number, cy: number, rx: number, ry: number, n: number, seed: number, palette: string[], rMin: number, rMax: number) {
  const r = rng(seed);
  const out: { x: number; y: number; r: number; c: string }[] = [];
  for (let i = 0; i < n; i++) {
    const a = r() * Math.PI * 2, d = Math.sqrt(r());
    out.push({ x: cx + Math.cos(a) * rx * d, y: cy + Math.sin(a) * ry * d, r: rMin + r() * (rMax - rMin), c: palette[Math.floor(r() * palette.length)] });
  }
  return out.sort((a, b) => a.y - b.y);
}
export const Circles = ({ list, filter }: { list: { x: number; y: number; r: number; c: string }[]; filter?: string }) => (
  <g filter={filter}>{list.map((b, i) => <circle key={i} cx={b.x} cy={b.y} r={b.r} fill={b.c} />)}</g>
);

export const Wrap = ({ children }: { children: ReactNode }) => <div className="absolute inset-0 overflow-hidden">{children}</div>;

/** A real couple photo inside an arched gold frame. `x` is the centre, `y` the top of the arch. */
export function ArchPhoto({ x, y, w, h, photo, id, glow = true }: { x: number; y: number; w: number; h: number; photo: number; id: string; glow?: boolean }) {
  const p = PHOTOS[photo % PHOTOS.length];
  const r = w / 2, b = 14; // frame thickness
  const arch = (ox: number, oy: number, ww: number, hh: number) => `M${ox},${oy + hh}V${oy + ww / 2}A${ww / 2},${ww / 2} 0 0 1 ${ox + ww},${oy + ww / 2}V${oy + hh}Z`;
  return (
    <g>
      {glow && <ellipse cx={x} cy={y + h * 0.55} rx={w * 0.95} ry={h * 0.7} fill="url(#glowP)" />}
      <path d={arch(x - r, y, w, h)} fill="url(#goldF)" />
      <clipPath id={`arch-${id}`}><path d={arch(x - r + b, y + b, w - b * 2, h - b)} /></clipPath>
      <g clipPath={`url(#arch-${id})`}>
        <rect x={x - r + b} y={y + b} width={w - b * 2} height={h - b} fill="#f6e6d8" />
        <svg x={x - r + b} y={y + b} width={w - b * 2} height={h - b} viewBox={p.vb} preserveAspectRatio="xMidYMid slice"><image href={p.src} width={p.w} height={p.h} /></svg>
      </g>
      <path d={arch(x - r + b, y + b, w - b * 2, h - b)} fill="none" stroke="#fff3c9" strokeOpacity=".7" strokeWidth="2" />
    </g>
  );
}
