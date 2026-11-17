import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useLang } from "../lib/i18n";
import { Corner } from "./Florals";
import { SectionHeading } from "./Reveal";

const parts = (target: number) => {
  const diff = Math.max(0, target - Date.now()); // never negative: a date in the past shows the "celebrations" message
  return { done: diff === 0, days: Math.floor(diff / 86_400_000), hours: Math.floor(diff / 3_600_000) % 24, minutes: Math.floor(diff / 60_000) % 60, seconds: Math.floor(diff / 1000) % 60 };
};

function Digits({ value, pad = 2 }: { value: number; pad?: number }) {
  const s = String(value).padStart(pad, "0");
  return (
    <span className="relative flex h-[2.3rem] justify-center overflow-hidden tabular-nums sm:h-[2.7rem]" aria-hidden>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={s}
          className="heading text-[2rem] font-semibold leading-[2.3rem] text-accent sm:text-[2.3rem] sm:leading-[2.7rem]"
          initial={{ y: 14, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -14, opacity: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        >
          {s}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

/** Live countdown to the wedding date from the config (which carries the venue's UTC offset, so every guest's clock agrees). */
export function CountdownSection() {
  const { w, t } = useLang();
  const target = new Date(w.weddingDate).getTime();
  const [c, setC] = useState(() => parts(target));

  useEffect(() => {
    if (c.done) return;
    let id = 0;
    const start = () => { id = window.setInterval(() => setC(parts(target)), 1000); };
    const onVis = () => { window.clearInterval(id); if (!document.hidden) { setC(parts(target)); start(); } }; // no ticking in a hidden tab
    start();
    document.addEventListener("visibilitychange", onVis);
    return () => { window.clearInterval(id); document.removeEventListener("visibilitychange", onVis); };
  }, [target, c.done]);

  return (
    <section id="countdown" aria-labelledby="countdown-title" className="relative overflow-hidden bg-ivory px-5 py-14">
      <Corner pos="tl" size="clamp(6rem, 26vw, 11rem)" />
      <Corner pos="br" size="clamp(6rem, 26vw, 11rem)" delay={0.2} />
      <div className="relative z-[2] mx-auto max-w-xl">
        <SectionHeading id="countdown-title" title={t("countdownTitle")} subtitle={c.done ? undefined : t("countdownSub")} />
        {c.done ? (
          <p className="heading text-center text-[1.4rem] italic text-accent" role="status">{t("countdownDone")}</p>
        ) : (
          <div className="grid grid-cols-4 gap-2.5 sm:gap-4" role="timer" aria-label={t("countdownAria", { n: c.days })}>
            {([["days", c.days, 3], ["hours", c.hours, 2], ["minutes", c.minutes, 2], ["seconds", c.seconds, 2]] as const).map(([k, v, pad]) => (
              <div key={k} className="card px-1 py-3 text-center">
                <Digits value={v} pad={k === "days" ? Math.max(2, String(v).length) : pad} />
                <span className="mt-1 block text-[0.78rem] uppercase tracking-[0.14em] text-ink/70">{t(`cd_${k}` as "cd_days")}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
