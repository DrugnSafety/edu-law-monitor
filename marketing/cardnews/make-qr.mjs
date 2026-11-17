// 06_cta.html이 쓰는 QR 코드(qr.svg)를 만든다.
import { writeFile } from "node:fs/promises";
import QRCode from "qrcode";

const TARGET = "https://edu-law-monitor.vercel.app/?utm_source=cardnews";

const svg = await QRCode.toString(TARGET, {
  type: "svg",
  errorCorrectionLevel: "M",
  margin: 4, // 표준 여백(4모듈)
  color: { dark: "#16213A", light: "#FFFFFF" },
});

await writeFile(new URL("./qr.svg", import.meta.url), svg);
console.log(`qr.svg ← ${TARGET}`);
