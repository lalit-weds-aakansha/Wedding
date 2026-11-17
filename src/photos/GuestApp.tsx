import { motion } from "framer-motion";
import { Camera, Check, ChevronLeft, ChevronRight, Download, Loader2, Trash2, Upload, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Corner, WatercolorFilter } from "../components/Florals";
import { LanguageToggle } from "../components/LanguageToggle";
import { wedding } from "../config/wedding";
import { LangProvider, useLang } from "../lib/i18n";
import { forgetToken, guestApi, myPhotosUrl, saveToken, savedToken, SelfieError, type GuestPhoto } from "./api";
import { canvasToJpeg, fileToCanvas } from "./face";
import { photoText, type PhotoKey } from "./strings";

const RETENTION_DAYS = 90; // keep in step with the server's RETENTION_DAYS

function useP() {
  const { lang } = useLang();
  return (key: PhotoKey, vars?: Record<string, string | number>) => photoText(lang, key, vars);
}

function Shell({ children }: { children: React.ReactNode }) {
  const p = useP();
  const { w } = useLang();
  return (
    <div className="wash relative min-h-screen overflow-x-clip px-4 pb-16 pt-24">
      <WatercolorFilter />
      <LanguageToggle />
      <Corner pos="tr" size="clamp(6rem, 28vw, 12rem)" />
      <Corner pos="bl" size="clamp(6rem, 28vw, 12rem)" delay={0.2} />
      <div className="relative z-[2] mx-auto max-w-md">
        <p className="caps text-center text-[0.8rem] text-[#b5586a]">{w.couple.groom} &amp; {w.couple.bride}</p>
        {children}
        <p className="mt-8 text-center"><a href="/" className="text-[0.95rem] text-ink/65 underline underline-offset-4">{p("home")}</a></p>
      </div>
    </div>
  );
}

type Selfie = { preview: string; ticket: string };

