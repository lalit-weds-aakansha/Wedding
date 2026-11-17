/**
 * A fake Google Drive + OAuth server used by the tests (and scripts/mock-drive.mjs). It verifies the service-account JWT
 * signature, serves a folder tree with Drive v3 JSON shapes (pagination, checksums, nested folders) and can simulate
 * permission errors, a missing folder, and download-restricted files.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";

export const EMAIL = "photos-bot@wedding-test.iam.gserviceaccount.com";
const md5 = (b) => crypto.createHash("md5").update(b).digest("hex");

/** tree: { folders: { id: { name, parent } }, files: { id: { name, parent, buf, mime? } } } */
export async function startMockDrive(tree, { port = 0, pageSize = 1000 } = {}) {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
  const keyFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "mock-drive-")), "key.json");
  fs.writeFileSync(keyFile, JSON.stringify({ type: "service_account", client_email: EMAIL, private_key: privateKey.export({ type: "pkcs8", format: "pem" }) }));
  const state = { forbiddenFolders: new Set(), restricted: new Set(), requests: 0 };
  for (const f of Object.values(tree.files)) { f.mime ??= "image/jpeg"; f.md5 = md5(f.buf); }
  const authed = new Set();
  const send = (res, code, body, type = "application/json") => { res.writeHead(code, { "content-type": type }); res.end(typeof body === "string" || Buffer.isBuffer(body) ? body : JSON.stringify(body)); };

  const server = http.createServer((req, res) => {
    const u = new URL(req.url, "http://x");
    if (u.pathname === "/token" && req.method === "POST") {
      let data = ""; req.on("data", (c) => (data += c)); req.on("end", () => {
        const [h, c, s] = (new URLSearchParams(data).get("assertion") || "").split(".");
        const ok = s && crypto.createVerify("RSA-SHA256").update(`${h}.${c}`).verify(publicKey, Buffer.from(s, "base64url"));
        if (!ok || JSON.parse(Buffer.from(c, "base64url").toString()).iss !== EMAIL) return send(res, 401, { error: "invalid_grant" });
        const t = crypto.randomBytes(12).toString("hex"); authed.add(t); send(res, 200, { access_token: t, expires_in: 3600 });
      }); return;
    }
    state.requests++;
    if (!authed.has((req.headers.authorization || "").replace("Bearer ", ""))) return send(res, 401, { error: "unauthorized" });
    const m = u.pathname.match(/^\/files(?:\/([^/]+))?$/);
    if (!m) return send(res, 404, {});
    if (m[1]) {
      const id = m[1];
      if (tree.folders[id]) return state.forbiddenFolders.has(id) ? send(res, 403, { error: { message: "forbidden" } }) : send(res, 200, { id, name: tree.folders[id].name, mimeType: "application/vnd.google-apps.folder" });
      const f = tree.files[id]; if (!f) return send(res, 404, {});
      if (u.searchParams.get("alt") === "media") return state.restricted.has(id) ? send(res, 403, { error: { errors: [{ reason: "cannotDownloadFile" }] } }) : send(res, 200, f.buf, f.mime);
      return send(res, 200, { id, name: f.name, mimeType: f.mime });
    }
    const parent = (u.searchParams.get("q") || "").match(/'([^']+)' in parents/)?.[1];
    if (state.forbiddenFolders.has(parent)) return send(res, 403, {});
    const list = [
      ...Object.entries(tree.folders).filter(([, v]) => v.parent === parent).map(([id, v]) => ({ id, name: v.name, mimeType: "application/vnd.google-apps.folder" })),
      ...Object.entries(tree.files).filter(([, v]) => v.parent === parent).map(([id, v]) => ({ id, name: v.name, mimeType: v.mime, md5Checksum: v.md5, size: String(v.buf.length) })),
    ];
    const start = Number(u.searchParams.get("pageToken") || 0);
    const page = list.slice(start, start + pageSize);
    send(res, 200, { files: page, ...(start + pageSize < list.length ? { nextPageToken: String(start + pageSize) } : {}) });
  });
  await new Promise((r) => server.listen(port, r));
  const p = server.address().port;
  return {
    port: p, keyFile, state,
    env: { GOOGLE_DRIVE_API: `http://localhost:${p}`, GOOGLE_TOKEN_URL: `http://localhost:${p}/token`, GOOGLE_SERVICE_ACCOUNT_FILE: keyFile },
    edit(id, buf) { tree.files[id].buf = buf; tree.files[id].md5 = md5(buf); },
    add(id, f) { tree.files[id] = { mime: "image/jpeg", ...f, md5: md5(f.buf) }; },
    remove(id) { delete tree.files[id]; },
    close: () => new Promise((r) => { server.closeAllConnections?.(); server.close(r); }),
  };
}
