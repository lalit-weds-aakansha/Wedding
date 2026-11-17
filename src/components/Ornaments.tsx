import { useId, type SVGProps } from "react";
import type { WeddingEvent } from "../config/wedding";
import { wedding } from "../config/wedding";

type P = SVGProps<SVGSVGElement>;

/* ---------- Floral primitives (drawn in a 0..200 coordinate space) ---------- */

/** A layered peony/rose blossom. */
export function Blossom({ x, y, r, rot = 0, tone = 0, gid }: { x: number; y: number; r: number; rot?: number; tone?: number; gid: string }) {
  const outer = 9, inner = 7;
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${r / 20})`}>
      {Array.from({ length: outer }, (_, i) => (
        <path key={i} d="M0 0C-9-6-10-17-3-21 0-23 3-23 5-20 11-15 8-6 0 0Z" fill={`url(#${gid}-p${tone})`} stroke="#c97f80" strokeOpacity=".35" strokeWidth=".5" transform={`rotate(${(360 / outer) * i})`} />
      ))}
      {Array.from({ length: inner }, (_, i) => (
        <path key={`i${i}`} d="M0 0C-5-4-6-11-2-13 1-14 3-13 4-11 6-7 4-3 0 0Z" fill={`url(#${gid}-c)`} opacity=".95" transform={`rotate(${(360 / inner) * i + 20})`} />
      ))}
      <circle r="3.2" fill="#d9a06b" />
      {Array.from({ length: 8 }, (_, i) => (
        <circle key={`d${i}`} cx={Math.cos(i * 0.785) * 4.6} cy={Math.sin(i * 0.785) * 4.6} r=".8" fill="#b9793f" />
      ))}
    </g>
  );
}

export function Leaf({ x, y, s = 1, rot = 0, light = false }: { x: number; y: number; s?: number; rot?: number; light?: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
      <path d="M0 0C6-8 18-10 30-6 22 2 10 6 0 0Z" fill={light ? "#b4c08f" : "#8a9a6a"} />
      <path d="M0 0C10-3 20-5 30-6" stroke="#6f7f52" strokeWidth=".6" fill="none" />
    </g>
  );
}

