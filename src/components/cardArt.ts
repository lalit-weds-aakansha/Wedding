/**
 * Draws the front of the Save-the-Date card (the scratch surface) with the Canvas 2D API.
 * Original artwork: letterpress-style cream paper, a Paithani-style maroon / green / gold border,
 * embossed lettering and a gold-glitter lotus. Nothing here is copied from another site.
 */

export type CardText = { om: string; shloka: string; title: string; names: string };
export type CardTheme = { maroon: string; green: string; gold: string; ink: string; displayFont: string; bodyFont: string; italic: boolean };

function rng(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

function paper(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, "#f6f1e8");
  g.addColorStop(1, "#efe8dc");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  const r = rng(7);
  for (let i = 0; i < (w * h) / 14; i++) {
    const x = r() * w, y = r() * h, a = 0.025 + r() * 0.05;
    ctx.fillStyle = r() > 0.5 ? `rgba(120,98,70,${a})` : `rgba(255,255,255,${a * 2})`;
    ctx.fillRect(x, y, 1 + r(), 1 + r());
  }
  for (let i = 0; i < 260; i++) { // soft paper fibres
    const x = r() * w, y = r() * h, l = 4 + r() * 12, ang = r() * Math.PI;
    ctx.strokeStyle = `rgba(150,128,100,${0.05 + r() * 0.06})`;
    ctx.lineWidth = 0.6;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(ang) * l, y + Math.sin(ang) * l); ctx.stroke();
  }
  const v = ctx.createRadialGradient(w / 2, h / 2, w * 0.35, w / 2, h / 2, h * 0.75);
  v.addColorStop(0, "rgba(0,0,0,0)");
  v.addColorStop(1, "rgba(90,70,40,0.12)");
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, w, h);
}

