// HTML 카드 → PNG. Playwright Chromium(헤드리스)으로 렌더한다(deviceScaleFactor 1).
// 사용: node render.mjs [파일명 일부…]   예) node render.mjs 01 thumb
// 결과: png/*.png, 그리고 글자 크기·넘침 점검 표를 출력한다.
import { mkdir } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import { chromium } from "playwright";

const DIR = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(DIR, "png");

const CARDS = [
  { html: "01_cover.html", png: "01_cover.png", w: 1080, h: 1350 },
  { html: "02_gap.html", png: "02_gap.png", w: 1080, h: 1350 },
  { html: "03_progress.html", png: "03_progress.png", w: 1080, h: 1350 },
  { html: "04_whats_left.html", png: "04_whats_left.png", w: 1080, h: 1350 },
  { html: "05_how_you_help.html", png: "05_how_you_help.png", w: 1080, h: 1350 },
  { html: "06_cta.html", png: "06_cta.png", w: 1080, h: 1350 },
  { html: "thumb_1080.html", png: "thumb_1080.png", w: 1080, h: 1080 },
];

const only = process.argv.slice(2);
const targets = only.length ? CARDS.filter((c) => only.some((o) => c.html.includes(o))) : CARDS;

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
const ctx = await browser.newContext({ deviceScaleFactor: 1, viewport: { width: 1080, height: 1350 } });
const page = await ctx.newPage();
let failed = false;

for (const c of targets) {
  await page.setViewportSize({ width: c.w, height: c.h });
  await page.goto(pathToFileURL(path.join(DIR, c.html)).href, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);

  const audit = await page.evaluate(() => {
    // 실제로 내려받은 웹폰트 수(유니코드 구간별 조각)
    const loaded = {};
    for (const f of document.fonts) if (f.status === "loaded") loaded[f.family.replace(/"/g, "")] = (loaded[f.family.replace(/"/g, "")] || 0) + 1;

    // 글자가 직접 들어 있는 요소의 글꼴 크기
    const sizes = [];
    const card = document.querySelector(".card").getBoundingClientRect();
    const overflow = [];
    for (const el of document.querySelectorAll(".card *")) {
      // SVG 안 글자(표식 '12', 도장 '의결')는 viewBox 단위라 화면 크기와 다르다 → 제외
      const inSvg = !!el.closest("svg");
      const own = !inSvg && [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
      const r = el.getBoundingClientRect();
      const name = el.getAttribute("class") || el.tagName;
      if (own) sizes.push({ px: parseFloat(getComputedStyle(el).fontSize), text: el.textContent.trim().slice(0, 24) });
      if (r.width && (r.right > card.right + 0.5 || r.bottom > card.bottom + 0.5 || r.left < card.left - 0.5)) overflow.push(name);
      if (!inSvg && el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflow !== "visible") overflow.push(`${name}(scroll)`);
    }
    // 원고지 면 안쪽이 넘쳤는지(내용 합이 면 높이를 넘음)
    const sheet = document.querySelector(".sheet");
    if (sheet && sheet.scrollHeight > sheet.clientHeight + 1) overflow.push(`sheet +${sheet.scrollHeight - sheet.clientHeight}px`);
    sizes.sort((a, b) => a.px - b.px);
    return { loaded, min: sizes[0], small: sizes.filter((s) => s.px < 34), overflow };
  });

  const gowun = audit.loaded["Gowun Batang"] || 0;
  const pret = audit.loaded["Pretendard Variable"] || 0;
  if (!gowun || !pret) failed = true;
  if (audit.overflow.length) failed = true;

  await page.screenshot({ path: path.join(OUT, c.png), clip: { x: 0, y: 0, width: c.w, height: c.h } });
  console.log(`${c.png}  fonts: Gowun ${gowun} · Pretendard ${pret}  min ${audit.min?.px}px「${audit.min?.text}」`);
  if (audit.small.length) console.log(`   <34px: ${[...new Set(audit.small.map((s) => `${s.px}px「${s.text}」`))].join(" / ")}`);
  if (audit.overflow.length) console.log(`   OVERFLOW: ${audit.overflow.join(", ")}`);
}

await browser.close();
if (failed) {
  console.error("점검 실패: 웹폰트 미적용 또는 넘침");
  process.exit(1);
}
