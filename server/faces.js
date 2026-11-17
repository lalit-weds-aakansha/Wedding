/**
 * Face detection + embedding, run on the server for EVERY image (guest selfies, Drive photos, uploaded photos), so selfies and
 * wedding photos always go through the same model and the same preprocessing.
 *
 * Model: face-api (@vladmandic/face-api) = SSD MobileNet v1 detector -> 68-point landmark alignment -> 128-d face-recognition
 * network (a dlib/ResNet-style model). Its natural metric is Euclidean distance between the 128-d embeddings; the match threshold
 * in server/index.js was calibrated on labelled faces (see README, "Calibration"). It runs on the TensorFlow.js WASM backend, so it
 * needs no GPU and no native TensorFlow build. Weights live in server/models (npm run setup:models re-copies them).
 */
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));

/** Stored with every indexed photo; photos indexed by a different model/preprocessing are re-indexed, never compared. */
export const MODEL_VERSION = "faceapi-1.7.15/ssd0.7+landmarks68+resnet128/photo2200-min60px";
export const MIN_FACE_PX = 60; // faces narrower than this (in the 2200 px working image) give unreliable embeddings and are not indexed
const PHOTO_MAX = 2200;
const SELFIE_MAX = 1280;

let faceapi;
let ready;
export function loadModels() {
  ready ??= (async () => {
    const wasm = require("@tensorflow/tfjs-backend-wasm");
    wasm.setWasmPaths(path.dirname(require.resolve("@tensorflow/tfjs-backend-wasm/package.json")) + "/dist/");
    faceapi = require("@vladmandic/face-api/dist/face-api.node-wasm.js");
    await faceapi.tf.setBackend("wasm");
    await faceapi.tf.ready();
    const dir = path.join(here, "models");
    await faceapi.nets.ssdMobilenetv1.loadFromDisk(dir);
    await faceapi.nets.faceLandmark68Net.loadFromDisk(dir);
    await faceapi.nets.faceRecognitionNet.loadFromDisk(dir);
  })();
  return ready;
}

async function toTensor(input, maxDim) {
  const { data, info } = await sharp(input, { failOn: "none", limitInputPixels: 200_000_000 })
    .rotate().resize({ width: maxDim, height: maxDim, fit: "inside", withoutEnlargement: true }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  return { tensor: faceapi.tf.tensor3d(new Uint8Array(data), [info.height, info.width, 3], "int32"), width: info.width, height: info.height };
}

async function run(input, maxDim, minConfidence) {
  await loadModels();
  const { tensor, width } = await toTensor(input, maxDim);
  try {
    const found = await faceapi.detectAllFaces(tensor, new faceapi.SsdMobilenetv1Options({ minConfidence, maxResults: 60 })).withFaceLandmarks().withFaceDescriptors();
    return found.map((r) => {
      const b = r.detection.box;
      return { score: r.detection.score, width: b.width, imageWidth: width, box: { x: b.x, y: b.y, w: b.width, h: b.height }, descriptor: Array.from(r.descriptor) };
    });
  } finally { tensor.dispose(); }
}

/** Every usable face in a wedding photo (small and low-confidence detections dropped). */
export async function analysePhoto(input) {
  const all = await run(input, PHOTO_MAX, 0.7);
  const faces = all.filter((f) => f.width >= MIN_FACE_PX);
  return { faces: faces.map((f) => f.descriptor), detected: all.length, skippedSmall: all.length - faces.length };
}

/** One dominant, reasonably large face from a guest's selfie, or the reason there is none. */
export async function analyseSelfie(input) {
  const faces = await run(input, SELFIE_MAX, 0.5);
  if (!faces.length) return { ok: false, reason: "none" };
  const area = (f) => f.box.w * f.box.h;
  faces.sort((a, b) => area(b) - area(a));
  if (faces.length > 1 && area(faces[1]) > area(faces[0]) * 0.5) return { ok: false, reason: "many" };
  if (faces[0].width < faces[0].imageWidth * 0.15) return { ok: false, reason: "small" };
  return { ok: true, descriptor: faces[0].descriptor, score: faces[0].score };
}

export async function makeThumb(input, size = 520) {
  return sharp(input, { failOn: "none" }).rotate().resize({ width: size, height: size, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 80 }).toBuffer();
}

/** Low-level detection with boxes, for tests and calibration scripts. `mode`: "photo" (stricter) or "selfie". */
export async function detectFaces(input, mode = "photo") {
  return run(input, mode === "photo" ? PHOTO_MAX : SELFIE_MAX, mode === "photo" ? 0.7 : 0.5);
}

/** A selfie-like close-up: the face box grown by `pad`, cut from the same 2200 px working image, re-encoded as JPEG. */
export async function cropFace(input, face, pad = 0.6) {
  const base = await sharp(input, { failOn: "none" }).rotate().resize({ width: PHOTO_MAX, height: PHOTO_MAX, fit: "inside", withoutEnlargement: true }).toBuffer({ resolveWithObject: true });
  const { width: W, height: H } = base.info;
  const cx = face.box.x + face.box.w / 2, cy = face.box.y + face.box.h / 2;
  const side = Math.min(W, H, Math.round(Math.max(face.box.w, face.box.h) * (1 + pad * 2)));
  const left = Math.max(0, Math.min(W - side, Math.round(cx - side / 2)));
  const top = Math.max(0, Math.min(H - side, Math.round(cy - side / 2)));
  return sharp(base.data).extract({ left, top, width: side, height: side }).jpeg({ quality: 92 }).toBuffer();
}

export const euclid = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) { const d = a[i] - b[i]; s += d * d; } return Math.sqrt(s); };
