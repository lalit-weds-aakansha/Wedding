import { useMemo } from "react";
import { ArchPhoto, Blooms, Circles, foliage, Lantern, Lights, along } from "./art";
import { Clouds, Layer, Sky } from "../scene/Landscape";
import { H, rng } from "../scene/geometry";

/* ====================================================================================================
   BLUSH-PINK ROOM  (Mehendi): a pointed arch of flowers, sheer drapes, hanging blossoms and your photo
   ==================================================================================================== */
export function BlushScene({ W }: { W: number }) {
  const cx = W / 2;
  const archPts = useMemo(() => {
    const out: [number, number][] = [];
    for (let i = 0; i <= 34; i++) {
      const t = i / 34;
      // pointed arch: two arcs meeting at the apex
      const side = t < 0.5 ? -1 : 1, u = t < 0.5 ? t * 2 : (1 - t) * 2; // 0 at the base, 1 at the apex
      const x = cx + side * (330 - 330 * Math.pow(u, 1.8));
      const y = 1280 - 900 * Math.pow(u, 0.62);
      out.push([x, y]);
    }
    return out;
  }, [cx]);
  const archPath = "M" + archPts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join("L");
  const strands = useMemo(() => Array.from({ length: 11 }, (_, i) => { const r = rng(200 + i); return { x: cx - 520 + (i / 10) * 1040 + (r() - 0.5) * 40, l: 220 + r() * 360, d: r() * 3 }; }), [cx]);
  const garland = useMemo(() => { const r = rng(7); return archPts.map(([x, y]) => ({ x: x + (r() - 0.5) * 26, y: y + (r() - 0.5) * 26, r: 14 + r() * 14, n: r() })); }, [archPts]);
  const PINKS = ["#f6b3c0", "#f9d0d6", "#fff3ee", "#f4a0b2", "#fbc7cc", "#f7ddd0"];
  return (
    <div className="absolute inset-0">
      <Layer W={W}>
        <defs>
          <linearGradient id="bWall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f3c3cb" /><stop offset=".6" stopColor="#f8d9d9" /><stop offset="1" stopColor="#f6cfcf" /></linearGradient>
          <linearGradient id="bFloor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f4cdd0" /><stop offset="1" stopColor="#efb9bf" /></linearGradient>
          <linearGradient id="bInside" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff7ee" /><stop offset="1" stopColor="#fbe3dd" /></linearGradient>
          <linearGradient id="sheer" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#fff" stopOpacity=".92" /><stop offset="1" stopColor="#fff" stopOpacity=".25" /></linearGradient>
        </defs>
        <rect width={W} height={H} fill="url(#bWall)" />
        {Array.from({ length: Math.ceil(W / 220) }, (_, i) => <rect key={i} x={i * 220 - 20} y="0" width="3" height="1290" fill="#e9a9b3" opacity=".3" />)}
        <rect y="1260" width={W} height={H - 1260} fill="url(#bFloor)" />
        <ellipse cx={cx} cy="1400" rx="620" ry="70" fill="#fff" opacity=".35" />
        {/* the arch: light inside, cream frame */}
        <path d={`${archPath}Z`} fill="url(#bInside)" />
        <ellipse cx={cx} cy="900" rx="330" ry="420" fill="url(#glowP)" opacity=".8" />
        <path d={archPath} fill="none" stroke="#fbeee6" strokeWidth="34" strokeLinejoin="round" />
        <path d={archPath} fill="none" stroke="#e8b9bd" strokeWidth="3" transform="translate(0 -17)" opacity=".6" />
        {/* hanging blossom strands */}
        {strands.map((s, i) => (
          <g key={i} style={{ transformOrigin: `${s.x}px 0px`, animationDelay: `${s.d}s` }}>
            <line x1={s.x} y1="0" x2={s.x} y2={s.l} stroke="#7fae6f" strokeWidth="2.4" />
            {Array.from({ length: Math.floor(s.l / 38) }, (_, k) => <g key={k}><circle cx={s.x + (k % 2 ? 7 : -7)} cy={20 + k * 38} r={9 + (k % 3) * 2} fill={PINKS[(k + i) % PINKS.length]} /><circle cx={s.x + (k % 2 ? 7 : -7)} cy={20 + k * 38} r="3" fill="#e8b84a" /></g>)}
            <circle cx={s.x} cy={s.l + 8} r="8" fill="#fff" stroke="#e7c9c9" />
          </g>
        ))}
        {/* floral garland along the arch */}
        {garland.map((g, i) => <g key={i}><ellipse cx={g.x + 14} cy={g.y + 8} rx="22" ry="9" fill="#6aa65c" transform={`rotate(${i * 37} ${g.x} ${g.y})`} /><circle cx={g.x} cy={g.y} r={g.r} fill={PINKS[Math.floor(g.n * PINKS.length)]} /><circle cx={g.x - 4} cy={g.y - 4} r={g.r * 0.5} fill="#fff" opacity=".3" /><circle cx={g.x} cy={g.y} r={g.r * 0.2} fill="#e8b84a" /></g>)}
        <Blooms x0={cx - 90} x1={cx + 90} y0={360} y1={440} n={22} rMin={14} rMax={26} seed={5} palette={PINKS} />
        {/* chandeliers */}
        {[-250, 250].map((dx, i) => (
          <g key={dx} className="chandelier" style={{ transformOrigin: `${cx + dx}px 0px`, animationDelay: `${i * 1.2}s` }}>
            <line x1={cx + dx} y1="0" x2={cx + dx} y2={300 + i * 40} stroke="#d6b66a" strokeWidth="3" />
            <ellipse cx={cx + dx} cy={380 + i * 40} rx="70" ry="70" fill="url(#glowW)" />
            <path d={`M${cx + dx - 34},${312 + i * 40}H${cx + dx + 34}L${cx + dx + 52},${400 + i * 40}Q${cx + dx},${424 + i * 40} ${cx + dx - 52},${400 + i * 40}Z`} fill="url(#goldF)" />
            <path d={`M${cx + dx - 40},${340 + i * 40}Q${cx + dx},${372 + i * 40} ${cx + dx + 40},${340 + i * 40}`} stroke="#fff3c9" strokeWidth="3" fill="none" opacity=".8" />
          </g>
        ))}
        {/* sheer drapes either side */}
        {[-1, 1].map((sd) => (
          <g key={sd}>
            <path d={`M${cx + sd * (W / 2 + 40)},-20L${cx + sd * (W / 2 - 150)},-20Q${cx + sd * (W / 2 - 230)},500 ${cx + sd * (W / 2 - 170)},1280L${cx + sd * (W / 2 + 40)},1280Z`} fill="url(#sheer)" transform={sd > 0 ? `translate(${cx * 2} 0) scale(-1 1) translate(${-cx * 2} 0)` : undefined} opacity=".92" />
            {[0.2, 0.45, 0.7].map((k) => <path key={k} d={`M${cx + sd * (W / 2 - 150 * k - 20)},0Q${cx + sd * (W / 2 - 200 * k - 40)},600 ${cx + sd * (W / 2 - 150 * k - 10)},1270`} stroke="#f3cfd4" strokeWidth="3" fill="none" opacity=".5" />)}
          </g>
        ))}
        {/* the portrait, and a low sofa */}
        <ArchPhoto x={cx} y={760} w={370} h={500} photo={0} id="blush" />
        <g>
          <ellipse cx={cx} cy="1368" rx="420" ry="26" fill="#a85c6a" opacity=".25" />
          <rect x={cx - 400} y="1230" width="800" height="110" rx="44" fill="#fbefe4" />
          <rect x={cx - 360} y="1150" width="720" height="120" rx="52" fill="#fff8f0" />
          <rect x={cx - 400} y="1290" width="800" height="70" rx="30" fill="#f1dccf" />
          {[-250, -120, 120, 250].map((dx, i) => <rect key={dx} x={cx + dx - 46} y={1190} width="92" height="84" rx="26" fill={i % 2 ? "#f6b8c4" : "#fbd6db"} stroke="#f2a6b4" strokeWidth="2" />)}
        </g>
        <Blooms x0={cx - 620} x1={cx - 420} y0={1300} y1={1480} n={16} rMin={12} rMax={22} seed={15} palette={PINKS} />
        <Blooms x0={cx + 420} x1={cx + 620} y0={1300} y1={1480} n={16} rMin={12} rMax={22} seed={16} palette={PINKS} />
      </Layer>
    </div>
  );
}

