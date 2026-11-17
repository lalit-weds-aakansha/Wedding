import type { Venue, WeddingEvent } from "../config/wedding";
import { coupleNames } from "../config/wedding";

const utc = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const couple = () => coupleNames().join(" & ");
const place = (v: Venue) => `${v.name}, ${v.address}`;

export const mapsUrl = (v: Venue) =>
  v.mapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place(v))}`;

export const directionsUrl = (v: Venue) =>
  `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(place(v))}`;

/** Keyless Google Maps embed. */
export const mapEmbedUrl = (v: Venue) =>
  `https://maps.google.com/maps?q=${encodeURIComponent(place(v))}&z=15&output=embed`;

const details = (e: WeddingEvent) =>
  [e.description, e.dressCode && `Dress code: ${e.dressCode.label}`].filter(Boolean).join("\n");

export const googleCalendarUrl = (e: WeddingEvent) => {
  const p = new URLSearchParams({
    action: "TEMPLATE",
    text: `${e.title} · ${couple()}`,
    dates: `${utc(e.start)}/${utc(e.end)}`,
    details: details(e),
    location: place(e.venue),
  });
  return `https://calendar.google.com/calendar/render?${p}`;
};

const esc = (s: string) => s.replace(/[\\;,]/g, (m) => `\\${m}`).replace(/\n/g, "\\n");

/** Downloads an .ics file (Apple Calendar, Outlook, etc.) */
export const downloadIcs = (e: WeddingEvent) => {
  const ics = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Wedding Invitation//EN", "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${e.id}-${utc(e.start)}@wedding-invite`,
    `DTSTAMP:${utc(new Date().toISOString())}`,
    `DTSTART:${utc(e.start)}`,
    `DTEND:${utc(e.end)}`,
    `SUMMARY:${esc(`${e.title} · ${couple()}`)}`,
    `LOCATION:${esc(place(e.venue))}`,
    `DESCRIPTION:${esc(details(e))}`,
    "END:VEVENT", "END:VCALENDAR",
  ].join("\r\n");
  const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: `${e.id}.ics` });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
