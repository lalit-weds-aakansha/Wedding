/**
 * Shared geometry for the painted scene. The scene is always 1600 units tall; its width follows the screen's shape (see ScenicHero),
 * so the road, hills and trees are generated for the actual width and nothing is stretched.
 */
export const H = 1600;
export const HORIZON = 770;

/** Small seeded random generator: the scene looks the same on every load. */
export function rng(seed: number) {
  let s = seed >>> 0;
  return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296;
}

const noise = (x: number, seed: number) => {
  // smooth 1-D value noise from a few sines (cheap, repeatable)
  return Math.sin(x * 1.0 + seed) * 0.5 + Math.sin(x * 2.3 + seed * 1.7) * 0.28 + Math.sin(x * 4.7 + seed * 0.6) * 0.14;
};

export type Road = ReturnType<typeof makeRoad>;

/** A winding road that leaves the bottom of the picture and curves away to the far hills. t = 0 at the bottom, 1 at the vanishing point. */
export function makeRoad(W: number) {
  const cx = W / 2;
  const y = (t: number) => 1700 - 880 * (1 - Math.pow(1 - t, 1.7));
  const x = (t: number) => cx + 250 * (1 - 0.62 * Math.max(0, t)) * Math.sin(2 * Math.PI * 1.22 * t + 0.55) * (0.3 + Math.min(1, t * 4) * 0.7);
  const w = (t: number) => 12 + 650 * Math.pow(Math.max(0, 1 - t), 2.2);
  const ts: number[] = [];
  for (let t = -0.1; t <= 1.0001; t += 0.0125) ts.push(t);
  const P = (t: number, k = 0) => ({ x: x(t) + (w(t) / 2) * k, y: y(t) }); // k: -1 left edge, 0 centre, 1 right edge
  const line = (k: number, from = -0.1, to = 1) => ts.filter((t) => t >= from && t <= to).map((t, i) => `${i ? "L" : "M"}${P(t, k).x.toFixed(1)},${P(t, k).y.toFixed(1)}`).join("");
  const left = ts.map((t) => P(t, -1));
  const right = [...ts].reverse().map((t) => P(t, 1));
  const polygon = "M" + [...left, ...right].map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join("L") + "Z";
  // centre dashes: a quad per dash, so they shrink with the road
  const dashes: string[] = [];
  for (let t = 0.0; t < 0.97; ) {
    const t2 = t + 0.012 + t * 0.03;
    const hw = (tt: number) => Math.max(0.8, w(tt) * 0.011);
    const a = P(t), b = P(Math.min(0.995, t2));
    dashes.push(`M${a.x - hw(t)},${a.y}L${a.x + hw(t)},${a.y}L${b.x + hw(t2)},${b.y}L${b.x - hw(t2)},${b.y}Z`);
    t = t2 + 0.014 + t * 0.04;
  }
  /** t at a given y (the road is monotonic in y) */
  const tAtY = (yy: number) => { let lo = -0.2, hi = 1; for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2; if (y(m) > yy) lo = m; else hi = m; } return (lo + hi) / 2; };
  return { cx, x, y, w, P, line, polygon, dashes, centerPath: line(0, -0.12, 1), tAtY, left: (yy: number) => P(tAtY(yy), -1).x, right: (yy: number) => P(tAtY(yy), 1).x };
}

/** A hill ridge as a closed path from the left edge to the right edge, down to the bottom of the picture. */
export function ridge(W: number, base: number, amp: number, seed: number, step = 20) {
  let d = `M-20,${H + 20}`;
  for (let xx = -20; xx <= W + 20; xx += step) {
    const n = noise(xx * 0.0042, seed) * amp + noise(xx * 0.011, seed + 3) * amp * 0.35;
    d += `L${xx},${(base - n).toFixed(1)}`;
  }
  return d + `L${W + 20},${H + 20}Z`;
}
export const ridgeY = (xx: number, base: number, amp: number, seed: number) => base - (noise(xx * 0.0042, seed) * amp + noise(xx * 0.011, seed + 3) * amp * 0.35);

