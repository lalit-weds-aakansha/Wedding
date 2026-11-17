import { motion, type TargetAndTransition, type Transition } from "framer-motion";
import { coupleNames } from "../../config/wedding";
import { fmtLong, fmtTime } from "../../lib/dates";
import { useLang } from "../../lib/i18n";

export type Tm = (delay: number, dur?: number) => Transition;

const GOLD = "url(#goldG)";

/** Burgundy wax seal with a glittering heart. */
export function HeartSeal({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden focusable="false">
      <defs>
        <radialGradient id="waxG" cx=".36" cy=".3" r=".8"><stop offset="0" stopColor="#c0394a" /><stop offset=".45" stopColor="#8e1b2d" /><stop offset="1" stopColor="#5b0e1c" /></radialGradient>
        <radialGradient id="heartG" cx=".4" cy=".3" r=".8"><stop offset="0" stopColor="#ff5c6c" /><stop offset="1" stopColor="#c0172b" /></radialGradient>
      </defs>
      <path d="M50 4 62 7 72 3 80 12 91 14 93 26 99 35 95 47 100 57 93 66 94 78 84 84 80 95 68 94 58 99 48 94 37 98 28 90 17 90 13 78 4 72 7 61 1 50 7 40 4 28 14 22 16 11 27 10 36 2Z" fill="url(#waxG)" />
      <circle cx="50" cy="50" r="33" fill="none" stroke="#e7a0a8" strokeOpacity=".55" strokeWidth="1.6" />
      <circle cx="50" cy="50" r="38" fill="none" stroke="#3d0812" strokeOpacity=".35" strokeWidth="1" />
      <path d="M50 70C34 59 28 49 28 41c0-7 5-12 11-12 5 0 9 3 11 7 2-4 6-7 11-7 6 0 11 5 11 12 0 8-6 18-22 29Z" fill="url(#heartG)" />
      <path d="M36 36c2-4 6-5 9-3" stroke="#fff" strokeOpacity=".7" strokeWidth="2.4" strokeLinecap="round" fill="none" />
      {[[40, 46], [52, 40], [58, 52], [46, 56], [62, 42], [34, 42]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={i % 2 ? 0.9 : 1.3} fill="#fff" opacity=".8" />)}
      <path d="M20 30C26 14 42 8 56 9" stroke="#fff" strokeOpacity=".28" strokeWidth="3" strokeLinecap="round" fill="none" />
    </svg>
  );
}

/** Gold shield monogram with a few painted blossoms at its foot. */
function MonogramShield({ a, b }: { a: string; b: string }) {
  return (
    <svg viewBox="0 0 100 124" className="h-auto w-full" role="img" aria-label={`${a} & ${b} monogram`}>
      <defs>
        <linearGradient id="goldG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#a87a30" /><stop offset=".45" stopColor="#e6c374" /><stop offset="1" stopColor="#a97c33" /></linearGradient>
      </defs>
      <path d="M50 5Q82 10 94 25Q97 70 79 97Q65 113 50 119Q35 113 21 97Q3 70 6 25Q18 10 50 5Z" fill="#fffaf0" fillOpacity=".55" stroke={GOLD} strokeWidth="2.6" />
      <path d="M50 11Q77 15 88 28Q90 68 75 92Q63 106 50 112Q37 106 25 92Q10 68 12 28Q23 15 50 11Z" fill="none" stroke={GOLD} strokeWidth="0.9" strokeOpacity=".7" />
      <text x="35" y="70" textAnchor="middle" fontSize="50" fill={GOLD} style={{ fontFamily: "var(--w-font-script)" }}>{a}</text>
      <text x="64" y="80" textAnchor="middle" fontSize="46" fill={GOLD} style={{ fontFamily: "var(--w-font-script)" }}>{b}</text>
      {/* painted blossoms */}
      {[[18, 96, 7, "#e98fa6"], [28, 104, 6, "#f4b8c4"], [80, 98, 7, "#f4b8c4"], [71, 106, 6, "#e98fa6"], [50, 114, 5, "#f7c9a8"], [12, 82, 5, "#fffaf2"], [88, 84, 5, "#fffaf2"]].map(([x, y, r, c], i) => (
        <g key={i}><circle cx={x as number} cy={y as number} r={r as number} fill={c as string} /><circle cx={x as number} cy={y as number} r={(r as number) * 0.35} fill="#e8b84a" /></g>
      ))}
      {[[10, 100], [88, 102], [40, 114], [60, 114]].map(([x, y], i) => <ellipse key={i} cx={x} cy={y} rx="7" ry="2.8" fill="#6aa45d" transform={`rotate(${i % 2 ? -30 : 30} ${x} ${y})`} />)}
    </svg>
  );
}

const Flourish = ({ className }: { className: string }) => (
  <svg viewBox="0 0 40 40" className={`absolute h-[7cqw] w-[7cqw] ${className}`} aria-hidden fill="none" stroke={GOLD} strokeWidth="1.4" strokeLinecap="round">
    <path d="M3 37V12Q3 3 12 3H37" /><path d="M9 37V16Q9 9 16 9H37" strokeOpacity=".5" /><circle cx="12" cy="12" r="2.2" fill="#d9b568" stroke="none" />
  </svg>
);

/**
 * The floating invitation. Everything on it is real text (names, date, venue) taken from the wedding config; only the paper,
 * border, monogram and seal are artwork. Sizes are in container units (cqw) so the card reads the same at any width.
 */
