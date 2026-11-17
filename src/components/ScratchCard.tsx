import { prefersReduced } from "../lib/motion";
import { useCallback, useEffect, useImperativeHandle, useRef, useState, forwardRef, type ReactNode } from "react";

export type ScratchHandle = { revealAll: () => void };

type Props = {
  /** Paints the cover artwork. Coordinates are CSS pixels; the context is already scaled for the device. */
  paint: (ctx: CanvasRenderingContext2D, w: number, h: number) => void | Promise<void>;
  /** Changing this repaints (and resets) the cover, e.g. when the language changes. */
  paintKey: string;
  /** 0–1 share of the card that must be cleared before the rest dissolves by itself. */
  threshold?: number;
  ariaLabel: string;
  onFirstTouch?: () => void;
  onRevealed?: () => void;
  /** The hidden content, rendered underneath the scratch layer. */
  children: ReactNode;
  className?: string;
};

const TRACK_W = 64; // low-res clone of the scratched area, used only to measure progress cheaply

/**
 * Real canvas scratch card. Pointer events cover mouse, touch and pen; `touch-action: none` keeps a finger
 * from scrolling the page while scratching. Progress is measured on a tiny mirror canvas, so it stays fast on phones.
 */
export const ScratchCard = forwardRef<ScratchHandle, Props>(function ScratchCard(
  { paint, paintKey, threshold = 0.5, ariaLabel, onFirstTouch, onRevealed, children, className = "" },
  ref
) {
  const box = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const track = useRef<HTMLCanvasElement | null>(null);
  const state = useRef({ drawing: false, lastX: 0, lastY: 0, touched: false, done: false, w: 0, h: 0, raf: 0 });
  const [done, setDone] = useState(false);
  const [gone, setGone] = useState(false);
  const reduce = prefersReduced();

  const finish = useCallback(() => {
    if (state.current.done) return;
    state.current.done = true;
    setDone(true);
    onRevealed?.();
    window.setTimeout(() => setGone(true), reduce ? 0 : 900); // after the fade, remove the canvas for good
  }, [onRevealed, reduce]);

  useImperativeHandle(ref, () => ({ revealAll: finish }), [finish]);

  // size + paint the cover; repaint on resize or when paintKey changes (until revealed)
  useEffect(() => {
    const el = box.current;
    const cv = canvas.current;
    if (!el || !cv || state.current.done) return;
    let cancelled = false;

    const setup = async () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (!w || !h) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
      const ctx = cv.getContext("2d")!;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalCompositeOperation = "source-over";
      state.current.w = w;
      state.current.h = h;
      await paint(ctx, w, h);
      if (cancelled) return;

      const t = document.createElement("canvas");
      t.width = TRACK_W;
      t.height = Math.max(1, Math.round((TRACK_W * h) / w));
      const tc = t.getContext("2d")!;
      tc.fillStyle = "#000";
      tc.fillRect(0, 0, t.width, t.height);
      track.current = t;
    };

    setup();
    const ro = new ResizeObserver(() => { if (!state.current.drawing) setup(); });
    ro.observe(el);
    return () => { cancelled = true; ro.disconnect(); };
  }, [paint, paintKey]);

  const cleared = () => {
    const t = track.current;
    if (!t) return 0;
    const data = t.getContext("2d")!.getImageData(0, 0, t.width, t.height).data;
    let c = 0;
    for (let i = 3; i < data.length; i += 4) if (data[i] < 128) c++;
    return c / (data.length / 4);
  };

  const scheduleCheck = () => {
    if (state.current.raf) return;
    state.current.raf = requestAnimationFrame(() => {
      state.current.raf = 0;
      if (cleared() >= threshold) finish();
    });
  };

  const stroke = (x0: number, y0: number, x1: number, y1: number) => {
    const cv = canvas.current;
    const t = track.current;
    if (!cv) return;
    const { w, h } = state.current;
    const radius = Math.max(16, w * 0.075);
    const ctx = cv.getContext("2d")!;
    ctx.save();
    ctx.globalCompositeOperation = "destination-out";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = radius * 2;
    // soft edge: a wide faint pass, then the solid core
    ctx.globalAlpha = 0.35;
    ctx.lineWidth = radius * 2.5;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.lineWidth = radius * 1.8;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    ctx.restore();
    if (t) {
      const k = t.width / w;
      const tc = t.getContext("2d")!;
      tc.save();
      tc.globalCompositeOperation = "destination-out";
      tc.lineCap = "round";
      tc.lineWidth = radius * 1.8 * k;
      tc.beginPath(); tc.moveTo(x0 * k, y0 * k); tc.lineTo(x1 * k, y1 * k); tc.stroke();
      tc.restore();
    }
    void h;
  };

  const local = (e: { clientX: number; clientY: number }) => {
    const r = canvas.current!.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top] as const;
  };

  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (state.current.done) return;
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* pointer already gone: keep scratching with plain events */ }
    const [x, y] = local(e);
    state.current.drawing = true;
    state.current.lastX = x;
    state.current.lastY = y;
    if (!state.current.touched) {
      state.current.touched = true;
      onFirstTouch?.(); // runs inside the user gesture, so music is allowed to start
    }
    stroke(x, y, x + 0.01, y + 0.01);
    scheduleCheck();
  };

  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!state.current.drawing || state.current.done) return;
    const events = (e.nativeEvent as PointerEvent).getCoalescedEvents?.() ?? [];
    const pts = events.length ? events : [e.nativeEvent as PointerEvent];
    for (const p of pts) {
      const [x, y] = local(p);
      stroke(state.current.lastX, state.current.lastY, x, y);
      state.current.lastX = x;
      state.current.lastY = y;
    }
    scheduleCheck();
  };

  const onUp = () => { state.current.drawing = false; scheduleCheck(); };

  useEffect(() => () => cancelAnimationFrame(state.current.raf), []);

  return (
    <div ref={box} className={`relative overflow-hidden ${className}`}>
      <div className="absolute inset-0" aria-hidden={!done ? undefined : false}>{children}</div>
      {!gone && (
        <canvas
          ref={canvas}
          role="img"
          aria-label={ariaLabel}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          className="absolute inset-0 h-full w-full cursor-crosshair select-none"
          style={{
            touchAction: "none", // no page scroll / pull-to-refresh while scratching
            opacity: done ? 0 : 1,
            transition: reduce ? "none" : "opacity 900ms ease",
            pointerEvents: done ? "none" : "auto",
          }}
        />
      )}
    </div>
  );
});
