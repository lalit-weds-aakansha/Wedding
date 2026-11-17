import { motion } from "framer-motion";
import type { WeddingEvent } from "../../config/wedding";
import { fmtLong, fmtTime, fmtWeekday } from "../../lib/dates";
import { useLang } from "../../lib/i18n";

const EASE = [0.22, 1, 0.36, 1] as const;
/* the oval event card shown over each event scene */
/** An oval of ivory paper with a double gold line. `children` sit in its middle. */
function Oval({ w, ratio, dark = false, children }: { w: string; ratio: number; dark?: boolean; children: React.ReactNode }) {
  return (
    <div className="relative" style={{ width: w, aspectRatio: String(ratio), filter: "drop-shadow(0 14px 20px rgba(40,30,30,.32))" }}>
      <svg viewBox="0 0 400 320" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden>
        <ellipse cx="200" cy="160" rx="198" ry="158" fill={dark ? "#f3efe6" : "#fffaf2"} opacity=".58" />
        <ellipse cx="200" cy="160" rx="188" ry="148" fill="none" stroke="#c9a45a" strokeOpacity=".7" strokeWidth="1.6" />
        <ellipse cx="200" cy="160" rx="181" ry="141" fill="none" stroke="#c9a45a" strokeOpacity=".35" strokeWidth="1" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center px-[11%] text-center [text-shadow:0_0_10px_rgba(255,250,242,1),0_0_5px_rgba(255,250,242,1),0_0_2px_rgba(255,250,242,1)]">{children}</div>
    </div>
  );
}

export function EventCard({ event, calm, delay = 1.1, dark = false }: { event: WeddingEvent; calm: boolean; delay?: number; dark?: boolean }) {
  const { t } = useLang();
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-[4svh] z-[3] flex justify-center px-3 min-[900px]:bottom-auto min-[900px]:top-[12svh] min-[900px]:justify-start min-[900px]:pl-[3vw]">
      <motion.div
        initial={{ opacity: 0, y: calm ? 0 : 24, scale: calm ? 1 : 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: calm ? 0.5 : 1.1, delay: calm ? delay * 0.2 : delay, ease: EASE }}
      >
        <Oval w="min(94vw, 520px)" ratio={1.5} dark={dark}>
          <h2 className="script text-[3.1rem] leading-[1.02]">{event.title}</h2>
          <p className="uppercase mt-1.5 text-[1.15rem] font-bold leading-snug tracking-[0.07em] text-[#4a1220] [font-family:var(--w-font-body)] [font-variant-numeric:lining-nums]">{fmtWeekday(event.start)}, {fmtLong(event.start)}</p>
          <p className="uppercase mt-1 text-[1.1rem] font-bold tracking-[0.07em] text-[#2a1a14] [font-family:var(--w-font-body)] [font-variant-numeric:lining-nums]">{fmtTime(event.start)} {t("onwards")}</p>
          <p className="mt-2 text-[1.2rem] font-bold leading-tight text-[#2a1a14]">{event.venue.name}</p>
        </Oval>
      </motion.div>
    </div>
  );
}