export type Blob = { x: number; y: number; r: number; c: string };

const GREENS_FAR = ["#7fa58f", "#88ad97", "#76a089"];
const GREENS_MID = ["#78ab63", "#6ea05b", "#83b56d", "#5f9455"];
const GREENS_NEAR = ["#4a8a45", "#5da24d", "#559748", "#3b7a3c", "#6aae55", "#2f6a38", "#73b35c"];

/** Rounded tree-top blobs sitting on a ridge: gives the hills their painted foliage. */
export function treesOnRidge(W: number, base: number, amp: number, seed: number, rMin: number, rMax: number, palette: string[], every = 22): Blob[] {
  const r = rng(seed + 100);
  const out: Blob[] = [];
  for (let xx = 0; xx < W; xx += every * (0.6 + r() * 0.8)) {
    const rad = rMin + r() * (rMax - rMin);
    out.push({ x: xx, y: ridgeY(xx, base, amp, seed) + rad * 0.35 + r() * rad * 0.5, r: rad, c: palette[Math.floor(r() * palette.length)] });
  }
  return out;
}

/** Forest on both sides of the road, getting bigger towards the viewer; the cliff area is left clear. */
export function roadsideTrees(W: number, road: Road, seed: number, cliffFrom: number, cliffTo: number): Blob[] {
  const r = rng(seed);
  const out: Blob[] = [];
  for (let yy = 880; yy <= 1640; yy += 20) {
    const depth = (yy - 860) / 780; // 0 far .. 1 near
    const L = road.left(yy), R = road.right(yy);
    const rad = 13 + depth * depth * 40;
    const rows = 1 + Math.floor(depth * 3);
    for (let k = 0; k < rows; k++) {
      const gap = 14 + r() * 40 + k * rad * 1.3;
      out.push({ x: L - gap - r() * 20, y: yy + r() * 10, r: rad * (0.8 + r() * 0.5), c: GREENS_NEAR[Math.floor(r() * GREENS_NEAR.length)] });
      const inCliff = yy > cliffFrom && yy < cliffTo;
      if (!inCliff) out.push({ x: R + gap + r() * 20, y: yy + r() * 10, r: rad * (0.8 + r() * 0.5), c: GREENS_NEAR[Math.floor(r() * GREENS_NEAR.length)] });
    }
  }
  // beyond the verge: fill the wide sides on landscape screens
  for (let yy = 900; yy <= 1620; yy += 32) {
    const depth = (yy - 860) / 780;
    const rad = 18 + depth * depth * 50;
    for (let xx = 0; xx < W; xx += rad * (1.3 + r() * 0.9)) {
      const L = road.left(yy) - 60 - rad, R = road.right(yy) + 60 + rad;
      if (xx < L || (xx > R && !(yy > cliffFrom && yy < cliffTo))) out.push({ x: xx, y: yy + r() * 12, r: rad * (0.8 + r() * 0.5), c: GREENS_NEAR[Math.floor(r() * GREENS_NEAR.length)] });
    }
  }
  return out.sort((a, b) => a.y - b.y);
}

export { GREENS_FAR, GREENS_MID, GREENS_NEAR };

/** A painted cliff face right of the road: jagged top, reddish strata. */
export function cliffPath(W: number, road: Road, top: number, bottom: number, seed: number) {
  const r = rng(seed);
  const xs = road.right(top + (bottom - top) * 0.55) + 70;
  let d = `M${xs},${bottom}`;
  const n = 9;
  for (let i = 0; i <= n; i++) {
    const yy = bottom - ((bottom - top) * i) / n;
    d += `L${xs + (i % 2 ? 24 : 0) + r() * 40 + (n - i) * 6},${yy}`;
  }
  const topX = xs + 90;
  const xr = Math.min(W + 40, topX + 120 + 320); // a rock outcrop, not a wall across the whole screen
  d += `L${topX},${top - 40}L${topX + 120},${top - 64}L${xr - 90},${top - 30}L${xr - 20},${top + 60}L${xr},${bottom - 90}L${xr - 36},${bottom}Z`;
  return { d, x: xs, xr };
}
