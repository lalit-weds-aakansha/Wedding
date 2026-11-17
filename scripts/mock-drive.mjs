/**
 * Starts the fake Google Drive used by the tests, serving the JPEGs in a local folder, so you can try the Drive screens
 * without real credentials:   node scripts/mock-drive.mjs <imagesDir> [port]
 * It prints the environment variables to start the photo server with. Not part of the production setup.
 */
import fs from "node:fs";
import path from "node:path";
import { startMockDrive } from "../tests/helpers/mock-drive.mjs";

const dir = process.argv[2];
if (!dir) { console.error("usage: node scripts/mock-drive.mjs <imagesDir> [port]"); process.exit(1); }
const imgs = fs.readdirSync(dir).filter((f) => /\.jpe?g$/i.test(f)).sort();
const tree = { folders: { ROOTFOLDER00001: { name: "Wedding", parent: null }, HALDIFOLDER00001: { name: "Haldi", parent: "ROOTFOLDER00001" } }, files: {} };
imgs.slice(0, 12).forEach((f, i) => { tree.files[`FILE${String(i).padStart(10, "0")}XX`] = { name: f, parent: i < 6 ? "ROOTFOLDER00001" : "HALDIFOLDER00001", buf: fs.readFileSync(path.join(dir, f)) }; });
const d = await startMockDrive(tree, { port: Number(process.argv[3] || 8790) });
console.log(`Mock Drive on http://localhost:${d.port}\nRoot folder id: ROOTFOLDER00001`);
console.log(Object.entries(d.env).map(([k, v]) => `${k}=${v}`).join(" "));
