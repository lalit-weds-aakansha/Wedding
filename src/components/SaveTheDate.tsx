import { motion } from "framer-motion";
import { useReduce } from "../lib/motion";
import { Check, Link2, Share2 } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import { coupleNames } from "../config/wedding";
import { fmtNumeric, fmtTime } from "../lib/dates";
import { useLang } from "../lib/i18n";
import { siteUrl } from "../lib/site";
import { drawCover, type CardText, type CardTheme } from "./cardArt";
import { Envelope } from "./Envelope";
import { LaceFrame } from "./LaceFrame";
import { startMusic } from "./MusicPlayer";
import { ScratchCard, type ScratchHandle } from "./ScratchCard";

const sparks = Array.from({ length: 18 }, (_, i) => {
  const a = (i / 18) * Math.PI * 2;
  const d = 90 + (i % 3) * 38;
  return { dx: Math.cos(a) * d, dy: Math.sin(a) * d, delay: (i % 6) * 0.04, size: 4 + (i % 3) * 2 };
});

/**
 * Save-the-Date gate shown before the invitation: optional envelope → scratch card → revealed date,
 * lace-framed photo and share buttons. "View the Invitation" hands over to the main page.
 */
export function SaveTheDate({ onContinue }: { onContinue: () => void }) {
  const { w, t, lang } = useLang();
  const cfg = w.saveTheDate;
  const reduce = useReduce();
  const [stage, setStage] = useState<"envelope" | "card">(cfg.envelope.enabled ? "envelope" : "card");
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);
  const scratch = useRef<ScratchHandle>(null);
  const [a, b] = coupleNames(w);
  const when = w.events.find((e) => e.id === "wedding") ?? null;
  const date = fmtNumeric(when?.start ?? w.weddingDate);
  const venueName = (when?.venue ?? w.venue).name;
  const url = siteUrl();
  const shareText = `${t("stdShareText", { names: `${a} & ${b}`, date, venue: venueName })}\n${url}`;
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  const latin = lang === "en";
  const text = useMemo<CardText>(
    () => ({ om: "ॐ", shloka: "॥ श्री गणेशाय नमः ॥", title: t("stdTitle"), names: latin ? `${a} & ${b}`.toUpperCase() : `${a} & ${b}` }),
    [lang] // eslint-disable-line react-hooks/exhaustive-deps
  );
  const theme = useMemo<CardTheme>(
    () => ({
      maroon: w.theme.accent, green: "#2f6b4a", gold: w.theme.gold, ink: w.theme.ink,
      displayFont: latin ? "'Cormorant Garamond', Georgia, serif" : "'Tiro Devanagari Hindi', serif",
      bodyFont: "'EB Garamond', serif", italic: latin,
    }),
    [lang] // eslint-disable-line react-hooks/exhaustive-deps
  );
  const paint = useCallback((ctx: CanvasRenderingContext2D, cw: number, ch: number) => drawCover(ctx, cw, ch, text, theme), [text, theme]);

  const share = async () => {
    try { await navigator.share({ title: t("stdTitle"), text: shareText, url }); } catch { /* cancelled */ }
  };
  const copy = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(url);
      else {
        const el = Object.assign(document.createElement("textarea"), { value: url });
        el.style.position = "fixed"; el.style.opacity = "0";
        document.body.appendChild(el); el.select(); document.execCommand("copy"); el.remove();
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch { /* ignore */ }
  };

  const pill = "btn btn-ghost !min-h-[44px] !px-4 !text-[0.92rem]";

  return (
    <div className="mx-auto flex min-h-full w-full max-w-lg flex-col items-center justify-center px-4 pb-8 pt-20 text-center">
      {stage === "envelope" ? (
        <Envelope onOpened={() => setStage("card")} />
      ) : (
        <>
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="relative"
            style={{ width: "min(92vw, calc((100svh - 230px) * 0.5625), 440px)" }}
          >
            <div className="absolute inset-0 -z-10 translate-y-2 rounded-sm bg-black/10 blur-xl" aria-hidden />
            <ScratchCard
              ref={scratch}
              paint={paint}
              paintKey={lang}
              threshold={cfg.scratchThreshold}
              ariaLabel={t("stdScratchLabel")}
              onFirstTouch={startMusic}
              onRevealed={() => setRevealed(true)}
              className="aspect-[9/16] w-full rounded-[2px] shadow-[0_18px_40px_-18px_rgba(60,40,20,.55)] [container-type:inline-size]"
            >
              {/* ---- what is hidden under the scratch layer ---- */}
              <div className="relative flex h-full flex-col items-center bg-[#f7f1e7] px-[8cqw] pb-[7cqw] pt-[8cqw] text-center">
                <div className="pointer-events-none absolute inset-[3.5cqw] border-[3cqw] border-accent" aria-hidden />
                <div className="pointer-events-none absolute inset-[7.2cqw] border border-gold/70" aria-hidden />
                <p className="font-['Tiro_Devanagari_Hindi',serif] text-[3.6cqw] text-ink/80" lang="sa">॥ श्री गणेशाय नमः ॥</p>
                <p className="caps mt-[1.5cqw] text-[2.8cqw] text-ink/70">{t("stdTogether")}</p>
                <LaceFrame className="mt-[3cqw] w-[62cqw]">
                  <img
                    src={cfg.photo}
                    alt={t("photoAlt")}
                    className="h-full w-full object-cover"
                    style={{ objectPosition: cfg.photoPosition }}
                    onError={(e) => { e.currentTarget.style.display = "none"; }}
                  />
                </LaceFrame>
                <p className="names mt-[3cqw] text-[8.6cqw]">{a} <span className="text-[0.6em] text-gold">&amp;</span> {b}</p>
                <p className="mt-[1.5cqw] max-w-[62cqw] text-[3.5cqw] leading-snug text-ink/85">{t("stdInvites")}</p>
                <p className="names mt-[1.5cqw] text-[11cqw] tracking-wide">{date}</p>
                <p className="heading text-[4cqw]">{fmtTime(when?.start ?? w.weddingDate)} · {venueName}</p>
                <p className="mt-auto text-[3.2cqw] italic text-ink/65">{t("stdFormal")}</p>
              </div>
            </ScratchCard>

            {revealed && !reduce && (
              <div className="pointer-events-none absolute inset-0 grid place-items-center" aria-hidden>
                {sparks.map((s, i) => (
                  <span key={i} className="spark absolute rounded-full bg-[#e9c766]"
                    style={{ width: s.size, height: s.size, animationDelay: `${s.delay}s`, ["--dx" as string]: `${s.dx}px`, ["--dy" as string]: `${s.dy}px` }} />
                ))}
              </div>
            )}
          </motion.div>

          <div className="mt-5 flex min-h-[7.5rem] flex-col items-center gap-3" aria-live="polite">
            {!revealed ? (
              <>
                <p className="text-[1.02rem] text-ink/75">{t("stdHint")}</p>
                <button type="button" className={pill} onClick={() => { startMusic(); scratch.current?.revealAll(); }}>
                  {t("revealAll")}
                </button>
              </>
            ) : (
              <motion.div initial={reduce ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.6 }} className="flex flex-col items-center gap-3">
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {canShare && <button type="button" className={pill} onClick={share}><Share2 size={16} aria-hidden /> {t("share")}</button>}
                  <a className={pill} target="_blank" rel="noopener noreferrer" href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}>{t("shareWhatsApp")}</a>
                  <button type="button" className={pill} onClick={copy}>
                    {copied ? <><Check size={16} aria-hidden /> {t("linkCopied")}</> : <><Link2 size={16} aria-hidden /> {t("copyLink")}</>}
                  </button>
                </div>
                <button type="button" className="btn btn-maroon px-8" onClick={onContinue}>{t("viewInvitation")}</button>
              </motion.div>
            )}
          </div>
        </>
      )}
      {!revealed && (
        <button type="button" onClick={onContinue} className="mt-1 min-h-[44px] px-3 text-[0.92rem] text-ink/55 underline underline-offset-4 hover:text-ink">
          {t("skipToInvitation")}
        </button>
      )}
    </div>
  );
}
