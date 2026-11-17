import { useMemo } from "react";
import { Blooms, Circles, foliage, HangingFrame, Lantern, Lights, along, type Pic } from "./art";
import { Clouds, FarMountains, Layer, Sky } from "../scene/Landscape";
import { H, rng, ridge } from "../scene/geometry";

/** Where the hanging pictures are, so the camera can zoom into one. `ox,oy` = centre of the picture as % of the scene (used as the zoom origin). */
export function gardenFrames(W: number) {
  const cx = W / 2 - 110;
  const sx = Math.min(1, (W - 160) / 960); // narrow screens: pull the hanging pictures in so they all stay on screen
  const f = (dx0: number, y: number, len: number, w: number, h: number, photo: number) => { const dx = dx0 * sx; return ({ x: cx + dx, y, len, w, h, photo, ox: ((cx + dx) / W) * 100, oy: ((y + len + h / 2) / H) * 100 }); };
  return {
    cx,
    focus: [f(-330, 600, 170, 112, 142, 0), f(220, 520, 270, 118, 150, 1), f(-110, 650, 320, 108, 138, 2), f(390, 690, 210, 104, 134, 3)],
    extra: [f(-480, 570, 110, 70, 90, 1), f(70, 460, 110, 88, 116, 4), f(520, 590, 90, 68, 88, 0)],
  };
}

const LAWN = ["#8cc07a", "#7cb56d", "#98c985", "#6fa862", "#a4d08e"];
const CANOPY = ["#4c8b45", "#5c9c4f", "#3f7d3f", "#6aae58", "#2f6a38", "#76b862", "#559748"];

