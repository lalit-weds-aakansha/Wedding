import { AlertTriangle, Check, Loader2, Pause, Play, RefreshCw, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { adminApi, Diagnostics, DriveStatus } from "./api";

type Api = ReturnType<typeof adminApi>;
const panel = "rounded-xl border border-gold/35 bg-white/70 p-4 shadow-sm";

/**
 * Google Drive source for the photographer's folder. The server lists the folder, tracks which images are new or changed, and a
 * background indexer on the server finds the faces (once per image). This page only shows progress, so it can be closed.
 */
export function DriveTab({ api, onChange }: { api: Api; onChange: () => void }) {
  const [st, setSt] = useState<DriveStatus | null>(null);
  const [diag, setDiag] = useState<Diagnostics | null>(null);
  const [folder, setFolder] = useState("");
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [busy, setBusy] = useState<"" | "save" | "verify" | "sync" | "retry">("");

  const load = useCallback(async () => {
    try {
      const [s, d] = await Promise.all([api.driveStatus(), api.diagnostics()]);
      setSt(s); setDiag(d); setFolder((f) => f || s.folder);
    } catch (x) { setMsg({ kind: "err", text: (x as Error).message }); }
  }, [api]);
  useEffect(() => {
    void load();
    const t = window.setInterval(() => { if (document.visibilityState === "visible") { void load(); onChange(); } }, 3000);
    return () => window.clearInterval(t);
  }, [load, onChange]);

  const guard = async (kind: typeof busy, fn: () => Promise<string>) => {
    setBusy(kind); setMsg(null);
    try { setMsg({ kind: "ok", text: await fn() }); } catch (x) { setMsg({ kind: "err", text: (x as Error).message }); }
    setBusy(""); void load(); onChange();
  };

  const clear = async (what: "index" | "guests" | "all", label: string) => {
    if (window.prompt(`${label}\n\nThis cannot be undone. Type DELETE to confirm.`) !== "DELETE") return;
    await guard("", async () => { await api.clear(what); return "Done."; });
  };

  if (!st || !diag) return <p className="text-sm">{msg ? msg.text : "Loading…"}</p>;
  const done = st.indexed + st.failed;
  const pct = st.total ? Math.round((done / st.total) * 100) : 0;
  const working = st.pending > 0 && !st.indexer.paused;

  return (
    <div className="space-y-5">
      <section className={panel}>
        <h2 className="heading text-xl font-semibold">Google Drive folder</h2>
        {!st.credentials ? (
          <div className="mt-2 flex gap-2 rounded-lg bg-[#f6e3d6] p-3 text-sm" role="status">
            <AlertTriangle size={18} className="mt-0.5 shrink-0" aria-hidden />
            <p>Google Drive is not connected yet. Add a service-account key to the server (<code>GOOGLE_SERVICE_ACCOUNT_FILE</code>) and restart it. The steps are in the README under “Google Drive”. Nothing below works until then.</p>
          </div>
        ) : (
          <p className="mt-2 text-sm text-ink/75">
            Share your photographer’s folder with <strong className="break-all">{st.serviceAccount}</strong> (Viewer). A “anyone with the link” share is <em>not</em> enough for the API.
          </p>
        )}
        <form className="mt-3 flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); void guard("save", async () => { const r = await api.driveSetFolder(folder); return `Connected to “${r.name}”. Now press Refresh.`; }); }}>
          <label className="min-w-[14rem] flex-1 text-sm">Folder link or ID
            <input className="field mt-1" value={folder} onChange={(e) => setFolder(e.target.value)} placeholder="https://drive.google.com/drive/folders/…" disabled={!st.credentials} />
          </label>
          <button className="btn btn-maroon self-end" disabled={!st.credentials || !folder.trim() || busy !== ""} type="submit">
            {busy === "save" ? <Loader2 size={16} className="animate-spin" aria-hidden /> : null} Save &amp; verify
          </button>
        </form>
        {st.folder && <p className="mt-2 text-sm text-ink/70">Current folder: <strong>{st.folderName || st.folder}</strong></p>}
        {msg && <p className={`mt-3 text-sm ${msg.kind === "err" ? "text-[#b4412f]" : "text-[#4f6b3f]"}`} role={msg.kind === "err" ? "alert" : "status"}>{msg.text}</p>}
      </section>

      <section className={panel}>
        <h2 className="heading text-xl font-semibold">Indexing</h2>
        <p className="mt-1 text-sm text-ink/70">
          “Refresh” reads the folder (including sub-folders) and queues new or changed photos. The server then finds the faces in each photo once, in the background; you can close this page.
          A photo only takes part in matching after it is indexed.
        </p>
        <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {([["In Drive", st.total], ["Indexed", st.indexed], ["Waiting", st.pending], ["Failed", st.failed]] as const).map(([k, v]) => (
            <div key={k} className="rounded-lg border border-gold/25 bg-white/60 p-3"><dt className="text-xs uppercase tracking-wider text-ink/60">{k}</dt><dd className="heading text-2xl font-semibold text-accent">{v}</dd></div>
          ))}
        </dl>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-gold/20" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Indexing progress">
          <div className="h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-2 flex items-center gap-2 text-xs text-ink/65" aria-live="polite">
          {working && <Loader2 size={13} className="animate-spin" aria-hidden />}
          {st.indexer.paused ? "Indexing is paused." : working ? `Finding faces… ${st.pending} waiting.` : "Indexer idle."}
          {st.lastSync.at && <> Last refresh {new Date(st.lastSync.at).toLocaleTimeString()}: {st.lastSync.added} new, {st.lastSync.changed} changed, {st.lastSync.removed} removed.</>}
          {st.lastSync.truncated && " The folder has more photos than the safety limit; only the first batch was read."}
        </p>
        {st.lastSync.error && <p className="mt-2 text-sm text-[#b4412f]" role="alert">Last refresh failed: {st.lastSync.error}</p>}
        <div className="mt-3 flex flex-wrap gap-2">
          <button className="btn btn-ghost !min-h-[44px]" disabled={!st.folder || busy !== ""} onClick={() => void guard("sync", async () => { const r = await api.driveSync(); return `Refreshed: ${r.added} new, ${r.changed} changed, ${r.removed} removed.`; })}>
            {busy === "sync" ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <RefreshCw size={16} aria-hidden />} Refresh from Drive
          </button>
          <button className="btn btn-ghost !min-h-[44px]" disabled={!st.folder || busy !== ""} onClick={() => void guard("verify", async () => { const r = await api.driveVerify(); return `Folder “${r.name}” is reachable.`; })}>
            <Check size={16} aria-hidden /> Check access
          </button>
          {st.failed > 0 && (
            <button className="btn btn-ghost !min-h-[44px]" disabled={busy !== ""} onClick={() => void guard("retry", async () => { const r = await api.retryFailed(); return `${r.requeued} failed photo(s) queued again.`; })}>
              <RefreshCw size={16} aria-hidden /> Retry {st.failed} failed
            </button>
          )}
          <button className="btn btn-ghost !min-h-[44px]" onClick={() => void guard("", async () => { await api.indexer(st.indexer.paused ? "resume" : "pause"); return st.indexer.paused ? "Indexing resumed." : "Indexing paused."; })}>
            {st.indexer.paused ? <><Play size={16} aria-hidden /> Resume indexing</> : <><Pause size={16} aria-hidden /> Pause indexing</>}
          </button>
        </div>
        {st.autoSyncMinutes > 0 && <p className="mt-2 text-xs text-ink/65">The server also refreshes the folder list every {st.autoSyncMinutes} minutes.</p>}
      </section>

      <section className={panel}>
        <h2 className="heading text-xl font-semibold">Diagnostics</h2>
        <p className="mt-1 text-sm text-ink/70">
          Face model <code className="break-all">{diag.model}</code>. Match distance limit {diag.threshold.toFixed(2)}; faces narrower than {diag.minFacePx}px are not indexed.
        </p>
        <ul className="mt-2 text-sm text-ink/80">
          <li>Drive images discovered: {diag.drive.discovered} (indexed {diag.drive.indexed}, waiting {diag.drive.pending}, failed {diag.drive.failed})</li>
          <li>Faces found: {diag.faces.total} · photos with 0 / 1 / 2 / 3+ faces: {diag.faces.photosByFaceCount["0"]} / {diag.faces.photosByFaceCount["1"]} / {diag.faces.photosByFaceCount["2"]} / {diag.faces.photosByFaceCount["3+"]}</li>
        </ul>
        {diag.failures.length > 0 && (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[420px] text-left text-sm">
              <thead className="text-xs uppercase tracking-wider text-ink/60"><tr><th className="py-1">Failed photo</th><th>Reason</th></tr></thead>
              <tbody className="divide-y divide-gold/20">
                {diag.failures.map((f) => <tr key={f.id}><td className="py-1 pr-3">{f.drive_path || `#${f.id}`}</td><td>{f.error}</td></tr>)}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-2 text-xs text-ink/60">Open the Guests tab and press “Why?” next to a guest to see every candidate photo, its distance and the decision. Face data itself is never shown.</p>
      </section>

      <section className={panel}>
        <h2 className="heading text-xl font-semibold">Clear stored data</h2>
        <p className="mt-1 text-sm text-ink/70">Photos stay in Drive; this only removes what this server stores. Each button asks you to type DELETE.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button className="btn btn-ghost !min-h-[44px]" onClick={() => void clear("index", "Remove the photo index (face data and matches).")}><Trash2 size={16} aria-hidden /> Clear photo index</button>
          <button className="btn btn-ghost !min-h-[44px]" onClick={() => void clear("guests", "Remove every guest registration (names, numbers, face templates).")}><Trash2 size={16} aria-hidden /> Clear all guests</button>
          <button className="btn btn-ghost !min-h-[44px] !text-[#b4412f]" onClick={() => void clear("all", "Remove everything, including the saved Drive folder.")}><Trash2 size={16} aria-hidden /> Clear everything</button>
        </div>
      </section>
    </div>
  );
}
