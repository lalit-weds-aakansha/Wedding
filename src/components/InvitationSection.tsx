import { motion } from "framer-motion";
import { CalendarDays, Clock, MapPin } from "lucide-react";
import { coupleNames } from "../config/wedding";
import { useLang } from "../lib/i18n";
import { fmtLong, fmtTime, fmtWeekday } from "../lib/dates";
import { Corner } from "./Florals";
import { GoldDivider } from "./Ornaments";
import { Reveal } from "./Reveal";

type Role = "groom" | "bride";

/** The invitation card: blessing, names with their parents, story line, date / time / venue. */
export function InvitationSection() {
  const { w, t } = useLang();
  const [first] = coupleNames(w);
  const order: Role[] = first === w.couple.groom ? ["groom", "bride"] : ["bride", "groom"];
  const [a, b] = coupleNames(w);
  const wedEvent = w.events.find((e) => e.id === "wedding");
  const when = wedEvent?.start ?? w.weddingDate;
  const where = wedEvent?.venue ?? w.venue;

  const parent = (role: Role) => {
    const fam = w.family[role];
    return (
      <div key={role} className="px-2">
        <p className="caps text-[0.7rem] text-gold">{role === "groom" ? t("sonOf") : t("daughterOf")}</p>
        <p className="heading mt-0.5 text-[1.05rem] font-semibold leading-snug">{fam.parents}</p>
        {fam.detail && !fam.detail.startsWith("(") && <p className="text-[0.95rem] italic text-ink/75">{fam.detail}</p>}
      </div>
    );
  };

  const detail = (Icon: typeof Clock, label: string, lines: string[]) => (
    <div className="flex flex-col items-center px-3 text-center">
      <Icon size={22} strokeWidth={1.4} className="text-gold" aria-hidden />
      <p className="mt-1 text-[0.8rem] text-ink/70">{label}</p>
      {lines.map((l) => <p key={l} className="heading text-[0.98rem] leading-snug">{l}</p>)}
    </div>
  );

  return (
    <section id="invite" aria-labelledby="invite-title" className="wash relative overflow-hidden px-4 pb-12 pt-0 sm:px-8 sm:pb-16">
      <div className="paithani -mx-4 mb-10 sm:-mx-8 sm:mb-14" aria-hidden />
      <div className="gold-frame relative mx-auto max-w-5xl overflow-hidden px-5 py-12 sm:px-10">
        <Corner pos="tr" size="clamp(5.5rem, 26vw, 11rem)" />
        <Corner pos="bl" size="clamp(5.5rem, 26vw, 11rem)" delay={0.2} />
        <Corner pos="br" size="clamp(5.5rem, 26vw, 11rem)" delay={0.4} />

        <div className="relative grid items-center gap-8 md:grid-cols-[1fr_1.9fr_1fr]">
          {/* couple photo */}
          <Reveal className="mx-auto w-[68%] max-w-[17rem] md:order-1 md:w-full">
            <div className="floaty overflow-hidden rounded-[1.1rem] border-[5px] border-white bg-white shadow-[0_18px_34px_-18px_rgba(90,40,40,.55)]">
              <motion.img
                src={w.images.couple}
                alt={t("coupleAlt")}
                loading="lazy"
                initial={{ opacity: 0, scale: 1.08 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
                className="aspect-[4/5] w-full object-cover"
                style={{ objectPosition: w.images.couplePosition }}
              />
            </div>
          </Reveal>

          {/* text */}
          <div className="text-center md:order-2">
            <Reveal>
              <p className="mx-auto max-w-sm whitespace-pre-line text-[1.02rem] leading-relaxed text-ink/85">
                {w.wording.inviteIntro}
              </p>
              <h2 id="invite-title" className="names mt-4 text-[2.6rem] sm:text-5xl">
                {a} <span className="text-[0.55em] text-gold">&amp;</span> {b}
              </h2>
              <GoldDivider className="mt-3" />
            </Reveal>

            <Reveal delay={0.1} className="mx-auto mt-6 grid max-w-md grid-cols-2 gap-3">
              {order.map(parent)}
            </Reveal>

            <Reveal delay={0.15}>
              <p className="mx-auto mt-6 max-w-sm whitespace-pre-line text-[1.02rem] leading-relaxed text-ink/85">{w.wording.story}</p>
            </Reveal>

            <Reveal delay={0.2} className="mx-auto mt-8 grid max-w-xl grid-cols-1 gap-6 sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-gold/40">
              {detail(CalendarDays, t("weddingDate"), [fmtLong(when), `(${fmtWeekday(when)})`])}
              {detail(Clock, t("time"), [fmtTime(when), t("onwards")])}
              {detail(MapPin, t("venue"), [where.name, where.area ?? ""].filter(Boolean))}
            </Reveal>

            <Reveal delay={0.25}>
              <p className="mt-9 text-[0.98rem] text-ink/80">{w.wording.signOff}</p>
              <p className="heading text-[1.05rem] font-semibold">{w.wording.signature}</p>
              <GoldDivider className="mt-2 max-w-[8rem]" />
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
