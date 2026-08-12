import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

function crc32(buf) {
  let c = ~0
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i]
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  }
  return ~c >>> 0
}

function chunk(type, data) {
  const t = Buffer.from(type)
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])))
  return Buffer.concat([len, t, data, crc])
}

function rgbaPng(w, h, r, g, b) {
  const raw = Buffer.alloc((w * 4 + 1) * h)
  for (let y = 0; y < h; y++) {
    const row = y * (w * 4 + 1)
    raw[row] = 0
    for (let x = 0; x < w; x++) {
      const i = row + 1 + x * 4
      raw[i] = r
      raw[i + 1] = g
      raw[i + 2] = b
      raw[i + 3] = 255
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0)
  ihdr.writeUInt32BE(h, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))])
}

function write(rel, buf) {
  const abs = join(root, rel)
  mkdirSync(dirname(abs), { recursive: true })
  writeFileSync(abs, buf)
}

const colors = {
  latte: [51, 71, 61],
  americano: [42, 58, 50],
  pourover: [154, 123, 79],
  sesame: [20, 17, 15],
  birdsnest: [184, 150, 106],
  longan: [143, 74, 60],
  goji: [154, 123, 79],
  'sesame-paste': [20, 17, 15],
  giftbox: [51, 71, 61],
  nuts: [184, 150, 106],
  dripbag: [42, 58, 50],
  'goji-juice': [143, 74, 60],
}

for (const [name, [r, g, b]] of Object.entries(colors)) {
  write(`src/static/images/products/${name}.png`, rgbaPng(400, 500, r, g, b))
}

write('src/static/tab/dot-off.png', rgbaPng(81, 81, 212, 207, 199))
write('src/static/tab/dot-on.png', rgbaPng(81, 81, 51, 71, 61))
