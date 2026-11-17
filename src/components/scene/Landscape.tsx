import { forwardRef, useMemo, type ReactNode } from "react";
import { cliffPath, GREENS_FAR, GREENS_MID, H, HORIZON, makeRoad, ridge, roadsideTrees, rng, treesOnRidge, type Blob, type Road } from "./geometry";

/** One painted layer: a full-bleed SVG that keeps the bottom of the picture at the bottom of the screen and is never stretched. */
export function Layer({ W, children, className = "" }: { W: number; children: ReactNode; className?: string }) {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMax slice" className={`pointer-events-none absolute inset-0 h-full w-full ${className}`} aria-hidden focusable="false">
      {children}
    </svg>
  );
}

/** Shared paint effects: rough watercolor edges and soft cloud edges. Mounted once. */
export function SceneDefs() {
  return (
    <svg width="0" height="0" className="absolute" aria-hidden focusable="false">
      <defs>
        <filter id="paint" x="-3%" y="-3%" width="106%" height="106%">
          <feTurbulence type="fractalNoise" baseFrequency="0.018" numOctaves="3" seed="7" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="16" xChannelSelector="R" yChannelSelector="G" result="d" />
          <feGaussianBlur in="d" stdDeviation="0.9" />
        </filter>
        <filter id="paintSoft" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="2" seed="3" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="26" xChannelSelector="R" yChannelSelector="G" result="d" />
          <feGaussianBlur in="d" stdDeviation="3.5" />
        </filter>
        <filter id="grain" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="11" />
          <feColorMatrix values="0 0 0 0 0.35  0 0 0 0 0.3  0 0 0 0 0.25  0 0 0 0.5 0" />
        </filter>
      </defs>
    </svg>
  );
}

const Blobs = ({ list, filter }: { list: Blob[]; filter?: string }) => (
  <g filter={filter}>{list.map((b, i) => <circle key={i} cx={b.x} cy={b.y} r={b.r} fill={b.c} />)}</g>
);

/* ---------------- sky + clouds ---------------- */
export function Sky({ W }: { W: number }) {
  return (
    <Layer W={W}>
      <defs>
        <linearGradient id="skyG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7fb2e0" />
          <stop offset=".28" stopColor="#a4cdec" />
          <stop offset=".46" stopColor="#cde5f3" />
          <stop offset=".5" stopColor="#e9f2ef" />
        </linearGradient>
        <radialGradient id="sunG" cx=".5" cy=".5" r=".5">
          <stop offset="0" stopColor="#fff6dc" stopOpacity=".85" />
          <stop offset=".45" stopColor="#fff0cc" stopOpacity=".35" />
          <stop offset="1" stopColor="#fff0cc" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width={W} height={H} fill="url(#skyG)" />
      <ellipse cx={W * 0.74} cy={250} rx={620} ry={520} fill="url(#sunG)" />
    </Layer>
  );
}

const CLOUD: [number, number, number][] = [[0, 0, 62], [58, -20, 54], [-58, -12, 50], [112, 8, 44], [-112, 10, 42], [22, 24, 56], [-26, 28, 46], [76, 30, 40]];
function Cloud({ x, y, s }: { x: number; y: number; s: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <g fill="#b9cfe2" opacity=".55" transform="translate(6 20)">{CLOUD.map(([cx, cy, r], i) => <circle key={i} cx={cx} cy={cy} r={r} />)}</g>
      <g fill="#ffffff">{CLOUD.map(([cx, cy, r], i) => <circle key={i} cx={cx} cy={cy} r={r * 0.97} />)}</g>
      <g fill="#fff6e6" opacity=".7" transform="translate(-14 -16)">{CLOUD.slice(0, 5).map(([cx, cy, r], i) => <circle key={i} cx={cx} cy={cy} r={r * 0.6} />)}</g>
    </g>
  );
}
export function Clouds({ W }: { W: number }) {
  const list = useMemo(() => {
    const r = rng(21);
    const out: { x: number; y: number; s: number }[] = [];
    const n = Math.max(6, Math.round(W / 230));
    for (let i = 0; i < n; i++) out.push({ x: ((i + 0.3 + r() * 0.5) / n) * W, y: 130 + r() * 500, s: 1 + r() * 1.3 });
    return out;
  }, [W]);
  return (
    <Layer W={W}>
      <g filter="url(#paintSoft)">{list.map((c, i) => <Cloud key={i} {...c} />)}</g>
    </Layer>
  );
}

