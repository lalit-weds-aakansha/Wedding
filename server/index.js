/**
 * Wedding photo delivery server.
 *
 *   guest: selfie (processed in memory, never stored) -> one face template -> private link -> sees ONLY photos where a face matched
 *   photographer: photos come from a Google Drive folder (or manual upload) -> background indexer finds every face with the same
 *   model used for selfies -> matching happens here, on the server, before anything is returned to a browser.
 *
 * Run:  ADMIN_PASSWORD=choose-a-strong-one node server/index.js
 * Also serves the built website (dist/) so one deployment hosts everything.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import express from "express";
import sharp from "sharp";
import * as drive from "./drive.js";
import { analysePhoto, analyseSelfie, euclid, makeThumb, MIN_FACE_PX, MODEL_VERSION } from "./faces.js";
import { createIndexer } from "./indexer.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const DATA = process.env.DATA_DIR || path.join(here, "data");
const PHOTOS = path.join(DATA, "photos");
fs.mkdirSync(PHOTOS, { recursive: true });

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";
/**
 * Euclidean distance between two 128-d embeddings; a photo matches when ANY face in it is at or under this distance.
 * Calibrated on labelled faces with this exact model: different people were never closer than ~0.46, same person is
 * usually below 0.5, so 0.44 is precision-first (0 false matches in calibration, ~73% of same-person face pairs found).
 * Lower = stricter. See README "Calibration" before changing it.
 */
const DEFAULT_THRESHOLD = 0.44;
let threshold = Number(process.env.MATCH_THRESHOLD || DEFAULT_THRESHOLD);
const RETENTION_DAYS = Number(process.env.RETENTION_DAYS || 90);
const QUIET = process.env.QUIET === "1";
const log = (...a) => { if (!QUIET) console.log(...a); };
const EXPERIMENTAL = process.emitWarning;
process.emitWarning = (w, ...a) => (String(w).includes("SQLite") ? undefined : EXPERIMENTAL.call(process, w, ...a));

const db = new DatabaseSync(path.join(DATA, "app.db"));
db.exec(`
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS guests (
    id INTEGER PRIMARY KEY AUTOINCREMENT, token TEXT UNIQUE NOT NULL, name TEXT NOT NULL, phone TEXT NOT NULL, email TEXT,
    descriptors TEXT NOT NULL, consent_at TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')));
  CREATE TABLE IF NOT EXISTS photos (
    id INTEGER PRIMARY KEY AUTOINCREMENT, file TEXT NOT NULL, thumb TEXT, faces TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL DEFAULT (datetime('now')));
  CREATE TABLE IF NOT EXISTS matches (
    guest_id INTEGER NOT NULL, photo_id INTEGER NOT NULL, distance REAL, source TEXT NOT NULL,
    PRIMARY KEY (guest_id, photo_id));
  CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
`);
// columns added over time are applied in place so an existing database keeps working
for (const col of ["drive_id TEXT", "drive_version TEXT", "drive_path TEXT", "status TEXT NOT NULL DEFAULT 'pending'", "error TEXT", "indexed_at TEXT", "model TEXT", "attempts INTEGER NOT NULL DEFAULT 0", "retry_at TEXT"]) {
  try { db.exec(`ALTER TABLE photos ADD COLUMN ${col}`); } catch { /* already there */ }
}
try { db.exec("ALTER TABLE guests ADD COLUMN model TEXT"); } catch { /* already there */ }
db.exec("CREATE UNIQUE INDEX IF NOT EXISTS photos_drive_id ON photos(drive_id) WHERE drive_id IS NOT NULL");
// Photos indexed before model versioning (browser-side, older model settings) are not comparable: queue them for re-indexing.
db.prepare("UPDATE photos SET status = 'pending' WHERE status = 'indexed' AND (model IS NULL OR model != ?)").run(MODEL_VERSION);

const getSetting = (k) => db.prepare("SELECT value FROM settings WHERE key = ?").get(k)?.value;
const putSetting = (k, v) => db.prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(k, String(v));
if (!process.env.MATCH_THRESHOLD && getSetting("threshold_v2")) threshold = Number(getSetting("threshold_v2"));

/* ---------------- helpers ---------------- */
const now = () => new Date().toISOString();
const isDescriptor = (d) => Array.isArray(d) && d.length === 128 && d.every((n) => typeof n === "number" && Number.isFinite(n));
const safeEq = (a, b) => { const x = Buffer.from(String(a)); const y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y); };
const cleanPhone = (p) => String(p || "").replace(/[^\d+]/g, "").slice(0, 16);