function Register() {
  const p = useP();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [selfies, setSelfies] = useState<Selfie[]>([]);
  const [camera, setCamera] = useState(false);
  const [busy, setBusy] = useState<"" | "check" | "save">("");
  const [selfieMsg, setSelfieMsg] = useState<PhotoKey | "">("");
  const [errors, setErrors] = useState<Partial<Record<"name" | "phone" | "email" | "selfie" | "consent" | "server", PhotoKey>>>({});
  const [done, setDone] = useState<{ token: string; photos: number } | null>(null);
  const [copied, setCopied] = useState(false);
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const existing = savedToken();

  const stopCamera = useCallback(() => { stream.current?.getTracks().forEach((t) => t.stop()); stream.current = null; setCamera(false); }, []);
  useEffect(() => stopCamera, [stopCamera]);

  const addSelfieFrom = async (source: Blob | HTMLCanvasElement) => {
    setSelfieMsg("");
    setBusy("check");
    try {
      const canvas = source instanceof HTMLCanvasElement ? source : await fileToCanvas(source, 1280);
      // the server finds the face with the same model it uses for the wedding photos; the picture itself is not kept
      const r = await guestApi.selfie(await canvasToJpeg(canvas, 0.9));
      const thumb = document.createElement("canvas");
      const k = 160 / Math.max(canvas.width, canvas.height);
      thumb.width = Math.round(canvas.width * k); thumb.height = Math.round(canvas.height * k);
      thumb.getContext("2d")!.drawImage(canvas, 0, 0, thumb.width, thumb.height);
      setSelfies((s) => [...s, { preview: thumb.toDataURL("image/jpeg", 0.7), ticket: r.ticket }].slice(0, 3));
      setErrors((e) => ({ ...e, selfie: undefined }));
    } catch (x) {
      const why = x instanceof SelfieError ? x.reason : "network";
      setSelfieMsg(why === "none" || why === "unreadable" || why === "invalid" ? "faceNone" : why === "many" ? "faceMany" : why === "small" ? "faceSmall" : why === "busy" ? "selfieBusy" : "selfieFail");
    } finally {
      setBusy("");
    }
  };

  const openCamera = async () => {
    setSelfieMsg("");
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 960 } }, audio: false });
      stream.current = s;
      setCamera(true);
      requestAnimationFrame(() => { if (video.current) { video.current.srcObject = s; void video.current.play(); } });
    } catch {
      setSelfieMsg("cameraDenied");
    }
  };
  const snap = async () => {
    const v = video.current;
    if (!v || !v.videoWidth) return;
    const c = document.createElement("canvas");
    c.width = v.videoWidth; c.height = v.videoHeight;
    c.getContext("2d")!.drawImage(v, 0, 0);
    stopCamera();
    await addSelfieFrom(c);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err: typeof errors = {};
    if (name.trim().length < 2) err.name = "errName";
    if (phone.replace(/\D/g, "").length < 8) err.phone = "errPhone";
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) err.email = "errEmail";
    if (!selfies.length) err.selfie = "errSelfie";
    if (!consent) err.consent = "errConsent";
    setErrors(err);
    if (Object.keys(err).length) return;
    setBusy("save");
    try {
      const r = await guestApi.register({ name: name.trim(), phone: phone.trim(), email: email.trim() || undefined, consent: true, tickets: selfies.map((s) => s.ticket) });
      saveToken(r.token);
      setDone({ token: r.token, photos: r.photos });
    } catch (x) {
      if ((x as { status?: number }).status === 400 && /face|selfie/i.test((x as Error).message)) { setSelfies([]); setSelfieMsg("selfieExpired"); }
      else setErrors({ server: "errServer" });
    } finally {
      setBusy("");
    }
  };

  const copy = async (text: string) => {
    try { await navigator.clipboard.writeText(text); setCopied(true); window.setTimeout(() => setCopied(false), 2200); } catch { /* ignore */ }
  };

  if (done) {
    const link = myPhotosUrl(done.token);
    return (
      <Shell>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="card mt-6 p-6 text-center">
          <Check className="mx-auto text-leaf" size={40} aria-hidden />
          <h1 className="script mt-2 text-[2.6rem] leading-tight">{p("doneTitle")}</h1>
          <p className="mt-2 text-[1.05rem] leading-relaxed">{p("doneText")}</p>
          {done.photos > 0 && <p className="mt-3 font-semibold text-accent">{p("doneFound", { n: done.photos })}</p>}
          <p className="mt-4 break-all rounded-lg bg-white/70 p-3 text-[0.82rem] text-ink/70">{link}</p>
          <div className="mt-4 flex flex-col gap-3">
            <a href={link} className="btn btn-maroon">{p("viewMyPhotos")}</a>
            <button type="button" className="btn btn-ghost" onClick={() => copy(link)}>{copied ? <><Check size={16} aria-hidden /> {p("linkCopied")}</> : p("copyLink")}</button>
            <a className="btn btn-ghost" target="_blank" rel="noopener noreferrer" href={`https://wa.me/?text=${encodeURIComponent(link)}`}>{p("whatsappMe")}</a>
          </div>
        </motion.div>
      </Shell>
    );
  }

  const fieldErr = (k: keyof typeof errors) => errors[k] && <p className="mt-1 text-sm text-[#b4412f]" role="alert">{p(errors[k]!)}</p>;
  const busyText = busy === "check" ? p("checking") : "";

  return (
    <Shell>
      <h1 className="script mt-3 text-center text-[2.7rem] leading-tight">{p("title")}</h1>
      <p className="mx-auto mt-2 max-w-sm text-center text-[1.05rem] leading-relaxed text-ink/85">{p("intro")}</p>

      {existing && (
        <a href={`/photos/me`} className="btn btn-ghost mt-5 w-full">{p("viewMyPhotos")}</a>
      )}

      <form onSubmit={submit} noValidate className="card mt-6 space-y-5 p-5">
        <div>
          <label htmlFor="g-name" className="heading mb-1 block text-[1.02rem] font-semibold">{p("yourName")}</label>
          <input id="g-name" className="field" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} aria-invalid={!!errors.name || undefined} />
          {fieldErr("name")}
        </div>
        <div>
          <label htmlFor="g-phone" className="heading mb-1 block text-[1.02rem] font-semibold">{p("phone")}</label>
          <input id="g-phone" className="field" type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} aria-invalid={!!errors.phone || undefined} />
          <p className="mt-1 text-[0.85rem] text-ink/60">{p("phoneHelp")}</p>
          {fieldErr("phone")}
        </div>
        <div>
          <label htmlFor="g-email" className="heading mb-1 block text-[1.02rem] font-semibold">{p("email")}</label>
          <input id="g-email" className="field" type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          {fieldErr("email")}
        </div>

        <fieldset>
          <legend className="heading mb-1 block text-[1.02rem] font-semibold">{p("selfieTitle")}</legend>
          <p className="text-[0.92rem] text-ink/70">{p("selfieHelp")}</p>

          {camera ? (
            <div className="mt-3">
              <video ref={video} playsInline muted className="aspect-[3/4] w-full -scale-x-100 rounded-xl bg-black object-cover" />
              <div className="mt-3 grid grid-cols-2 gap-3">
                <button type="button" className="btn btn-maroon" onClick={snap}><Camera size={16} aria-hidden /> {p("capture")}</button>
                <button type="button" className="btn btn-ghost" onClick={stopCamera}>{p("cancel")}</button>
              </div>
            </div>
          ) : (
            selfies.length < 3 && (
              <div className="mt-3 grid gap-3">
                <button type="button" className="btn btn-ghost" onClick={openCamera} disabled={!!busy}><Camera size={16} aria-hidden /> {selfies.length ? p("addAnother") : p("openCamera")}</button>
                <label className={`btn btn-ghost cursor-pointer ${busy ? "pointer-events-none opacity-60" : ""}`}>
                  <Upload size={16} aria-hidden /> {p("uploadSelfie")}
                  <input type="file" accept="image/*" capture="user" className="sr-only" disabled={!!busy}
                    onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void addSelfieFrom(f); }} />
                </label>
              </div>
            )
          )}

          {busyText && <p className="mt-3 flex items-center gap-2 text-[0.95rem] text-ink/75" role="status"><Loader2 size={16} className="animate-spin" aria-hidden /> {busyText}</p>}
          {selfieMsg && <p className="mt-3 rounded-lg bg-[#fbe4df] p-3 text-sm text-[#8a2a1c]" role="alert">{p(selfieMsg)}</p>}
          {selfies.length > 0 && (
            <ul className="mt-3 flex gap-3">
              {selfies.map((s, i) => (
                <li key={i} className="relative">
                  <img src={s.preview} alt="" className="h-20 w-16 rounded-lg border-2 border-white object-cover shadow" />
                  <Check size={14} className="absolute bottom-1 left-1 rounded-full bg-leaf p-0.5 text-white" aria-hidden />
                  <button type="button" aria-label={p("remove")} onClick={() => setSelfies((x) => x.filter((_, j) => j !== i))}
                    className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-ink text-white"><X size={12} /></button>
                </li>
              ))}
            </ul>
          )}
          {fieldErr("selfie")}
        </fieldset>

        <div>
          <label className="flex cursor-pointer items-start gap-3">
            <input type="checkbox" className="mt-1 h-5 w-5 shrink-0 accent-[var(--w-button)]" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            <span className="text-[0.92rem] leading-snug text-ink/85">{p("consent", { days: RETENTION_DAYS })}</span>
          </label>
          {fieldErr("consent")}
        </div>

        {errors.server && <p className="rounded-lg bg-[#fbe4df] p-3 text-sm text-[#8a2a1c]" role="alert">{p("errServer")}</p>}
        <button type="submit" className="btn btn-maroon w-full" disabled={busy === "save" || !!busyText}>
          {busy === "save" ? <><Loader2 size={16} className="animate-spin" aria-hidden /> {p("saving")}</> : p("submit")}
        </button>
        <p className="text-center text-[0.82rem] italic text-ink/60">{p("privacy")}</p>
      </form>
    </Shell>
  );
}

