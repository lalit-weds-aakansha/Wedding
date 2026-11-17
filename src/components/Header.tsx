import { wedding } from "../config/wedding";
import { useT } from "../lib/i18n";
import { LanguageToggle } from "./LanguageToggle";
import { MusicIcon, toggleMusic, useMusic } from "./MusicPlayer";

/**
 * The floating music button: shows the song's state (animated bars while it plays, a note when paused) with a text label,
 * and plays or pauses it. Hidden if the audio file cannot be loaded. `className` positions it.
 */
export function MusicPill({ className = "fixed right-3 top-3 z-40" }: { className?: string }) {
  const { available, playing } = useMusic();
  const t = useT();
  if (!available || !wedding.music.showControl) return null; // no button by default: the music just plays (see config music.showControl)
  return (
    <button
      type="button"
      data-music-control
      onClick={toggleMusic}
      aria-pressed={playing}
      aria-label={playing ? t("turnMusicOff") : t("turnMusicOn")}
      className={`${className} flex min-h-[44px] items-center gap-2 rounded-full border border-white/70 bg-[#3a2018]/70 py-1.5 pl-2 pr-2 text-[0.82rem] text-white shadow-lg backdrop-blur-md transition hover:bg-[#3a2018]/85 min-[430px]:pr-4 ${playing ? "pulse-ring" : "opacity-90"}`}
    >
      <span className="grid h-8 w-8 place-items-center rounded-full border border-white/70"><MusicIcon playing={playing} /></span>
      <span className="heading hidden font-medium tracking-wide min-[430px]:inline">{playing ? t("musicOn") : t("musicOff")}</span>
    </button>
  );
}

/** Top bar: language switch (left) and the floating music button (right). */
export function Header() {
  return (
    <>
      <LanguageToggle />
      <MusicPill />
    </>
  );
}
