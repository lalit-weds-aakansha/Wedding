import { motion } from "framer-motion";
import { ArrowLeft, CalendarDays, MapPin, Navigation } from "lucide-react";
import { useEffect, useRef } from "react";
import type { WeddingEvent } from "../config/wedding";
import { directionsUrl, mapEmbedUrl, mapsUrl } from "../lib/calendar";
import { fmtLong, fmtTime } from "../lib/dates";
import { useT } from "../lib/i18n";
import { AddToCalendar } from "./AddToCalendar";
import { EventMotif, GoldDivider } from "./Ornaments";

/** Full-screen detail page for a single event (opened at #event-<id>). */
export function EventDetail({ event, onClose }: { event: WeddingEvent; onClose: () => void }) {
  const t = useT();
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    scroller.current?.focus();
    return () => { document.body.style.overflow = ""; window.removeEventListener("keydown", onKey); };
  }, [onClose]);

  return (
    <motion.div
      ref={scroller}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-labelledby="event-detail-title"
      className="hero-sky fixed inset-0 z-[45] overflow-y-auto overscroll-contain outline-none"
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 40 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label={t("backToEvents")}
        className="fixed left-3 top-3 z-20 grid h-11 w-11 place-items-center rounded-full bg-ivory/90 text-accent shadow-md backdrop-blur"
      >
        <ArrowLeft size={20} />
      </button>

      <div className="mx-auto max-w-md px-5 pb-16 pt-16 text-center">
        <div className="gold-frame bg-ivory/90 px-5 py-8 shadow-xl">
          {event.image ? (
            <img src={event.image} alt={event.title} className="mx-auto mb-3 h-36 w-full rounded-lg object-cover" />
          ) : event.icon ? (
            <img src={event.icon} alt="" className="mx-auto h-20 w-auto mix-blend-multiply [mask-image:radial-gradient(ellipse_68%_72%_at_50%_50%,#000_55%,transparent_100%)]" />
          ) : (
            <EventMotif motif={event.motif} className="mx-auto h-16 w-16 text-gold" />
          )}
          <h2 id="event-detail-title" className="names mt-2 text-[2.6rem]">{event.title}</h2>
          <GoldDivider className="mt-2" />

          <p className="mt-4 flex items-center justify-center gap-2 text-[1.08rem]">
            <CalendarDays size={16} className="text-gold" aria-hidden /> {fmtLong(event.start)}
          </p>
          <p className="heading text-[1.15rem] text-accent">{fmtTime(event.start)} – {fmtTime(event.end)}</p>
          {event.description && <p className="mx-auto mt-3 max-w-xs text-[1.02rem] italic leading-relaxed">{event.description}</p>}

          <div className="mx-auto mt-5 flex items-start gap-3 text-left">
            <MapPin size={20} className="mt-1 shrink-0 text-gold" aria-hidden />
            <address className="not-italic">
              <span className="heading block text-[1.15rem] font-semibold leading-tight">{event.venue.name}</span>
              <span className="text-[0.98rem] text-ink/80">{event.venue.address}</span>
            </address>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <a href={mapsUrl(event.venue)} target="_blank" rel="noopener noreferrer" className="btn btn-ghost whitespace-nowrap !gap-1.5 !px-2 !text-[0.9rem]">
              <Navigation size={16} aria-hidden /> {t("openInMaps")}
            </a>
            <AddToCalendar event={event} />
          </div>
          <a href={directionsUrl(event.venue)} target="_blank" rel="noopener noreferrer" className="btn btn-maroon mt-3 w-full">{t("getDirections")}</a>

          <div className="card mt-5 overflow-hidden">
            <iframe title={t("mapOf", { name: event.venue.name })} src={mapEmbedUrl(event.venue)} className="h-52 w-full border-0" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
