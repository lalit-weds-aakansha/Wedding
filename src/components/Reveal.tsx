import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { GoldDivider } from "./Ornaments";

/** Fades content up as it scrolls into view (MotionConfig drops the movement for reduced-motion users). */
export function Reveal({ children, delay = 0, className = "" }: { children: ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 26 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

/** Section title with a gold ornament and a small subtitle. */
export function SectionHeading({ title, subtitle, id }: { title: string; subtitle?: string; id: string }) {
  return (
    <Reveal className="mb-8 text-center">
      <h2 id={id} className="heading text-[2rem] font-semibold leading-tight text-accent sm:text-4xl">{title}</h2>
      <GoldDivider className="mt-2" />
      {subtitle && <p className="mt-2 text-[1.02rem] text-ink/80">{subtitle}</p>}
    </Reveal>
  );
}