function MyPhotos() {
  const p = useP();
  const token = new URLSearchParams(window.location.search).get("t") || savedToken() || "";
  const [name, setName] = useState("");
  const [photos, setPhotos] = useState<GuestPhoto[] | null>(null);
  const [processing, setProcessing] = useState(0);
  const [legacy, setLegacy] = useState(false);
  const [state, setState] = useState<"loading" | "ok" | "invalid" | "error" | "deleted">(token ? "loading" : "invalid");
  const [open, setOpen] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const [me, res] = await Promise.all([guestApi.me(token), guestApi.photos(token)]);
      saveToken(token);
      setName(me.name); setPhotos(res.photos); setProcessing(res.pending); setLegacy(!!res.legacy); setState("ok");
    } catch (x) {
      // a missing link (404) is final; anything else (offline, server busy) can be retried, and photos already on screen stay
      if ((x as { status?: number }).status === 404) setState("invalid");
      else setState((s) => (s === "ok" ? s : "error"));
    }
  }, [token]);
  useEffect(() => {
    void load();
    const t = window.setInterval(() => { if (document.visibilityState === "visible") void load(); }, 30_000); // new photos appear without a refresh
    return () => window.clearInterval(t);
  }, [load]);

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
      if (e.key === "ArrowRight") setOpen((i) => (i === null || !photos ? i : (i + 1) % photos.length));
      if (e.key === "ArrowLeft") setOpen((i) => (i === null || !photos ? i : (i - 1 + photos.length) % photos.length));
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [open, photos]);

  const remove = async () => {
    if (!window.confirm(p("deleteConfirm"))) return;
    try { await guestApi.remove(token); } catch { /* already gone */ }
    forgetToken();
    setState("deleted");
  };

  if (state === "loading") return <Shell><p className="mt-10 text-center"><Loader2 className="mx-auto animate-spin text-gold" aria-label="Loading" /></p></Shell>;
  if (state === "error")
    return (
      <Shell>
        <div className="card mt-8 p-6 text-center" role="alert">
          <p className="text-[1.05rem]">{p("loadError")}</p>
          <button type="button" className="btn btn-maroon mt-4" onClick={() => { setState("loading"); void load(); }}>{p("retry")}</button>
        </div>
      </Shell>
    );
  if (state === "invalid" || state === "deleted")
    return (
      <Shell>
        <div className="card mt-8 p-6 text-center">
          <p className="text-[1.05rem]">{state === "deleted" ? p("deleted") : p("invalidLink")}</p>
          <a href="/photos" className="btn btn-maroon mt-4">{p("registerAgain")}</a>
        </div>
      </Shell>
    );

  const list = photos ?? [];
  const cur = open !== null ? list[open] : null;
  return (
    <Shell>
      <h1 className="script mt-3 text-center text-[2.6rem] leading-tight">{p("myPhotos")}</h1>
      <p className="text-center text-[1.05rem] text-ink/80">{name}{list.length > 0 ? ` · ${p("found", { n: list.length })}` : ""}</p>

      {list.length === 0 ? (
        <div className="card mt-6 p-6 text-center text-[1.05rem] leading-relaxed" role="status">
          <p>{legacy ? p("legacy") : p("noMatch")}</p>
          <a href="/photos" className="btn btn-ghost mt-4">{legacy ? p("registerAgain") : p("tryClearer")}</a>
        </div>
      ) : (
        <ul className="mt-6 grid grid-cols-2 gap-3">
          {list.map((ph, i) => (
            <li key={ph.id}>
              <button type="button" onClick={() => setOpen(i)} className="relative block aspect-[4/5] w-full overflow-hidden rounded-xl bg-white shadow-md" aria-label={`${p("myPhotos")} ${i + 1}`}>
                <img src={ph.thumb} alt="" loading="lazy" className="h-full w-full object-cover transition duration-500 hover:scale-105"
                  onError={(e) => { e.currentTarget.style.visibility = "hidden"; e.currentTarget.parentElement?.setAttribute("title", p("photoFailed")); }} />
                {!ph.manual && <span className="absolute bottom-1.5 left-1.5 rounded-full bg-white/85 px-2 py-0.5 text-[0.7rem] text-accent shadow-sm">{p("matchStrength", { n: ph.confidence })}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}

      {processing > 0 && <p className="mt-5 text-center text-[0.95rem] text-ink/70" role="status">{p("processing", { n: processing })}</p>}
      <button type="button" onClick={remove} className="mx-auto mt-10 flex min-h-[44px] items-center gap-2 text-[0.92rem] text-ink/60 underline underline-offset-4">
        <Trash2 size={14} aria-hidden /> {p("deleteData")}
      </button>

      {cur && (
        <div role="dialog" aria-modal="true" aria-label={p("myPhotos")} className="fixed inset-0 z-[60] flex flex-col bg-[#1d1611]/95" onClick={() => setOpen(null)}>
          <div className="flex items-center justify-between p-3" onClick={(e) => e.stopPropagation()}>
            <a href={cur.download} download className="btn btn-maroon !min-h-[44px]"><Download size={16} aria-hidden /> {p("download")}</a>
            <button type="button" onClick={() => setOpen(null)} aria-label={p("close")} className="grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white"><X /></button>
          </div>
          <div className="relative flex min-h-0 flex-1 items-center justify-center p-3">
            <img src={cur.full} alt="" className="max-h-full max-w-full rounded-lg object-contain" onClick={(e) => e.stopPropagation()} />
            {list.length > 1 && (
              <>
                <button type="button" aria-label={p("prev")} onClick={(e) => { e.stopPropagation(); setOpen((open! - 1 + list.length) % list.length); }} className="absolute left-2 grid h-11 w-11 place-items-center rounded-full bg-white/15 text-white"><ChevronLeft /></button>
                <button type="button" aria-label={p("next")} onClick={(e) => { e.stopPropagation(); setOpen((open! + 1) % list.length); }} className="absolute right-2 grid h-11 w-11 place-items-center rounded-full bg-white/15 text-white"><ChevronRight /></button>
              </>
            )}
          </div>
        </div>
      )}
    </Shell>
  );
}

export default function GuestApp() {
  const isMine = window.location.pathname.replace(/\/+$/, "").endsWith("/photos/me");
  void wedding;
  return (
    <LangProvider>
      {isMine ? <MyPhotos /> : <Register />}
    </LangProvider>
  );
}
