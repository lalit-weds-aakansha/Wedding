import { AnimatePresence, motion } from "framer-motion";
import { CalendarPlus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { WeddingEvent } from "../config/wedding";
import { downloadIcs, googleCalendarUrl } from "../lib/calendar";
import { useT } from "../lib/i18n";

/** "Add to Calendar" with Google Calendar and .ics (Apple / Outlook) options. */
export function AddToCalendar({ event, className = "" }: { event: WeddingEvent; className?: string }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    return () => { document.removeEventListener("pointerdown", close); document.removeEventListener("keydown", close); };
  }, [open]);

  const item = "flex w-full items-center px-4 py-3 text-left text-[0.95rem] hover:bg-paper";

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button type="button" className="btn btn-ghost w-full whitespace-nowrap !gap-1.5 !px-2 !text-[0.9rem]" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <CalendarPlus size={17} aria-hidden /> {t("addToCalendar")}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div role="menu" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
            className="card absolute right-0 z-20 mt-2 w-56 overflow-hidden !bg-white py-1">
            <a role="menuitem" className={item} href={googleCalendarUrl(event)} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)}>
              {t("googleCalendar")}
            </a>
            <button role="menuitem" type="button" className={item} onClick={() => { downloadIcs(event); setOpen(false); }}>
              {t("appleOutlook")}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
