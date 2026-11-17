import { motion } from "framer-motion";
import { BedDouble, Car, CircleParking, ExternalLink, MapPin, Navigation, Plane, Route, TrainFront } from "lucide-react";
import type { TravelItem, Venue, WeddingConfig } from "../config/wedding";
import { useLang } from "../lib/i18n";
import { directionsUrl, mapEmbedUrl, mapsUrl } from "../lib/calendar";
import { Corner } from "./Florals";
import { Reveal, SectionHeading } from "./Reveal";

const travelIcons: Record<TravelItem["icon"], typeof Car> = { hotel: BedDouble, parking: CircleParking, car: Car, plane: Plane, train: TrainFront };

/** Venues used by events other than the main one, so guests see every location. */
function otherVenuesOf(w: WeddingConfig) {
  const seen = new Set([w.venue.name + w.venue.address]);
  const out: { venue: Venue; events: string[] }[] = [];
  for (const e of w.events) {
    const key = e.venue.name + e.venue.address;
    const found = out.find((o) => o.venue.name + o.venue.address === key);
    if (found) found.events.push(e.title);
    else if (!seen.has(key)) out.push({ venue: e.venue, events: [e.title] });
  }
  return out;
}

export function VenueSection() {
  const { w, t } = useLang();
  const v = w.venue;
  const otherVenues = otherVenuesOf(w);
  return (
    <section id="venue" aria-labelledby="venue-title" className="wash relative overflow-hidden px-4 py-16 sm:px-8">
      <Corner pos="tr" size="clamp(6rem, 26vw, 12rem)" />
      <Corner pos="bl" size="clamp(6rem, 26vw, 12rem)" delay={0.2} />
      <SectionHeading id="venue-title" title={t("venue")} subtitle={w.wording.venueSubtitle} />
      <div className="relative z-[2] mx-auto grid max-w-5xl items-center gap-8 md:grid-cols-3">
        {v.image && (
          <motion.figure
            initial={{ opacity: 0, rotate: -12, y: 30 }}
            whileInView={{ opacity: 1, rotate: -4, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ type: "spring", stiffness: 70, damping: 14 }}
            whileHover={{ rotate: -1, scale: 1.03 }}
            className="mx-auto w-[78%] max-w-[17rem] bg-white p-2 pb-7 shadow-[0_18px_34px_-16px_rgba(60,40,20,.55)] md:w-full"
          >
            <img src={v.image} alt={`${t("venueAlt")}: ${v.name}`} loading="lazy" className="aspect-[4/3] w-full object-cover" />
          </motion.figure>
        )}

        <Reveal className="text-center md:text-left">
          <div className="flex items-start justify-center gap-2 md:justify-start">
            <MapPin size={20} className="mt-1 shrink-0 text-gold" aria-hidden />
            <address className="not-italic">
              <span className="heading block text-[1.25rem] font-semibold leading-tight text-accent">{v.name}</span>
              <span className="text-[1rem] text-ink/80">{v.address}</span>
            </address>
          </div>
          <a href={directionsUrl(v)} target="_blank" rel="noopener noreferrer" className="btn btn-maroon mt-5 px-6">
            {t("getDirections")} <Route size={15} aria-hidden />
          </a>
          {w.travel.enabled && w.travel.items.length > 0 && (
            <ul className="mt-5 space-y-2 text-left">
              {w.travel.items.map((it) => {
                const Icon = travelIcons[it.icon];
                return (
                  <li key={it.title} className="flex items-start gap-2">
                    <Icon size={18} strokeWidth={1.5} className="mt-0.5 shrink-0 text-gold" aria-hidden />
                    <span><b className="heading font-semibold">{it.title}</b> <span className="text-ink/80">· {it.text}</span></span>
                  </li>
                );
              })}
            </ul>
          )}
        </Reveal>

        <Reveal delay={0.1}>
          <div className="overflow-hidden rounded-xl border border-gold/40 bg-white/70 shadow-md">
            <iframe title={t("mapOf", { name: v.name })} src={mapEmbedUrl(v)} className="h-52 w-full border-0" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
            <a href={mapsUrl(v)} target="_blank" rel="noopener noreferrer" className="flex min-h-[44px] items-center justify-center gap-1.5 border-t border-gold/30 text-[0.9rem] text-accent hover:bg-white">
              {t("openInGoogleMaps")} <ExternalLink size={13} aria-hidden />
            </a>
          </div>
        </Reveal>
      </div>

      {otherVenues.length > 0 && (
        <div className="mx-auto mt-8 grid max-w-5xl gap-4 sm:grid-cols-2">
          {otherVenues.map(({ venue, events }) => (
            <Reveal key={venue.name} className="rounded-xl border border-gold/35 bg-white/55 p-4">
              <p className="caps text-[0.7rem] text-gold">{events.join(" · ")}</p>
              <p className="heading mt-1 text-[1.15rem] font-semibold leading-tight text-accent">{venue.name}</p>
              <p className="text-[0.95rem] text-ink/80">{venue.address}</p>
              <div className="mt-2 flex flex-wrap gap-x-5">
                <a href={mapsUrl(venue)} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[44px] items-center gap-1 text-[0.92rem] font-semibold text-accent underline-offset-4 hover:underline">
                  {t("openInMaps")} <Navigation size={13} aria-hidden />
                </a>
                <a href={directionsUrl(venue)} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[44px] items-center gap-1 text-[0.92rem] font-semibold text-accent underline-offset-4 hover:underline">
                  {t("getDirections")} <Route size={13} aria-hidden />
                </a>
              </div>
            </Reveal>
          ))}
        </div>
      )}
    </section>
  );
}
