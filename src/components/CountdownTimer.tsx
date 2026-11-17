import { useEffect, useState } from "react";

const calc = (target: number) => {
  const diff = Math.max(0, target - Date.now()); // never negative
  return {
    done: diff === 0,
    parts: [
      { label: "Days", value: Math.floor(diff / 86_400_000) },
      { label: "Hours", value: Math.floor(diff / 3_600_000) % 24 },
      { label: "Minutes", value: Math.floor(diff / 60_000) % 60 },
      { label: "Seconds", value: Math.floor(diff / 1000) % 60 },
    ],
  };
};

/** Live countdown. `iso` must include the venue's UTC offset so every guest's clock agrees. */
export function CountdownTimer({ iso }: { iso: string }) {
  const target = new Date(iso).getTime();
  const [t, setT] = useState(() => calc(target));

  useEffect(() => {
    if (t.done) return;
    const id = setInterval(() => setT(calc(target)), 1000);
    return () => clearInterval(id);
  }, [target, t.done]);

  if (t.done) {
    return <p className="heading text-xl italic text-accent">The celebrations have begun — thank you for being with us!</p>;
  }

  return (
    <div className="flex justify-center gap-2.5 sm:gap-4" role="timer" aria-label={`${t.parts[0].value} days to go`}>
      {t.parts.map((p) => (
        <div key={p.label} className="card w-[4.4rem] px-1 py-2.5 text-center sm:w-20">
          <span className="heading block text-[1.9rem] font-semibold leading-none text-accent tabular-nums" aria-hidden>
            {String(p.value).padStart(2, "0")}
          </span>
          <span className="mt-1 block text-[0.78rem] text-ink/75">{p.label}</span>
        </div>
      ))}
    </div>
  );
}
