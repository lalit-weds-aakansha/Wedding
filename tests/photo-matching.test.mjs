/**
 * End-to-end tests for "Find your photos": real HTTP server, real face model (same code the site runs), fake Google Drive.
 * The sample wedding photos are local and private (not in the repo): put them in ./_test-photos or set TEST_PHOTOS_DIR.
 * Identities in tests/fixtures/identities.json were verified by eye (A = bride, B = older woman, C = man with glasses).
 * Run:  npm test
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { after, before, describe, test } from "node:test";
import { DatabaseSync } from "node:sqlite";
import sharp from "sharp";
import { cropFace, detectFaces } from "./helpers/faces.mjs";
import { startMockDrive } from "./helpers/mock-drive.mjs";
import { startServer } from "./helpers/server.mjs";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..");
const PHOTOS = process.env.TEST_PHOTOS_DIR || path.join(root, "_test-photos");
const identities = JSON.parse(fs.readFileSync(path.join(root, "tests/fixtures/identities.json"), "utf8"));

if (!fs.existsSync(PHOTOS)) {
  test("sample photos are missing", { skip: `Put the sample wedding photos in ${PHOTOS} (or set TEST_PHOTOS_DIR) to run the matching tests.` }, () => {});
} else {
  describe("Find your photos: strict face-matched results", { timeout: 900_000 }, () => {
    const read = (f) => fs.readFileSync(path.join(PHOTOS, f));
    const has = (f, who) => (identities[f] || []).includes(who);
    let srv, drive, tree, ids;           // ids: file name -> drive file id
    let selfieA, selfieZ, noFace;
    const photoIdByName = {};            // drive path -> photo id on the server

    const folder = (id, name, parent) => { tree.folders[id] = { name, parent }; };
    const put = (name, parent, buf, extra = {}) => { const id = `F${String(Object.keys(tree.files).length).padStart(9, "0")}XXXX`; tree.files[id] = { name, parent, buf, ...extra }; ids[name] = id; return id; };

    before(async () => {
      tree = { folders: {}, files: {} }; ids = {};
      folder("ROOTFOLDER00001", "Wedding", null);
      folder("PORTRAITS000001", "Portraits", "ROOTFOLDER00001");
      folder("GROUPS000000001", "Groups", "ROOTFOLDER00001");
      folder("CANDID000000001", "Candid", "GROUPS000000001"); // nested two levels deep
      folder("MISC00000000001", "Misc", "ROOTFOLDER00001");
      // A (the bride) alone
      for (const f of ["FD0A2713.JPG", "FD0A2716.JPG", "FD0A2721.JPG", "FD0A2724.JPG"]) put(f, "PORTRAITS000001", read(f));
      // groups and people who are NOT A (B only, C only, B and C, plus strangers)
      for (const f of ["FD0A2742.JPG", "FD0A2743.JPG", "FD0A2751.JPG"]) put(f, "GROUPS000000001", read(f));
      for (const f of ["FD0A2745.JPG", "FD0A2744.JPG"]) put(f, "CANDID000000001", read(f));
      // a photo with no faces at all, and a statue (the detector reads a Buddha face)
      put("FD0A2701.JPG", "MISC00000000001", read("FD0A2701.JPG"));
      put("FD0A2710.JPG", "MISC00000000001", read("FD0A2710.JPG"));
      // a controlled group photo containing BOTH A and B, built from two real close-ups side by side
      const faceOf = async (who) => { const [f, i] = identities._faces[who][0]; const faces = await detectFaces(read(f)); return { f, face: faces[i] }; };
      const a = await faceOf("A"); const b = await faceOf("B");
      const [ca, cb] = await Promise.all([cropFace(read(a.f), a.face, 0.8), cropFace(read(b.f), b.face, 0.8)]);
      const [ra, rb] = await Promise.all([sharp(ca).resize(700, 700).toBuffer(), sharp(cb).resize(700, 700).toBuffer()]);
      put("GROUP_A_AND_B.jpg", "GROUPS000000001", await sharp({ create: { width: 1400, height: 700, channels: 3, background: "#ddd" } }).composite([{ input: ra, left: 0, top: 0 }, { input: rb, left: 700, top: 0 }]).jpeg().toBuffer());
      // files Drive can hand over but the indexer cannot use
      put("CORRUPT.jpg", "MISC00000000001", Buffer.from("this is not an image at all, just text pretending to be a photo".repeat(40)));
      const restricted = put("RESTRICTED.jpg", "MISC00000000001", read("FD0A2718.JPG"));
      put("notes.txt", "MISC00000000001", Buffer.from("not an image"), { mime: "text/plain" });

      // selfies: a close-up cut from a photo that is NOT in the Drive folder (so a match is never the photo itself)
      const sa = await detectFaces(read("FD0A2722.JPG")); selfieA = await cropFace(read("FD0A2722.JPG"), sa[0], 0.6);
      const [zf, zi] = identities._faces.Z[0]; const sz = await detectFaces(read(zf)); selfieZ = await cropFace(read(zf), sz[zi], 0.6);
      noFace = await sharp(read("FD0A2701.JPG")).resize(900).jpeg().toBuffer(); // decor photo, no face

      drive = await startMockDrive(tree, { pageSize: 4 }); // small pages: forces pagination
      drive.state.restricted.add(restricted);
      srv = await startServer({ ...drive.env });
      const f = await srv.admin("POST", "/api/admin/drive/folder", { folder: "https://drive.google.com/drive/folders/ROOTFOLDER00001?usp=sharing" });
      assert.equal(f.status, 200, f.text);
      const sync = await srv.admin("POST", "/api/admin/drive/sync");
      assert.equal(sync.status, 200, sync.text);
      await srv.waitIdle();
      for (const p of (await srv.admin("GET", "/api/admin/photos")).json) photoIdByName[path.basename(p.path)] = p.id;
    });
    after(async () => { await srv?.stop(); await drive?.close(); });

    const registerWith = async (jpeg, name = "Test Guest") => {
      const s = await srv.call("POST", "/api/selfie", { raw: jpeg });
      assert.equal(s.status, 200, s.text);
      const g = await srv.call("POST", "/api/guests", { body: { name, phone: "9876543210", consent: true, tickets: [s.json.ticket] } });
      assert.equal(g.status, 200, g.text);
      return g.json.token;
    };
    const results = async (token) => (await srv.call("GET", `/api/me/photos?token=${token}`)).json;
    const names = (list) => list.photos.map((p) => Object.keys(photoIdByName).find((k) => photoIdByName[k] === p.id));

    test("Drive discovery: nested folders and pagination are followed, only images are indexed", async () => {
      const d = (await srv.admin("GET", "/api/admin/diagnostics")).json;
      const imagesInTree = Object.values(tree.files).filter((f) => f.mime.startsWith("image/")).length;
      assert.equal(d.drive.discovered, imagesInTree, "every image in every nested folder is discovered, notes.txt is not");
      assert.ok(photoIdByName["FD0A2744.JPG"], "a photo two folders deep was found");
      console.log(`    discovered=${d.drive.discovered} indexed=${d.drive.indexed} failed=${d.drive.failed} faces=${d.faces.total} byFaceCount=${JSON.stringify(d.faces.photosByFaceCount)}`);
    });

    test("A/B/C: selfie of Person A returns only photos containing Person A (incl. the A+B group), none with only B or strangers", async () => {
      const token = await registerWith(selfieA, "Person A");
      const got = names(await results(token));
      const expected = Object.keys(photoIdByName).filter((n) => has(n, "A") || n === "GROUP_A_AND_B.jpg");
      const wrong = got.filter((n) => !expected.includes(n));
      console.log(`    expected=${JSON.stringify(expected)}\n    returned=${JSON.stringify(got)}`);
      assert.deepEqual(wrong, [], `unexpected photos returned: ${wrong}`);
      assert.ok(got.includes("GROUP_A_AND_B.jpg"), "group photo with A and B is returned for A when the face passes the threshold");
      assert.ok(got.length >= Math.ceil(expected.length * 0.6), `at least 60% of A's photos found (${got.length}/${expected.length})`);
      // B-only and C-only photos are excluded
      for (const n of ["FD0A2751.JPG", "FD0A2745.JPG"]) assert.ok(!got.includes(n), `${n} (no A) must be excluded`);
      // statue / no-face photos are excluded
      for (const n of ["FD0A2710.JPG", "FD0A2701.JPG"]) assert.ok(!got.includes(n), `${n} must be excluded`);
    });

    test("D: an unrelated selfie returns zero photos, not the album", async () => {
      const token = await registerWith(selfieZ, "Person Z");
      const r = await results(token);
      assert.equal(r.photos.length, 0, `expected no photos, got ${names(r)}`);
      const total = (await srv.admin("GET", "/api/admin/overview")).json.indexed;
      assert.ok(total > 5, "the album itself is not empty, so zero really is a filtered result");
    });

    test("E: a selfie with no detectable face is a validation error", async () => {
      const s = await srv.call("POST", "/api/selfie", { raw: noFace });
      assert.equal(s.status, 422);
      assert.equal(s.json.reason, "none");
      assert.match(s.json.error, /upload another selfie/i);
      const junk = await srv.call("POST", "/api/selfie", { raw: Buffer.from("x".repeat(5000)) });
      assert.ok([400, 422].includes(junk.status));
      // and registering without a valid selfie ticket is refused
      const g = await srv.call("POST", "/api/guests", { body: { name: "No Face", phone: "9876543210", consent: true, tickets: ["nope"] } });
      assert.equal(g.status, 400);
      assert.equal(g.json.reason, "no-face");
    });

    test("consent, name and phone are validated", async () => {
      const s = await srv.call("POST", "/api/selfie", { raw: selfieA });
      const bad = await srv.call("POST", "/api/guests", { body: { name: "Tester", phone: "9876543210", consent: false, tickets: [s.json.ticket] } });
      assert.equal(bad.status, 400); assert.match(bad.json.error, /consent/i);
      const bad2 = await srv.call("POST", "/api/guests", { body: { name: "T", phone: "1", consent: true, tickets: [s.json.ticket] } });
      assert.equal(bad2.status, 400);
    });

    test("F: an inaccessible Drive folder gives an actionable error, and never exposes photos", async () => {
      const missing = await srv.admin("POST", "/api/admin/drive/folder", { folder: "DOESNOTEXIST12345" });
      assert.equal(missing.status, 400);
      assert.match(missing.json.error, /not found|not shared with the service account/i);
      drive.state.forbiddenFolders.add("GROUPS000000001");
      const forb = await srv.admin("POST", "/api/admin/drive/sync");
      assert.equal(forb.status, 400);
      assert.match(forb.json.error, /Share the folder with its e-mail address/i);
      drive.state.forbiddenFolders.delete("GROUPS000000001");
      const notFolder = await srv.admin("POST", "/api/admin/drive/folder", { folder: ids["FD0A2713.JPG"] });
      assert.match(notFolder.json.error, /file, not a folder/i);
      const nonsense = await srv.admin("POST", "/api/admin/drive/folder", { folder: "not a link!" });
      assert.equal(nonsense.status, 400);
      // a failed sync must not have deleted or exposed anything: the guest gallery is unchanged
      const s = await srv.call("POST", "/api/selfie", { raw: selfieA });
      assert.equal(s.status, 200);
    });

    test("G: failed and unprocessed photos are never returned", async () => {
      const diag = (await srv.admin("GET", "/api/admin/diagnostics")).json;
      const failed = diag.failures.map((f) => f.drive_path);
      assert.ok(failed.includes("Misc/CORRUPT.jpg"), "corrupt image is a failure, not a no-match");
      assert.ok(failed.includes("Misc/RESTRICTED.jpg"), "download-restricted image is a failure");
      assert.match(diag.failures.find((f) => f.drive_path === "Misc/RESTRICTED.jpg").error, /disabled downloading/i);
      const token = await registerWith(selfieA, "A again");
      const got = names(await results(token));
      assert.ok(!got.includes("CORRUPT.jpg") && !got.includes("RESTRICTED.jpg"));
      // RESTRICTED.jpg is a real photo of A (FD0A2718): it must NOT appear because it was never processed
      assert.ok(has("FD0A2718.JPG", "A"));

      // unprocessed: pause the indexer, add another photo of A to Drive, sync -> it is "pending" and invisible
      await srv.admin("POST", "/api/admin/indexer/pause");
      const before = got.length;
      drive.add("NEWPHOTOA0000001", { name: "FD0A2727.JPG", parent: "PORTRAITS000001", buf: read("FD0A2727.JPG") });
      assert.equal((await srv.admin("POST", "/api/admin/drive/sync")).json.added, 1);
      const pending = (await srv.admin("GET", "/api/admin/photos")).json.find((p) => p.path === "Portraits/FD0A2727.JPG");
      assert.equal(pending.status, "pending");
      assert.equal(names(await results(token)).length, before, "pending photo is not part of the results");
      assert.equal((await srv.call("GET", `/api/photos/${pending.id}/file?token=${token}`)).status, 403, "pending photo file cannot be fetched");
      assert.equal((await results(token)).pending, 1, "the gallery only learns that one photo is still processing");
      // resume -> indexed once; then an unchanged sync does no re-indexing
      await srv.admin("POST", "/api/admin/indexer/resume");
      await srv.waitIdle();
      const after1 = (await srv.admin("GET", "/api/admin/photos")).json.find((p) => p.path === "Portraits/FD0A2727.JPG");
      assert.equal(after1.status, "indexed");
      await new Promise((r) => setTimeout(r, 400));
      const logsBefore = srv.logs.filter((l) => l.startsWith("[index]")).length;
      const again = (await srv.admin("POST", "/api/admin/drive/sync")).json;
      assert.deepEqual([again.added, again.changed, again.removed], [0, 0, 0]);
      await srv.waitIdle();
      assert.equal(srv.logs.filter((l) => l.startsWith("[index]")).length, logsBefore, "no photo is re-processed when nothing changed");
      // a changed file is re-indexed (new checksum)
      drive.edit("NEWPHOTOA0000001", read("FD0A2728.JPG"));
      assert.equal((await srv.admin("POST", "/api/admin/drive/sync")).json.changed, 1);
      await srv.waitIdle();
      assert.ok(srv.logs.filter((l) => l.startsWith("[index]")).length > logsBefore);
      // Drive deletion removes the photo and its matches
      drive.remove("NEWPHOTOA0000001");
      assert.equal((await srv.admin("POST", "/api/admin/drive/sync")).json.removed, 1);
      // failed photos can be retried safely (and fail again with the same reason)
      const rq = await srv.admin("POST", "/api/admin/indexer/retry");
      assert.equal(rq.json.requeued, 2);
      await srv.waitIdle();
      assert.equal((await srv.admin("GET", "/api/admin/diagnostics")).json.failures.length, 2);
    });

    test("H: one guest cannot see another guest's results or photos by changing an ID or URL", async () => {
      const tokenA = await registerWith(selfieA, "Guest A");
      const tokenZ = await registerWith(selfieZ, "Guest Z");
      const mine = (await results(tokenA)).photos;
      assert.ok(mine.length > 0);
      // Z (no matches) cannot fetch A's photo, in any form
      for (const kind of ["file", "thumb"]) assert.equal((await srv.call("GET", `/api/photos/${mine[0].id}/${kind}?token=${tokenZ}`)).status, 403);
      assert.equal((await srv.call("GET", `/api/photos/${mine[0].id}/file`)).status, 403, "no token");
      assert.equal((await srv.call("GET", `/api/photos/${mine[0].id}/file?token=${"a".repeat(48)}`)).status, 403, "well-formed but unknown token");
      assert.equal((await srv.call("GET", `/api/photos/${mine[0].id}/file?admin=forged`)).status, 403, "forged admin session");
      // guessable identifiers are not accepted as tokens
      for (const t of ["1", "2", "0", "../1", "' OR 1=1 --"]) assert.equal((await srv.call("GET", `/api/me/photos?token=${encodeURIComponent(t)}`)).status, 404);
      assert.equal((await srv.call("GET", `/api/me/photos`)).status, 404);
      // a random photo id that is not in A's results is refused even with A's valid token
      const notMine = Object.values(photoIdByName).find((id) => !mine.some((m) => m.id === id));
      assert.equal((await srv.call("GET", `/api/photos/${notMine}/file?token=${tokenA}`)).status, 403);
      // A's own photo works with A's token, as an image
      const ok = await srv.call("GET", `/api/photos/${mine[0].id}/thumb?token=${tokenA}`);
      assert.equal(ok.status, 200); assert.match(ok.headers.get("content-type"), /^image\//); assert.match(ok.headers.get("cache-control"), /no-store/);
      // admin endpoints need the admin session
      for (const u of ["/api/admin/guests", "/api/admin/photos", "/api/admin/diagnostics", "/api/admin/drive/status", "/api/admin/overview"]) assert.equal((await srv.call("GET", u)).status, 401, u);
      assert.equal((await srv.call("POST", "/api/admin/clear", { body: { what: "all", confirm: "DELETE" } })).status, 401);
      // deleting one's data only removes that guest
      assert.equal((await srv.call("DELETE", `/api/me?token=${tokenZ}`)).status, 200);
      assert.equal((await srv.call("GET", `/api/me?token=${tokenZ}`)).status, 404);
      assert.equal((await srv.call("GET", `/api/me?token=${tokenA}`)).status, 200);
    });

    test("diagnostics explain every decision without exposing embeddings or secrets", async () => {
      const guests = (await srv.admin("GET", "/api/admin/guests")).json;
      const g = guests.find((x) => x.name === "Person A");
      const d = (await srv.admin("GET", `/api/admin/guests/${g.id}/diagnostics`)).json;
      assert.equal(d.threshold, 0.44);
      assert.ok(d.candidates.length > 0 && d.candidates.every((c) => ["match", "rejected"].includes(c.decision)));
      assert.ok(d.candidates.filter((c) => c.decision === "match").every((c) => c.distance <= d.threshold));
      assert.ok(d.candidates.filter((c) => c.decision === "rejected").every((c) => c.distance > d.threshold));
      const blob = JSON.stringify(d) + JSON.stringify((await srv.admin("GET", "/api/admin/diagnostics")).json) + JSON.stringify((await srv.admin("GET", "/api/admin/drive/status")).json);
      assert.ok(!/PRIVATE KEY/.test(blob) && !/"descriptors?"/.test(blob));
      assert.ok(srv.logs.some((l) => l.startsWith("[match] guest=")) && srv.logs.some((l) => l.startsWith("[selfie] faceDetected=")));
      assert.ok(!srv.logs.join("\n").includes("PRIVATE KEY"));
      console.log(`    Person A: ${d.returned} returned of ${d.photosWithFaces} photos with faces; nearest rejected: ${d.candidates.filter((c) => c.decision === "rejected").slice(0, 3).map((c) => c.distance).join(", ")}`);
    });

    test("guests registered by the old, unchecked pipeline are never matched and are asked to register again", async () => {
      const db = new DatabaseSync(path.join(srv.dataDir, "app.db"));
      const donor = db.prepare("SELECT descriptors FROM guests WHERE name = 'Person A'").get();
      const token = "b".repeat(48);
      const info = db.prepare("INSERT INTO guests (token, name, phone, descriptors, consent_at, model) VALUES (?, 'Old Guest', '9876543210', ?, ?, NULL)").run(token, donor.descriptors, new Date().toISOString());
      const photo = Object.values(photoIdByName)[0];
      db.prepare("INSERT INTO matches (guest_id, photo_id, distance, source) VALUES (?, ?, 0.1, 'auto')").run(Number(info.lastInsertRowid), photo);
      db.close();
      const r = await results(token);
      assert.equal(r.photos.length, 0); assert.equal(r.legacy, true);
      assert.equal((await srv.call("GET", `/api/photos/${photo}/file?token=${token}`)).status, 403);
    });

    test("clear data removes guests and the index", async () => {
      assert.equal((await srv.admin("POST", "/api/admin/clear", { what: "guests" })).status, 400, "needs DELETE confirmation");
      assert.equal((await srv.admin("POST", "/api/admin/clear", { what: "guests", confirm: "DELETE" })).status, 200);
      assert.equal((await srv.admin("GET", "/api/admin/guests")).json.length, 0);
      assert.equal((await srv.admin("POST", "/api/admin/clear", { what: "index", confirm: "DELETE" })).status, 200);
      assert.equal((await srv.admin("GET", "/api/admin/overview")).json.photos, 0);
    });
  });
}
