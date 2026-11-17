/**
 * Minimal Google Drive client for the photo server (no googleapis dependency).
 *
 * Auth is a Google *service account*: a robot identity with its own e-mail address. A "share with anyone who has the link"
 * setting does NOT give the API access; the photographer must share the folder with the service account's e-mail (Viewer).
 *
 * Credentials (never sent to the browser, never logged):
 *   GOOGLE_SERVICE_ACCOUNT_FILE=/path/to/key.json       (or)
 *   GOOGLE_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}'
 * Optional overrides, used by the tests to point at a local fake Drive:
 *   GOOGLE_DRIVE_API=https://www.googleapis.com/drive/v3   GOOGLE_TOKEN_URL=https://oauth2.googleapis.com/token
 */
import crypto from "node:crypto";
import fs from "node:fs";

const API = () => (process.env.GOOGLE_DRIVE_API || "https://www.googleapis.com/drive/v3").replace(/\/$/, "");
const TOKEN_URL = () => process.env.GOOGLE_TOKEN_URL || "https://oauth2.googleapis.com/token";
const SCOPE = "https://www.googleapis.com/auth/drive.readonly";
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_FILES = Number(process.env.DRIVE_MAX_FILES || 20000);

const b64url = (b) => Buffer.from(b).toString("base64url");

export function loadCredentials() {
  try {
    const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
      || (process.env.GOOGLE_SERVICE_ACCOUNT_FILE ? fs.readFileSync(process.env.GOOGLE_SERVICE_ACCOUNT_FILE, "utf8") : "");
    if (!raw) return null;
    const k = JSON.parse(raw);
    if (!k.client_email || !k.private_key) return null;
    return { email: k.client_email, key: k.private_key };
  } catch { return null; }
}

let cached = { token: "", exp: 0 };
async function accessToken() {
  const cred = loadCredentials();
  if (!cred) throw driveError("not-configured", "Google credentials are not set on the server.");
  if (cached.token && cached.exp > Date.now() + 60_000) return cached.token;
  const iat = Math.floor(Date.now() / 1000);
  const head = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = b64url(JSON.stringify({ iss: cred.email, scope: SCOPE, aud: TOKEN_URL(), iat, exp: iat + 3600 }));
  let sig;
  try { sig = crypto.createSign("RSA-SHA256").update(`${head}.${claim}`).sign(cred.key).toString("base64url"); }
  catch { throw driveError("bad-key", "The service-account private key could not be read."); }
  const r = await fetch(TOKEN_URL(), {
    method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${head}.${claim}.${sig}` }),
  });
  if (!r.ok) throw driveError("auth", `Google rejected the service account (HTTP ${r.status}).`);
  const j = await r.json();
  cached = { token: j.access_token, exp: Date.now() + (Number(j.expires_in) || 3600) * 1000 };
  return cached.token;
}

function driveError(code, message) { return Object.assign(new Error(message), { code }); }

async function call(pathAndQuery, init = {}) {
  const token = await accessToken();
  const r = await fetch(`${API()}${pathAndQuery}`, { ...init, headers: { ...(init.headers || {}), authorization: `Bearer ${token}` } });
  if (r.status === 404) throw driveError("not-found", "Folder or file not found, or it is not shared with the service account.");
  if (r.status === 403) {
    const body = await r.text().catch(() => "");
    if (/cannotDownloadFile|downloadRestricted|copyRequiresWriterPermission/i.test(body)) throw driveError("download-restricted", "The owner has disabled downloading for this file. Allow viewers to download (Share settings), then retry.");
    if (/rateLimitExceeded|userRateLimitExceeded|quotaExceeded/i.test(body)) throw driveError("transient", "Google Drive rate limit reached. It will be retried automatically.");
    throw driveError("forbidden", "The service account may not read this. Share the folder with its e-mail address (Viewer).");
  }
  if (r.status === 429 || r.status >= 500) throw driveError("transient", `Google Drive is busy (HTTP ${r.status}). Try again shortly.`);
  if (!r.ok) throw driveError("http", `Google Drive returned HTTP ${r.status}.`);
  return r;
}

const q = (o) => new URLSearchParams(o).toString();
const validId = (id) => /^[A-Za-z0-9_-]{10,100}$/.test(String(id || ""));
export const isValidFolderId = validId;

/** Accepts a bare folder ID or a drive.google.com/.../folders/ID link. */
export function parseFolderId(input) {
  const s = String(input || "").trim();
  const m = s.match(/\/folders\/([A-Za-z0-9_-]{10,100})/) || s.match(/[?&]id=([A-Za-z0-9_-]{10,100})/);
  const id = m ? m[1] : s;
  return validId(id) ? id : null;
}

export const serviceAccountEmail = () => loadCredentials()?.email || null;

export async function verifyFolder(folderId) {
  if (!validId(folderId)) throw driveError("bad-id", "That does not look like a Google Drive folder ID or link.");
  const r = await call(`/files/${folderId}?${q({ fields: "id,name,mimeType", supportsAllDrives: "true" })}`);
  const f = await r.json();
  if (f.mimeType !== "application/vnd.google-apps.folder") throw driveError("not-folder", "That ID is a file, not a folder.");
  return { id: f.id, name: f.name };
}

/** Every image under the folder, including nested sub-folders. */
export async function listImages(rootId) {
  const out = [];
  const queue = [{ id: rootId, path: "" }];
  const seen = new Set([rootId]);
  while (queue.length) {
    const dir = queue.shift();
    let pageToken = "";
    do {
      const params = {
        q: `'${dir.id}' in parents and trashed = false`, pageSize: "1000", supportsAllDrives: "true", includeItemsFromAllDrives: "true",
        fields: "nextPageToken,files(id,name,mimeType,md5Checksum,modifiedTime,size)",
      };
      if (pageToken) params.pageToken = pageToken;
      const j = await (await call(`/files?${q(params)}`)).json();
      for (const f of j.files || []) {
        if (f.mimeType === "application/vnd.google-apps.folder") {
          if (!seen.has(f.id)) { seen.add(f.id); queue.push({ id: f.id, path: `${dir.path}${f.name}/` }); }
        } else if (IMAGE_TYPES.has(f.mimeType)) {
          out.push({ id: f.id, name: f.name, path: `${dir.path}${f.name}`, mime: f.mimeType, version: f.md5Checksum || f.modifiedTime || "", size: Number(f.size) || 0 });
          if (out.length >= MAX_FILES) return { files: out, truncated: true };
        }
      }
      pageToken = j.nextPageToken || "";
    } while (pageToken);
  }
  return { files: out, truncated: false };
}

/** Raw Response for an image so the caller can stream it. `thumb` asks Drive for a small rendition first. */
export async function fetchImage(fileId, { thumb = false } = {}) {
  if (!validId(fileId)) throw driveError("bad-id", "Bad file id.");
  if (thumb) {
    try {
      const meta = await (await call(`/files/${fileId}?${q({ fields: "thumbnailLink", supportsAllDrives: "true" })}`)).json();
      if (meta.thumbnailLink) {
        const token = await accessToken();
        const r = await fetch(meta.thumbnailLink.replace(/=s\d+$/, "=s640"), { headers: { authorization: `Bearer ${token}` } });
        if (r.ok) return r;
      }
    } catch { /* fall back to the full image */ }
  }
  return call(`/files/${fileId}?${q({ alt: "media", supportsAllDrives: "true" })}`);
}
