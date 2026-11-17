import { AnimatePresence, MotionConfig, motion, useAnimationControls } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { EventDetail } from "./components/EventDetail";
import { Header } from "./components/Header";
import { WatercolorFilter } from "./components/Florals";
import { GiftSection } from "./components/GiftSection";
import { InvitationSection } from "./components/InvitationSection";
import { OurStory } from "./components/OurStory";
import { RSVPForm } from "./components/RSVPForm";
import { VenueSection } from "./components/VenueSection";
import { WeddingEvents } from "./components/WeddingEvents";
import { WeddingFooter } from "./components/WeddingFooter";
import { SaveTheDate } from "./components/SaveTheDate";
import { ScenicHero } from "./components/ScenicHero";
import { prefersReduced, respectReducedMotion } from "./lib/motion";
import { armMusic } from "./components/MusicPlayer";
import { StoryIntro } from "./components/story/StoryIntro";
import { CountdownSection } from "./components/CountdownSection";
import { LangProvider, useLang } from "./lib/i18n";

const eventIdFromHash = () => {
  const m = window.location.hash.match(/^#event-(.+)$/);
  return m ? decodeURIComponent(m[1]) : null;
};

function Page() {
  const { w, t, lang } = useLang();
  const [eventId, setEventId] = useState(eventIdFromHash);
  const event = eventId ? w.events.find((e) => e.id === eventId) ?? null : null;
  // Save-the-Date scratch card first, unless disabled or the visitor followed a direct #event link.
  const [gate, setGate] = useState(() => w.saveTheDate.enabled && !eventIdFromHash());
  // The cinematic story: plays on every visit, except for a direct link to a section.
  const [story, setStory] = useState(() => {
    try {
      if (!w.opening.story || window.location.hash.length > 1) return false;
      return true;
    } catch { return false; }
  });
  const [storyLeaving, setStoryLeaving] = useState(false); // the hero is already in place while the story fades out
  const storyLeave = useCallback(() => setStoryLeaving(true), []);
  useEffect(() => { if (!story && !gate) armMusic(); }, [story, gate]); // no story playing: music may start now (skipping the story also lands here)
  useEffect(() => {
    document.body.style.overflow = gate || story ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [gate, story]);
  const enter = useCallback(() => { setGate(false); window.scrollTo(0, 0); }, []);

  // The hero comes first; "Open Invitation" fades the rest in (no reload). A direct link to a section opens it right away.
  const [opened, setOpened] = useState(() => window.location.hash.length > 1);
  const openInvitation = useCallback(() => {
    setOpened(true);
    window.setTimeout(() => document.getElementById("invite")?.scrollIntoView({ behavior: prefersReduced() ? "auto" : "smooth" }), 120);
  }, []);
  const storyDone = useCallback(() => { setStory(false); setStoryLeaving(false); }, []);
  const replayStory = useCallback(() => { setStoryLeaving(false); window.scrollTo(0, 0); setStory(true); }, []);

  useEffect(() => {
    const onHash = () => {
      setEventId(eventIdFromHash());
      const id = window.location.hash.slice(1);
      if (id && !id.startsWith("event-")) {
        // a link to a section opens the invitation (if still closed) and scrolls there once it is on the page
        setOpened(true);
        window.setTimeout(() => document.getElementById(id)?.scrollIntoView(), 150);
      }
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  // Arriving on a link like /#gift: scroll to that section once the page has mounted.
  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (!id || id.startsWith("event-")) return;
    const t = window.setTimeout(() => document.getElementById(id)?.scrollIntoView(), 500);
    return () => window.clearTimeout(t);
  }, []);

  const closeEvent = useCallback(() => {
    // Return to the events list, keeping a clean URL.
    history.pushState(null, "", `${location.pathname}${location.search}#events`);
    setEventId(null);
    requestAnimationFrame(() => document.getElementById("events")?.scrollIntoView({ block: "start" }));
  }, []);

  // Soft fade + rise whenever the language changes (no remount, so a half-filled RSVP form keeps its text).
  const swap = useAnimationControls();
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    swap.start({ opacity: [0.2, 1], y: [10, 0], transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } });
  }, [lang, swap]);

  return (
    <div className="relative min-h-screen overflow-x-clip bg-ivory">
      {w.isDemo && (
        <div className="pointer-events-none fixed bottom-2 left-2 z-40 rounded-full bg-ivory/85 px-2 py-0.5 text-[9px] uppercase tracking-widest text-ink/50">
          {t("sampleBadge")}
        </div>
      )}
      <WatercolorFilter />
      {story && <StoryIntro onLeaving={storyLeave} onDone={storyDone} />}
      {w.opening.story && !story && !gate && !event && (
        <button type="button" onClick={replayStory} className="fixed bottom-12 left-3 z-40 flex min-h-[48px] items-center gap-1.5 rounded-full border border-gold/45 bg-ivory/95 px-5 text-[0.95rem] font-medium text-ink shadow-lg backdrop-blur transition hover:bg-white">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /></svg>
          {t("storyReplay")}
        </button>
      )}
      <Header />
      <motion.div animate={swap}>
        <main>
          <ScenicHero onOpen={openInvitation} ready={!story || storyLeaving} instant={w.opening.story} />
          {opened && (
            <motion.div initial={{ opacity: 0, y: 36 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}>
              <InvitationSection />
              <CountdownSection />
              <OurStory />
              <WeddingEvents />
              <VenueSection />
              <GiftSection />
              {w.rsvp.enabled && <RSVPForm />}
            </motion.div>
          )}
        </main>
        {opened && <WeddingFooter />}
      </motion.div>
      <AnimatePresence>
        {gate && (
          <motion.div key="std" className="fixed inset-0 z-30 overflow-y-auto bg-[#f4efe8]" initial={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.6 }}>
            <SaveTheDate onContinue={enter} />
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>{event && <EventDetail key={event.id} event={event} onClose={closeEvent} />}</AnimatePresence>
    </div>
  );
}

export default function App() {
  return (
    <MotionConfig reducedMotion={respectReducedMotion ? "user" : "never"}>
      <LangProvider>
        <Page />
      </LangProvider>
    </MotionConfig>
  );
}
