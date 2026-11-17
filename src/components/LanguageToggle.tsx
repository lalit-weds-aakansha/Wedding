import { motion } from "framer-motion";
import { LANGS } from "../config/translations";
import { useLang } from "../lib/i18n";

/** English / हिन्दी / मराठी switch. The white highlight slides to the chosen language. */
export function LanguageToggle() {
  const { lang, setLang, t } = useLang();
  return (
    <div
      role="group"
      aria-label={t("language")}
      className="fixed left-3 top-3 z-40 flex min-h-[44px] items-center rounded-full border border-white/70 bg-[#3a2018]/70 p-1 shadow-lg backdrop-blur-md"
    >
      {LANGS.map((l) => {
        const active = l.code === lang;
        return (
          <button
            key={l.code}
            type="button"
            lang={l.htmlLang}
            aria-pressed={active}
            onClick={() => setLang(l.code)}
            className={`relative min-h-[36px] rounded-full px-3 text-[0.8rem] font-medium transition-colors ${active ? "text-accent" : "text-white/90 hover:text-white"}`}
          >
            {active && (
              <motion.span
                layoutId="lang-pill"
                className="absolute inset-0 rounded-full bg-white shadow"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            )}
            <span className="relative">{l.label}</span>
          </button>
        );
      })}
    </div>
  );
}
