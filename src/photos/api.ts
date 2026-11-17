/** Thin wrappers around the photo server's JSON API. Errors carry the server's message. */
async function json<T>(res: Response): Promise<T> {
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) throw Object.assign(new Error(data.error || `Request failed (${res.status})`), { status: res.status });
  return data as T;
}
const post = (url: string, body: unknown, headers: Record<string, string> = {}) =>
  fetch(url, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) });

export type GuestPhoto = { id: number; confidence: number; manual: boolean; thumb: string; full: string; download: string };
export type SelfieFail = "none" | "many" | "small" | "unreadable" | "invalid" | "busy";
/** Thrown by selfie(): `reason` says why the photo was refused (no face, several faces, too small...). */
export class SelfieError extends Error { constructor(message: string, public reason: SelfieFail | "network") { super(message); } }

export const guestApi = {
  /** Sends one selfie to be analysed (in memory, never stored). Returns a short-lived ticket that stands for its face template. */
  selfie: async (blob: Blob) => {
    let r: Response;
    try { r = await fetch("/api/selfie", { method: "POST", headers: { "content-type": "image/jpeg" }, body: blob }); }
    catch { throw new SelfieError("network", "network"); }
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new SelfieError(data.error || "failed", (data.reason as SelfieFail) || "network");
    return data as { ticket: string };
  },
  register: (b: { name: string; phone: string; email?: string; consent: true; tickets: string[] }) =>
    post("/api/guests", b).then((r) => json<{ token: string; name: string; photos: number; pending: number }>(r)),
  me: (token: string) => fetch(`/api/me?token=${encodeURIComponent(token)}`).then((r) => json<{ name: string; photos: number }>(r)),
  photos: (token: string) => fetch(`/api/me/photos?token=${encodeURIComponent(token)}`).then((r) => json<{ photos: GuestPhoto[]; pending: number; legacy?: boolean }>(r)),
  remove: (token: string) => fetch(`/api/me?token=${encodeURIComponent(token)}`, { method: "DELETE" }).then((r) => json<{ ok: true }>(r)),
};

export const TOKEN_KEY = "wedding-photo-token";
export const savedToken = () => { try { return window.localStorage.getItem(TOKEN_KEY); } catch { return null; } };
export const saveToken = (t: string) => { try { window.localStorage.setItem(TOKEN_KEY, t); } catch { /* ignore */ } };
export const forgetToken = () => { try { window.localStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ } };
export const myPhotosUrl = (token: string) => `${window.location.origin}/photos/me?t=${encodeURIComponent(token)}`;

/* ---- photographer (admin) ---- */
export type AdminGuest = { id: number; name: string; phone: string; email: string | null; token: string; created_at: string; photos: number };
export type AdminPhoto = { id: number; faces: number; matches: number; created_at: string; status: "pending" | "indexed" | "failed"; error: string | null; path: string | null };
export type DriveStatus = {
  credentials: boolean; serviceAccount: string | null; folder: string; folderName: string | null; syncing: boolean;
  lastSync: { at: string | null; error: string | null; added: number; changed: number; removed: number; truncated: boolean };
  total: number; indexed: number; pending: number; failed: number; autoSyncMinutes: number; indexer: { running: boolean; paused: boolean; current: number | null };
};
export type Overview = { guests: number; photos: number; indexed: number; pending: number; failed: number; matches: number; guestsWithPhotos: number; threshold: number; defaultThreshold: number; retentionDays: number; model: string };
export type Diagnostics = {
  model: string; threshold: number; minFacePx: number; indexer: { running: boolean; paused: boolean; current: number | null };
  drive: { discovered: number; indexed: number; pending: number; failed: number };
  uploads: { total: number; indexed: number; failed: number };
  faces: { total: number; photosByFaceCount: Record<string, number> };
  failures: { id: number; drive_id: string | null; drive_path: string | null; error: string | null; attempts: number }[];
};
export type GuestDiagnostics = {
  threshold: number; templates: number; indexedPhotos: number; photosWithFaces: number; returned: number;
  candidates: { photoId: number; path: string | null; faces: number; distance: number; decision: "match" | "rejected" }[];
};

export function adminApi(session: string) {
  const h = { "x-admin-session": session };
  const get = <T,>(u: string) => fetch(u, { headers: h }).then((r) => json<T>(r));
  const send = <T,>(method: string, u: string, body?: unknown) =>
    fetch(u, { method, headers: { ...h, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) }).then((r) => json<T>(r));
  const raw = <T,>(method: string, u: string, blob: Blob) => fetch(u, { method, headers: { ...h, "content-type": blob.type || "image/jpeg" }, body: blob }).then((r) => json<T>(r));
  return {
    overview: () => get<Overview>("/api/admin/overview"),
    guests: () => get<AdminGuest[]>("/api/admin/guests"),
    photos: () => get<AdminPhoto[]>("/api/admin/photos"),
    photoGuests: (id: number) => get<{ matched: { id: number; name: string; phone: string; distance: number | null; source: string }[]; all: { id: number; name: string; phone: string }[] }>(`/api/admin/photos/${id}/guests`),
    uploadPhoto: (blob: Blob) => raw<{ id: number }>("POST", "/api/admin/photos", blob),
    diagnostics: () => get<Diagnostics>("/api/admin/diagnostics"),
    guestDiagnostics: (id: number) => get<GuestDiagnostics>(`/api/admin/guests/${id}/diagnostics`),
    retryFailed: () => send<{ requeued: number }>("POST", "/api/admin/indexer/retry"),
    indexer: (action: "pause" | "resume") => send<{ running: boolean; paused: boolean }>("POST", `/api/admin/indexer/${action}`),
    deletePhoto: (id: number) => send<{ ok: true }>("DELETE", `/api/admin/photos/${id}`),
    deleteGuest: (id: number) => send<{ ok: true }>("DELETE", `/api/admin/guests/${id}`),
    addMatch: (guestId: number, photoId: number) => send<{ ok: true }>("POST", "/api/admin/matches", { guestId, photoId }),
    removeMatch: (guestId: number, photoId: number) => send<{ ok: true }>("DELETE", "/api/admin/matches", { guestId, photoId }),
    rematch: (threshold: number) => send<{ threshold: number; matches: number }>("POST", "/api/admin/rematch", { threshold }),
    driveStatus: () => get<DriveStatus>("/api/admin/drive/status"),
    driveSetFolder: (folder: string) => send<{ ok: true; name: string }>("POST", "/api/admin/drive/folder", { folder }),
    driveVerify: () => send<{ ok: true; name: string }>("POST", "/api/admin/drive/verify"),
    driveSync: () => send<DriveStatus["lastSync"]>("POST", "/api/admin/drive/sync"),
    clear: (what: "index" | "guests" | "all") => send<{ ok: true }>("POST", "/api/admin/clear", { what, confirm: "DELETE" }),
    thumbUrl: (id: number) => `/api/photos/${id}/thumb?admin=${encodeURIComponent(session)}`,
    fileUrl: (id: number) => `/api/photos/${id}/file?admin=${encodeURIComponent(session)}`,
  };
}
export const adminLogin = (password: string) => post("/api/admin/login", { password }).then((r) => json<{ session: string }>(r));
