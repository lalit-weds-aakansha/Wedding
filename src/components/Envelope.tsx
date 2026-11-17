import { motion } from "framer-motion";
import { useReduce } from "../lib/motion";
import { useState } from "react";
import { Monogram } from "./Ornaments";
import { useT } from "../lib/i18n";

const ease = [0.65, 0, 0.35, 1] as const;

/**
 * Optional envelope for the Save-the-Date (config: saveTheDate.envelope.enabled).
 * Tap → the flap folds back, a card slides up, then `onOpened` hands over to the scratch card. Plays once.
 */
export function Envelope({ onOpened }: { onOpened: () => void }) {
  const [open, setOpen] = useState(false);
  const reduce = useReduce();
  const t = useT();

  const go = () => {
    if (open) return;
    setOpen(true);
    window.setTimeout(onOpened, reduce ? 200 : 1500);
  };

  return (
    <button
      type="button"
      onClick={go}
      disabled={open}
      aria-label={t("envTap")}
      className="group relative mx-auto block w-[min(86vw,360px)] cursor-pointer"
      style={{ aspectRatio: "1.45", perspective: 900 }}
    >
      <div className="absolute inset-0 rounded-md border border-gold/40 bg-[#efe4d0] shadow-[0_22px_40px_-18px_rgba(74,51,36,.55)]" />
      <motion.div
        className="absolute inset-x-[6%] top-[8%] h-[84%] rounded-sm border border-gold/40 bg-[#fffaf1] shadow-md"
        animate={open && !reduce ? { y: "-58%" } : { y: 0 }}
        transition={{ duration: 0.75, delay: 0.55, ease }}
      >
        <div className="flex h-full flex-col items-center pt-3"><Monogram className="text-3xl text-accent" /></div>
      </motion.div>
      <svg viewBox="0 0 145 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden>
        <path d="M0 0 72.5 58 145 0V100H0Z" fill="#f6ecdc" />
        <path d="M0 100 60 50M145 100 85 50" stroke="#b8893f" strokeOpacity=".3" strokeWidth=".4" fill="none" />
      </svg>
      <motion.div
        className="absolute inset-x-0 top-0 h-[62%] origin-top"
        style={{ transformStyle: "preserve-3d", zIndex: open ? 0 : 3 }}
        animate={open && !reduce ? { rotateX: 180 } : { rotateX: 0 }}
        transition={{ duration: 0.65, ease }}
      >
        <svg viewBox="0 0 145 62" preserveAspectRatio="none" className="h-full w-full" aria-hidden>
          <path d="M0 0H145L72.5 62Z" fill="#e8dcc4" />
        </svg>
      </motion.div>
      <motion.span
        className="absolute left-1/2 top-[62%] z-10 grid h-14 w-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full text-[0.7rem] text-[#5a3a12] shadow-lg"
        style={{ background: "radial-gradient(circle at 35% 30%, #efd48f, #c9a052 55%, #8a6322)" }}
        animate={{ opacity: open ? 0 : 1, scale: open ? 1.2 : 1 }}
        transition={{ duration: 0.3 }}
      >
        <Monogram className="text-lg" />
      </motion.span>
      <span className="absolute -bottom-9 left-0 right-0 text-center text-[0.95rem] italic text-ink/70">{t("envTap")}</span>
    </button>
  );
}
