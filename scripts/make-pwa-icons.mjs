import { deflateSync } from 'node:zlib'
import { writeFileSync } from 'node:fs'

const BG = [0x2f, 0x6b, 0x80, 255]
const PAPER = [0xfb, 0xfa, 0xf2, 255]
const DASH = [0xa3, 0xcc, 0xda, 255]

function crc32(buf) {
  let c = ~0
  for (const b of buf) {
    c ^= b
    for (let i = 0; i < 8; i++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1))
  }
  return ~c >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const name = Buffer.from(type)
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([name, data])))
  return Buffer.concat([len, name, data, crc])
}

function sdRoundRect(px, py, hw, hh, r) {
  const x = Math.abs(px) - hw + r
  const y = Math.abs(py) - hh + r
  return Math.min(Math.max(x, y), 0) + Math.hypot(Math.max(x, 0), Math.max(y, 0)) - r
}

function sample(x, y, s) {
  const px = x + 0.5 - s / 2
  const py = y + 0.5 - s / 2
  const ticket = sdRoundRect(px, py, s * 0.34, s * 0.2, s * 0.055)
  const notch = Math.min(Math.hypot(px + s * 0.34, py), Math.hypot(px - s * 0.34, py)) - s * 0.062
  const shape = Math.max(ticket, -notch)
  const cover = Math.min(1, Math.max(0, 0.5 - shape))
  const color = BG.map((channel, i) =>
    i === 3 ? 255 : Math.round(channel + (PAPER[i] - channel) * cover),
  )
  const onDash =
    cover > 0.9 &&
    Math.abs(py) < Math.max(1, s * 0.012) &&
    Math.abs(px) < s * 0.2 &&
    Math.floor((px + s) / (s * 0.05)) % 2 === 0
  return onDash ? DASH : color
}

function png(size) {
  const stride = size * 4 + 1
  const raw = Buffer.alloc(stride * size)
  for (let y = 0; y < size; y++) {
    raw[y * stride] = 0
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = sample(x, y, size)
      const i = y * stride + 1 + x * 4
      raw[i] = r
      raw[i + 1] = g
      raw[i + 2] = b
      raw[i + 3] = a
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

const files = {
  'public/favicon-32.png': 32,
  'public/apple-touch-icon.png': 180,
  'public/icon-192.png': 192,
  'public/icon-512.png': 512,
}

for (const [path, size] of Object.entries(files)) {
  writeFileSync(path, png(size))
}
