import { motion } from "framer-motion";
import { useLang } from "../lib/i18n";
import { FloatingPetals } from "./FloatingPetals";
import { Corner } from "./Florals";
import { GoldDivider } from "./Ornaments";
import { Reveal } from "./Reveal";

/** Editorial split: couple photo on one side, "OUR STORY" label, script heading and a short paragraph. */
export function OurStory() {
  const { w } = useLang();
  const s = w.story;
  if (!s.enabled) return null;
  return (
    <section id="story" aria-labelledby="story-title" className="wash relative overflow-hidden px-5 py-16 sm:px-8 sm:py-24">
      <Corner pos="tr" size="clamp(7rem, 30vw, 15rem)" />
      <Corner pos="bl" size="clamp(7rem, 30vw, 15rem)" delay={0.2} />
      <FloatingPetals count={5} contained />
      <div className="relative z-[2] mx-auto grid max-w-5xl items-center gap-10 md:grid-cols-2 md:gap-16">
        <Reveal className="relative mx-auto w-full max-w-sm">
          <div className="absolute -inset-3 rounded-[1.6rem] border border-gold/40" aria-hidden />
          <div className="aspect-[4/5] overflow-hidden rounded-[1.2rem] bg-[#f1e3d3] shadow-[0_22px_40px_-22px_rgba(90,40,40,.5)]">
            <motion.img
              src={s.photo}
              alt={w.couple.groom + " & " + w.couple.bride}
              loading="lazy"
              initial={{ opacity: 0, scale: 1.08 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
              className="h-full w-full object-cover"
              style={{ objectPosition: s.photoPosition }}
              onError={(e) => { e.currentTarget.style.display = "none"; }}
            />
          </div>
        </Reveal>

        <div className="text-center md:text-left">
          <Reveal>
            <p className="caps text-[0.78rem] text-[#b5586a]">{s.label}</p>
            <h2 id="story-title" className="script mt-2 text-[2.8rem] leading-tight sm:text-[3.4rem]">{s.title}</h2>
            <GoldDivider className="mt-3 md:mx-0" />
          </Reveal>
          <Reveal delay={0.12}>
            <p className="mx-auto mt-6 max-w-md text-[1.1rem] leading-relaxed text-ink/85 md:mx-0">{s.text}</p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
