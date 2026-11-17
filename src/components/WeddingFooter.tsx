import { Check, Link2 } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import { coupleNames } from "../config/wedding";
import { useLang } from "../lib/i18n";
import { fmtLong } from "../lib/dates";
import { siteUrl } from "../lib/site";
import { Corner } from "./Florals";
import { FloatingPetals } from "./FloatingPetals";
import { GoldDivider } from "./Ornaments";
import { Reveal } from "./Reveal";

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
      <path d="M17.5 14.4c-.3-.1-1.7-.8-2-.9-.3-.1-.5-.1-.7.1-.2.3-.8.9-.9 1.1-.2.2-.3.2-.6.1-.3-.1-1.2-.5-2.3-1.4-.9-.8-1.4-1.7-1.6-2-.2-.3 0-.5.1-.6l.4-.5c.2-.2.2-.3.3-.5.1-.2 0-.4 0-.5l-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.4s1 2.8 1.2 3c.1.2 2 3.1 4.9 4.3 2.4.9 2.9.8 3.4.7.5-.1 1.7-.7 2-1.4.2-.7.2-1.2.2-1.4-.1-.1-.3-.2-.6-.3ZM12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2c-1.5 0-3-.4-4.3-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Z" />
    </svg>
  );
}

/** Closing thank-you over the sunset lake, with WhatsApp share and copy-link. */
export function WeddingFooter() {
  const { w, t } = useLang();
  const [a, b] = coupleNames(w);
  const [copied, setCopied] = useState<"" | "ok" | "fail">("");
  const url = siteUrl();
  const waHref = `https://wa.me/?text=${encodeURIComponent(`${w.share.whatsappText}\n${url}`)}`;
  const wed = w.events.find((e) => e.id === "wedding")?.start ?? w.weddingDate;

  const copy = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(url);
      else {
        // Fallback for older in-app browsers
        const t = Object.assign(document.createElement("textarea"), { value: url });
        t.style.position = "fixed";
        t.style.opacity = "0";
        document.body.appendChild(t);
        t.select();
        const ok = document.execCommand("copy");
        t.remove();
        if (!ok) throw new Error("copy failed");
      }
      setCopied("ok");
    } catch {
      setCopied("fail");
    }
    setTimeout(() => setCopied(""), 2500);
  };

  return (
    <footer id="thank-you" aria-labelledby="thanks-title" className="wash relative overflow-hidden">
      <Corner pos="tl" size="clamp(7rem, 32vw, 15rem)" />
      <Corner pos="tr" size="clamp(7rem, 32vw, 15rem)" delay={0.2} />
      <Reveal className="relative z-10 px-6 pb-4 pt-24 text-center sm:pt-28">
        <h2 id="thanks-title" className="script text-[2.9rem] leading-tight sm:text-6xl">{w.wording.thankYouTitle}</h2>
        <p className="mx-auto mt-2 max-w-sm whitespace-pre-line text-[1.05rem] leading-relaxed text-ink">{w.wording.thankYouMessage}</p>
        <GoldDivider className="mt-4" />
        <p className="script mt-3 text-[2.5rem] leading-tight">
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
        </p>
        <p className="heading text-[1.05rem]">{fmtLong(wed)}</p>

        <div className="mx-auto mt-6 flex max-w-xs flex-col gap-3 sm:max-w-md sm:flex-row sm:justify-center">
          <a href={waHref} target="_blank" rel="noopener noreferrer" className="btn bg-[#25a35a] text-white shadow-md hover:bg-[#1f8f4e]">
            <WhatsAppIcon /> {t("shareWhatsApp")}
          </a>
          <button type="button" onClick={copy} className="btn btn-ghost">
            {copied === "ok" ? <><Check size={16} aria-hidden /> {t("linkCopied")}</> : <><Link2 size={16} aria-hidden /> {t("copyLink")}</>}
          </button>
        </div>
        {w.photos.showLink && (
          <p className="mx-auto mt-6 max-w-xs text-[0.95rem] text-ink/75">
            {t("photosLinkHint")}{" "}
            <a href="/photos" className="font-semibold text-accent underline underline-offset-4">{t("photosLink")}</a>
          </p>
        )}
        <p className="mt-2 text-[0.95rem] italic text-ink/75" role="status" aria-live="polite">
          {copied === "fail" ? t("copyFail", { url }) : t("helpSpread")}
        </p>
      </Reveal>

      <div className="relative mt-2 overflow-hidden">
        <img src={w.images.thanks} alt={t("thanksAlt")} loading="lazy"
          className="pan-slow mask-fade-top block h-44 w-full object-cover object-left md:h-auto" />
        <span className="flame hidden md:block" style={{ left: "8%", top: "56%", width: "9%" }} aria-hidden />
        <span className="flame hidden md:block" style={{ left: "17%", top: "84%", width: "6%", animationDelay: "-0.8s" }} aria-hidden />
      </div>
      <FloatingPetals count={6} contained />
    </footer>
  );
}
