import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Info, Loader2 } from "lucide-react";
import { useId, useState, type FormEvent, type ReactNode } from "react";
import { wedding } from "../config/wedding";
import { useLang } from "../lib/i18n";
import type { UiKey } from "../config/translations";
import { fmtDayMonth, fmtPlainDate } from "../lib/dates";
import { rsvpEndpoint, submitRsvp, type RsvpResult } from "../lib/rsvp";
import { SectionHeading } from "./Reveal";

type Form = { name: string; contact: string; attending: "" | "yes" | "no"; guests: string; events: string[]; dietary: string; message: string; website: string };
type Errors = Partial<Record<"name" | "contact" | "attending" | "guests" | "events", string>>;

const cfg = wedding.rsvp;
const initial: Form = { name: "", contact: "", attending: "", guests: "", events: [], dietary: "", message: "", website: "" };

function validate(f: Form, t: (k: UiKey) => string): Errors {
  const e: Errors = {};
  if (f.name.trim().length < 2) e.name = t("errName");
  if (cfg.contact === "phone") {
    const digits = f.contact.replace(/\D/g, "");
    if (digits.length < 7 || digits.length > 15) e.contact = t("errPhone");
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.contact.trim())) {
    e.contact = t("errEmail");
  }
  if (!f.attending) e.attending = t("errAttending");
  if (f.attending === "yes") {
    if (!f.guests) e.guests = t("errGuests");
    if (f.events.length === 0) e.events = t("errEvents");
  }
  return e;
}

function Field({ label, htmlFor, required, error, errorId, children }: { label: string; htmlFor?: string; required?: boolean; error?: string; errorId: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="heading mb-1 block text-[1.02rem] font-semibold">
        {label} {required && <span className="text-[#b4412f]" aria-hidden>*</span>}
      </label>
      {children}
      {error && <p id={errorId} className="mt-1 text-sm text-[#b4412f]" role="alert">{error}</p>}
    </div>
  );
}

