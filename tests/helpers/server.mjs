/** Starts the real photo server as a child process on a free port with a throw-away data folder, and offers small HTTP helpers. */
import { spawn } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..", "..");
export const ADMIN_PASSWORD = "test-admin-password";

const freePort = () => new Promise((res) => { const s = net.createServer().listen(0, () => { const p = s.address().port; s.close(() => res(p)); }); });

export async function startServer(extraEnv = {}) {
  const port = await freePort();
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "photo-test-"));
  const logs = [];
  const child = spawn(process.execPath, ["server/index.js"], {
    cwd: root, env: { ...process.env, PORT: String(port), DATA_DIR: dataDir, ADMIN_PASSWORD, MATCH_THRESHOLD: process.env.TEST_MATCH_THRESHOLD || "", ...extraEnv }, stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.on("data", (d) => logs.push(...String(d).split("\n").filter(Boolean)));
  child.stderr.on("data", (d) => logs.push(...String(d).split("\n").filter(Boolean)));
  const base = `http://localhost:${port}`;
  for (let i = 0; i < 100; i++) { try { await fetch(`${base}/api/nothing`); break; } catch { await new Promise((r) => setTimeout(r, 100)); } }
  const call = async (method, url, { body, headers = {}, raw } = {}) => {
    const init = { method, headers: { ...headers } };
    if (raw) { init.body = raw; init.headers["content-type"] ??= "image/jpeg"; }
    else if (body !== undefined) { init.body = JSON.stringify(body); init.headers["content-type"] = "application/json"; }
    const r = await fetch(base + url, init);
    const text = await r.text(); let json; try { json = JSON.parse(text); } catch { /* not json */ }
    return { status: r.status, json, text, headers: r.headers };
  };
  const login = (await call("POST", "/api/admin/login", { body: { password: ADMIN_PASSWORD } })).json.session;
  const admin = (method, url, body) => call(method, url, { body, headers: { "x-admin-session": login } });
  const waitIdle = async (timeoutMs = 240_000) => {
    const t0 = Date.now();
    for (;;) {
      const o = (await admin("GET", "/api/admin/overview")).json;
      if (o.pending === 0) return o;
      if (Date.now() - t0 > timeoutMs) throw new Error(`indexing did not finish: ${JSON.stringify(o)}`);
      await new Promise((r) => setTimeout(r, 500));
    }
  };
  return { base, port, dataDir, logs, call, admin, session: login, waitIdle, stop: () => new Promise((r) => { child.once("exit", r); child.kill(); }) };
}
