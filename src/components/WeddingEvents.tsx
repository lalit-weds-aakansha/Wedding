import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { useLang } from "../lib/i18n";
import { fmtShort, fmtTime } from "../lib/dates";
import { Corner } from "./Florals";
import { EventMotif } from "./Ornaments";
import { Reveal, SectionHeading } from "./Reveal";

/** Event cards; each opens its detail page via the URL hash (#event-<id>). Hidden when no events are configured. */
export function WeddingEvents() {
  const { w, t } = useLang();
  if (w.events.length === 0) return null;
  return (
    <section id="events" aria-labelledby="events-title" className="wash relative overflow-hidden px-4 py-16 sm:px-8">
      <Corner pos="tl" size="clamp(6rem, 26vw, 12rem)" />
      <Corner pos="br" size="clamp(6rem, 26vw, 12rem)" delay={0.2} />
      <SectionHeading id="events-title" title={t("weddingEvents")} subtitle={w.wording.eventsSubtitle} />
      <ul className="relative z-[2] mx-auto grid max-w-5xl grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
        {w.events.map((e, i) => (
          <Reveal key={e.id} delay={Math.min(i, 3) * 0.08}>
            <li className="relative h-full">
              <motion.a
                href={`#event-${e.id}`}
                whileHover={{ y: -4 }}
                whileTap={{ scale: 0.98 }}
                className="group flex h-full flex-col items-center rounded-xl border border-gold/35 bg-white/45 px-3 pb-4 pt-5 text-center shadow-[0_10px_24px_-18px_rgba(90,50,30,.6)] transition-[background-color,box-shadow] duration-300 hover:bg-white/70 hover:shadow-[0_20px_32px_-18px_rgba(90,40,40,.5)] focus-visible:bg-white/70"
                aria-label={`${e.title}, ${fmtShort(e.start)} at ${fmtTime(e.start)}. View details`}
              >
                {e.icon ? (
                  <img src={e.icon} alt="" loading="lazy" className="h-[4.6rem] w-auto mix-blend-multiply [mask-image:radial-gradient(ellipse_68%_72%_at_50%_50%,#000_55%,transparent_100%)] transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-2" />
                ) : (
                  <EventMotif motif={e.motif} className="h-14 w-14 text-gold" />
                )}
                <span className="heading mt-3 text-[1.15rem] font-semibold leading-tight text-accent">{e.title}</span>
                <span className="mt-1 text-[0.92rem] text-ink/80">{fmtShort(e.start)}</span>
                <span className="text-[0.92rem] text-ink/80">{fmtTime(e.start)}</span>
                <span className="mt-2 inline-flex items-center gap-0.5 text-[0.78rem] uppercase tracking-widest text-gold">{t("details")} <ChevronRight size={13} aria-hidden /></span>
              </motion.a>
              {i < w.events.length - 1 && (
                <span className="absolute -right-[1.05rem] top-1/2 z-10 hidden h-4 w-4 -translate-y-1/2 place-items-center rounded-full border border-gold/50 bg-ivory text-gold md:grid" aria-hidden>
                  <ChevronRight size={10} />
                </span>
              )}
            </li>
          </Reveal>
        ))}
      </ul>
    </section>
  );
}