/* ---------------- mountains and hills ---------------- */
export function FarMountains({ W }: { W: number }) {
  return (
    <Layer W={W}>
      <defs>
        <linearGradient id="farA" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#aabfd0" /><stop offset="1" stopColor="#c6d8d9" /></linearGradient>
        <linearGradient id="farB" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#8fb0a4" /><stop offset="1" stopColor="#bcd3cb" /></linearGradient>
        <linearGradient id="mist" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f4f7f3" stopOpacity="0" /><stop offset="1" stopColor="#f4f7f3" stopOpacity=".85" /></linearGradient>
      </defs>
      <g filter="url(#paint)">
        <path d={ridge(W, 640, 110, 2, 28)} fill="url(#farA)" />
        <path d={ridge(W, 720, 90, 4, 26)} fill="url(#farB)" />
      </g>
      <rect y={HORIZON - 70} width={W} height={150} fill="url(#mist)" />
    </Layer>
  );
}

export function MidHills({ W }: { W: number }) {
  const t1 = useMemo(() => treesOnRidge(W, 800, 80, 5, 14, 24, GREENS_FAR, 26), [W]);
  const t2 = useMemo(() => treesOnRidge(W, 860, 60, 8, 20, 34, GREENS_MID, 28), [W]);
  return (
    <Layer W={W}>
      <defs>
        <linearGradient id="midA" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#8fbb86" /><stop offset="1" stopColor="#6fa35f" /></linearGradient>
        <linearGradient id="midB" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#74a863" /><stop offset="1" stopColor="#4f8d4a" /></linearGradient>
        <linearGradient id="mist2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#eef5ee" stopOpacity="0" /><stop offset="1" stopColor="#eef5ee" stopOpacity=".6" /></linearGradient>
      </defs>
      <g filter="url(#paint)">
        <path d={ridge(W, 800, 80, 5, 24)} fill="url(#midA)" />
        <Blobs list={t1} />
      </g>
      <rect y={800} width={W} height={90} fill="url(#mist2)" />
      <g filter="url(#paint)">
        <path d={ridge(W, 880, 60, 8, 24)} fill="url(#midB)" />
        <Blobs list={t2} />
      </g>
    </Layer>
  );
}

/* ---------------- foreground: near hills, road, cliff, trees, guard rail, car ---------------- */
const CLIFF_TOP = 930, CLIFF_BOTTOM = 1190;

