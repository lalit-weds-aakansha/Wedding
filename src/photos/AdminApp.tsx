import { Check, Copy, Download, Loader2, Trash2, Upload, X } from "lucide-react";
import QRCode from "qrcode";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { adminApi, adminLogin, type AdminGuest, type AdminPhoto, type GuestDiagnostics, type Overview } from "./api";
import { DriveTab } from "./DriveTab";

/** Photographer / couple page at /admin (English only). Upload photos; faces are found in the browser; matches appear for guests automatically. */
type Tab = "upload" | "drive" | "photos" | "guests" | "qr";
type Job = { name: string; state: "waiting" | "working" | "done" | "error"; detail?: string };

const SESSION_KEY = "wedding-admin-session";
const panel = "rounded-xl border border-gold/35 bg-white/70 p-4 shadow-sm";
const phoneDigits = (p: string) => { const d = p.replace(/\D/g, ""); return d.length === 10 ? `91${d}` : d; };

export default function AdminApp() {
  const [session, setSession] = useState<string | null>(() => { try { return window.sessionStorage.getItem(SESSION_KEY); } catch { return null; } });
  const [pw, setPw] = useState("");
  const [loginErr, setLoginErr] = useState("");

  const api = useMemo(() => (session ? adminApi(session) : null), [session]);
  const logout = () => { try { window.sessionStorage.removeItem(SESSION_KEY); } catch { /* ignore */ } setSession(null); };

  if (!api) {
    return (
      <div className="wash grid min-h-screen place-items-center px-4">
        <form className={`${panel} w-full max-w-sm space-y-4`} onSubmit={async (e) => {
          e.preventDefault(); setLoginErr("");
          try { const r = await adminLogin(pw); try { window.sessionStorage.setItem(SESSION_KEY, r.session); } catch { /* ignore */ } setSession(r.session); setPw(""); }
          catch (x) { setLoginErr((x as Error).message); }
        }}>
          <h1 className="heading text-2xl font-semibold text-accent">Wedding photos: admin</h1>
          <label className="block text-sm">Password
            <input type="password" autoComplete="current-password" className="field mt-1" value={pw} onChange={(e) => setPw(e.target.value)} autoFocus />
          </label>
          {loginErr && <p className="text-sm text-[#b4412f]" role="alert">{loginErr}</p>}
          <button className="btn btn-maroon w-full" type="submit">Log in</button>
        </form>
      </div>
    );
  }
  return <Dashboard api={api} onLogout={logout} onExpired={logout} />;
}

function Dashboard({ api, onLogout, onExpired }: { api: ReturnType<typeof adminApi>; onLogout: () => void; onExpired: () => void }) {
  const [tab, setTab] = useState<Tab>("upload");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [photos, setPhotos] = useState<AdminPhoto[]>([]);
  const [guests, setGuests] = useState<AdminGuest[]>([]);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    try {
      const [o, p, g] = await Promise.all([api.overview(), api.photos(), api.guests()]);
      setOverview(o); setPhotos(p); setGuests(g); setError("");
    } catch (x) {
      if ((x as { status?: number }).status === 401) onExpired(); else setError((x as Error).message);
    }
  }, [api, onExpired]);
  useEffect(() => { void refresh(); const t = window.setInterval(() => { if (document.visibilityState === "visible") void refresh(); }, 20_000); return () => window.clearInterval(t); }, [refresh]);

  const tabs: [Tab, string][] = [["upload", "Upload"], ["drive", "Google Drive"], ["photos", `Photos (${photos.length})`], ["guests", `Guests (${guests.length})`], ["qr", "QR & settings"]];
  return (
    <div className="wash min-h-screen px-4 pb-16 pt-6">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="heading text-2xl font-semibold text-accent">Wedding photos</h1>
          <button className="btn btn-ghost !min-h-[40px]" onClick={onLogout}>Log out</button>
        </header>
        {overview && (
          <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[["Guests registered", overview.guests], ["Photos", overview.photos], ["Guests with photos", overview.guestsWithPhotos], ["Photo matches", overview.matches]].map(([k, v]) => (
              <div key={k as string} className={panel}><dt className="text-xs uppercase tracking-wider text-ink/60">{k}</dt><dd className="heading text-3xl font-semibold text-accent">{v}</dd></div>
            ))}
          </dl>
        )}
        {error && <p className="mt-3 text-sm text-[#b4412f]" role="alert">{error}</p>}
        <nav className="mt-6 flex flex-wrap gap-2" aria-label="Sections">
          {tabs.map(([t, label]) => (
            <button key={t} onClick={() => setTab(t)} aria-pressed={tab === t} className={`btn !min-h-[40px] ${tab === t ? "btn-maroon !normal-case !tracking-normal !text-[0.95rem]" : "btn-ghost"}`}>{label}</button>
          ))}
        </nav>
        <main className="mt-5">
          {tab === "upload" && <UploadTab api={api} onDone={refresh} />}
          {tab === "drive" && <DriveTab api={api} onChange={refresh} />}
          {tab === "photos" && <PhotosTab api={api} photos={photos} onChange={refresh} />}
          {tab === "guests" && <GuestsTab api={api} guests={guests} onChange={refresh} />}
          {tab === "qr" && <QrTab api={api} overview={overview} onChange={refresh} />}
        </main>
      </div>
    </div>
  );
}