export function GardenScene({ W, pics }: { W: number; pics?: Pic[] }) {
  const { cx, focus, extra } = useMemo(() => gardenFrames(W), [W]);
  const canopy = useMemo(() => [
    ...foliage(cx - 40, 330, 560, 300, 120, 3, CANOPY, 46, 96),
    ...foliage(cx - 420, 560, 140, 70, 26, 5, CANOPY, 30, 56),
    ...foliage(cx + 330, 480, 230, 120, 40, 8, CANOPY, 34, 70),
    ...foliage(cx + 80, 150, 360, 110, 30, 12, ["#86c46c", "#76b862", "#98d07a"], 40, 80),
  ], [cx]);
  const lawn = useMemo(() => {
    const r = rng(41); const out: { x: number; y: number; rx: number; ry: number; c: string }[] = [];
    for (let i = 0; i < Math.round(W / 14); i++) { const y = 830 + Math.pow(r(), 1.6) * 760; out.push({ x: r() * W, y, rx: 40 + (y - 800) * 0.2 + r() * 40, ry: 8 + (y - 800) * 0.04, c: LAWN[Math.floor(r() * LAWN.length)] }); }
    return out;
  }, [W]);
  const stones = useMemo(() => {
    const pts: { x: number; y: number; s: number }[] = [];
    for (let i = 0; i < 26; i++) {
      const t = i / 25;
      const y = 1640 - Math.pow(t, 0.72) * 800;
      const x = cx + 120 + Math.sin(t * 4.2 + 0.2) * 260 * (1 - t * 0.6) + t * 190;
      pts.push({ x, y, s: 1 - t * 0.8 });
    }
    return pts;
  }, [cx]);
  const hedge = useMemo(() => foliage(W / 2, 835, W / 2 + 40, 26, Math.round(W / 22), 81, CANOPY, 22, 40), [W]);
  const sideTrees = useMemo(() => [...foliage(cx - 760, 650, 150, 130, 34, 82, CANOPY, 30, 60), ...foliage(cx + 800, 640, 160, 120, 34, 83, CANOPY, 30, 60), ...foliage(cx - 1180, 700, 200, 120, 30, 84, CANOPY, 30, 60), ...foliage(cx + 1240, 690, 200, 120, 30, 85, CANOPY, 30, 60)], [cx]);
  const dapple = useMemo(() => { const r = rng(91); return Array.from({ length: 14 }, () => ({ x: cx - 200 + r() * 500, y: 1180 + r() * 380, rx: 30 + r() * 70, ry: 10 + r() * 20 })); }, [cx]);
  const vines = useMemo(() => Array.from({ length: 9 }, (_, i) => { const r = rng(120 + i); const x = cx - 460 + r() * 900, y = 380 + r() * 200, l = 160 + r() * 260; return { d: `M${x},${y}c${(r() - 0.5) * 40},${l * 0.4} ${(r() - 0.5) * 50},${l * 0.7} ${(r() - 0.5) * 30},${l}`, x, y, l }; }), [cx]);
  const trunk = `M${cx - 190},1640C${cx - 120},1580 ${cx - 120},1500 ${cx - 112},1420C${cx - 100},1280 ${cx - 96},1180 ${cx - 76},1090C${cx - 56},990 ${cx - 90},870 ${cx - 56},750L${cx + 78},760C${cx + 112},880 ${cx + 66},1000 ${cx + 90},1110C${cx + 112},1250 ${cx + 120},1380 ${cx + 150},1470C${cx + 160},1560 ${cx + 220},1590 ${cx + 270},1640Z`;
  const bark = Array.from({ length: 16 }, (_, i) => {
    const r = rng(60 + i);
    const x = cx - 70 + r() * 130, y = 800 + r() * 800;
    return `M${x},${y}c${6 + r() * 8},${40 + r() * 40} ${-6 + r() * 12},${80 + r() * 60} ${r() * 14 - 4},${120 + r() * 70}`;
  });
  const branches: [string, number][] = [
    [`M${cx - 20},780C${cx - 120},720 ${cx - 270},650 ${cx - 440},560`, 56],
    [`M${cx + 20},780C${cx + 110},690 ${cx + 220},590 ${cx + 320},480`, 54],
    [`M${cx + 30},800C${cx + 150},770 ${cx + 300},740 ${cx + 470},670`, 44],
    [`M${cx - 10},760C${cx - 20},640 ${cx + 10},520 ${cx - 6},400`, 50],
    [`M${cx - 200},690C${cx - 250},620 ${cx - 330},560 ${cx - 380},470`, 26],
    [`M${cx + 190},620C${cx + 250},560 ${cx + 340},520 ${cx + 400},430`, 24],
  ];
  const lightsA = along(cx - 460, 540, cx + 20, 500, 70, 12);
  const lightsB = along(cx + 20, 500, cx + 480, 600, 60, 11);
  const lightsC = along(cx - 300, 620, cx + 300, 700, 90, 14);
  return (
    <div className="absolute inset-0">
      <Sky W={W} />
      <Clouds W={W} />
      <FarMountains W={W} />
      <Layer W={W}>
        <defs>
          <linearGradient id="gLawn" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#a8d493" /><stop offset=".5" stopColor="#85bd74" /><stop offset="1" stopColor="#5f9f55" /></linearGradient>
          <linearGradient id="gHill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#a5cc98" /><stop offset="1" stopColor="#86b87a" /></linearGradient>
          <radialGradient id="vig" cx=".5" cy=".55" r=".75"><stop offset=".55" stopColor="#1d3f1f" stopOpacity="0" /><stop offset="1" stopColor="#1d3f1f" stopOpacity=".45" /></radialGradient>
          <linearGradient id="gTrunk" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#5c402c" /><stop offset=".45" stopColor="#8a6446" /><stop offset="1" stopColor="#4d3524" /></linearGradient>
        </defs>
        <g>
          <path d={ridge(W, 800, 40, 17, 24)} fill="url(#gHill)" />
          <path d={ridge(W, 850, 24, 19, 24)} fill="url(#gLawn)" />
          {lawn.map((l, i) => <ellipse key={i} cx={l.x} cy={l.y} rx={l.rx} ry={l.ry} fill={l.c} opacity=".55" />)}
        </g>
        {/* hedges and small trees at the horizon */}
        <g>
          <Circles list={hedge} />
          <Circles list={sideTrees} />
        </g>
        {dapple.map((d, i) => <ellipse key={i} cx={d.x} cy={d.y} rx={d.rx} ry={d.ry} fill="#fff6c8" opacity=".22" />)}
        {W > 1300 && (
          <g>
            <path d={`M${cx + 1010},830C${cx + 1002},760 ${cx + 1010},700 ${cx + 996},640L${cx + 1040},640C${cx + 1034},710 ${cx + 1046},780 ${cx + 1060},830Z`} fill="#6b4a32" />
            <Circles list={foliage(cx + 1030, 560, 170, 130, 40, 97, CANOPY, 28, 56)} />
          </g>
        )}
        {/* distant floral arch */}
        <g transform={`translate(${cx + 330} 800)`}>
          <ellipse cx="0" cy="40" rx="62" ry="10" fill="#4f8d4a" opacity=".5" />
          <path d="M-46,40V-30Q-46,-72 0,-72Q46,-72 46,-30V40" stroke="#f3e6e0" strokeWidth="13" fill="none" />
          <Blooms x0={-56} x1={56} y0={-76} y1={-20} n={26} rMin={7} rMax={13} seed={9} />
        </g>
        {/* stepping-stone path */}
        <g>
          {stones.map((s, i) => <ellipse key={i} cx={s.x} cy={s.y} rx={96 * s.s + 12} ry={26 * s.s + 5} fill={i % 3 ? "#d9d0c6" : "#cdbfb4"} stroke="#b4a698" strokeWidth="2" />)}
        </g>
        {/* roses along the path */}
        <Blooms x0={cx - 70} x1={cx + 190} y0={1420} y1={1580} n={28} rMin={13} rMax={24} seed={31} />
        <Blooms x0={cx + 220} x1={cx + 560} y0={980} y1={1100} n={20} rMin={8} rMax={14} seed={32} />
      </Layer>
      <Layer W={W}>
        {/* the old tree */}
        <path d={trunk} fill="url(#gTrunk)" />
        {bark.map((d, i) => <path key={i} d={d} stroke="#3a2718" strokeOpacity=".4" strokeWidth="3" fill="none" strokeLinecap="round" />)}
        <path d={`M${cx - 60},1000C${cx - 40},1100 ${cx - 52},1200 ${cx - 30},1340`} stroke="#c9a77c" strokeOpacity=".28" strokeWidth="14" fill="none" strokeLinecap="round" />
        {branches.map(([d, wd], i) => <path key={i} d={d} stroke="#6b4a32" strokeWidth={wd} fill="none" strokeLinecap="round" />)}
        <Circles list={canopy} />
        <g opacity=".55">{canopy.filter((_, i) => i % 2 === 0).map((b, i) => <circle key={i} cx={b.x - b.r * 0.28} cy={b.y - b.r * 0.3} r={b.r * 0.5} fill="#b2e096" />)}</g>
        <g opacity=".35">{canopy.filter((_, i) => i % 3 === 0).map((b, i) => <circle key={i} cx={b.x + b.r * 0.25} cy={b.y + b.r * 0.4} r={b.r * 0.45} fill="#24582f" />)}</g>
        {[0, 1, 2, 3].map((i) => <polygon key={i} points={`${cx + 420 + i * 70},-40 ${cx + 470 + i * 70},-40 ${cx + 40 + i * 190},1500 ${cx - 80 + i * 190},1500`} fill="#fff7d0" opacity=".07" />)}
        {vines.map((v, i) => (
          <g key={i} style={{ transformOrigin: `${v.x}px ${v.y}px`, animationDelay: `${i * 0.5}s` }}>
            <path d={v.d} stroke="#4f8d45" strokeWidth="3" fill="none" strokeLinecap="round" />
            {Array.from({ length: 7 }, (_, k) => <ellipse key={k} cx={v.x + (k % 2 ? 9 : -9)} cy={v.y + (v.l / 7) * (k + 0.8)} rx="12" ry="5" fill={k % 2 ? "#5da24d" : "#6aae58"} transform={`rotate(${k % 2 ? 35 : -35} ${v.x} ${v.y + (v.l / 7) * (k + 0.8)})`} />)}
          </g>
        ))}
        {/* light through the leaves */}
        <ellipse cx={cx + 200} cy={260} rx={300} ry={160} fill="url(#glowW)" opacity=".5" />
        <Lights pts={lightsA} r={4} glow={14} />
        <Lights pts={lightsB} r={4} glow={14} />
        <Lights pts={lightsC} r={4} glow={14} />
        {extra.map((f, i) => <HangingFrame key={`e${i}`} {...f} pics={pics} id={`x${i}`} delay={(i % 4) * 0.7} />)}
        {focus.map((f, i) => <HangingFrame key={`f${i}`} {...f} pics={pics} id={`f${i}`} delay={i * 0.45} />)}
        {[[cx - 90, 520, 170, 14], [cx + 120, 500, 220, 13], [cx - 380, 540, 140, 12], [cx + 420, 640, 130, 12]].map(([x, y, l, r], i) => <Lantern key={i} x={x} y={y} len={l} r={r} c={i % 2 ? "#f4c7a0" : "#f6b8c4"} delay={i * 0.6} />)}
        {/* foreground bushes */}
        <g>
          <Circles list={foliage(cx - 640, 1580, 380, 150, 26, 71, CANOPY, 34, 70)} />
          <Circles list={foliage(cx + 760, 1590, 380, 130, 24, 72, CANOPY, 34, 70)} />
        </g>
        <Blooms x0={cx - 880} x1={cx - 420} y0={1450} y1={1590} n={26} rMin={12} rMax={22} seed={73} />
        <Blooms x0={cx + 560} x1={cx + 980} y0={1470} y1={1600} n={24} rMin={12} rMax={22} seed={74} />
        <rect width={W} height={H} fill="url(#vig)" />
      </Layer>
    </div>
  );
}
