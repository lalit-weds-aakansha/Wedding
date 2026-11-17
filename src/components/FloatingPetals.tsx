import { useReduce } from "../lib/motion";
import { useEffect, useMemo, useRef, useState } from "react";

// pink and peach only, matching the palette
const COLORS = ["#f4a7b5", "#f6b9a6", "#f8cdb4", "#ee93a5", "#f3c0c8"];

/**
 * Gently falling rose petals for one section. Kept deliberately light:
 *  - a handful of petals, each with its own size, speed, drift and spin
 *  - paused while the section is off-screen and while the tab is hidden
 *  - not rendered at all for visitors who prefer reduced motion
 * `contained` keeps them inside the nearest `relative` parent instead of the whole screen.
 */
export function FloatingPetals({ count = 8, contained = false }: { count?: number; contained?: boolean }) {
  const reduce = useReduce();
  const box = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const [tabVisible, setTabVisible] = useState(() => typeof document === "undefined" || !document.hidden);

  useEffect(() => {
    const el = box.current;
    if (!el || typeof IntersectionObserver === "undefined") { setInView(true); return; }
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.05 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  useEffect(() => {
    const on = () => setTabVisible(!document.hidden);
    document.addEventListener("visibilitychange", on);
    return () => document.removeEventListener("visibilitychange", on);
  }, []);

  const petals = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        left: `${(i * 41 + 9) % 94}%`,
        size: 9 + ((i * 7) % 9),
        duration: 12 + ((i * 5) % 9),
        delay: -((i * 3.3) % 16),
        drift: `${((i % 5) - 2) * 36 + (i % 2 ? 14 : -10)}px`,
        rot: `${(i % 2 ? 1 : -1) * (280 + ((i * 53) % 200))}deg`,
        color: COLORS[i % COLORS.length],
      })),
    [count]
  );

  if (reduce) return null;
  const running = inView && tabVisible;
  return (
    <div ref={box} className={`pointer-events-none ${contained ? "absolute" : "fixed"} inset-0 z-[5] overflow-hidden`} aria-hidden>
      {petals.map((p, i) => (
        <svg
          key={i}
          viewBox="0 0 20 20"
          className="petal-fall"
          style={{
            left: p.left, width: p.size, height: p.size, opacity: 0.85,
            animationDuration: `${p.duration}s`, animationDelay: `${p.delay}s`,
            animationPlayState: running ? "running" : "paused",
            ["--drift" as string]: p.drift, ["--rot" as string]: p.rot,
          }}
        >
          <path d="M10 1C4 6 3 13 10 19c7-6 6-13 0-18Z" fill={p.color} />
        </svg>
      ))}
    </div>
  );
}
