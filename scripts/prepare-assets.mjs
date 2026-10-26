import sharp from "sharp";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

await mkdir("art-source", { recursive: true });
for (const name of ["meadow", "farm-icons"]) {
  const source = `art-source/${name}.png`;
  await sharp(source)
    .webp({ quality: 88, effort: 6 })
    .toFile(`public/assets/${name}.webp`);
}
const source = (
  await Promise.all(
    ["src/main.ts", "src/game.ts"].map((path) => readFile(path, "utf8")),
  )
).join("");
const text =
  [...new Set(source.match(/[\p{Script=Han}，。！？～·、：；“”「」]/gu))].join(
    "",
  ) + "0123456789";
const url = `https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@600;700;800&text=${encodeURIComponent(text)}`;
try {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(20000),
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  if (!response.ok) throw new Error(`Font CSS ${response.status}`);
  const css = await response.text();
  const urls = [
    ...new Set([...css.matchAll(/url\(([^)]+)\)/g)].map((match) => match[1])),
  ];
  await mkdir("public/fonts", { recursive: true });
  let localCSS = css;
  for (let i = 0; i < urls.length; i++) {
    const font = await fetch(urls[i], { signal: AbortSignal.timeout(20000) });
    if (!font.ok) throw new Error(`Font file ${font.status}`);
    const filename = `meadow-serif-${i}.woff2`;
    await writeFile(
      join("public/fonts", filename),
      new Uint8Array(await font.arrayBuffer()),
    );
    localCSS = localCSS.replaceAll(urls[i], `./${filename}`);
  }
  localCSS = localCSS.replaceAll(
    "font-style: normal;",
    "font-style: normal; font-display: swap;",
  );
  await writeFile("public/fonts/meadow-serif.css", localCSS);
  console.log(
    `Saved ${urls.length} local font files, ${text.length} characters`,
  );
  const license = await fetch(
    "https://raw.githubusercontent.com/google/fonts/main/ofl/notoserifsc/OFL.txt",
    { signal: AbortSignal.timeout(20000) },
  );
  if (license.ok) await writeFile("public/fonts/OFL.txt", await license.text());
} catch (error) {
  console.log(`Optional font preparation skipped: ${error.message}`);
}
console.log(
  "WebP assets prepared. Original PNG files preserved in art-source/.",
);