/* ====================================================================================================
   NIGHT STAGE  (Sangeet): navy sky and stars, a chandelier, teal curtains, a chequered floor
   ==================================================================================================== */
export function NightScene({ W }: { W: number }) {
  const cx = W / 2;
  const cw = Math.min(250, W * 0.15);
  const stars = useMemo(() => { const r = rng(55); return Array.from({ length: Math.round(W / 14) }, () => ({ x: r() * W, y: r() * 760, r: 1 + r() * 2.6, d: r() * 4 })); }, [W]);
  const tiles = useMemo(() => {
    const out: { p: string; dark: boolean }[] = [];
    const top = 1190, rows = 9, cols = 16;
    const yAt = (r: number) => top + (H - top + 120) * Math.pow(r / rows, 1.7);
    for (let r = 0; r < rows; r++) {
      const y0 = yAt(r), y1 = yAt(r + 1);
      const w0 = 46 + (y0 - top) * 0.62, w1 = 46 + (y1 - top) * 0.62;
      for (let c = -cols; c < cols; c++) out.push({ p: `${cx + c * w0},${y0} ${cx + (c + 1) * w0},${y0} ${cx + (c + 1) * w1},${y1} ${cx + c * w1},${y1}`, dark: (r + c) % 2 === 0 });
    }
    return out;
  }, [cx]);
  const crystals = useMemo(() => Array.from({ length: 22 }, (_, i) => { const a = (i / 21) * Math.PI; return { x: Math.cos(a) * 170, y: Math.sin(a) * 60 + 52 }; }), []);
  const lightsA = along(0, 80, cx, 190, 90, Math.max(12, Math.round(W / 70)));
  const lightsB = along(cx, 190, W, 70, 90, Math.max(12, Math.round(W / 70)));
  return (
    <div className="absolute inset-0">
      <Layer W={W}>
        <defs>
          <linearGradient id="nSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0c1840" /><stop offset=".55" stopColor="#1b2d68" /><stop offset="1" stopColor="#2a4180" /></linearGradient>
          <linearGradient id="nArch" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#1c2b5c" /><stop offset="1" stopColor="#3a4f8e" /></linearGradient>
          <linearGradient id="curt" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#0f4a52" /><stop offset=".5" stopColor="#1d6f78" /><stop offset="1" stopColor="#0d3f48" /></linearGradient>
        </defs>
        <rect width={W} height={H} fill="url(#nSky)" />
        {stars.map((s, i) => <circle key={i} className="twinkle" cx={s.x} cy={s.y} r={s.r} fill="#fff7dc" style={{ animationDelay: `${s.d}s` }} />)}
        {/* back wall of arches */}
        {[-1, 0, 1].map((k) => <g key={k}><path d={`M${cx + k * 330 - 150},1180V740A150,150 0 0 1 ${cx + k * 330 + 150},740V1180Z`} fill="url(#nArch)" /><path d={`M${cx + k * 330 - 150},1180V740A150,150 0 0 1 ${cx + k * 330 + 150},740V1180Z`} fill="none" stroke="#8aa0d6" strokeOpacity=".35" strokeWidth="5" /></g>)}
        <rect y="1170" width={W} height="40" fill="#101c46" />
        {/* the couple, glowing in the central arch */}
        <ellipse cx={cx} cy={930} rx={300} ry={360} fill="url(#glowW)" opacity=".55" />
        <ArchPhoto x={cx} y={700} w={290} h={420} photo={1} id="night" glow={false} />
        {/* floor */}
        {tiles.map((t, i) => <polygon key={i} points={t.p} fill={t.dark ? "#16162a" : "#f3efe6"} />)}
        <rect y="1180" width={W} height={H - 1180} fill="url(#glowW)" opacity=".18" />
        {/* chandelier */}
        <g className="chandelier" style={{ transformOrigin: `${cx}px 0px` }}>
          <line x1={cx} y1="0" x2={cx} y2="150" stroke="#d9b65e" strokeWidth="4" />
          <ellipse cx={cx} cy="250" rx="300" ry="200" fill="url(#glowW)" />
          <g transform={`translate(${cx} 170)`}>
            <path d="M-170,60Q0,150 170,60" stroke="url(#goldF)" strokeWidth="10" fill="none" />
            <path d="M-110,20Q0,90 110,20" stroke="url(#goldF)" strokeWidth="8" fill="none" />
            <rect x="-14" y="-24" width="28" height="60" rx="8" fill="url(#goldF)" />
            {crystals.map((c, i) => <g key={i}><line x1={c.x} y1={c.y} x2={c.x} y2={c.y + 26} stroke="#f5e5b8" strokeWidth="2" /><circle cx={c.x} cy={c.y + 32} r="6" fill="#fff8e0" opacity=".9" /></g>)}
            {[-150, -75, 0, 75, 150].map((x, i) => <g key={x} className="twinkle" style={{ animationDelay: `${i * 0.4}s` }}><circle cx={x} cy={Math.abs(x) > 100 ? 38 : 22} r="16" fill="url(#glowW)" /><circle cx={x} cy={Math.abs(x) > 100 ? 38 : 22} r="6" fill="#ffe9a8" /></g>)}
          </g>
        </g>
        <Lights pts={lightsA} r={4} glow={14} />
        <Lights pts={lightsB} r={4} glow={14} />
        {/* teal curtains: they get narrower on narrow screens so the stage stays visible */}
        {[-1, 1].map((sd) => {
          const e = sd < 0 ? 0 : W, d = -sd; // edge and direction towards the centre
          return <path key={sd} d={`M${e - d * -20},-20H${e + d * cw}Q${e + d * (cw + 70)},600 ${e + d * (cw - 10)},1190H${e - d * -20}Z`} fill="url(#curt)" />;
        })}
        {[0.2, 0.5, 0.8].flatMap((k) => [-1, 1].map((sd) => { const e = sd < 0 ? 0 : W, d = -sd; return <path key={`${k}${sd}`} d={`M${e + d * cw * k},0Q${e + d * (cw * k + 40)},600 ${e + d * (cw * k - 8)},1180`} stroke="#0a3038" strokeOpacity=".4" strokeWidth="6" fill="none" />; }))}
        {/* tables with candles, and bokeh */}
        {[cx - 420, cx + 420].map((x, i) => (
          <g key={x}>
            <ellipse cx={x} cy="1500" rx="170" ry="48" fill="#0f5760" />
            <ellipse cx={x} cy="1485" rx="150" ry="36" fill="#1b7882" />
            <circle cx={x} cy="1455" r="40" fill="url(#glowW)" className="twinkle" style={{ animationDelay: `${i * 0.7}s` }} />
            <rect x={x - 5} y="1446" width="10" height="34" rx="3" fill="#fff0cf" /><circle cx={x} cy="1440" r="6" fill="#ffd36e" />
          </g>
        ))}
        {stars.slice(0, 14).map((s, i) => <circle key={`b${i}`} cx={(s.x * 1.7) % W} cy={900 + ((s.y * 2.3) % 500)} r={10 + (i % 4) * 5} fill="#ffcf7a" opacity=".16" filter="url(#bokeh)" />)}
      </Layer>
    </div>
  );
}

