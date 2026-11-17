import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { content, LANGS, ui, type Lang, type UiKey } from "../config/translations";
import { wedding, type Venue, type WeddingConfig } from "../config/wedding";
import { setDateLocale } from "./dates";

const STORAGE_KEY = "wedding-lang";
const isLang = (v: unknown): v is Lang => v === "en" || v === "hi" || v === "mr";

/** English by default. A shared link can force a language with ?lang=hi or ?lang=mr; otherwise the guest's last choice is remembered. */
function initialLang(): Lang {
  try {
    const q = new URLSearchParams(window.location.search).get("lang");
    if (isLang(q)) return q;
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (isLang(saved)) return saved;
  } catch {
    /* storage can be blocked (private mode); fall through to English */
  }
  return "en";
}

/** The wedding config with Hindi / Marathi text applied. English returns the config untouched. */
function localize(lang: Lang): WeddingConfig {
  if (lang === "en") return wedding;
  const c = content[lang];
  const venue = (v: Venue): Venue => ({ ...v, ...(c.venues[v.name] ?? {}) });
  return {
    ...wedding,
    couple: { ...wedding.couple, groom: c.couple.groom, bride: c.couple.bride },
    wording: { ...wedding.wording, ...c.wording },
    story: { ...wedding.story, ...c.story },
    family: {
      groom: { ...wedding.family.groom, ...c.family.groom },
      bride: { ...wedding.family.bride, ...c.family.bride },
    },
    events: wedding.events.map((e) => {
      const t = c.events[e.id];
      return {
        ...e,
        title: t?.title ?? e.title,
        description: t?.description ?? e.description,
        dressCode: e.dressCode && t?.dressCode ? { ...e.dressCode, label: t.dressCode } : e.dressCode,
        venue: venue(e.venue),
      };
    }),
    venue: { ...venue(wedding.venue), image: wedding.venue.image },
    travel: { ...wedding.travel, items: wedding.travel.items.map((it, i) => ({ ...it, ...(c.travel[i] ?? {}) })) },
    share: { ...wedding.share, whatsappText: c.whatsappText },
  };
}

type T = (key: UiKey, vars?: Record<string, string | number>) => string;
type Ctx = { lang: Lang; setLang: (l: Lang) => void; w: WeddingConfig; t: T; dietary: (option: string) => string };

const LangContext = createContext<Ctx | null>(null);

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang);
  setDateLocale(lang); // must happen before children format dates

  useEffect(() => {
    document.documentElement.lang = LANGS.find((l) => l.code === lang)?.htmlLang ?? "en";
  }, [lang]);

  const value = useMemo<Ctx>(() => {
    const dict = ui[lang];
    const t: T = (key, vars) => {
      let s = dict[key] as string;
      if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, String(v));
      return s;
    };
    return {
      lang,
      setLang: (l) => {
        setLangState(l);
        try { window.localStorage.setItem(STORAGE_KEY, l); } catch { /* ignore */ }
      },
      w: localize(lang),
      t,
      dietary: (option) => dict.dietaryOptions[option] ?? option,
    };
  }, [lang]);

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang() {
  const c = useContext(LangContext);
  if (!c) throw new Error("useLang must be used inside <LangProvider>");
  return c;
}
export const useWedding = () => useLang().w;
export const useT = () => useLang().t;