export function InviteCard({ go, tm, calm }: { go: boolean; tm: Tm; calm: boolean }) {
  const { w } = useLang();
  const [a, b] = coupleNames(w);
  const main = w.events.find((e) => e.id === "wedding") ?? w.events[w.events.length - 1];
  const show = (delay: number, y = 10): { initial: TargetAndTransition; animate: TargetAndTransition; transition: Transition } => ({
    initial: { opacity: 0, y },
    animate: go ? { opacity: 1, y: 0 } : { opacity: 0, y },
    transition: tm(delay, 0.9),
  });
  const mono = w.couple.monogram;
  return (
    <motion.div
      className="absolute left-1/2 top-[8.5%] z-[3] -translate-x-1/2"
      style={{ width: "min(90vw, 560px, calc(52svh * 1.5))", perspective: 1000 }}
      initial={{ opacity: 0, y: -80, scale: 0.9, rotate: -13 }}
      animate={go ? { opacity: 1, y: 0, scale: 1, rotate: -5 } : { opacity: 0, y: -80, scale: 0.9, rotate: -13 }}
      transition={tm(3.5, 2.6)}
    >
      <motion.div
        animate={go && !calm ? { y: [0, -9, 0], rotate: [0, 1.1, 0], rotateX: [3, 0, 3] } : { y: 0 }}
        transition={{ duration: 7.5, repeat: Infinity, ease: "easeInOut", delay: 6.5 }}
      >
        <div
          className="relative overflow-hidden rounded-[3px]"
          style={{ containerType: "inline-size", aspectRatio: "1.5", background: "radial-gradient(130% 100% at 18% 8%, #fffdf8 0%, #f8efdf 58%, #eddfc6 100%)", boxShadow: "0 34px 52px -22px rgba(36,48,72,.6), 0 5px 10px rgba(36,48,72,.14)" }}
        >
          {/* paper grain and crinkle */}
          <div aria-hidden className="absolute inset-0 opacity-[.5] mix-blend-multiply" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='3'/%3E%3CfeColorMatrix values='0 0 0 0 .55 0 0 0 0 .45 0 0 0 0 .32 0 0 0 .22 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")" }} />
          <div aria-hidden className="absolute inset-0" style={{ background: "linear-gradient(115deg, rgba(255,255,255,0) 30%, rgba(190,160,120,.10) 48%, rgba(255,255,255,0) 62%), linear-gradient(200deg, rgba(255,255,255,.5) 0%, rgba(255,255,255,0) 40%)" }} />
          <svg width="0" height="0" className="absolute" aria-hidden><defs><linearGradient id="goldG2"><stop offset="0" stopColor="#b88a3a" /><stop offset="1" stopColor="#e2c06f" /></linearGradient></defs></svg>

          {/* champagne-gold border draws itself open from the centre */}
          <motion.div aria-hidden className="absolute inset-[2.4cqw]" initial={{ clipPath: "inset(50% 50% 50% 50%)", opacity: 0 }} animate={go ? { clipPath: "inset(0% 0% 0% 0%)", opacity: 1 } : {}} transition={tm(5.0, 1.3)}>
            <div className="absolute inset-0 border border-[#c9a45a]" />
            <div className="absolute inset-[1.1cqw] border border-[#c9a45a]/45" />
            <Flourish className="left-[1cqw] top-[1cqw]" />
            <Flourish className="right-[1cqw] top-[1cqw] -scale-x-100" />
            <Flourish className="bottom-[1cqw] left-[1cqw] -scale-y-100" />
            <Flourish className="bottom-[1cqw] right-[1cqw] scale-[-1]" />
          </motion.div>

          <motion.p {...show(7.1, 6)} className="caps absolute left-[8cqw] top-[7.2cqw] text-[2.5cqw] tracking-[0.2em] text-[#9a6a2c]">{w.wording.coverTop}</motion.p>

          <motion.div {...show(5.4, 8)} className="absolute left-[7cqw] top-[16cqw] w-[27cqw]"><MonogramShield a={mono.first} b={mono.second} /></motion.div>

          <motion.div
            className="absolute right-[10cqw] top-[6.5cqw] w-[15.5cqw]"
            initial={{ opacity: 0, scale: 1.5, rotate: -18 }}
            animate={go ? { opacity: 1, scale: 1, rotate: -6 } : { opacity: 0, scale: 1.5, rotate: -18 }}
            transition={tm(5.9, 0.7)}
            style={{ filter: "drop-shadow(0 2px 3px rgba(60,10,20,.45))" }}
          >
            <HeartSeal className="h-auto w-full" />
          </motion.div>

          <div className="absolute left-[37cqw] right-[8cqw] top-[24.5cqw] text-right">
            <motion.p {...show(6.3, 6)} className="text-[2.7cqw] italic leading-tight text-ink/70">{w.wording.coverInvite}</motion.p>
            <motion.h1 {...show(6.3)} id="hero-names" className="script mt-[0.6cqw] whitespace-nowrap text-[8cqw] leading-[1.12]">{a} <span className="text-[0.62em] text-[#b8893f]">&amp;</span> {b}</motion.h1>
            <motion.p {...show(6.9, 8)} className="caps mt-[1.4cqw] text-[2.9cqw] leading-snug tracking-[0.14em] text-[#7a3b46]">{fmtLong(w.weddingDate)} · {fmtTime(w.weddingDate)}</motion.p>
            <motion.p {...show(7.1, 8)} className="caps mt-[0.8cqw] text-[2.4cqw] leading-snug tracking-[0.12em] text-ink/70">{main.venue.name}{main.venue.area ? `, ${main.venue.area}` : ""}</motion.p>
          </div>

          <motion.p {...show(7.5, 6)} className="absolute inset-x-0 bottom-[6.2cqw] text-center text-[2.7cqw] italic text-ink/65">{w.wording.heroQuote}</motion.p>

          {/* one brief gold sweep when the card arrives */}
          {go && !calm && <div aria-hidden className="card-sheen pointer-events-none absolute inset-0" />}
        </div>
      </motion.div>
    </motion.div>
  );
}
