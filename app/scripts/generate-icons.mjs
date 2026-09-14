// Emits real, valid PNG icons for the PWA manifest. No placeholders, no zero-byte files.
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, '..', 'public', 'icons');

const BRAND = [16, 69, 126]; // #10457e
const MARK = [255, 255, 255];

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function png(size, { padding = 0 } = {}) {
  const rows = [];
  const bar = Math.round(size * 0.12);
  const barTop = Math.round(size * 0.44);
  const inset = Math.round(size * padding);
  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 3);
    row[0] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      const inField = x >= inset && x < size - inset && y >= inset && y < size - inset;
      const inMark =
        inField &&
        y >= barTop &&
        y < barTop + bar &&
        x >= inset + Math.round(size * 0.14) &&
        x < size - inset - Math.round(size * 0.14);
      const colour = !inField ? BRAND : inMark ? MARK : BRAND;
      row[1 + x * 3] = colour[0];
      row[2 + x * 3] = colour[1];
      row[3 + x * 3] = colour[2];
    }
    rows.push(row);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: truecolour
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(Buffer.concat(rows), { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

mkdirSync(outDir, { recursive: true });

const files = [
  ['icon-192.png', png(192)],
  ['icon-512.png', png(512)],
  ['icon-maskable-512.png', png(512, { padding: 0.1 })],
  ['apple-touch-icon.png', png(180)],
];

for (const [name, data] of files) {
  writeFileSync(join(outDir, name), data);
  console.log(`wrote ${name} (${data.length} bytes)`);
}

const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="10" fill="#10457e"/><rect x="12" y="28" width="40" height="8" rx="2" fill="#ffffff"/></svg>\n`;
writeFileSync(join(here, '..', 'public', 'favicon.svg'), favicon);
console.log('wrote favicon.svg');
