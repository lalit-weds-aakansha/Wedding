import { Check, Copy, Smartphone } from "lucide-react";
import { useMemo, useState } from "react";
import { useLang } from "../lib/i18n";
import { Corner } from "./Florals";
import { Reveal, SectionHeading } from "./Reveal";

/** The gift block itself: the UPI QR guests can scan, the payee, and phone-friendly "Pay with UPI app" and "Copy UPI ID". Used by the gift section and by the story's closing scene. */
export function GiftPanel({ qrWidth = "min(72vw,17rem)" }: { qrWidth?: string }) {
  const { w, t } = useLang();
  const g = w.gift;
  const [copied, setCopied] = useState(false);

  const { upiId, payee } = useMemo(() => {
    const p = new URLSearchParams(g.upiLink.split("?")[1] ?? "");
    return { upiId: p.get("pa") ?? "", payee: p.get("pn") ?? "" };
  }, [g.upiLink]);
  // "Pay with UPI app" only does something on a phone (a UPI app has to be installed), so show it only for touch devices.
  const phone = useMemo(() => typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches, []);

  const copy = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(upiId);
      else {
        const el = Object.assign(document.createElement("textarea"), { value: upiId });
        el.style.position = "fixed"; el.style.opacity = "0";
        document.body.appendChild(el); el.select(); document.execCommand("copy"); el.remove();
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch { /* ignore */ }
  };

  return (
    <>
      <p className="mx-auto max-w-sm text-[1.05rem] leading-relaxed text-ink/85">{t("giftSubtitle")}</p>

      <div className="mx-auto mt-5 rounded-2xl border border-gold/40 bg-white p-3 shadow-[0_18px_34px_-18px_rgba(90,40,40,.45)]" style={{ width: qrWidth }}>
        <img src={g.qr} alt={t("giftQrAlt")} loading="lazy" className="block aspect-square w-full" />
      </div>
      <p className="mx-auto mt-3 max-w-xs text-[0.98rem] text-ink/80">{t("giftScan")}</p>

      {g.showPayeeName && payee && (
        <p className="mt-3 text-[0.95rem] text-ink/75">
          {t("giftPayee")}: <b className="heading font-semibold tracking-wide text-accent">{payee}</b>
        </p>
      )}

      <div className="mt-5 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        {phone && (
          <a href={g.upiLink} className="btn btn-maroon px-7">
            <Smartphone size={16} aria-hidden /> {t("giftOpenApp")}
          </a>
        )}
        {upiId && (
          <button type="button" onClick={copy} className="btn btn-ghost">
            {copied ? <><Check size={16} aria-hidden /> {t("giftUpiCopied")}</> : <><Copy size={16} aria-hidden /> {t("giftCopyUpi")}</>}
          </button>
        )}
      </div>
      <p className="mx-auto mt-5 max-w-xs text-[0.88rem] italic text-ink/60" role="note">{t("giftOptional")}</p>
    </>
  );
}

/** Optional wedding-gift section on the page. */
export function GiftSection() {
  const { w, t } = useLang();
  if (!w.gift.enabled) return null;
  return (
    <section id="gift" aria-labelledby="gift-title" className="wash relative overflow-hidden px-5 py-16 sm:px-8">
      <Corner pos="tl" size="clamp(6rem, 26vw, 12rem)" />
      <Corner pos="br" size="clamp(6rem, 26vw, 12rem)" delay={0.2} />
      <div className="relative z-[2] mx-auto max-w-md text-center">
        <SectionHeading id="gift-title" title={t("giftTitle")} />
        <Reveal>
          <GiftPanel />
        </Reveal>
      </div>
    </section>
  );
}