function bestDistance(guestDescs, faces) {
  let best = Infinity;
  for (const g of guestDescs) for (const f of faces) best = Math.min(best, euclid(g, f));
  return best;
}
const setAuto = db.prepare(`INSERT INTO matches (guest_id, photo_id, distance, source) VALUES (?, ?, ?, 'auto')
  ON CONFLICT(guest_id, photo_id) DO UPDATE SET distance = excluded.distance WHERE matches.source = 'auto'`);

/** Only photos that finished indexing with the current model take part. Pending and failed photos can never match. */
const indexedPhotos = () => db.prepare("SELECT id, faces FROM photos WHERE status = 'indexed' AND model = ?").all(MODEL_VERSION);

/** Guests registered before selfies were analysed on the server have templates of unknown quality: they are never matched, they must register again. */
const isCurrent = (g) => g.model === MODEL_VERSION;

/** Every candidate for one guest with its distance and decision (no embeddings leave this function). */
function evaluateGuest(g) {
  if (!isCurrent(g)) return [];
  const descs = JSON.parse(g.descriptors);
  const out = [];
  for (const p of indexedPhotos()) {
    const faces = JSON.parse(p.faces);
    if (!faces.length) continue;
    const d = bestDistance(descs, faces);
    out.push({ photoId: p.id, faces: faces.length, distance: d, passed: d <= threshold });
  }
  return out.sort((a, b) => a.distance - b.distance);
}
function matchGuest(g) {
  const cands = evaluateGuest(g);
  let n = 0;
  for (const c of cands) if (c.passed) { setAuto.run(g.id, c.photoId, c.distance); n++; }
  log(`[match] guest=${g.id} threshold=${threshold} indexedPhotos=${indexedPhotos().length} withFaces=${cands.length} passed=${n} nearestRejected=${cands.filter((c) => !c.passed).slice(0, 3).map((c) => c.distance.toFixed(2)).join(",") || "-"} best=${cands.slice(0, 3).map((c) => c.distance.toFixed(2)).join(",") || "-"}`);
  return n;
}
function matchPhoto(photoId) {
  const p = db.prepare("SELECT faces FROM photos WHERE id = ? AND status = 'indexed' AND model = ?").get(photoId, MODEL_VERSION);
  if (!p) return 0;
  const faces = JSON.parse(p.faces);
  let n = 0;
  if (!faces.length) return 0;
  for (const g of db.prepare("SELECT id, descriptors FROM guests WHERE model = ?").all(MODEL_VERSION)) {
    const d = bestDistance(JSON.parse(g.descriptors), faces);
    if (d <= threshold) { setAuto.run(g.id, photoId, d); n++; }
  }
  return n;
}
function deletePhotoFiles(p) {
  for (const f of [p.file, p.thumb]) if (f) fs.rm(path.join(PHOTOS, f), { force: true }, () => {});
}
function purgeOld() {
  const old = db.prepare(`SELECT id FROM guests WHERE created_at < datetime('now', ?)`).all(`-${RETENTION_DAYS} days`);
  for (const g of old) { db.prepare("DELETE FROM matches WHERE guest_id = ?").run(g.id); db.prepare("DELETE FROM guests WHERE id = ?").run(g.id); }
  if (old.length) log(`[retention] removed ${old.length} guest record(s) older than ${RETENTION_DAYS} days`);
}
db.prepare("DELETE FROM matches WHERE guest_id IN (SELECT id FROM guests WHERE model IS NULL OR model != ?)").run(MODEL_VERSION);
purgeOld();
setInterval(purgeOld, 6 * 3600 * 1000).unref();

const indexer = createIndexer({ db, drive, photosDir: PHOTOS, analysePhoto, makeThumb, modelVersion: MODEL_VERSION, onIndexed: matchPhoto, log });

/* simple in-memory rate limiter */
const hits = new Map();
function limit(name, max, windowMs) {
  return (req, res, next) => {
    const key = `${name}:${req.ip}`;
    const t = Date.now();
    const arr = (hits.get(key) || []).filter((x) => t - x < windowMs);
    if (arr.length >= max) return res.status(429).json({ error: "Too many attempts. Please wait and try again." });
    arr.push(t); hits.set(key, arr); next();
  };
}

