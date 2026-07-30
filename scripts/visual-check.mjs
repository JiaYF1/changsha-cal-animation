import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright-core";

const edge = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
fs.mkdirSync("checks", { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: edge });
const viewports = [
  { name: "desktop", width: 1920, height: 1080, times: [0, 3, 8, 16, 25, 36, 45, 51] },
  { name: "compact", width: 900, height: 700, times: [25, 36, 51] },
];
let failed = false;

for (const config of viewports) {
  const page = await browser.newPage({ viewport: { width: config.width, height: config.height } });
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("http://127.0.0.1:8765/index.html", { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__ready === true);

  for (const time of config.times) {
    await page.evaluate(value => window.__seek(value), time);
    await page.waitForTimeout(80);
    const metrics = await page.evaluate(() => {
      const canvas = document.querySelector("#scene");
      const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
      let pixels;
      let nonDark = 0;
      if (gl) {
        const w = canvas.width, h = canvas.height;
        pixels = new Uint8Array(w * h * 4);
        gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
        for (let y = 0; y < h; y += 24) {
          for (let x = 0; x < w; x += 24) {
            const offset = (y * w + x) * 4;
            if (pixels[offset] + pixels[offset + 1] + pixels[offset + 2] > 45) nonDark++;
          }
        }
      }
      const interactive = [...document.querySelectorAll("button,input")].map(el => el.getBoundingClientRect());
      const overlaps = interactive.some((a, i) => interactive.some((b, j) => j > i && a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top));
      return { hasWebGL: !!gl, nonDark, bodyW: document.body.scrollWidth, bodyH: document.body.scrollHeight, innerW: innerWidth, innerH: innerHeight, overlaps };
    });
    console.log(`${config.name} t=${time}:`, metrics);
    if (!metrics.hasWebGL || metrics.nonDark < 1 || metrics.bodyW > metrics.innerW || metrics.bodyH > metrics.innerH || metrics.overlaps) failed = true;
    if (config.name === "desktop") await page.screenshot({ path: `checks/frame-${String(time).padStart(2, "0")}.png` });
  }
  if (errors.length) {
    console.error(`${config.name} page errors:`, errors);
    failed = true;
  }
  await page.close();
}

const offlinePage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const offlineErrors = [];
offlinePage.on("pageerror", error => offlineErrors.push(error.message));
await offlinePage.goto(pathToFileURL(path.resolve("index.html")).href, { waitUntil: "load" });
await offlinePage.waitForFunction(() => window.__ready === true);
const offlineState = await offlinePage.evaluate(() => ({
  title: document.title,
  canvasWidth: document.querySelector("#scene").width,
  bundleLoaded: typeof window.__seek === "function",
}));
console.log("offline file:", offlineState);
if (offlineErrors.length || !offlineState.bundleLoaded || offlineState.canvasWidth < 100) failed = true;
await offlinePage.close();

await browser.close();
if (failed) process.exit(1);
console.log("Visual check: PASS");