/* ====================================================================================================
   COLOURFUL CARNIVAL  (Haldi): blue-and-yellow parasols, lemon garlands, stalls and flowers
   ==================================================================================================== */
function Parasol({ x, y, r, flip = false, id }: { x: number; y: number; r: number; flip?: boolean; id: string }) {
  const wedges = 8;
  return (
    <g transform={`translate(${x} ${y}) ${flip ? "scale(-1 1)" : ""}`} className="sway-slow">
      <rect x="-5" y="0" width="10" height={r * 2.4} fill="#c9a14a" />
      {Array.from({ length: wedges }, (_, i) => {
        const a0 = Math.PI + (i / wedges) * Math.PI, a1 = Math.PI + ((i + 1) / wedges) * Math.PI;
        return <path key={i} d={`M0,0L${Math.cos(a0) * r},${Math.sin(a0) * r * 0.55}Q${Math.cos((a0 + a1) / 2) * r * 1.02},${Math.sin((a0 + a1) / 2) * r * 0.62 + 12} ${Math.cos(a1) * r},${Math.sin(a1) * r * 0.55}Z`} fill={i % 2 ? "#f5c935" : "#2f63b8"} />;
      })}
      <path d={`M${-r},0Q0,${r * 0.2} ${r},0`} stroke="#fff" strokeOpacity=".5" strokeWidth="3" fill="none" id={id} />
    </g>
  );
}
export function CarnivalScene({ W }: { W: number }) {
  const cx = W / 2;
  const lemon = (pts: [number, number][]) => pts.map(([x, y], i) => <g key={i}><ellipse cx={x} cy={y + 18} rx="14" ry="20" fill={i % 2 ? "#f6d03c" : "#f2c21f"} /><ellipse cx={x - 4} cy={y + 10} rx="4" ry="6" fill="#fff" opacity=".4" /><ellipse cx={x + 12} cy={y - 2} rx="12" ry="5" fill="#5fa24d" transform={`rotate(-25 ${x} ${y})`} /></g>);
  const crates = useMemo(() => { const r = rng(88); return Array.from({ length: 36 }, (_, i) => ({ x: (i % 12) * 26 + r() * 6, y: Math.floor(i / 12) * 22 + r() * 5, c: ["#f4a21f", "#f6d03c", "#e8512f", "#79b84f"][Math.floor(r() * 4)] })); }, []);
  const strings = [along(0, 120, cx, 320, 120, 12), along(cx, 320, W, 100, 110, 12)];
  return (
    <div className="absolute inset-0">
      <Sky W={W} />
      <Clouds W={W} />
      <Layer W={W}>
        <defs>
          <linearGradient id="cGround" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f2d9b4" /><stop offset="1" stopColor="#e8bf8d" /></linearGradient>
        </defs>
        <rect y="820" width={W} height={H - 820} fill="url(#cGround)" />
        {Array.from({ length: 70 }, (_, i) => { const r = rng(300 + i); return <ellipse key={i} cx={r() * W} cy={860 + r() * 740} rx={20 + r() * 40} ry={6 + r() * 8} fill="#d9a574" opacity=".35" />; })}
        {/* stalls with striped awnings */}
        {[-1, 0, 1].map((k) => {
          const sx = cx + k * 420 - 170;
          return (
            <g key={k}>
              <rect x={sx} y="720" width="340" height="240" fill={k === 0 ? "#2f63b8" : "#fff1d6"} />
              <rect x={sx} y="900" width="340" height="70" fill="#a8723c" />
              {Array.from({ length: 8 }, (_, i) => <path key={i} d={`M${sx + i * 42.5},700h42.5l-6,56a21,21 0 0 1-30.5,0Z`} fill={i % 2 ? "#fff5dd" : "#f5c935"} />)}
              <g transform={`translate(${sx + 28} 868)`}>{crates.map((c, i) => <circle key={i} cx={c.x} cy={c.y} r="11" fill={c.c} />)}</g>
            </g>
          );
        })}
        {/* hanging lemons and bunting */}
        {strings.map((pts, i) => <g key={i}><path d={"M" + pts.map(([x, y]) => `${x},${y}`).join("L")} stroke="#8a6a3a" strokeWidth="3" fill="none" />{lemon(pts.filter((_, k) => k % 2 === 0))}</g>)}
        {along(0, 40, W, 40, 60, Math.max(14, Math.round(W / 60))).map(([x, y], i) => <path key={i} d={`M${x - 20},${y}h40l-20,46Z`} fill={i % 2 ? "#f5c935" : "#2f63b8"} />)}
        {/* parasols */}
        <Parasol x={cx - 330} y={470} r={290} id="p1" />
        <Parasol x={cx + 360} y={560} r={240} flip id="p2" />
        {/* the couple in a round frame, between flower pots */}
        <ArchPhoto x={cx} y={820} w={340} h={470} photo={2} id="carn" glow={false} />
        <Blooms x0={cx - Math.min(700, W * 0.48)} x1={cx - Math.min(330, W * 0.2)} y0={1250} y1={1500} n={34} rMin={13} rMax={24} seed={70} palette={["#2f63b8", "#7fa8e6", "#fff", "#f5c935", "#f6d03c"]} />
        <Blooms x0={cx + Math.min(330, W * 0.2)} x1={cx + Math.min(700, W * 0.48)} y0={1250} y1={1500} n={34} rMin={13} rMax={24} seed={71} palette={["#f5c935", "#f6d03c", "#fff", "#2f63b8", "#7fa8e6"]} />
        <ellipse cx={cx} cy="1390" rx="260" ry="30" fill="#b9854f" opacity=".3" />
      </Layer>
    </div>
  );
}