/* ---------------- app ---------------- */
const app = express();
app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer"); // tokens travel in links, so never leak them through the Referer header
  next();
});
app.use(express.json({ limit: "1mb" }));
app.use(express.raw({ type: "image/*", limit: "40mb" }));

/* ---- selfie: analysed in memory and thrown away. Only the 128-number template survives, in a short-lived "ticket". ---- */
const tickets = new Map(); // ticket -> { descriptor, exp }
setInterval(() => { const t = Date.now(); for (const [k, v] of tickets) if (v.exp < t) tickets.delete(k); }, 60_000).unref();
let selfieQueue = 0;
let selfieChain = Promise.resolve();
app.post("/api/selfie", limit("selfie", 40, 3600_000), async (req, res) => {
  if (!Buffer.isBuffer(req.body) || req.body.length < 2000 || req.body.length > 12 * 1024 * 1024) return res.status(400).json({ error: "Please send a photo (JPEG or PNG, under 12 MB).", reason: "invalid" });
  if (selfieQueue >= 8) return res.status(503).json({ error: "We are busy right now. Please try again in a moment.", reason: "busy" });
  const body = req.body;
  selfieQueue++;
  const job = selfieChain.then(() => analyseSelfie(body));
  selfieChain = job.catch(() => {});
  try {
    const r = await job;
    log(`[selfie] faceDetected=${r.ok} ${r.ok ? `score=${r.score.toFixed(2)}` : `reason=${r.reason}`}`);
    if (!r.ok) {
      const msg = { none: "We could not find a face in this photo. Please upload another selfie.", many: "More than one face was found. Please use a photo of just you.", small: "Your face looks too small. Move closer and try again." }[r.reason];
      return res.status(422).json({ error: msg, reason: r.reason });
    }
    const ticket = crypto.randomBytes(18).toString("hex");
    tickets.set(ticket, { descriptor: r.descriptor, exp: Date.now() + 15 * 60_000 });
    res.json({ ticket });
  } catch {
    res.status(422).json({ error: "We could not read that image. Please try a different photo.", reason: "unreadable" });
  } finally { selfieQueue--; }
});
const takeTickets = (list) => {
  if (!Array.isArray(list) || list.length < 1 || list.length > 5) return null;
  const out = [];
  for (const t of list) { const v = tickets.get(String(t)); if (!v || v.exp < Date.now()) return null; out.push(v.descriptor); }
  for (const t of list) tickets.delete(String(t));
  return out;
};

/* ---- guests ---- */
app.post("/api/guests", limit("register", 30, 3600_000), (req, res) => {
  const { name, phone, email, consent, tickets: tk } = req.body || {};
  const n = String(name || "").trim();
  const ph = cleanPhone(phone);
  if (n.length < 2 || n.length > 80) return res.status(400).json({ error: "Please enter your name." });
  if (ph.replace(/\D/g, "").length < 8) return res.status(400).json({ error: "Please enter a valid phone number." });
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email))) return res.status(400).json({ error: "Please enter a valid email or leave it empty." });
  if (consent !== true) return res.status(400).json({ error: "Consent is required to match your photos." });
  const descriptors = takeTickets(tk);
  if (!descriptors || !descriptors.every(isDescriptor)) return res.status(400).json({ error: "We could not find a face in your selfie. Please upload another image.", reason: "no-face" });
  const token = crypto.randomBytes(24).toString("hex");
  const info = db.prepare("INSERT INTO guests (token, name, phone, email, descriptors, consent_at, model) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .run(token, n, ph, email ? String(email).trim() : null, JSON.stringify(descriptors), now(), MODEL_VERSION);
  const guest = db.prepare("SELECT * FROM guests WHERE id = ?").get(Number(info.lastInsertRowid));
  matchGuest(guest);
  const count = db.prepare("SELECT COUNT(*) c FROM matches m JOIN photos p ON p.id = m.photo_id WHERE m.guest_id = ? AND m.source != 'blocked' AND p.status = 'indexed'").get(guest.id).c;
  res.json({ token, name: n, photos: count, pending: pendingCount() });
});

