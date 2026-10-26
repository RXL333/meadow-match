import sharp from "sharp";
import wawoff2 from "wawoff2";
import { readFile, writeFile } from "node:fs/promises";

// Production transcodes only. Original artwork and licensed font sources stay intact.
for (const name of ["meadow", "farm-icons"]) {
  await sharp(`art-source/${name}.png`)
    .webp({ quality: name === "meadow" ? 76 : 80, effort: 6 })
    .toFile(`public/assets/${name}.webp`);
}

const originalFont = await readFile("art-source/meadow-serif-subset.ttf");
const compressedFont = await wawoff2.compress(originalFont);
await writeFile("public/fonts/meadow-serif.woff2", compressedFont);
await writeFile("public/fonts/meadow-serif.css", `@font-face {
  font-family: "Noto Serif SC";
  font-style: normal;
  font-weight: 600 800;
  font-display: swap;
  src: url("./meadow-serif.woff2") format("woff2");
}
`);
console.log("WebP assets and a single WOFF2 font prepared from local originals.");
