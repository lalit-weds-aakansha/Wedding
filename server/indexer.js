/**
 * Background photo indexer. One photo at a time (the face model is CPU/WASM), so a big folder never starves the web server.
 *
 * A photo is only ever used for matching once it reaches status "indexed" with the current model version. The states:
 *   pending  - waiting to be processed (new, changed, or being retried)
 *   indexed  - faces found (possibly zero) and stored. "0 faces" is a valid result, not a failure
 *   failed   - could not be read or analysed; `error` says why. Failed photos are never matched; "Retry" puts them back in the queue
 * Temporary problems (Google busy, network) are retried automatically with backoff; permanent ones (not found, not an image) fail at once.
 */
import fs from "node:fs";
import path from "node:path";

const MAX_ATTEMPTS = 3;
const MAX_BYTES = 60 * 1024 * 1024;

export function createIndexer({ db, drive, photosDir, analysePhoto, makeThumb, modelVersion, onIndexed, log = console.log }) {
  let running = false;
  let paused = false;
  let current = null;
  let timer = null;

  const next = () => db.prepare("SELECT * FROM photos WHERE status = 'pending' AND (retry_at IS NULL OR retry_at <= ?) ORDER BY id LIMIT 1").get(new Date().toISOString());

  async function load(p) {
    if (p.drive_id) {
      const res = await drive.fetchImage(p.drive_id);
      const type = res.headers.get("content-type") || "";
      if (!type.startsWith("image/")) throw Object.assign(new Error("Drive did not return an image (the file may be restricted)."), { permanent: true });
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length > MAX_BYTES) throw Object.assign(new Error("Image is larger than 60 MB."), { permanent: true });
      return buf;
    }
    return fs.promises.readFile(path.join(photosDir, p.file));
  }

  function classify(e) {
    if (e?.permanent) return { retry: false, reason: e.message };
    if (e?.code === "transient" || e?.code === "auth" || e?.cause || e?.name === "TypeError") return { retry: true, reason: e.message || "Temporary network problem." };
    if (e?.code && e.message) return { retry: false, reason: e.message }; // not-found / forbidden / bad-id from Drive: actionable text
    return { retry: false, reason: "The file is not a readable image." };
  }

  async function processOne(p) {
    const t0 = Date.now();
    current = p.id;
    try {
      const buf = await load(p);
      const r = await analysePhoto(buf);
      if (!p.drive_id && !p.thumb) {
        const thumb = `${path.parse(p.file).name}-t.jpg`;
        fs.writeFileSync(path.join(photosDir, thumb), await makeThumb(buf));
        db.prepare("UPDATE photos SET thumb = ? WHERE id = ?").run(thumb, p.id);
      }
      db.prepare("DELETE FROM matches WHERE photo_id = ? AND source = 'auto'").run(p.id);
      db.prepare("UPDATE photos SET faces = ?, model = ?, status = 'indexed', error = NULL, attempts = 0, retry_at = NULL, indexed_at = ? WHERE id = ?")
        .run(JSON.stringify(r.faces), modelVersion, new Date().toISOString(), p.id);
      const n = onIndexed(p.id);
      log(`[index] photo=${p.id}${p.drive_id ? ` drive=${p.drive_id}` : ""} status=indexed faces=${r.faces.length} detected=${r.detected} skippedSmall=${r.skippedSmall} newMatches=${n} ms=${Date.now() - t0}`);
    } catch (e) {
      const c = classify(e);
      const attempts = (p.attempts || 0) + 1;
      if (c.retry && attempts < MAX_ATTEMPTS) {
        const at = new Date(Date.now() + 30_000 * 2 ** attempts).toISOString();
        db.prepare("UPDATE photos SET attempts = ?, retry_at = ?, error = ? WHERE id = ?").run(attempts, at, c.reason, p.id);
        log(`[index] photo=${p.id}${p.drive_id ? ` drive=${p.drive_id}` : ""} status=retry attempt=${attempts} reason="${c.reason}"`);
      } else {
        db.prepare("UPDATE photos SET status = 'failed', attempts = ?, retry_at = NULL, error = ? WHERE id = ?").run(attempts, c.reason, p.id);
        log(`[index] photo=${p.id}${p.drive_id ? ` drive=${p.drive_id}` : ""} status=failed reason="${c.reason}"`);
      }
    } finally { current = null; }
  }

  async function loop() {
    if (running || paused) return;
    running = true;
    try {
      for (let p = next(); p && !paused; p = next()) await processOne(p);
    } finally { running = false; }
    const waiting = db.prepare("SELECT MIN(retry_at) t FROM photos WHERE status = 'pending' AND retry_at IS NOT NULL").get().t;
    if (waiting && !paused) { clearTimeout(timer); timer = setTimeout(kick, Math.max(1000, new Date(waiting) - Date.now() + 500)); timer.unref?.(); }
  }

  function kick() { void loop(); }
  return {
    kick,
    pause() { paused = true; },
    resume() { paused = false; kick(); },
    /** Put failed photos back in the queue (safe to call repeatedly). */
    retryFailed() {
      const n = db.prepare("UPDATE photos SET status = 'pending', attempts = 0, retry_at = NULL, error = NULL WHERE status = 'failed'").run().changes;
      kick(); return Number(n);
    },
    state: () => ({ running, paused, current }),
    idle: () => !running && !next(),
  };
}