/** A relative "how strong is this match" score for ranking; it is not a probability. */
const confidence = (d) => (d == null ? 100 : Math.max(0, Math.min(100, Math.round((1 - d / (threshold * 1.5)) * 100))));
const pendingCount = () => db.prepare("SELECT COUNT(*) c FROM photos WHERE status = 'pending'").get().c;
const guestByToken = (token) => (token && /^[a-f0-9]{48}$/.test(String(token)) ? db.prepare("SELECT * FROM guests WHERE token = ?").get(String(token)) : undefined);

app.get("/api/me", (req, res) => {
  const g = guestByToken(req.query.token);
  if (!g) return res.status(404).json({ error: "Link not found. It may have expired or been deleted." });
  const count = isCurrent(g) ? db.prepare("SELECT COUNT(*) c FROM matches m JOIN photos p ON p.id = m.photo_id WHERE m.guest_id = ? AND m.source != 'blocked' AND p.status = 'indexed'").get(g.id).c : 0;
  res.json({ name: g.name, photos: count });
});
/** The ONLY gallery data source: photos with a verified face match for this guest. Zero matches = an empty list, never the album. */
app.get("/api/me/photos", (req, res) => {
  const g = guestByToken(req.query.token);
  if (!g) return res.status(404).json({ error: "Link not found." });
  res.setHeader("Cache-Control", "private, no-store");
  if (!isCurrent(g)) return res.json({ photos: [], pending: pendingCount(), legacy: true });
  const rows = db.prepare(`SELECT p.id, m.distance, m.source FROM matches m JOIN photos p ON p.id = m.photo_id
    WHERE m.guest_id = ? AND m.source != 'blocked' AND p.status = 'indexed' ORDER BY (m.distance IS NULL) ASC, m.distance ASC, p.id DESC`).all(g.id);
  const t = encodeURIComponent(g.token);
  res.json({
    photos: rows.map((r) => ({ id: r.id, confidence: confidence(r.distance), manual: r.source === "manual", thumb: `/api/photos/${r.id}/thumb?token=${t}`, full: `/api/photos/${r.id}/file?token=${t}`, download: `/api/photos/${r.id}/file?token=${t}&download=1` })),
    pending: pendingCount(), // photos still being processed: shown as a note, never as images
  });
});
app.delete("/api/me", (req, res) => {
  const g = guestByToken(req.query.token);
  if (!g) return res.status(404).json({ error: "Link not found." });
  db.prepare("DELETE FROM matches WHERE guest_id = ?").run(g.id);
  db.prepare("DELETE FROM guests WHERE id = ?").run(g.id);
  res.json({ ok: true });
});

/* ---- admin auth ---- */
const sessions = new Map(); // session token -> expiry
const adminOk = (s) => !!(s && ADMIN_PASSWORD && (sessions.get(String(s)) ?? 0) > Date.now());
function requireAdmin(req, res, next) {
  if (!ADMIN_PASSWORD) return res.status(503).json({ error: "Admin is disabled: start the server with ADMIN_PASSWORD set." });
  if (!adminOk(req.get("x-admin-session") || req.query.admin)) return res.status(401).json({ error: "Please log in again." });
  next();
}
app.post("/api/admin/login", limit("login", 10, 15 * 60_000), (req, res) => {
  if (!ADMIN_PASSWORD) return res.status(503).json({ error: "Admin is disabled: start the server with ADMIN_PASSWORD set." });
  if (!safeEq(req.body?.password ?? "", ADMIN_PASSWORD)) return res.status(401).json({ error: "Wrong password." });
  const s = crypto.randomBytes(24).toString("hex");
  sessions.set(s, Date.now() + 12 * 3600_000);
  res.json({ session: s });
});

