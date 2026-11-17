def edit(p, pairs):
    s = open(p, encoding="utf8").read()
    for a, b in pairs:
        assert a in s, (p, a[:80])
        s = s.replace(a, b, 1)
    open(p, "w", encoding="utf8").write(s)


REVEAL = '''initial={{ opacity: 0, scale: 1.08 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}'''

# ---- Our Story: photo fades in and settles; a few petals drift ----
edit("src/components/OurStory.tsx", [
    ('import { useLang } from "../lib/i18n";', 'import { motion } from "framer-motion";\nimport { useLang } from "../lib/i18n";\nimport { FloatingPetals } from "./FloatingPetals";'),
    ('''            <img
              src={s.photo}''', '''            <motion.img
              src={s.photo}'''),
    ('              className="h-full w-full object-cover"\n              style={{ objectPosition: s.photoPosition }}', '              ' + REVEAL + '\n              className="h-full w-full object-cover"\n              style={{ objectPosition: s.photoPosition }}'),
    ('      <Corner pos="bl" size="clamp(7rem, 30vw, 15rem)" delay={0.2} />', '      <Corner pos="bl" size="clamp(7rem, 30vw, 15rem)" delay={0.2} />\n      <FloatingPetals count={5} contained />'),
])

# ---- Invitation card photo ----
edit("src/components/InvitationSection.tsx", [
    ('import { CalendarDays, Clock, MapPin } from "lucide-react";', 'import { motion } from "framer-motion";\nimport { CalendarDays, Clock, MapPin } from "lucide-react";'),
    ('''              <img
                src={w.images.couple}''', '''              <motion.img
                src={w.images.couple}'''),
    ('                className="aspect-[4/5] w-full object-cover"\n                style={{ objectPosition: w.images.couplePosition }}', '                ' + REVEAL.replace("\n              ", "\n                ") + '\n                className="aspect-[4/5] w-full object-cover"\n                style={{ objectPosition: w.images.couplePosition }}'),
])

# ---- Event cards: shadow eases in with the lift ----
edit("src/components/WeddingEvents.tsx", [
    ('transition-colors hover:bg-white/70"', 'transition-[background-color,box-shadow] duration-300 hover:bg-white/70 hover:shadow-[0_20px_32px_-18px_rgba(90,40,40,.5)] focus-visible:bg-white/70"'),
])

# ---- Music button: gentle pulse only while playing ----
edit("src/components/Header.tsx", [
    ('className="fixed right-3 top-3 z-40 flex min-h-[44px] items-center gap-2 rounded-full border border-white/70 bg-[#3a2018]/70 py-1.5 pl-2 pr-2 text-[0.82rem] text-white shadow-lg backdrop-blur-md transition hover:bg-[#3a2018]/85 min-[430px]:pr-4"',
     'className={`fixed right-3 top-3 z-40 flex min-h-[44px] items-center gap-2 rounded-full border border-white/70 bg-[#3a2018]/70 py-1.5 pl-2 pr-2 text-[0.82rem] text-white shadow-lg backdrop-blur-md transition hover:bg-[#3a2018]/85 min-[430px]:pr-4 ${playing ? "pulse-ring" : ""}`}'),
])

# ---- Closing: names appear one after another; fewer petals ----
edit("src/components/WeddingFooter.tsx", [
    ('import { useState } from "react";', 'import { motion } from "framer-motion";\nimport { useState } from "react";'),
    ('''        <p className="script mt-3 text-[2.5rem] leading-tight">
          {a} <span className="text-[0.6em] text-gold">&amp;</span> {b}
        </p>''', '''        <p className="script mt-3 text-[2.5rem] leading-tight">
          {[a, "&", b].map((part, i) => (
            <motion.span
              key={i}
              className={i === 1 ? "mx-2 inline-block text-[0.6em] text-gold" : "inline-block"}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.8 }}
              transition={{ duration: 0.9, delay: 0.5 + i * 0.4, ease: [0.22, 1, 0.36, 1] }}
            >
              {part}
            </motion.span>
          ))}
        </p>'''),
    ('<FloatingPetals count={8} contained />', '<FloatingPetals count={6} contained />'),
])
print("touches ok")
