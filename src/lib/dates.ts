import { wedding } from "../config/wedding";

const tz = wedding.timezone;
let current: "en" | "hi" | "mr" = "en";
/** Called by the language provider so every date below is written in the chosen language. */
export const setDateLocale = (l: "en" | "hi" | "mr") => { current = l; };

const part = (iso: string, opts: Intl.DateTimeFormatOptions, locale = "en-GB") =>
  new Intl.DateTimeFormat(current === "en" ? locale : current === "hi" ? "hi-IN" : "mr-IN", { ...opts, timeZone: tz }).format(new Date(iso));

/** 25 December 2026 */
export const fmtLong = (iso: string) => part(iso, { day: "numeric", month: "long", year: "numeric" });
/** 22 Dec 2026 */
export const fmtShort = (iso: string) => part(iso, { day: "numeric", month: "short", year: "numeric" });
/** 22 Dec */
export const fmtDayMonth = (iso: string) => part(iso, { day: "numeric", month: "short" });
/** 5:00 PM */
export const fmtTime = (iso: string) => part(iso, { hour: "numeric", minute: "2-digit", hour12: true }, "en-US");
/** 25 · 12 · 2026 */
export const fmtDotted = (iso: string) =>
  [part(iso, { day: "2-digit" }), part(iso, { month: "2-digit" }), part(iso, { year: "numeric" })].join(" · ");
/** Respond-by dates written as plain YYYY-MM-DD */
export const fmtPlainDate = (ymd: string) => fmtShort(`${ymd}T12:00:00Z`);
/** Wed */
export const fmtWeekday = (iso: string) => part(iso, { weekday: "short" });
/** 12.12.2026 (digits follow the chosen language) */
export const fmtNumeric = (iso: string) =>
  [part(iso, { day: "2-digit" }), part(iso, { month: "2-digit" }), part(iso, { year: "numeric" })].join(".");