/* ---- photo files: a guest may only fetch photos they are matched to; admin may fetch all ---- */
const MIME = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" };
app.get("/api/photos/:id/:kind", limit("photo", 1500, 3600_000), async (req, res) => {
  if (req.params.kind !== "thumb" && req.params.kind !== "file") return res.status(404).end();
  const id = Number(req.params.id);
  const p = db.prepare("SELECT * FROM photos WHERE id = ?").get(id);
  if (!p) return res.status(404).end();
  let allowed = false;
  if (adminOk(req.query.admin)) allowed = true;
  else {
    const g = guestByToken(req.query.token);
    if (g && isCurrent(g) && p.status === "indexed") allowed = !!db.prepare("SELECT 1 FROM matches WHERE guest_id = ? AND photo_id = ? AND source != 'blocked'").get(g.id, id);
  }
  if (!allowed) return res.status(403).end();
  res.setHeader("Cache-Control", "private, no-store");
  if (req.query.download) res.setHeader("Content-Disposition", `attachment; filename="wedding-photo-${id}.jpg"`);
  if (p.drive_id) { // streamed from Google Drive on demand; nothing is copied to this server
    try {
      const up = await drive.fetchImage(p.drive_id, { thumb: req.params.kind === "thumb" });
      res.setHeader("Content-Type", up.headers.get("content-type") || "image/jpeg");
      return Readable.fromWeb(up.body).on("error", () => res.end()).pipe(res);
    } catch (e) { log(`[photo] drive=${p.drive_id} fetch failed: ${e.code || "error"}`); return res.status(502).end(); }
  }
  const file = req.params.kind === "thumb" ? p.thumb || p.file : p.file;
  res.setHeader("Content-Type", MIME[path.extname(file).toLowerCase()] || "image/jpeg");
  fs.createReadStream(path.join(PHOTOS, file)).on("error", () => res.status(404).end()).pipe(res);
});

/* ---- admin: manually uploaded photos (queued for the same background indexer) ---- */
app.post("/api/admin/photos", requireAdmin, async (req, res) => {
  if (!Buffer.isBuffer(req.body) || req.body.length < 100) return res.status(400).json({ error: "Send the image as the request body." });
  let format;
  try { format = (await sharp(req.body, { failOn: "none" }).metadata()).format; } catch { /* handled below */ }
  if (!["jpeg", "png", "webp"].includes(format)) return res.status(400).json({ error: "That file is not a JPEG, PNG or WebP image." });
  const file = `${crypto.randomUUID()}.${format === "jpeg" ? "jpg" : format}`;
  fs.writeFileSync(path.join(PHOTOS, file), req.body);
  const info = db.prepare("INSERT INTO photos (file, status) VALUES (?, 'pending')").run(file);
  indexer.kick();
  res.json({ id: Number(info.lastInsertRowid) });
});
app.get("/api/admin/photos", requireAdmin, (_req, res) => {
  const rows = db.prepare(`SELECT p.id, p.faces, p.created_at, p.status, p.error, p.drive_path,
      (SELECT COUNT(*) FROM matches m WHERE m.photo_id = p.id AND m.source != 'blocked') AS matches FROM photos p ORDER BY p.id DESC`).all();
  res.json(rows.map((r) => ({ id: r.id, faces: JSON.parse(r.faces).length, matches: r.matches, created_at: r.created_at, status: r.status, error: r.error, path: r.drive_path })));
});
app.delete("/api/admin/photos/:id", requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const p = db.prepare("SELECT * FROM photos WHERE id = ?").get(id);
  if (p) { deletePhotoFiles(p); db.prepare("DELETE FROM matches WHERE photo_id = ?").run(id); db.prepare("DELETE FROM photos WHERE id = ?").run(id); }
  res.json({ ok: true });
});
app.get("/api/admin/photos/:id/guests", requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const matched = db.prepare(`SELECT g.id, g.name, g.phone, m.distance, m.source FROM matches m JOIN guests g ON g.id = m.guest_id
    WHERE m.photo_id = ? AND m.source != 'blocked' ORDER BY m.distance`).all(id);
  const all = db.prepare("SELECT id, name, phone FROM guests ORDER BY name").all();
  res.json({ matched, all });
});
app.post("/api/admin/matches", requireAdmin, (req, res) => {
  const { guestId, photoId } = req.body || {};
  db.prepare(`INSERT INTO matches (guest_id, photo_id, distance, source) VALUES (?, ?, NULL, 'manual')
    ON CONFLICT(guest_id, photo_id) DO UPDATE SET source = 'manual'`).run(Number(guestId), Number(photoId));
  res.json({ ok: true });
});
app.delete("/api/admin/matches", requireAdmin, (req, res) => {
  const { guestId, photoId } = req.body || {};
  // 'blocked' keeps a removed match from coming back when matching is re-run
  db.prepare(`INSERT INTO matches (guest_id, photo_id, distance, source) VALUES (?, ?, NULL, 'blocked')
    ON CONFLICT(guest_id, photo_id) DO UPDATE SET source = 'blocked'`).run(Number(guestId), Number(photoId));
  res.json({ ok: true });
});

