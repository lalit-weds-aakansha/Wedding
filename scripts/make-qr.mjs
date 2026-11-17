// Usage: npm run qr -- https://your-site.example.com   → writes photos-qr.png (points at <url>/photos)
import { writeFileSync } from "node:fs";
import QRCode from "qrcode";

const base = process.argv[2];
if (!base || !/^https?:\/\//.test(base)) {
  console.error("Give the public address of the site, e.g.  npm run qr -- https://your-wedding.example.com");
  process.exit(1);
}
const url = `${base.replace(/\/+$/, "")}/photos`;
const png = await QRCode.toBuffer(url, { width: 1000, margin: 2, errorCorrectionLevel: "M", color: { dark: "#3b1a22", light: "#ffffff" } });
writeFileSync("photos-qr.png", png);
console.log(`Wrote photos-qr.png for ${url}`);
