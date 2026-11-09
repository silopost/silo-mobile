// Rasterises the brand icon assets/icon.svg (a copy of silo-web/public/icons/icon.svg, the
// source of truth: keep the two identical) into the Expo icon PNGs referenced by app.json.
// Uses @resvg/resvg-js (devDependency, prebuilt renderer) and writes PNGs with node:zlib, so
// icon.png can be saved without an alpha channel (App Store rule). Run `npm run gen:icons`
// after changing icon.svg; the output is committed.
//   icon.png                     1024, opaque white background, icon at 80 %
//   android-icon-foreground.png  1024, transparent, icon at 52 %: its farthest point stays in the 66 dp safe circle
//   android-icon-monochrome.png  1024, transparent, the same shapes in plain white
//   favicon.png                  48, transparent (web)
//   splash-icon.png              1024, transparent, icon at full size
// The adaptive icon background is the plain colour adaptiveIcon.backgroundColor (#FFFFFF).
import { Buffer } from "node:buffer";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";
import { Resvg } from "@resvg/resvg-js";

const dir = resolve(dirname(fileURLToPath(import.meta.url)), "../assets");
const icon = readFileSync(resolve(dir, "icon.svg"), "utf8");
const mono = icon.replace(/fill="#[0-9A-Fa-f]{6}"/g, 'fill="#FFFFFF"');
const href = (svg) => `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;

/** RGBA pixels of `svg` centred on a `size` px square at `scale` of it, on `background` or none. */
function render(svg, size, scale, background) {
  const s = size * scale;
  const o = (size - s) / 2;
  const bg = background ? `<rect width="${size}" height="${size}" fill="${background}"/>` : "";
  const page = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">${bg}<image href="${href(svg)}" x="${o}" y="${o}" width="${s}" height="${s}"/></svg>`;
  return new Resvg(page).render().pixels; // premultiplied only where alpha < 255
}

function crc32(buf) {
  let c = ~0;
  for (const b of buf) {
    c ^= b;
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

/** PNG of RGBA `pixels`; `alpha: false` drops the alpha channel (colour type 2). */
function png(size, pixels, alpha = true) {
  const ch = alpha ? 4 : 3;
  const row = size * ch + 1;
  const raw = Buffer.alloc(row * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const a = pixels[i + 3];
      const j = y * row + 1 + x * ch;
      // resvg returns premultiplied RGBA; PNG wants straight alpha.
      for (let c = 0; c < 3; c++)
        raw[j + c] = a ? Math.min(255, Math.round((pixels[i + c] * 255) / a)) : 0;
      if (alpha) raw[j + 3] = a;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr.set([8, alpha ? 6 : 2, 0, 0, 0], 8);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const write = (name, size, ...args) => {
  const [svg, scale, bg, alpha] = args;
  writeFileSync(resolve(dir, name), png(size, render(svg, size, scale, bg), alpha));
};
write("icon.png", 1024, icon, 0.8, "#ffffff", false);
write("android-icon-foreground.png", 1024, icon, 0.52);
write("android-icon-monochrome.png", 1024, mono, 0.52);
write("favicon.png", 48, icon, 1);
write("splash-icon.png", 1024, icon, 1);
console.log(`icons written to ${dir}`);
