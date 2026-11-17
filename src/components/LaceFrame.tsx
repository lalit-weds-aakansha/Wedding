import type { ReactNode } from "react";

/**
 * A scalloped lace border drawn around a 4:5 photo (original SVG artwork).
 * The photo sits inside the frame; the lace is a cream band with a scalloped edge,
 * rows of eyelets and small corner flowers.
 */
export function LaceFrame({ children, className = "" }: { children: ReactNode; className?: string }) {
  const W = 100, H = 125, m = 3;
  const bumps = (n: number, len: number, fix: (t: number) => [number, number]) =>
    Array.from({ length: n }, (_, i) => fix((i + 0.5) * (len / n)));
  const top = bumps(22, W - 2 * m, (t) => [m + t, m]);
  const bottom = bumps(22, W - 2 * m, (t) => [m + t, H - m]);
  const left = bumps(28, H - 2 * m, (t) => [m, m + t]);
  const right = bumps(28, H - 2 * m, (t) => [W - m, m + t]);
  const eyelets = (n: number, len: number, fix: (t: number) => [number, number]) => bumps(n, len, fix);
  const e = 7.2;
  const eTop = eyelets(26, W - 2 * e, (t) => [e + t, e]);
  const eBottom = eyelets(26, W - 2 * e, (t) => [e + t, H - e]);
  const eLeft = eyelets(32, H - 2 * e, (t) => [e, e + t]);
  const eRight = eyelets(32, H - 2 * e, (t) => [W - e, e + t]);
  const ink = "#e7dcc6";

  return (
    <div className={`relative aspect-[4/5] ${className}`} style={{ filter: "drop-shadow(0 8px 14px rgba(90,60,30,.28))" }}>
      <div className="absolute overflow-hidden rounded-[2px] bg-[#e9dfcf]" style={{ inset: "8.4% 8.4%" }}>{children}</div>
      <svg viewBox={`0 0 ${W} ${H}`} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
        <defs>
          <mask id="lace-hole">
            <rect width={W} height={H} fill="#fff" />
            <rect x="8.4" y="10.5" width="83.2" height="104" fill="#000" />
          </mask>
        </defs>
        <g mask="url(#lace-hole)">
          <rect x={m} y={m} width={W - 2 * m} height={H - 2 * m} fill="#fbf8f1" />
          {[...top, ...bottom, ...left, ...right].map(([x, y], i) => <circle key={`s${i}`} cx={x} cy={y} r="2.1" fill="#fbf8f1" stroke={ink} strokeWidth=".35" />)}
          {[...eTop, ...eBottom, ...eLeft, ...eRight].map(([x, y], i) => <circle key={`e${i}`} cx={x} cy={y} r=".85" fill="#fff" stroke="#d9c9a8" strokeWidth=".3" />)}
          <rect x="5.2" y="5.2" width="89.6" height="114.6" rx="1" fill="none" stroke="#d9c9a8" strokeWidth=".35" strokeDasharray="0.8 1.2" />
          {[[8.5, 8.5], [91.5, 8.5], [8.5, 116.5], [91.5, 116.5]].map(([x, y], i) => (
            <g key={i} transform={`translate(${x} ${y})`}>
              {Array.from({ length: 6 }, (_, k) => <ellipse key={k} cx="0" cy="-2.2" rx="1" ry="1.9" fill="#fff" stroke="#d3bf96" strokeWidth=".3" transform={`rotate(${k * 60})`} />)}
              <circle r=".8" fill="#e3c987" />
            </g>
          ))}
        </g>
        <rect x="8.4" y="10.5" width="83.2" height="104" fill="none" stroke="#cdb98f" strokeWidth=".35" />
      </svg>
    </div>
  );
}

export type LaceChildren = ReactNode;
