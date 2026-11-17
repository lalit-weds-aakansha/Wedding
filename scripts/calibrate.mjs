/**
 * Measures how far apart same-person and different-person faces are with the site's actual face model, to choose the match threshold.
 *   node scripts/calibrate.mjs [photosDir]      (default ./_test-photos; uses tests/fixtures/identities.json, labels verified by eye)
 * For each labelled face (the "selfie") it compares against every labelled face in OTHER photos (leave-one-photo-out).
 */
import fs from "node:fs";
import path from "node:path";
import { detectFaces, euclid } from "../server/faces.js";

const dir = process.argv[2] || "_test-photos";
const fx = JSON.parse(fs.readFileSync("tests/fixtures/identities.json", "utf8"));
const cache = {};
const faceAt = async (file, i) => (cache[file] ??= await detectFaces(fs.readFileSync(path.join(dir, file))))[i];
const people = {};
for (const [who, refs] of Object.entries(fx._faces)) people[who] = await Promise.all(refs.map(async ([file, i]) => ({ who, file, d: (await faceAt(file, i)).descriptor })));
const all = Object.values(people).flat();
const q = (a, p) => a.slice().sort((x, y) => x - y)[Math.min(a.length - 1, Math.floor(a.length * p))].toFixed(2);
const same = [], diff = [];
for (const a of all) for (const b of all) if (a.file !== b.file) (a.who === b.who ? same : diff).push(euclid(a.d, b.d));
console.log(`faces: ${all.length} (${Object.entries(people).map(([k, v]) => `${k}=${v.length}`).join(", ")})`);
console.log(`same person  (n=${same.length}): min ${q(same, 0)}  median ${q(same, .5)}  p90 ${q(same, .9)}  max ${q(same, 1)}`);
console.log(`different    (n=${diff.length}): min ${q(diff, 0)}  p5 ${q(diff, .05)}  median ${q(diff, .5)}`);
console.log("threshold  false-match pairs  same-person pairs found");
for (const t of [0.36, 0.40, 0.42, 0.44, 0.46, 0.48, 0.50, 0.55]) {
  const fp = diff.filter((d) => d <= t).length, tp = same.filter((d) => d <= t).length;
  console.log(`${t.toFixed(2)}       ${String(fp).padStart(4)} / ${diff.length}         ${tp}/${same.length} (${(100 * tp / same.length).toFixed(0)}%)`);
}
