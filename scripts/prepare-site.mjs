import fs from "node:fs";

fs.rmSync("_site", { recursive: true, force: true });
fs.mkdirSync("_site/dist", { recursive: true });
fs.copyFileSync("index.html", "_site/index.html");
fs.copyFileSync("dist/app.min.js", "_site/dist/app.min.js");
fs.writeFileSync("_site/.nojekyll", "");