export function RSVPForm() {
  const { w, t, dietary } = useLang();
  const uid = useId();
  const [f, setF] = useState<Form>(initial);
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<"idle" | "sending" | "error">("idle");
  const [result, setResult] = useState<RsvpResult | null>(null);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => {
    setF((p) => ({ ...p, [k]: v }));
    if (errors[k as keyof Errors]) setErrors((e) => ({ ...e, [k]: undefined }));
  };
  const id = (k: string) => `${uid}-${k}`;
  const err = (k: keyof Errors) => ({ "aria-invalid": Boolean(errors[k]) || undefined, "aria-describedby": errors[k] ? id(`${k}-err`) : undefined });

  const submit = async (ev: FormEvent) => {
    ev.preventDefault();
    if (f.website) return; // honeypot: bots fill hidden fields
    const e = validate(f, t);
    setErrors(e);
    if (Object.keys(e).length) {
      document.getElementById(id(Object.keys(e)[0]))?.focus();
      return;
    }
    setStatus("sending");
    try {
      const attending = f.attending === "yes";
      const contact = cfg.contact === "phone" ? { phone: `${cfg.phoneCountryCode} ${f.contact.trim()}` } : { email: f.contact.trim() };
      const r = await submitRsvp({
        name: f.name.trim(), ...contact, attending: f.attending as "yes" | "no",
        guests: attending ? Number(f.guests) : 0,
        events: attending ? f.events : [],
        dietary: attending ? f.dietary || undefined : undefined,
        message: f.message.trim() || undefined,
        submittedAt: new Date().toISOString(),
      });
      setResult(r);
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  };

  return (
    <section id="rsvp" aria-labelledby="rsvp-title" className="wash relative overflow-hidden px-5 py-16">
      <div className="relative mx-auto max-w-md">
        <SectionHeading id="rsvp-title" title={t("rsvp")} subtitle={t("respondBy", { date: fmtPlainDate(cfg.respondBy) })} />

        <AnimatePresence mode="wait">
          {result ? (
            <motion.div key="done" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card mt-8 p-6 text-center" role="status">
              <CheckCircle2 className="mx-auto text-leaf" size={40} aria-hidden />
              <p className="script mt-2 text-4xl">{t("thankYouName", { name: f.name.trim().split(" ")[0] })}</p>
              <p className="mt-2 text-lg">
                {f.attending === "yes" ? t("canWait") : t("willBeMissed")}
              </p>
              {!result.saved && (
                <p className="mt-4 flex items-start gap-2 rounded-lg bg-[#fff3d9] p-3 text-left text-sm text-ink/85">
                  <Info size={16} className="mt-0.5 shrink-0" aria-hidden />
                  <span>{t("demoSaved")}</span>
                </p>
              )}
              <button type="button" className="btn btn-ghost mt-5" onClick={() => { setResult(null); setF(initial); }}>{t("submitAnother")}</button>
            </motion.div>
          ) : (
            <motion.form key="form" noValidate onSubmit={submit} className="mt-8 space-y-5" exit={{ opacity: 0 }}>
              {!rsvpEndpoint && (
                <p className="flex items-start gap-2 rounded-lg border border-gold/30 bg-white/60 p-3 text-sm text-ink/75">
                  <Info size={16} className="mt-0.5 shrink-0 text-gold" aria-hidden />
                  {t("sampleRsvp")}
                </p>
              )}
              {/* honeypot */}
              <input type="text" name="website" tabIndex={-1} autoComplete="off" value={f.website} onChange={(e) => set("website", e.target.value)} className="hidden" aria-hidden />

              <Field label={t("fullName")} htmlFor={id("name")} required error={errors.name} errorId={id("name-err")}>
                <input id={id("name")} className="field" placeholder={t("enterName")} autoComplete="name" value={f.name} onChange={(e) => set("name", e.target.value)} {...err("name")} />
              </Field>

              <Field label={cfg.contact === "phone" ? t("phone") : t("email")} htmlFor={id("contact")} required error={errors.contact} errorId={id("contact-err")}>
                {cfg.contact === "phone" ? (
                  <div className="flex gap-2">
                    <span className="field flex !w-16 shrink-0 items-center justify-center text-ink/80">{cfg.phoneCountryCode}</span>
                    <input id={id("contact")} className="field" type="tel" inputMode="tel" autoComplete="tel-national" placeholder={t("enterPhone")}
                      value={f.contact} onChange={(e) => set("contact", e.target.value)} {...err("contact")} />
                  </div>
                ) : (
                  <input id={id("contact")} className="field" type="email" inputMode="email" autoComplete="email" placeholder="you@example.com"
                    value={f.contact} onChange={(e) => set("contact", e.target.value)} {...err("contact")} />
                )}
              </Field>

              <fieldset>
                <legend className="heading mb-2 block text-[1.02rem] font-semibold">{t("willAttend")} <span className="text-[#b4412f]" aria-hidden>*</span></legend>
                <div className="grid grid-cols-2 gap-3">
                  {([["yes", t("accept")], ["no", t("decline")]] as const).map(([v, l], i) => (
                    <label key={v} className={`field flex cursor-pointer items-center justify-center gap-2 text-center text-[0.95rem] transition ${f.attending === v ? "!border-button !bg-button text-white" : ""}`}>
                      <input id={i === 0 ? id("attending") : undefined} type="radio" name="attending" value={v} checked={f.attending === v}
                        onChange={() => set("attending", v)} className="sr-only" {...err("attending")} />
                      {l}
                    </label>
                  ))}
                </div>
                {errors.attending && <p id={id("attending-err")} className="mt-1 text-sm text-[#b4412f]" role="alert">{errors.attending}</p>}
              </fieldset>

              {f.attending === "yes" && (
                <>
                  <Field label={t("numGuests")} htmlFor={id("guests")} required error={errors.guests} errorId={id("guests-err")}>
                    <select id={id("guests")} className="field" value={f.guests} onChange={(e) => set("guests", e.target.value)} {...err("guests")}>
                      <option value="">{t("selectGuests")}</option>
                      {Array.from({ length: cfg.maxGuests }, (_, i) => <option key={i} value={i + 1}>{i + 1} {i ? t("guests") : t("guest")}</option>)}
                    </select>
                  </Field>

                  <fieldset>
                    <legend className="heading mb-2 block text-[1.02rem] font-semibold">{t("eventsAttend")} <span className="text-[#b4412f]" aria-hidden>*</span></legend>
                    <div className="space-y-1">
                      {w.events.map((e, i) => (
                        <label key={e.id} className="flex min-h-[40px] cursor-pointer items-center gap-3">
                          <input id={i === 0 ? id("events") : undefined} type="checkbox" className="h-5 w-5 accent-[var(--w-button)]"
                            checked={f.events.includes(e.id)} {...err("events")}
                            onChange={(ev) => set("events", ev.target.checked ? [...f.events, e.id] : f.events.filter((x) => x !== e.id))} />
                          <span>{e.title} <span className="text-ink/60">({fmtDayMonth(e.start)})</span></span>
                        </label>
                      ))}
                    </div>
                    {errors.events && <p id={id("events-err")} className="mt-1 text-sm text-[#b4412f]" role="alert">{errors.events}</p>}
                  </fieldset>

                  {cfg.askDietary && (
                    <Field label={t("dietary")} htmlFor={id("dietary")} errorId={id("dietary-err")}>
                      <select id={id("dietary")} className="field" value={f.dietary} onChange={(e) => set("dietary", e.target.value)}>
                        <option value="">{t("selectPreference")}</option>
                        {cfg.dietaryOptions.map((o) => <option key={o} value={o}>{dietary(o)}</option>)}
                      </select>
                    </Field>
                  )}
                </>
              )}

              <Field label={t("message")} htmlFor={id("message")} errorId={id("message-err")}>
                <textarea id={id("message")} className="field min-h-[110px] resize-y" maxLength={500} placeholder={t("messagePlaceholder")}
                  value={f.message} onChange={(e) => set("message", e.target.value)} />
              </Field>

              {status === "error" && (
                <p className="rounded-lg bg-[#fbe4df] p-3 text-sm text-[#8a2a1c]" role="alert">
                  {t("sendFail")}
                </p>
              )}

              <button type="submit" className="btn btn-primary w-full text-lg" disabled={status === "sending"}>
                {status === "sending" ? (<><Loader2 size={18} className="animate-spin" aria-hidden /> {t("sending")}</>) : t("submit")}
              </button>
            </motion.form>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