/* ---- admin: guests, overview, settings ---- */
app.get("/api/admin/guests", requireAdmin, (_req, res) => {
  res.json(db.prepare(`SELECT g.id, g.name, g.phone, g.email, g.token, g.created_at,
    (SELECT COUNT(*) FROM matches m JOIN photos p ON p.id = m.photo_id WHERE m.guest_id = g.id AND m.source != 'blocked' AND p.status = 'indexed') AS photos FROM guests g ORDER BY g.id DESC`).all());
});
app.delete("/api/admin/guests/:id", requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  db.prepare("DELETE FROM matches WHERE guest_id = ?").run(id);
  db.prepare("DELETE FROM guests WHERE id = ?").run(id);
  res.json({ ok: true });
});
app.get("/api/admin/overview", requireAdmin, (_req, res) => {
  const c = (sql) => db.prepare(sql).get().c;
  res.json({
    guests: c("SELECT COUNT(*) c FROM guests"),
    photos: c("SELECT COUNT(*) c FROM photos"),
    indexed: c("SELECT COUNT(*) c FROM photos WHERE status = 'indexed'"),
    pending: c("SELECT COUNT(*) c FROM photos WHERE status = 'pending'"),
    failed: c("SELECT COUNT(*) c FROM photos WHERE status = 'failed'"),
    matches: c("SELECT COUNT(*) c FROM matches m JOIN photos p ON p.id = m.photo_id WHERE m.source != 'blocked' AND p.status = 'indexed'"),
    guestsWithPhotos: c("SELECT COUNT(DISTINCT m.guest_id) c FROM matches m JOIN photos p ON p.id = m.photo_id WHERE m.source != 'blocked' AND p.status = 'indexed'"),
    threshold, defaultThreshold: DEFAULT_THRESHOLD, retentionDays: RETENTION_DAYS, model: MODEL_VERSION,
  });
});
app.post("/api/admin/rematch", requireAdmin, (req, res) => {
  const t = Number(req.body?.threshold);
  if (!(t >= 0.3 && t <= 0.6)) return res.status(400).json({ error: "Choose a value between 0.30 and 0.60. Above about 0.46, different people start to match." });
  threshold = t; putSetting("threshold_v2", t);
  db.prepare("DELETE FROM matches WHERE source = 'auto'").run();
  for (const g of db.prepare("SELECT * FROM guests").all()) if (isCurrent(g)) matchGuest(g);
  res.json({ threshold, matches: db.prepare("SELECT COUNT(*) c FROM matches WHERE source != 'blocked'").get().c });
});

/* ---- admin: diagnostics (distances and decisions only; embeddings never leave the database) ---- */
app.get("/api/admin/diagnostics", requireAdmin, (_req, res) => {
  const c = (sql, ...a) => db.prepare(sql).get(...a).c;
  const hist = { 0: 0, 1: 0, 2: 0, "3+": 0 };
  let totalFaces = 0;
  for (const p of db.prepare("SELECT faces FROM photos WHERE status = 'indexed'").all()) { const n = JSON.parse(p.faces).length; totalFaces += n; hist[n >= 3 ? "3+" : n]++; }
  res.json({
    model: MODEL_VERSION, threshold, minFacePx: MIN_FACE_PX, indexer: indexer.state(),
    drive: { discovered: c("SELECT COUNT(*) c FROM photos WHERE drive_id IS NOT NULL"), indexed: c("SELECT COUNT(*) c FROM photos WHERE drive_id IS NOT NULL AND status = 'indexed'"),
      pending: c("SELECT COUNT(*) c FROM photos WHERE drive_id IS NOT NULL AND status = 'pending'"), failed: c("SELECT COUNT(*) c FROM photos WHERE drive_id IS NOT NULL AND status = 'failed'"), lastSync },
    uploads: { total: c("SELECT COUNT(*) c FROM photos WHERE drive_id IS NULL"), indexed: c("SELECT COUNT(*) c FROM photos WHERE drive_id IS NULL AND status = 'indexed'"), failed: c("SELECT COUNT(*) c FROM photos WHERE drive_id IS NULL AND status = 'failed'") },
    faces: { total: totalFaces, photosByFaceCount: hist },
    failures: db.prepare("SELECT id, drive_id, drive_path, error, attempts FROM photos WHERE status = 'failed' ORDER BY id DESC LIMIT 50").all(),
  });
});
app.get("/api/admin/guests/:id/diagnostics", requireAdmin, (req, res) => {
  const g = db.prepare("SELECT * FROM guests WHERE id = ?").get(Number(req.params.id));
  if (!g) return res.status(404).json({ error: "Guest not found." });
  const paths = new Map(db.prepare("SELECT id, drive_path FROM photos").all().map((r) => [r.id, r.drive_path]));
  const cands = evaluateGuest(g);
  res.json({
    threshold, model: MODEL_VERSION, templates: JSON.parse(g.descriptors).length, indexedPhotos: indexedPhotos().length, photosWithFaces: cands.length,
    returned: cands.filter((x) => x.passed).length,
    candidates: cands.slice(0, 40).map((x) => ({ photoId: x.photoId, path: paths.get(x.photoId) || null, faces: x.faces, distance: Number(x.distance.toFixed(3)), decision: x.passed ? "match" : "rejected" })),
  });
});