/** Paithani-style border: maroon band, gold lines and a row of small green/gold triangles ("kath"). */
function border(ctx: CanvasRenderingContext2D, w: number, h: number, t: CardTheme) {
  const m = w * 0.035;
  const band = w * 0.03;
  ctx.save();
  ctx.fillStyle = t.maroon;
  ctx.fillRect(m, m, w - 2 * m, band);
  ctx.fillRect(m, h - m - band, w - 2 * m, band);
  ctx.fillRect(m, m, band, h - 2 * m);
  ctx.fillRect(w - m - band, m, band, h - 2 * m);
  ctx.strokeStyle = t.gold;
  ctx.lineWidth = 1.2;
  ctx.strokeRect(m - 3, m - 3, w - 2 * m + 6, h - 2 * m + 6);
  ctx.strokeRect(m + band + 3, m + band + 3, w - 2 * (m + band + 3), h - 2 * (m + band + 3));
  const tri = band * 0.62;
  const step = tri * 1.35;
  const row = (x0: number, y0: number, dx: number, dy: number, n: number, nx: number, ny: number) => {
    for (let i = 0; i < n; i++) {
      const cx = x0 + dx * i, cy = y0 + dy * i;
      ctx.fillStyle = i % 2 ? t.gold : "#e9dcb9";
      ctx.beginPath();
      ctx.moveTo(cx - (dx ? tri / 2 : 0) * 1, cy - (dy ? tri / 2 : 0) * 1);
      ctx.lineTo(cx + (dx ? tri / 2 : 0) * 1, cy + (dy ? tri / 2 : 0) * 1);
      ctx.lineTo(cx + nx * tri * 0.8, cy + ny * tri * 0.8);
      ctx.closePath();
      ctx.fill();
    }
  };
  const nTop = Math.floor((w - 2 * m - band * 2) / step);
  const nSide = Math.floor((h - 2 * m - band * 2) / step);
  row(m + band + step / 2, m + band * 0.1, step, 0, nTop, 0, 1);
  row(m + band + step / 2, h - m - band * 0.1, step, 0, nTop, 0, -1);
  row(m + band * 0.1, m + band + step / 2, 0, step, nSide, 1, 0);
  row(w - m - band * 0.1, m + band + step / 2, 0, step, nSide, -1, 0);
  // corner diamonds
  for (const [cx, cy] of [[m + band / 2, m + band / 2], [w - m - band / 2, m + band / 2], [m + band / 2, h - m - band / 2], [w - m - band / 2, h - m - band / 2]]) {
    ctx.fillStyle = t.green;
    ctx.beginPath();
    ctx.moveTo(cx, cy - band * 0.9); ctx.lineTo(cx + band * 0.9, cy); ctx.lineTo(cx, cy + band * 0.9); ctx.lineTo(cx - band * 0.9, cy); ctx.closePath();
    ctx.fill();
    ctx.fillStyle = t.gold;
    ctx.beginPath(); ctx.arc(cx, cy, band * 0.3, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

/** Letterpress effect: light edge, dark edge, then the ink. */
function emboss(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, font: string, color: string, letterSpacing = 0) {
  ctx.save();
  ctx.font = font;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  (ctx as unknown as { letterSpacing: string }).letterSpacing = `${letterSpacing}px`;
  ctx.fillStyle = "rgba(255,255,255,0.95)"; ctx.fillText(text, x + 1.2, y + 1.2);
  ctx.fillStyle = "rgba(70,55,35,0.28)"; ctx.fillText(text, x - 0.8, y - 0.8);
  ctx.fillStyle = color; ctx.fillText(text, x, y);
  ctx.restore();
}

function lotusPath(cx: number, cy: number, s: number) {
  const p = new Path2D();
  const petal = new Path2D("M0 0C-12-8-13-26 0-36 13-26 12-8 0 0Z");
  const add = (rot: number, k: number) => {
    const m = new DOMMatrix().translate(cx, cy).rotate(rot).scale(s * k);
    p.addPath(petal, m);
  };
  add(-82, 0.82); add(82, 0.82); add(-56, 1); add(56, 1); add(-28, 1.12); add(28, 1.12); add(0, 1.24);
  p.addPath(new Path2D("M-24 3C-12 10 12 10 24 3 18 12-18 12-24 3Z"), new DOMMatrix().translate(cx, cy).scale(s));
  return p;
}

function glitterLotus(ctx: CanvasRenderingContext2D, w: number, h: number, t: CardTheme) {
  const cx = w / 2, cy = h * 0.645, s = w * 0.0098;
  const path = lotusPath(cx, cy, s);
  ctx.save();
  ctx.shadowColor = "rgba(80,55,20,0.45)";
  ctx.shadowBlur = 12; ctx.shadowOffsetY = 5;
  const g = ctx.createLinearGradient(cx - w * 0.3, cy - h * 0.25, cx + w * 0.3, cy + h * 0.05);
  g.addColorStop(0, "#b58a33"); g.addColorStop(0.45, "#e6c978"); g.addColorStop(1, "#a97a25");
  ctx.fillStyle = g;
  ctx.fill(path);
  ctx.restore();
  ctx.save();
  ctx.clip(path);
  const r = rng(11);
  const palette = ["#fff3bf", "#f5db84", "#d5ac4a", "#9a6c1c", "#7a5212", "#ffe9a0"];
  for (let i = 0; i < 9000; i++) {
    const x = cx - w * 0.34 + r() * w * 0.68, y = cy - h * 0.25 + r() * h * 0.3;
    ctx.globalAlpha = 0.35 + r() * 0.6;
    ctx.fillStyle = palette[Math.floor(r() * palette.length)];
    const sz = 0.6 + r() * 1.4;
    ctx.fillRect(x, y, sz, sz);
  }
  ctx.globalAlpha = 1;
  for (let i = 0; i < 90; i++) { // sparkles
    const x = cx - w * 0.34 + r() * w * 0.68, y = cy - h * 0.25 + r() * h * 0.3, k = 1 + r() * 2.2;
    ctx.fillStyle = "rgba(255,252,230,0.95)";
    ctx.fillRect(x - k, y - 0.4, k * 2, 0.8); ctx.fillRect(x - 0.4, y - k, 0.8, k * 2);
  }
  ctx.restore();
  ctx.save();
  ctx.strokeStyle = "rgba(120,86,30,0.55)"; ctx.lineWidth = 1;
  ctx.stroke(path);
  ctx.restore();
  void t;
}

export async function drawCover(ctx: CanvasRenderingContext2D, w: number, h: number, text: CardText, t: CardTheme) {
  try {
    await Promise.all([document.fonts.load(`40px ${t.displayFont}`), document.fonts.load(`italic 40px ${t.displayFont}`), document.fonts.load(`40px 'Tiro Devanagari Hindi'`)]);
  } catch { /* fonts fall back gracefully */ }
  paper(ctx, w, h);
  border(ctx, w, h, t);
  const ink = "#b7ad9f";
  ctx.save();
  ctx.font = `${w * 0.1}px 'Tiro Devanagari Hindi', serif`;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(255,255,255,0.9)"; ctx.fillText(text.om, w / 2 + 1, h * 0.155 + 1);
  ctx.fillStyle = t.gold; ctx.fillText(text.om, w / 2, h * 0.155);
  ctx.restore();
  emboss(ctx, text.shloka, w / 2, h * 0.225, `${w * 0.042}px 'Tiro Devanagari Hindi', serif`, "#9c9283");
  emboss(ctx, text.title, w / 2, h * 0.33, `${t.italic ? "italic " : ""}${w * 0.098}px ${t.displayFont}`, ink);
  glitterLotus(ctx, w, h, t);
  emboss(ctx, text.names, w / 2, h * 0.865, `${w * 0.064}px ${t.displayFont}`, ink, w * 0.004);
}
