// Copies the face-recognition model files that ship inside @vladmandic/face-api into server/models.
import { cpSync, mkdirSync } from "node:fs";
const keep = ["ssd_mobilenetv1", "tiny_face_detector", "face_landmark_68", "face_recognition"];
import { readdirSync } from "node:fs";
const src = "node_modules/@vladmandic/face-api/model";
mkdirSync("server/models", { recursive: true });
let n = 0;
for (const f of readdirSync(src)) {
  if (keep.some((k) => f.startsWith(k)) && !f.includes("tiny_model")) { cpSync(`${src}/${f}`, `server/models/${f}`); n++; }
}
console.log(`Copied ${n} model files to server/models`);