/* ---- admin: Google Drive ---- */
let syncing = false;
let lastSync = { at: null, error: null, added: 0, changed: 0, removed: 0, truncated: false };
const driveFolder = () => getSetting("drive_folder") || process.env.DRIVE_FOLDER_ID || "";
const driveMessage = (e) => (e && e.code ? e.message : "Could not reach Google Drive.");

async function syncDrive() {
  const folder = driveFolder();
  if (!folder) throw Object.assign(new Error("Set the Drive folder first."), { code: "no-folder" });
  const { files, truncated } = await drive.listImages(folder);
  const byId = new Map(db.prepare("SELECT id, drive_id, drive_version FROM photos WHERE drive_id IS NOT NULL").all().map((r) => [r.drive_id, r]));
  let added = 0, changed = 0, removed = 0;
  const ins = db.prepare("INSERT INTO photos (file, faces, drive_id, drive_version, drive_path, status) VALUES ('', '[]', ?, ?, ?, 'pending')");
  const upd = db.prepare("UPDATE photos SET faces = '[]', status = 'pending', error = NULL, attempts = 0, retry_at = NULL, drive_version = ?, drive_path = ?, indexed_at = NULL WHERE id = ?");
  const path_ = db.prepare("UPDATE photos SET drive_path = ? WHERE id = ?");
  for (const f of files) {
    const row = byId.get(f.id);
    if (!row) { ins.run(f.id, f.version, f.path); added++; }
    else if (row.drive_version !== f.version) { // new content: re-index once, and forget matches made from the old image
      upd.run(f.version, f.path, row.id); db.prepare("DELETE FROM matches WHERE photo_id = ? AND source = 'auto'").run(row.id); changed++;
    } else path_.run(f.path, row.id);
    byId.delete(f.id);
  }
  if (!truncated) for (const row of byId.values()) { // gone from Drive (deleted or moved out of the folder)
    db.prepare("DELETE FROM matches WHERE photo_id = ?").run(row.id); db.prepare("DELETE FROM photos WHERE id = ?").run(row.id); removed++;
  }
  lastSync = { at: now(), error: null, added, changed, removed, truncated };
  log(`[drive] folder=${folder} discovered=${files.length} new=${added} changed=${changed} removed=${removed}${truncated ? " truncated" : ""}`);
  indexer.kick();
  return lastSync;
}