function UploadTab({ api, onDone }: { api: ReturnType<typeof adminApi>; onDone: () => void }) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const running = useRef(false);

  const run = async (files: File[]) => {
    if (running.current) return;
    running.current = true;
    setJobs(files.map((f) => ({ name: f.name, state: "waiting" })));
    for (let i = 0; i < files.length; i++) {
      const set = (j: Partial<Job>) => setJobs((all) => all.map((x, k) => (k === i ? { ...x, ...j } : x)));
      set({ state: "working" });
      try {
        await api.uploadPhoto(files[i]); // the server saves it and finds the faces in the background
        set({ state: "done", detail: "Uploaded. Faces are being found on the server." });
      } catch (x) {
        set({ state: "error", detail: (x as Error).message });
      }
    }
    running.current = false;
    onDone();
  };

  return (
    <section className={panel}>
      <h2 className="heading text-xl font-semibold">Upload photos</h2>
      <p className="mt-1 text-sm text-ink/70">
        Pick the edited photos (JPEG, PNG or WebP). The server finds the faces in the background (a few seconds per photo), so you can close this page after the upload finishes.
        Guests who registered a selfie are matched automatically once a photo is processed. For a whole album, the Google Drive tab is easier.
      </p>
      <label className="btn btn-maroon mt-4 cursor-pointer">
        <Upload size={16} aria-hidden /> Choose photos
        <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={(e) => { const f = Array.from(e.target.files ?? []); e.target.value = ""; if (f.length) void run(f); }} />
      </label>
      {jobs.length > 0 && (
        <ul className="mt-4 divide-y divide-gold/20 text-sm" aria-live="polite">
          {jobs.map((j, i) => (
            <li key={i} className="flex items-center justify-between gap-3 py-2">
              <span className="truncate">{j.name}</span>
              <span className={j.state === "error" ? "text-[#b4412f]" : "text-ink/70"}>
                {j.state === "working" && <Loader2 size={14} className="mr-1 inline animate-spin" aria-hidden />}
                {j.state === "done" && <Check size={14} className="mr-1 inline text-leaf" aria-hidden />}
                {j.state === "error" && <X size={14} className="mr-1 inline" aria-hidden />}
                {j.state === "waiting" ? "Waiting" : j.state === "working" ? "Uploading" : j.detail}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function PhotosTab({ api, photos, onChange }: { api: ReturnType<typeof adminApi>; photos: AdminPhoto[]; onChange: () => void }) {
  const [open, setOpen] = useState<AdminPhoto | null>(null);
  const [detail, setDetail] = useState<Awaited<ReturnType<typeof api.photoGuests>> | null>(null);
  const [pick, setPick] = useState("");
  const load = useCallback(async (id: number) => setDetail(await api.photoGuests(id)), [api]);
  useEffect(() => { if (open) void load(open.id); else setDetail(null); }, [open, load]);

  if (!photos.length) return <p className={panel}>No photos yet. Upload some on the Upload tab.</p>;
  return (
    <>
      <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
        {photos.map((p) => (
          <li key={p.id}>
            <button className="relative block aspect-[4/5] w-full overflow-hidden rounded-lg bg-white shadow" onClick={() => setOpen(p)} aria-label={`Photo ${p.id}: ${p.faces} faces, ${p.matches} matches`}>
              <img src={api.thumbUrl(p.id)} alt="" loading="lazy" className="h-full w-full object-cover" />
              <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 text-[11px] text-white">{p.status === "indexed" ? `${p.faces} faces · ${p.matches} guests` : p.status === "pending" ? "processing…" : "failed"}</span>
            </button>
          </li>
        ))}
      </ul>
      {open && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-3" onClick={() => setOpen(null)}>
          <div className="max-h-[92vh] w-full max-w-3xl overflow-auto rounded-xl bg-ivory p-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between"><h2 className="heading text-xl font-semibold">Photo {open.id}</h2><button aria-label="Close" onClick={() => setOpen(null)}><X /></button></div>
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              <img src={api.fileUrl(open.id)} alt="" className="max-h-[60vh] w-full rounded-lg object-contain" />
              <div>
                <h3 className="font-semibold">Guests who get this photo</h3>
                {detail?.matched.length === 0 && <p className="text-sm text-ink/70">Nobody matched yet.</p>}
                <ul className="mt-2 space-y-1 text-sm">
                  {detail?.matched.map((m) => (
                    <li key={m.id} className="flex items-center justify-between gap-2">
                      <span>{m.name} <span className="text-ink/50">({m.source === "manual" ? "added by hand" : `distance ${m.distance?.toFixed(2)}`})</span></span>
                      <button className="text-[#b4412f] underline" onClick={async () => { await api.removeMatch(m.id, open.id); await load(open.id); onChange(); }}>Remove</button>
                    </li>
                  ))}
                </ul>
                <div className="mt-4 flex gap-2">
                  <select className="field !min-h-[40px]" value={pick} onChange={(e) => setPick(e.target.value)} aria-label="Add a guest to this photo">
                    <option value="">Add a guest by hand…</option>
                    {detail?.all.filter((g) => !detail.matched.some((m) => m.id === g.id)).map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                  <button className="btn btn-ghost !min-h-[40px]" disabled={!pick} onClick={async () => { await api.addMatch(Number(pick), open.id); setPick(""); await load(open.id); onChange(); }}>Add</button>
                </div>
                <button className="btn btn-ghost mt-6 !border-[#b4412f]/50 text-[#b4412f]" onClick={async () => { if (window.confirm("Delete this photo for everyone?")) { await api.deletePhoto(open.id); setOpen(null); onChange(); } }}>
                  <Trash2 size={16} aria-hidden /> Delete photo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function GuestsTab({ api, guests, onChange }: { api: ReturnType<typeof adminApi>; guests: AdminGuest[]; onChange: () => void }) {
  const [copied, setCopied] = useState<number | null>(null);
  const [why, setWhy] = useState<{ name: string; d: GuestDiagnostics } | null>(null);
  if (!guests.length) return <p className={panel}>No guests have registered yet. Print the QR code (QR &amp; settings tab) and put it where guests will see it.</p>;
  const link = (g: AdminGuest) => `${window.location.origin}/photos/me?t=${g.token}`;
  return (
    <div className={`${panel} overflow-x-auto`}>
      <table className="w-full min-w-[560px] text-left text-sm">
        <thead className="text-xs uppercase tracking-wider text-ink/60"><tr><th className="py-2">Name</th><th>Phone</th><th>Photos</th><th /></tr></thead>
        <tbody className="divide-y divide-gold/20">
          {guests.map((g) => (
            <tr key={g.id}>
              <td className="py-2">{g.name}{g.email && <div className="text-xs text-ink/50">{g.email}</div>}</td>
              <td>{g.phone}</td>
              <td>{g.photos}</td>
              <td className="space-x-3 whitespace-nowrap text-right">
                <button className="underline" onClick={async () => { await navigator.clipboard.writeText(link(g)); setCopied(g.id); window.setTimeout(() => setCopied(null), 1800); }}>
                  {copied === g.id ? <><Check size={13} className="inline" aria-hidden /> Copied</> : <><Copy size={13} className="inline" aria-hidden /> Link</>}
                </button>
                <a className="underline" target="_blank" rel="noopener noreferrer"
                  href={`https://wa.me/${phoneDigits(g.phone)}?text=${encodeURIComponent(`Hi ${g.name}! Your wedding photos are ready: ${link(g)}`)}`}>WhatsApp</a>
                <button className="underline" onClick={async () => setWhy({ name: g.name, d: await api.guestDiagnostics(g.id) })}>Why?</button>
                <button className="text-[#b4412f] underline" onClick={async () => { if (window.confirm(`Delete ${g.name}'s data?`)) { await api.deleteGuest(g.id); onChange(); } }}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {why && (
        <div className="mt-4 rounded-lg border border-gold/30 bg-white/70 p-3 text-sm">
          <div className="flex items-center justify-between gap-2">
            <strong>Why these photos for {why.name}?</strong>
            <button className="underline" onClick={() => setWhy(null)}>Close</button>
          </div>
          <p className="mt-1 text-ink/70">
            {why.d.returned} returned of {why.d.photosWithFaces} indexed photos with faces (limit {why.d.threshold.toFixed(2)}, {why.d.templates} selfie template(s)). Smaller distance = more similar.
          </p>
          <table className="mt-2 w-full text-left">
            <thead className="text-xs uppercase tracking-wider text-ink/60"><tr><th>Photo</th><th>Faces</th><th>Distance</th><th>Decision</th></tr></thead>
            <tbody className="divide-y divide-gold/20">
              {why.d.candidates.map((c) => (
                <tr key={c.photoId} className={c.decision === "match" ? "font-medium" : "text-ink/60"}>
                  <td className="py-1 pr-2">{c.path || `#${c.photoId}`}</td><td>{c.faces}</td><td className="tabular-nums">{c.distance.toFixed(3)}</td><td>{c.decision}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function QrTab({ api, overview, onChange }: { api: ReturnType<typeof adminApi>; overview: Overview | null; onChange: () => void }) {
  const [base, setBase] = useState(window.location.origin);
  const [qr, setQr] = useState("");
  const [threshold, setThreshold] = useState(overview?.threshold ?? 0.44);
  const [msg, setMsg] = useState("");
  const url = `${base.replace(/\/+$/, "")}/photos`;
  useEffect(() => { QRCode.toDataURL(url, { width: 720, margin: 2, errorCorrectionLevel: "M", color: { dark: "#3b1a22", light: "#ffffff" } }).then(setQr).catch(() => setQr("")); }, [url]);
  useEffect(() => { if (overview) setThreshold(overview.threshold); }, [overview]);
  const local = /localhost|127\.0\.0\.1|192\.168\./.test(base);
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <section className={panel}>
        <h2 className="heading text-xl font-semibold">Guest QR code</h2>
        <p className="mt-1 text-sm text-ink/70">Print this and place it at the venue. Guests scan it, take a selfie, and later open their private photo link.</p>
        <label className="mt-3 block text-sm">Public address of this site
          <input className="field mt-1" value={base} onChange={(e) => setBase(e.target.value)} inputMode="url" />
        </label>
        {local && <p className="mt-2 text-sm text-[#b4412f]" role="alert">This address only works on this computer. Deploy the site to a public https address and enter it here before printing.</p>}
        {qr && <img src={qr} alt={`QR code for ${url}`} className="mx-auto mt-4 w-56 rounded-lg border border-gold/30" />}
        <p className="mt-2 break-all text-center text-xs text-ink/60">{url}</p>
        <a className="btn btn-maroon mt-3 w-full" href={qr} download="wedding-photos-qr.png"><Download size={16} aria-hidden /> Download QR (PNG)</a>
      </section>
      <section className={panel}>
        <h2 className="heading text-xl font-semibold">Matching strictness</h2>
        <p className="mt-1 text-sm text-ink/70">Lower is stricter (fewer wrong photos, more missed ones). Higher is looser. 0.44 is the calibrated default: with this face model, different people were never closer than about 0.46 in testing, so values above 0.46 start to show other people's photos. Photos you remove by hand stay removed.</p>
        <div className="mt-3 flex items-center gap-3">
          <input type="range" min={0.36} max={0.52} step={0.01} value={threshold} onChange={(e) => setThreshold(Number(e.target.value))} className="flex-1 accent-[var(--w-button)]" aria-label="Matching strictness" />
          <span className="w-12 text-right tabular-nums">{threshold.toFixed(2)}</span>
        </div>
        <button className="btn btn-ghost mt-3" onClick={async () => { const r = await api.rematch(threshold); setMsg(`Matching re-run: ${r.matches} matches in total.`); onChange(); }}>Apply and re-run matching</button>
        {msg && <p className="mt-2 text-sm text-ink/70" role="status">{msg}</p>}
        <hr className="my-5 border-gold/25" />
        <p className="text-sm text-ink/70">Guest face data and links are deleted automatically after {overview?.retentionDays ?? 90} days (<code>RETENTION_DAYS</code>). Guests can also delete their own data from their photos page.</p>
      </section>
    </div>
  );
}