export const Ground = forwardRef<SVGGElement, { W: number; road: Road; children?: ReactNode; roadReveal: ReactNode }>(function Ground({ W, road, children, roadReveal }, carRef) {
  const trees = useMemo(() => roadsideTrees(W, road, 33, CLIFF_TOP - 20, CLIFF_BOTTOM + 40), [W, road]);
  const near = useMemo(() => treesOnRidge(W, 980, 50, 11, 26, 44, GREENS_MID, 34), [W]);
  const cliff = useMemo(() => cliffPath(W, road, CLIFF_TOP, CLIFF_BOTTOM, 4), [W, road]);
  const capTrees = useMemo(() => {
    const r = rng(77); const out: Blob[] = [];
    for (let xx = cliff.x + 70; xx < cliff.xr - 30; xx += 30 + r() * 26) out.push({ x: xx, y: CLIFF_TOP - 52 + r() * 24, r: 24 + r() * 22, c: ["#3f7d3e", "#559748", "#33703a"][Math.floor(r() * 3)] });
    return out;
  }, [W, cliff.x, cliff.xr]);
  // guard rail along the right edge, with posts
  const rail = useMemo(() => {
    const pts: { x: number; y: number }[] = [];
    for (let t = 0.1; t <= 0.52; t += 0.01) { const p = road.P(t, 1.08); pts.push(p); }
    const d = pts.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)},${(p.y - 18).toFixed(1)}`).join("");
    const posts = pts.filter((_, i) => i % 4 === 0);
    return { d, posts };
  }, [road]);
  const RAIL = (
    <g>
      <path d={rail.d} stroke="#6d7479" strokeWidth="13" fill="none" transform="translate(0 7)" opacity=".5" />
      <path d={rail.d} stroke="#d4dadc" strokeWidth="9" fill="none" />
      <path d={rail.d} stroke="#9aa3a8" strokeWidth="2.5" fill="none" transform="translate(0 3)" />
      {rail.posts.map((p, i) => <rect key={i} x={p.x - 2.5} y={p.y - 18} width="5" height={14 + (p.y - 800) * 0.012} fill="#8b9399" />)}
    </g>
  );
  return (
    <Layer W={W}>
      <defs>
        <linearGradient id="nearG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#5b9c4f" /><stop offset="1" stopColor="#3b7a3c" /></linearGradient>
        <linearGradient id="roadG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#8f9199" /><stop offset="1" stopColor="#6f7179" /></linearGradient>
        <linearGradient id="cliffG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#d99e6b" /><stop offset=".5" stopColor="#bb6a43" /><stop offset="1" stopColor="#8d4a30" /></linearGradient>
      </defs>
      <g filter="url(#paint)">
        <path d={ridge(W, 980, 50, 11, 24)} fill="url(#nearG)" />
        <Blobs list={near} />
      </g>
      {/* the road, drawn on by a growing mask */}
      <g mask="url(#roadMask)">
        <path d={road.polygon} fill="#b49a76" transform={`translate(${W / 2} 0) scale(1.07 1) translate(${-W / 2} 0)`} opacity=".85" />
        <path d={road.polygon} fill="url(#roadG)" />
        <path d={road.line(-0.9)} stroke="#f2efe8" strokeWidth="5" fill="none" opacity=".85" />
        <path d={road.line(0.9)} stroke="#f2efe8" strokeWidth="5" fill="none" opacity=".85" />
        {road.dashes.map((d, i) => <path key={i} d={d} fill="#f6f3ec" opacity=".95" />)}
        {RAIL}
      </g>
      <mask id="roadMask" maskUnits="userSpaceOnUse" x="0" y="0" width={W} height={H}>{roadReveal}</mask>
      {/* cliff */}
      <g filter="url(#paint)">
        <path d={cliff.d} fill="url(#cliffG)" />
        {[0.2, 0.42, 0.64, 0.82].map((k, i) => <path key={i} d={`M${cliff.x + 24},${CLIFF_TOP + (CLIFF_BOTTOM - CLIFF_TOP) * k}L${cliff.xr - 20},${CLIFF_TOP + (CLIFF_BOTTOM - CLIFF_TOP) * k - 14}`} stroke="#7a3f2a" strokeOpacity=".28" strokeWidth="6" />)}
        <Blobs list={capTrees} />
      </g>
      <g filter="url(#paint)"><Blobs list={trees} /></g>
      <g ref={carRef}>{children}</g>
    </Layer>
  );
});

/* ---------------- the flower-decorated vintage car, seen from behind. Origin = bottom centre, ~300 units wide ---------------- */
const FLOWER = ["#e98fa6", "#f4b8c4", "#fffaf2", "#f7c9a8", "#e56f8c"];
export function CarArt() {
  const flowers = useMemo(() => {
    const r = rng(9);
    const out: { x: number; y: number; r: number; c: string }[] = [];
    const place = (x0: number, x1: number, y0: number, y1: number, n: number, rMin: number, rMax: number) => {
      for (let i = 0; i < n; i++) out.push({ x: x0 + r() * (x1 - x0), y: y0 + r() * (y1 - y0), r: rMin + r() * (rMax - rMin), c: FLOWER[Math.floor(r() * FLOWER.length)] });
    };
    place(-150, -90, -158, -112, 9, 9, 15);  // left back corner
    place(90, 150, -158, -112, 9, 9, 15);    // right back corner
    place(-110, 110, -122, -108, 14, 6, 10); // swag along the boot
    place(-62, 62, -180, -168, 6, 6, 9);
    return out;
  }, []);
  const leaves = useMemo(() => {
    const r = rng(15);
    return Array.from({ length: 26 }, () => ({ x: (r() - 0.5) * 300, y: -170 + r() * 62, a: r() * 180, s: 0.8 + r() * 0.8 }));
  }, []);
  return (
    <g>
      <ellipse cx="0" cy="3" rx="150" ry="11" fill="#2d3a2a" opacity=".32" />
      {/* wheels */}
      <rect x="-122" y="-44" width="44" height="46" rx="14" fill="#2a2a30" />
      <rect x="78" y="-44" width="44" height="46" rx="14" fill="#2a2a30" />
      <rect x="-112" y="-34" width="24" height="30" rx="8" fill="#4b4b53" />
      <rect x="88" y="-34" width="24" height="30" rx="8" fill="#4b4b53" />
      {/* windscreen frame behind the couple */}
      <path d="M-84,-168 Q-84,-206 -50,-206 H50 Q84,-206 84,-168 V-132 H-84Z" fill="#dce8ee" opacity=".55" stroke="#c9ced2" strokeWidth="6" />
      {/* the couple, from behind */}
      <g>
        <path d="M-70,-114 Q-70,-152 -34,-152 Q-4,-152 -4,-114Z" fill="#26324a" />
        <ellipse cx="-38" cy="-166" rx="19" ry="21" fill="#e2b48d" />
        <path d="M-58,-170 Q-58,-192 -38,-192 Q-18,-192 -18,-170 Q-24,-178 -38,-178 Q-52,-178 -58,-170Z" fill="#2f2420" />
        <path d="M6,-114 Q6,-152 40,-152 Q72,-152 72,-114Z" fill="#fbf3e4" />
        <ellipse cx="40" cy="-168" rx="19" ry="21" fill="#e0b08a" />
        <path d="M18,-172 Q18,-196 40,-196 Q62,-196 62,-172 Q56,-160 62,-136 Q40,-132 18,-136 Q24,-160 18,-172Z" fill="#3a2a24" />
        <path d="M14,-176 Q40,-206 66,-176 L70,-128 Q40,-136 10,-128Z" fill="#fff" opacity=".55" />
        <circle cx="40" cy="-189" r="6" fill="#f4b8c4" />
      </g>
      {/* body */}
      <path d="M-148,-96 Q-148,-122 -120,-122 H120 Q148,-122 148,-96 V-44 Q148,-30 134,-30 H-134 Q-148,-30 -148,-44Z" fill="#f2e4c6" />
      <path d="M-148,-96 Q-148,-122 -120,-122 H120 Q148,-122 148,-96 V-84 H-148Z" fill="#fbf1da" />
      <path d="M-148,-60 H148 V-44 Q148,-30 134,-30 H-134 Q-148,-30 -148,-44Z" fill="#dcc9a2" opacity=".8" />
      <path d="M-128,-34 Q-100,-76 -72,-34Z" fill="#d6c19a" />
      <path d="M72,-34 Q100,-76 128,-34Z" fill="#d6c19a" />
      <rect x="-156" y="-30" width="312" height="12" rx="6" fill="#e8ecee" />
      <rect x="-156" y="-30" width="312" height="4" rx="2" fill="#ffffff" opacity=".8" />
      <rect x="-36" y="-76" width="72" height="26" rx="4" fill="#fffaf0" stroke="#7b6f5c" strokeWidth="2.5" />
      <rect x="-26" y="-68" width="52" height="3" fill="#7b6f5c" opacity=".5" />
      <ellipse cx="-118" cy="-86" rx="12" ry="8" fill="#c43b3b" />
      <ellipse cx="118" cy="-86" rx="12" ry="8" fill="#c43b3b" />
      {/* flowers and leaves */}
      <g fill="#5b9a4e">{leaves.map((l, i) => <ellipse key={i} cx={l.x} cy={l.y} rx={11 * l.s} ry={4.6 * l.s} transform={`rotate(${l.a} ${l.x} ${l.y})`} />)}</g>
      {flowers.map((f, i) => (
        <g key={i}>
          <circle cx={f.x} cy={f.y} r={f.r} fill={f.c} />
          <circle cx={f.x} cy={f.y} r={f.r * 0.45} fill="#fff" opacity=".35" />
          <circle cx={f.x + f.r * 0.1} cy={f.y} r={f.r * 0.2} fill="#e8b84a" />
        </g>
      ))}
    </g>
  );
}

export type { Road };
export { makeRoad };