/* ====================================================================================================
   FLORAL MANDAP  (Wedding): golden hour, a flowered arch, an aisle of petals, chairs and lanterns
   ==================================================================================================== */
export function MandapScene({ W }: { W: number }) {
  const cx = W / 2;
  const ring = (rad: number, n: number, seed: number, palette: string[], rMin: number, rMax: number) => {
    const r = rng(seed);
    return Array.from({ length: n }, (_, i) => { const a = Math.PI + (i / (n - 1)) * Math.PI; return { x: cx + Math.cos(a) * rad + (r() - 0.5) * 20, y: 1010 + Math.sin(a) * rad * 0.95 + (r() - 0.5) * 20, r: rMin + r() * (rMax - rMin), c: palette[Math.floor(r() * palette.length)] }; });
  };
  const PINK = ["#f2a7b6", "#f8cdd3", "#fff2ec", "#ef95a8", "#f7d4c0", "#fbe1e3"];
  const arch = useMemo(() => [...ring(360, 44, 3, PINK, 24, 40), ...ring(300, 38, 4, PINK, 20, 34), ...ring(240, 30, 5, ["#fff2ec", "#fbe1e3", "#f8cdd3"], 18, 30)], [cx]); // eslint-disable-line react-hooks/exhaustive-deps
  const petals = useMemo(() => { const r = rng(12); return Array.from({ length: 70 }, () => { const t = Math.pow(r(), 0.8); const y = 1100 + t * 520; const half = 40 + t * 330; return { x: cx + (r() - 0.5) * 2 * half, y, rx: 5 + t * 12, c: PINK[Math.floor(r() * PINK.length)] }; }); }, [cx]); // eslint-disable-line react-hooks/exhaustive-deps
  const hedge = useMemo(() => foliage(cx, 830, W / 2 + 60, 30, Math.round(W / 20), 61, ["#6e9a4e", "#7fae5c", "#5d8c45", "#8cba66"], 24, 44), [W, cx]);
  const chairs = (side: number) => Array.from({ length: 6 }, (_, i) => { const t = i / 5; const y = 1180 + t * t * 420; const s = 0.5 + t * 1.1; const x = cx + side * (170 + t * 420); return { x, y, s }; });
  return (
    <div className="absolute inset-0">
      <Layer W={W}>
        <defs>
          <linearGradient id="mSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f9e0c4" /><stop offset=".5" stopColor="#f7cfb2" /><stop offset="1" stopColor="#f4bfa6" /></linearGradient>
          <linearGradient id="mLawn" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#b6c97f" /><stop offset="1" stopColor="#8eaa63" /></linearGradient>
          <linearGradient id="mAisle" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f6dcc8" /><stop offset="1" stopColor="#f2c6b2" /></linearGradient>
        </defs>
        <rect width={W} height={H} fill="url(#mSky)" />
        <ellipse cx={cx} cy="700" rx="700" ry="380" fill="url(#glowW)" opacity=".7" />
      </Layer>
      <div className="absolute inset-0 opacity-45"><Clouds W={W} /></div>
      <Layer W={W}>
        <rect y="820" width={W} height={H - 820} fill="url(#mLawn)" />
        <g><Circles list={hedge} /></g>
        {/* aisle in perspective */}
        <polygon points={`${cx - 60},1000 ${cx + 60},1000 ${cx + 520},${H + 20} ${cx - 520},${H + 20}`} fill="url(#mAisle)" />
        {petals.map((p, i) => <ellipse key={i} cx={p.x} cy={p.y} rx={p.rx} ry={p.rx * 0.5} fill={p.c} opacity=".9" transform={`rotate(${i * 29} ${p.x} ${p.y})`} />)}
        {/* chairs */}
        {[-1, 1].map((sd) => chairs(sd).map((c, i) => (
          <g key={`${sd}${i}`} transform={`translate(${c.x} ${c.y}) scale(${c.s})`}>
            <ellipse cx="0" cy="48" rx="34" ry="8" fill="#6a7a45" opacity=".35" />
            <rect x="-26" y="-34" width="52" height="46" rx="12" fill="#fffaf2" stroke="#ead9c4" strokeWidth="2" />
            <rect x="-30" y="14" width="60" height="30" rx="9" fill="#fff4e6" stroke="#ead9c4" strokeWidth="2" />
            <circle cx="0" cy="-8" r="7" fill="#f2a7b6" />
          </g>
        )))}
        {/* the flowered arch and pillars */}
        <rect x={cx - 400} y="1000" width="64" height="560" rx="16" fill="#fbefe3" />
        <rect x={cx + 336} y="1000" width="64" height="560" rx="16" fill="#fbefe3" />
        <path d={`M${cx - 330},1010A330,330 0 0 1 ${cx + 330},1010Z`} fill="#fff1e6" opacity=".8" />
        <ArchPhoto x={cx} y={760} w={330} h={520} photo={3} id="mandap" />
        {arch.map((b, i) => <g key={i}><ellipse cx={b.x + b.r * 0.7} cy={b.y + b.r * 0.4} rx={b.r * 1.1} ry={b.r * 0.42} fill="#6aa65c" transform={`rotate(${i * 41} ${b.x} ${b.y})`} /><circle cx={b.x} cy={b.y} r={b.r} fill={b.c} /><circle cx={b.x - b.r * 0.2} cy={b.y - b.r * 0.2} r={b.r * 0.5} fill="#fff" opacity=".3" /></g>)}
        <Blooms x0={cx - 420} x1={cx - 330} y0={1000} y1={1540} n={22} rMin={20} rMax={34} seed={21} palette={PINK} />
        <Blooms x0={cx + 330} x1={cx + 420} y0={1000} y1={1540} n={22} rMin={20} rMax={34} seed={22} palette={PINK} />
        {/* lanterns across the top */}
        {Array.from({ length: Math.max(9, Math.round(W / 130)) }, (_, i) => <Lantern key={i} x={((i + 0.5) / Math.max(9, Math.round(W / 130))) * W} y={0} len={70 + ((i * 53) % 180)} r={14 + (i % 3) * 3} c={i % 2 ? "#f5b8c4" : "#f7cfa0"} delay={(i % 5) * 0.5} />)}
      </Layer>
    </div>
  );
}