export function Bud({ x, y, rot = 0 }: { x: number; y: number; rot?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`}>
      <path d="M0 0C-3-5-2-11 2-13 6-11 6-5 0 0Z" fill="#eab3ae" />
      <path d="M0 0C-3-2-4-5-3-7M0 0C3-2 4-5 3-7" stroke="#8a9a6a" strokeWidth="1.1" fill="none" />
      <path d="M0 0l-2 12" stroke="#8a9a6a" strokeWidth=".8" />
    </g>
  );
}

export function Defs({ gid }: { gid: string }) {
  return (
    <defs>
      <radialGradient id={`${gid}-p0`} cx=".5" cy=".9" r="1">
        <stop offset="0" stopColor="#f3c9c3" /><stop offset=".6" stopColor="#efb7b2" /><stop offset="1" stopColor="#fbe7e1" />
      </radialGradient>
      <radialGradient id={`${gid}-p1`} cx=".5" cy=".9" r="1">
        <stop offset="0" stopColor="#f7ddd2" /><stop offset=".7" stopColor="#f6e6dc" /><stop offset="1" stopColor="#fffaf3" />
      </radialGradient>
      <radialGradient id={`${gid}-p2`} cx=".5" cy=".9" r="1">
        <stop offset="0" stopColor="#f6b896" /><stop offset=".6" stopColor="#f8cdb4" /><stop offset="1" stopColor="#fdeadb" />
      </radialGradient>
      <radialGradient id={`${gid}-c`} cx=".5" cy="1" r="1">
        <stop offset="0" stopColor="#e39a98" /><stop offset="1" stopColor="#f4c7c0" />
      </radialGradient>
    </defs>
  );
}

/**
 * Corner bouquet of blush blossoms, buds and leaves.
 * Anchored to the top-left of its box — flip with `-scale-x-100` / `-scale-y-100`.
 */
export function FloralCorner(p: P) {
  const gid = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 140 140" aria-hidden {...p}>
      <Defs gid={gid} />
      <Leaf x={20} y={70} s={1.4} rot={70} />
      <Leaf x={60} y={30} s={1.3} rot={-10} light />
      <Leaf x={90} y={20} s={1.1} rot={10} />
      <Leaf x={22} y={110} s={1.1} rot={95} light />
      <Leaf x={70} y={70} s={1} rot={35} />
      <Bud x={128} y={22} rot={70} />
      <Bud x={18} y={150} rot={170} />
      <Bud x={100} y={58} rot={45} />
      <Blossom gid={gid} x={30} y={30} r={30} rot={10} />
      <Blossom gid={gid} x={78} y={14} r={20} rot={40} tone={1} />
      <Blossom gid={gid} x={14} y={84} r={20} rot={-20} tone={1} />
      <Blossom gid={gid} x={62} y={56} r={14} rot={80} />
      <circle cx="112" cy="36" r="2.2" fill="#e8c27a" /><circle cx="44" cy="96" r="2" fill="#e8c27a" /><circle cx="120" cy="12" r="1.6" fill="#e8c27a" />
    </svg>
  );
}

/** A small horizontal spray, used as the centre of dividers. */
export function FloralSpray(p: P) {
  const gid = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 120 44" aria-hidden {...p}>
      <Defs gid={gid} />
      <Leaf x={58} y={26} s={1} rot={190} light />
      <Leaf x={62} y={26} s={1} rot={-10} light />
      <Leaf x={52} y={28} s={.8} rot={150} />
      <Leaf x={68} y={28} s={.8} rot={30} />
      <Bud x={36} y={26} rot={-70} />
      <Bud x={84} y={26} rot={70} />
      <Blossom gid={gid} x={60} y={22} r={12} />
      <Blossom gid={gid} x={45} y={24} r={7} rot={30} tone={1} />
      <Blossom gid={gid} x={75} y={24} r={7} rot={-30} tone={1} />
    </svg>
  );
}

/** Gold rule with a floral centrepiece. */
export function Divider({ className = "" }: { className?: string }) {
  return (
    <div className={`mx-auto flex w-full max-w-[16rem] items-center gap-1 ${className}`} aria-hidden>
      <span className="h-px flex-1 bg-gradient-to-r from-transparent to-gold/70" />
      <FloralSpray className="h-6 w-16 shrink-0" />
      <span className="h-px flex-1 bg-gradient-to-l from-transparent to-gold/70" />
    </div>
  );
}

/** Thin gold flourish line (like the swirl under the cover date). */
export function Flourish({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 160 16" className={`mx-auto h-4 w-36 text-gold ${className}`} fill="none" stroke="currentColor" strokeWidth=".9" aria-hidden>
      <path d="M2 8h50c8 0 10-6 16-6s8 6 12 6 6-6 12-6 8 6 16 6h50" />
      <path d="M80 8c-3 3-3 5 0 7 3-2 3-4 0-7Z" fill="currentColor" />
      <circle cx="58" cy="8" r="1.4" fill="currentColor" /><circle cx="102" cy="8" r="1.4" fill="currentColor" />
    </svg>
  );
}

/** Script initials monogram ("A S" with a flourish). */
export function Monogram({ className = "" }: { className?: string }) {
  const { first, second } = wedding.couple.monogram;
  return (
    <span className={`relative inline-block font-script leading-none ${className}`} aria-label={`${first} & ${second} monogram`} role="img">
      <span>{first}</span>
      <span className="ml-[-0.18em] inline-block translate-y-[0.18em]">{second}</span>
    </span>
  );
}

/** Wax seal with the monogram pressed in. */
export function WaxSeal({ className = "" }: { className?: string }) {
  return (
    <div
      className={`relative grid place-items-center rounded-full ${className}`}
      style={{
        background: "radial-gradient(circle at 35% 30%, #f0d48f 0%, #c9a052 40%, #94702c 80%, #7a5a20 100%)",
        boxShadow: "0 6px 14px -4px rgba(74,51,36,.55), inset 0 2px 4px rgba(255,255,255,.5), inset 0 -3px 6px rgba(0,0,0,.25)",
        clipPath: "polygon(50% 0,61% 4%,72% 2%,79% 10%,90% 12%,92% 23%,99% 31%,96% 42%,100% 52%,95% 61%,97% 72%,89% 79%,87% 90%,76% 92%,68% 99%,57% 96%,47% 100%,37% 96%,27% 98%,20% 90%,10% 87%,8% 76%,1% 68%,4% 57%,0 47%,4% 37%,2% 26%,10% 20%,13% 10%,24% 8%,32% 1%,43% 4%)",
      }}
    >
      <div className="absolute inset-[14%] rounded-full border border-[#7a5a20]/40 shadow-[inset_0_1px_3px_rgba(0,0,0,.25)]" />
      <Monogram className="relative text-[2.2em] text-[#6e4f1a] [text-shadow:0_1px_0_rgba(255,240,200,.6)]" />
    </div>
  );
}

/** Per-event line illustrations (used on placeholder tiles). */
export function EventMotif({ motif, ...p }: P & { motif: WeddingEvent["motif"] }) {
  const g = {
    rings: (<><circle cx="26" cy="38" r="12" /><circle cx="40" cy="38" r="12" /><path d="M37 20l4-6 4 6-4 4Z" /></>),
    turmeric: (<><path d="M14 40c0 10 8 16 18 16s18-6 18-16Z" /><path d="M12 40h40" /><circle cx="26" cy="32" r="4" /><circle cx="36" cy="30" r="5" /><path d="M44 18c-4 4-4 8 0 12 4-4 4-8 0-12Z" /></>),
    henna: (<><path d="M22 56V30c0-3 5-3 5 0v-8c0-3 5-3 5 0v-2c0-3 5-3 5 0v4c0-3 5-3 5 0v18c4-6 9-4 7 0l-8 14H22Z" /><circle cx="33" cy="42" r="4" /><path d="M33 34v-4M29 46l-3 3M37 46l3 3" /></>),
    music: (<><path d="M24 50V18l24-6v32" /><circle cx="19" cy="50" r="5" /><circle cx="43" cy="44" r="5" /><path d="M24 26l24-6" /></>),
    fire: (<><path d="M14 54h36M18 54l4-10h20l4 10" /><path d="M32 42c-8-4-8-12-2-20 0 6 4 6 4 2 6 6 8 14-2 18Z" /><path d="M32 42c-3-2-3-6 0-9 3 3 3 7 0 9Z" /></>),
    lotus: (<><path d="M32 52c-8-6-10-18 0-30 10 12 8 24 0 30Z" /><path d="M32 52c-10 0-20-6-22-18 10 0 18 6 22 18Zm0 0c10 0 20-6 22-18-10 0-18 6-22 18Z" /><path d="M12 56h40" /></>),
  }[motif];
  return (
    <svg viewBox="0 0 64 64" aria-hidden {...p}>
      <g fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">{g}</g>
    </svg>
  );
}

const motifBg: Record<WeddingEvent["motif"], string> = {
  rings: "linear-gradient(135deg,#f6e7d6,#ead2b6 60%,#f3dccf)",
  turmeric: "linear-gradient(135deg,#f9dc7a,#e9a93a 70%,#f4c454)",
  henna: "linear-gradient(135deg,#d7c0a0,#a0704a 70%,#c49a73)",
  music: "linear-gradient(135deg,#4b2a5a,#a03d6b 60%,#e0a14a)",
  fire: "linear-gradient(135deg,#f3d9b8,#d99a6a 60%,#b25d3a)",
  lotus: "linear-gradient(135deg,#f3dcdc,#d9a3a8 60%,#efd3c4)",
};

/** Image if supplied, otherwise an illustrated tile — never a broken image. */
const tints = [
  "linear-gradient(140deg,#f6eadb,#efd9c9 55%,#f8eee3)",
  "linear-gradient(160deg,#eef0e2,#d9dfc6 60%,#f4f1e4)",
  "linear-gradient(130deg,#f8e4e1,#eec9c4 60%,#fbefe9)",
  "linear-gradient(150deg,#f4ead6,#e6d2a6 65%,#f9f1e1)",
];

export function ImageOrArt({
  src, alt, motif, label, variant = 0, className = "", eager = false,
}: { src?: string; alt: string; motif?: WeddingEvent["motif"]; label?: string; variant?: number; className?: string; eager?: boolean }) {
  if (src) {
    return <img src={src} alt={alt} loading={eager ? "eager" : "lazy"} decoding="async" className={`h-full w-full object-cover ${className}`} />;
  }
  const dark = motif === "music" || motif === "henna" || motif === "turmeric";
  return (
    <div
      role="img"
      aria-label={`${alt} (placeholder)`}
      className={`relative grid h-full w-full place-items-center overflow-hidden ${className}`}
      style={{ background: motif ? motifBg[motif] : tints[variant % tints.length] }}
    >
      <FloralCorner className="absolute -left-4 -top-4 h-2/3 w-2/3 opacity-80" />
      <FloralCorner className="absolute -bottom-4 -right-4 h-1/2 w-1/2 rotate-180 opacity-70" />
      {motif ? (
        <EventMotif motif={motif} className={`relative h-1/2 max-h-28 w-1/2 max-w-28 ${dark ? "text-white/85" : "text-accent/70"}`} />
      ) : label ? (
        <span className="script relative px-3 text-center text-3xl !text-accent/70">{label}</span>
      ) : (
        <Monogram className="relative text-5xl text-accent/55" />
      )}
    </div>
  );
}

/** Line-art wedding mandap with the couple, for the closing section. */
export function MandapArt(p: P) {
  return (
    <svg viewBox="0 0 220 200" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden {...p}>
      {/* canopy */}
      <path d="M20 60c30-30 60-42 90-44 30 2 60 14 90 44" />
      <path d="M30 60h160" />
      <path d="M40 60c4 8 10 8 14 0 4 8 10 8 14 0 4 8 10 8 14 0 4 8 10 8 14 0 4 8 10 8 14 0 4 8 10 8 14 0 4 8 10 8 14 0 4 8 10 8 14 0 4 8 10 8 14 0 4 8 10 8 14 0" strokeWidth=".8" />
      <path d="M110 16v-4" /><circle cx="110" cy="8" r="3.5" fill="currentColor" fillOpacity=".25" />
      {/* pillars */}
      <path d="M34 60v130M44 60v130M176 60v130M186 60v130" />
      <path d="M30 190h160" />
      {/* garlands */}
      <path d="M44 74c20 18 46 26 66 26s46-8 66-26" strokeDasharray="1 4" strokeWidth="2.4" />
      {/* groom */}
      <circle cx="92" cy="102" r="8" />
      <path d="M86 96c2-6 10-6 12 0" />
      <path d="M84 112c-4 10-6 30-6 56h28c0-26-2-46-6-56" />
      <path d="M92 112v56M86 126h12" strokeWidth=".8" />
      {/* bride */}
      <circle cx="128" cy="104" r="7.5" />
      <path d="M120 100c4-12 16-12 18 2 2 14 4 30 14 66h-44c4-24 8-42 12-58" />
      <path d="M118 140c10 4 22 4 30 0" strokeWidth=".8" />
      {/* joined hands */}
      <path d="M102 128c4 4 10 4 18 0" />
      {/* sacred fire */}
      <path d="M100 190l4-8h12l4 8" />
      <path d="M110 182c-5-3-5-8-1-13 0 4 3 4 3 1 4 4 4 9-2 12Z" fill="currentColor" fillOpacity=".15" />
      {/* kalash */}
      <path d="M58 190c-6-4-6-14 0-18h10c6 4 6 14 0 18Z M60 172c0-4 6-4 6 0M63 168c-4-6 0-10 0-10s4 4 0 10" />
      <path d="M152 190c-6-4-6-14 0-18h10c6 4 6 14 0 18Z M154 172c0-4 6-4 6 0M157 168c-4-6 0-10 0-10s4 4 0 10" />
    </svg>
  );
}

/** Thin gold rule with a small eight-petal flower in the middle. */
export function GoldDivider({ className = "" }: { className?: string }) {
  return (
    <div className={`mx-auto flex w-full max-w-[15rem] items-center gap-2 ${className}`} aria-hidden>
      <span className="h-px flex-1 bg-gradient-to-r from-transparent to-gold/80" />
      <svg viewBox="-12 -12 24 24" className="h-4 w-4 shrink-0 text-gold">
        {Array.from({ length: 8 }, (_, i) => (
          <ellipse key={i} cx="0" cy="-5.2" rx="1.8" ry="4" fill="currentColor" opacity={i % 2 ? 0.55 : 0.9} transform={`rotate(${i * 45})`} />
        ))}
        <circle r="1.9" fill="#faf3e8" />
      </svg>
      <span className="h-px flex-1 bg-gradient-to-l from-transparent to-gold/80" />
    </div>
  );
}
