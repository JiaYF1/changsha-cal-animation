import fs from "node:fs";

const files = ["index.html", "dist/app.min.js", "src/airport-grid.json"];
let ok = true;
for (const file of files) {
  if (!fs.existsSync(file) || fs.statSync(file).size === 0) {
    console.error(`Missing or empty: ${file}`);
    ok = false;
  }
}
const data = JSON.parse(fs.readFileSync("src/airport-grid.json", "utf8"));
if (data.cells.length < 1500) {
  console.error(`Airport mask too sparse: ${data.cells.length}`);
  ok = false;
}
const html = fs.readFileSync("index.html", "utf8");
for (const reference of ["dist/app.min.js", "sectionSvg", "scrubber", "resultsPanel"]) {
  if (!html.includes(reference)) {
    console.error(`Missing HTML contract: ${reference}`);
    ok = false;
  }
}
console.log(`Grid cells: ${data.cells.length}`);
console.log(`Build contract: ${ok ? "PASS" : "FAIL"}`);
if (!ok) process.exit(1);

