import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, ChevronLeft, ChevronRight, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { wedding } from "../config/wedding";
import { ImageOrArt } from "./Ornaments";
import { Reveal, SectionHeading } from "./Reveal";

const photos = wedding.gallery.photos;

function Lightbox({ index, onClose, onNav }: { index: number; onClose: () => void; onNav: (d: number) => void }) {
  const p = photos[index];
  const touchX = useRef<number | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") onNav(1);
      if (e.key === "ArrowLeft") onNav(-1);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose, onNav]);

  const navBtn = "absolute top-1/2 z-10 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white backdrop-blur hover:bg-white/20";

  return (
    <motion.div
      role="dialog" aria-modal="true" aria-label={`Photo ${index + 1} of ${photos.length}: ${p.alt}`}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-[#1d1611]/95 p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        if (Math.abs(dx) > 50) onNav(dx < 0 ? 1 : -1);
        touchX.current = null;
      }}
    >
      <button ref={closeRef} type="button" aria-label="Close gallery" onClick={onClose} className="absolute right-3 top-3 z-10 grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20">
        <X size={22} />
      </button>
      <button type="button" aria-label="Previous photo" className={`${navBtn} left-2 sm:left-6`} onClick={(e) => { e.stopPropagation(); onNav(-1); }}><ChevronLeft /></button>
      <button type="button" aria-label="Next photo" className={`${navBtn} right-2 sm:right-6`} onClick={(e) => { e.stopPropagation(); onNav(1); }}><ChevronRight /></button>

      <AnimatePresence mode="wait">
        <motion.figure key={index} className="flex max-h-full flex-col items-center" onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} transition={{ duration: 0.25 }}>
          <div className={`overflow-hidden rounded-lg ${p.orientation === "portrait" ? "aspect-[3/4] h-[72vh] max-w-[88vw]" : "aspect-[4/3] w-[88vw] max-w-4xl"}`}>
            {p.src ? <img src={p.src} alt={p.alt} className="h-full w-full object-contain" /> : <ImageOrArt alt={p.alt} label={p.caption} variant={index} />}
          </div>
          <figcaption className="mt-3 text-center text-white/85">
            {p.src && p.caption && <span className="heading text-lg italic">{p.caption}</span>}
            <span className="ml-2 text-sm text-white/50">{index + 1} / {photos.length}</span>
          </figcaption>
        </motion.figure>
      </AnimatePresence>
    </motion.div>
  );
}

export function PhotoGallery() {
  const [showAll, setShowAll] = useState(false);
  const [active, setActive] = useState<number | null>(null);
  const shown = showAll ? photos : photos.slice(0, wedding.gallery.previewCount);
  const nav = useCallback((d: number) => setActive((i) => (i === null ? i : (i + d + photos.length) % photos.length)), []);
  const close = useCallback(() => setActive(null), []);

  return (
    <section id="gallery" className="px-4 py-16" aria-labelledby="gallery-title">
      <SectionHeading id="gallery-title" title="Photo Gallery" subtitle={wedding.wording.gallerySubtitle} />
      <div className="mx-auto grid max-w-3xl grid-flow-dense grid-cols-2 gap-3 sm:grid-cols-3">
        {shown.map((p, i) => (
          <Reveal key={i} delay={(i % 3) * 0.08} className={p.orientation === "landscape" ? "col-span-2" : ""}>
            <button type="button" onClick={() => setActive(i)} aria-label={`Open photo: ${p.alt}`}
              className={`group block w-full overflow-hidden rounded-lg shadow-md ${p.orientation === "landscape" ? "aspect-[16/9]" : "aspect-[4/5]"}`}>
              <ImageOrArt src={p.src} alt={p.alt} label={p.caption} variant={i} className="transition duration-700 group-hover:scale-105" />
            </button>
          </Reveal>
        ))}
      </div>
      {photos.length > shown.length && (
        <div className="mt-8 text-center">
          <button type="button" className="btn btn-primary" onClick={() => setShowAll(true)}>
            View All Photos <ArrowRight size={16} aria-hidden />
          </button>
        </div>
      )}
      <AnimatePresence>{active !== null && <Lightbox index={active} onClose={close} onNav={nav} />}</AnimatePresence>
    </section>
  );
}