app.get("/api/admin/drive/status", requireAdmin, (_req, res) => {
  const c = (s) => db.prepare(`SELECT COUNT(*) c FROM photos WHERE drive_id IS NOT NULL AND ${s}`).get().c;
  res.json({
    credentials: !!drive.serviceAccountEmail(), serviceAccount: drive.serviceAccountEmail(), folder: driveFolder(), folderName: getSetting("drive_folder_name") || null,
    syncing, lastSync, total: c("1=1"), indexed: c("status = 'indexed'"), pending: c("status = 'pending'"), failed: c("status = 'failed'"),
    indexer: indexer.state(), autoSyncMinutes: AUTO_SYNC_MIN,
  });
});
app.post("/api/admin/drive/folder", requireAdmin, async (req, res) => {
  const id = drive.parseFolderId(req.body?.folder);
  if (!id) return res.status(400).json({ error: "Paste a Google Drive folder link or its ID." });
  try {
    const f = await drive.verifyFolder(id);
    if (id !== driveFolder()) { // switching folders: the old Drive photos no longer apply
      for (const r of db.prepare("SELECT id FROM photos WHERE drive_id IS NOT NULL").all()) { db.prepare("DELETE FROM matches WHERE photo_id = ?").run(r.id); db.prepare("DELETE FROM photos WHERE id = ?").run(r.id); }
    }
    putSetting("drive_folder", id); putSetting("drive_folder_name", f.name);
    res.json({ ok: true, folder: id, name: f.name });
  } catch (e) { log(`[drive] folder check failed: ${e.code || "error"}`); res.status(400).json({ error: driveMessage(e), code: e.code || "error" }); }
});
app.post("/api/admin/drive/verify", requireAdmin, async (_req, res) => {
  try { const f = await drive.verifyFolder(driveFolder()); res.json({ ok: true, name: f.name }); }
  catch (e) { res.status(400).json({ error: driveMessage(e), code: e.code || "error" }); }
});
app.post("/api/admin/drive/sync", requireAdmin, limit("sync", 30, 3600_000), async (_req, res) => {
  if (syncing) return res.status(409).json({ error: "A refresh is already running." });
  syncing = true;
  try { res.json(await syncDrive()); }
  catch (e) { lastSync = { ...lastSync, error: driveMessage(e) }; log(`[drive] sync failed: ${e.code || "error"}`); res.status(400).json({ error: driveMessage(e), code: e.code || "error" }); }
  finally { syncing = false; }
});
app.post("/api/admin/indexer/retry", requireAdmin, (_req, res) => res.json({ requeued: indexer.retryFailed() }));
app.post("/api/admin/indexer/:action", requireAdmin, (req, res) => {
  if (req.params.action === "pause") indexer.pause(); else if (req.params.action === "resume") indexer.resume(); else return res.status(404).json({ error: "Not found." });
  res.json(indexer.state());
});
/** Wipe stored data. `what`: index (photo records + matches), guests (registrations + matches), all (both, plus the folder setting). */
app.post("/api/admin/clear", requireAdmin, (req, res) => {
  const { what, confirm } = req.body || {};
  if (confirm !== "DELETE") return res.status(400).json({ error: 'Type DELETE to confirm.' });
  if (!["index", "guests", "all"].includes(what)) return res.status(400).json({ error: "Unknown option." });
  if (what === "index" || what === "all") {
    for (const p of db.prepare("SELECT * FROM photos").all()) deletePhotoFiles(p);
    db.prepare("DELETE FROM photos").run();
    db.prepare("DELETE FROM matches").run();
  }
  if (what === "guests" || what === "all") { db.prepare("DELETE FROM matches").run(); db.prepare("DELETE FROM guests").run(); tickets.clear(); }
  if (what === "all") db.prepare("DELETE FROM settings WHERE key LIKE 'drive_%'").run();
  res.json({ ok: true });
});
const AUTO_SYNC_MIN = Number(process.env.DRIVE_SYNC_MINUTES || 0);
if (AUTO_SYNC_MIN > 0) {
  setInterval(() => { if (!syncing && driveFolder() && drive.serviceAccountEmail()) { syncing = true; syncDrive().catch((e) => { lastSync = { ...lastSync, error: driveMessage(e) }; }).finally(() => { syncing = false; }); } }, AUTO_SYNC_MIN * 60_000).unref();
}

app.use("/api", (_req, res) => res.status(404).json({ error: "Not found." }));

/* ---- the website itself (after `npm run build`) ---- */
const dist = path.join(here, "..", "dist");
if (fs.existsSync(dist)) {
  app.use(express.static(dist, { index: false, maxAge: "1h" }));
  app.get("/{*splat}", (_req, res) => res.sendFile(path.join(dist, "index.html")));
}

app.use((err, _req, res, _next) => {
  console.error(err.message);
  res.status(err.status || 500).json({ error: err.status === 413 ? "That file is too large." : "Something went wrong." });
});

export { app, indexer, db };
if (process.env.NO_LISTEN !== "1") {
  const PORT = Number(process.env.PORT || 8787);
  app.listen(PORT, () => {
    log(`Photo server on http://localhost:${PORT}  model=${MODEL_VERSION}  threshold=${threshold}`);
    if (!ADMIN_PASSWORD) console.warn("ADMIN_PASSWORD is not set, so /admin is disabled. Start with: ADMIN_PASSWORD=... node server/index.js");
    indexer.kick(); // resume anything that was waiting when the server last stopped
  });
}
