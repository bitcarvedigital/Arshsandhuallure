// Resize + convert the marketing photos to WebP with clean names.
// Originals: BitCarve-HQ/Clients/arshsandhuallure/assets/originals (and git history).
// Run: node scripts/optimize-images.mjs <originals-dir>
import sharp from 'sharp'
import { mkdir, stat } from 'node:fs/promises'
import path from 'node:path'

const src = process.argv[2]
if (!src) { console.error('usage: node scripts/optimize-images.mjs <originals-dir>'); process.exit(1) }
const out = path.resolve('public/images')
await mkdir(out, { recursive: true })

// [source file, output name, { width | height } max, quality]
const jobs = [
  ['hero.JPG', 'hero.webp', { width: 1920 }, 78],
  ['complimentary consultation BG.jpg', 'consultation-bg.webp', { width: 1600 }, 78],
  ['company ethos.jpg', 'company-ethos.webp', { height: 1400 }, 80],
  ['about arsh sandhu.jpeg', 'about-arsh-sandhu.webp', { height: 1400 }, 80],
  ['Bridal services.JPG', 'bridal-services.webp', { height: 1200 }, 80],
  ['event services.JPG', 'event-services.webp', { height: 1200 }, 80],
  ['editorial services.jpeg', 'editorial-services.webp', { height: 1200 }, 80],
  ...Array.from({ length: 10 }, (_, i) => {
    const n = i + 1
    const ext = [1, 2].includes(n) ? 'jpeg' : n === 7 ? 'jpg' : 'JPG'
    return [`Portfolio ${n}.${ext}`, `portfolio-${String(n).padStart(2, '0')}.webp`, { height: 1080 }, 80]
  }),
]

const dims = {}
for (const [file, name, size, quality] of jobs) {
  const input = path.join(src, file)
  const target = path.join(out, name)
  const info = await sharp(input).rotate().resize({ ...size, withoutEnlargement: true }).webp({ quality }).toFile(target)
  const { size: bytes } = await stat(target)
  dims[name] = { width: info.width, height: info.height, kb: Math.round(bytes / 1024) }
  console.log(`${name.padEnd(26)} ${info.width}x${info.height}  ${Math.round(bytes / 1024)} KB`)
}

// Open Graph card from the hero (1200x630)
const og = path.resolve('public/og-image.jpg')
const ogInfo = await sharp(path.join(src, 'hero.JPG')).rotate()
  .resize({ width: 1200, height: 630, fit: 'cover', position: sharp.strategy.attention })
  .jpeg({ quality: 82, mozjpeg: true }).toFile(og)
console.log(`og-image.jpg               ${ogInfo.width}x${ogInfo.height}  ${Math.round((await stat(og)).size / 1024)} KB`)
