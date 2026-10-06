/*
 * Builds the 张 loader asset from a running-script reference (src/assets/zhang/reference.png).
 *
 *   npm run build:zhang                          # writes src/assets/zhang/zhang.json
 *   ZHANG_PREVIEW=ink.png npm run build:zhang    # also writes the thresholded ink, for plotting
 *
 * zhang.json:
 *   - d:        the reference traced to a vector outline (keeps its ragged, dry-brush edges)
 *   - timeMap:  a half-resolution greyscale PNG; each pixel is when the brush reaches it
 *               (0 = first touch, 255 = end of writing). The loader thresholds it over time.
 *   - target:   solid ink near the centre, for the zoom to dive into
 *
 * Also writes public/favicon.svg: the same ink on a white square, used as the site icon
 * and the header mark.
 *
 * Stroke paths below are plotted by hand over the reference, in writing order.
 */
import fs from "node:fs";
import { createRequire } from "node:module";
import { PNG } from "pngjs";
import { strokeRhythm, timeAtFrac, type Pt } from "./rhythm.ts";

const require = createRequire(import.meta.url);
const potrace = require("potrace");

const SRC = new URL("../src/assets/zhang/reference.png", import.meta.url);
const OUT = new URL("../src/assets/zhang/zhang.json", import.meta.url);
const ICON = new URL("../public/favicon.svg", import.meta.url);
const INK_THRESHOLD = 128; // ink vs paper cut-off (0-255 luminance)

type Stroke = {
  name: string;
  path: Pt[];
  lift: number; // ms the brush is off the paper before the next stroke
  reach?: number; // how far this stroke claims ink around its path
  press?: number;
  pace?: number;
};

// Writing order: 弓 (横折, 横, 竖折折钩), then 長 (横, 竖, 横, 横, long 横, 竖提, 撇, 捺).
// Writing order: 弓 flows as one movement (横折, 横, 竖折折钩), then 长:
// 竖提, the 牵丝 thread off the top of the 竖 into the 撇, then 横, then 捺.
const STROKES: Stroke[] = [
  {
    name: "横折",
    path: [[78, 198], [140, 188], [200, 168], [250, 138], [290, 124], [318, 150], [305, 195], [268, 235], [220, 268], [155, 302]],
    lift: 40,
  },
  { name: "横", path: [[135, 318], [200, 322], [275, 318]], lift: 50 },
  {
    name: "竖折折钩",
    path: [[275, 322], [250, 355], [212, 388], [165, 420], [125, 462], [175, 440], [235, 422], [292, 415], [275, 470], [260, 530], [242, 585], [222, 632], [195, 656], [150, 648], [105, 622]],
    lift: 260,
  },
  {
    name: "竖提",
    path: [[418, 50], [410, 120], [400, 200], [392, 300], [386, 400], [386, 500], [392, 600], [405, 665], [450, 638], [488, 580], [510, 505]],
    lift: 120,
  },
  { name: "牵丝", path: [[438, 58], [465, 110], [492, 165], [503, 195]], lift: 0, reach: 0.35, press: 0, pace: 0.5 },
  {
    name: "撇",
    path: [[510, 108], [550, 140], [592, 182], [560, 218], [518, 252], [470, 287], [430, 322]],
    lift: 90,
  },
  { name: "横", path: [[420, 395], [500, 378], [560, 358], [610, 345], [632, 352]], lift: 110 },
  { name: "捺", path: [[392, 440], [470, 452], [535, 472], [635, 508], [745, 552]], lift: 0, pace: 1.5 },
];

// Paper carved back into the reference before tracing, where ink pooled across strokes that
// should read separately. Each is a round-capped path of bare paper; `widths` (px) taper along it.
const CARVES: { name: string; path: Pt[]; widths: number[] }[] = [
  // The end of 弓's lower 横 bled into 长's 竖; open a gap between the two notches,
  // widest where the brush would have lifted off the end of the 横.
  { name: "弓 | 长", path: [[321, 397], [326, 420], [333, 447], [343, 481]], widths: [12, 19, 21, 15] },
];

const DRAW_TIME = 3000; // first touch to last lift
const EDGE_LAG = 30; // ms: ink at the edge of a stroke arrives a touch after the centre
const CROSSING = 14; // px: paths this close to the nearest count as passing through the same ink

// --- Reference -------------------------------------------------------------------------

const src = PNG.sync.read(fs.readFileSync(SRC));
const { width: W, height: H } = src;
const ink = new Uint8Array(W * H);
for (let i = 0; i < W * H; i++) {
  const lum = 0.299 * src.data[i * 4] + 0.587 * src.data[i * 4 + 1] + 0.114 * src.data[i * 4 + 2];
  ink[i] = src.data[i * 4 + 3] > 128 && lum < INK_THRESHOLD ? 1 : 0;
}

for (const carve of CARVES) {
  const r = Math.max(...carve.widths) / 2;
  const xs = carve.path.map((p) => p[0]);
  const ys = carve.path.map((p) => p[1]);
  for (let y = Math.floor(Math.min(...ys) - r); y <= Math.max(...ys) + r; y++)
    for (let x = Math.floor(Math.min(...xs) - r); x <= Math.max(...xs) + r; x++) {
      if (x < 0 || y < 0 || x >= W || y >= H) continue;
      let inside = false;
      for (let j = 1; j < carve.path.length && !inside; j++) {
        const [ax, ay] = carve.path[j - 1];
        const [bx, by] = carve.path[j];
        const dx = bx - ax;
        const dy = by - ay;
        const u = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)));
        const half = (carve.widths[j - 1] + (carve.widths[j] - carve.widths[j - 1]) * u) / 2;
        inside = Math.hypot(x - (ax + u * dx), y - (ay + u * dy)) <= half;
      }
      if (inside) ink[y * W + x] = 0;
    }
}

// Black-on-white copy of the thresholded ink: what gets traced, and the preview.
const binary = new PNG({ width: W, height: H });
for (let i = 0; i < W * H; i++) {
  binary.data.fill(ink[i] ? 0 : 255, i * 4, i * 4 + 3);
  binary.data[i * 4 + 3] = 255;
}
const binaryPng = PNG.sync.write(binary);

if (process.env.ZHANG_PREVIEW) {
  fs.writeFileSync(process.env.ZHANG_PREVIEW, binaryPng);
  console.log(`preview ${W}×${H} → ${process.env.ZHANG_PREVIEW}`);
  if (!STROKES.length) process.exit(0);
}

// --- Timeline --------------------------------------------------------------------------

const rhythms = STROKES.map((s) => strokeRhythm(s.path, { press: s.press ?? 60, pace: s.pace ?? 1 }));
const fixed = rhythms.reduce((a, r) => a + r.fixed, 0) + STROKES.reduce((a, s) => a + s.lift, 0);
const msPerWeight = (DRAW_TIME - fixed) / rhythms.reduce((a, r) => a + r.moveWeight, 0);

let cursor = 0;
const timed = STROKES.map((s, i) => {
  const { keys, duration } = rhythms[i].keys(msPerWeight);
  const seg = s.path.slice(1).map((p, j) => Math.hypot(p[0] - s.path[j][0], p[1] - s.path[j][1]));
  const t = { ...s, keys, start: cursor, duration, seg, length: seg.reduce((a, b) => a + b, 0) };
  cursor += duration + s.lift;
  return t;
});
const drawEnd = cursor;

/** Nearest point on a stroke path: distance and fraction along it. */
function project(s: (typeof timed)[number], x: number, y: number) {
  let best = { d: Infinity, frac: 0 };
  let along = 0;
  for (let j = 0; j < s.seg.length; j++) {
    const [ax, ay] = s.path[j];
    const [bx, by] = s.path[j + 1];
    const dx = bx - ax;
    const dy = by - ay;
    const u = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1)));
    const dist = Math.hypot(x - (ax + u * dx), y - (ay + u * dy));
    if (dist < best.d) best = { d: dist, frac: (along + u * s.seg[j]) / s.length };
    along += s.seg[j];
  }
  return best;
}

/**
 * When the brush reaches (x, y). The nearest stroke path claims the ink, except where
 * strokes cross: ink there appears with whichever nearby stroke passes first.
 */
function arrival(x: number, y: number) {
  const hits = timed.map((s) => {
    const { d: dist, frac } = project(s, x, y);
    return { score: dist / (s.reach ?? 1), t: s.start + timeAtFrac(s.keys, frac) + Math.min(1, dist / 45) * EDGE_LAG };
  });
  const nearest = Math.min(...hits.map((h) => h.score));
  return Math.min(...hits.filter((h) => h.score <= nearest + CROSSING).map((h) => h.t));
}

// --- Time map --------------------------------------------------------------------------

// Half resolution; the browser's bilinear upscale and a light blur keep the front smooth.
const TW = Math.ceil(W / 2);
const TH = Math.ceil(H / 2);
const times = new Float32Array(TW * TH);
for (let y = 0; y < TH; y++)
  for (let x = 0; x < TW; x++) times[y * TW + x] = Math.min(1, arrival(x * 2 + 1, y * 2 + 1) / drawEnd);

function blur(src: Float32Array, w: number, h: number) {
  const out = new Float32Array(src.length);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let sum = 0;
      let n = 0;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx;
          const yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
          sum += src[yy * w + xx];
          n++;
        }
      out[y * w + x] = sum / n;
    }
  return out;
}
const smoothed = blur(blur(times, TW, TH), TW, TH);
const map = new PNG({ width: TW, height: TH });
for (let i = 0; i < TW * TH; i++) {
  map.data[i * 4] = map.data[i * 4 + 1] = map.data[i * 4 + 2] = Math.round(smoothed[i] * 255);
  map.data[i * 4 + 3] = 255;
}
const timeMap = "data:image/png;base64," + PNG.sync.write(map, { colorType: 0 }).toString("base64");

// --- Zoom target -----------------------------------------------------------------------

// Chamfer distance transform of the ink, to find solid ink near the centre for the zoom.
const dist = new Float32Array(W * H).map((_, i) => (ink[i] ? Infinity : 0));
const at = (x: number, y: number) => (x < 0 || y < 0 || x >= W || y >= H ? 0 : dist[y * W + x]);
for (let y = 0; y < H; y++)
  for (let x = 0; x < W; x++) {
    const i = y * W + x;
    if (dist[i]) dist[i] = Math.min(dist[i], at(x - 1, y) + 1, at(x, y - 1) + 1, at(x - 1, y - 1) + 1.414, at(x + 1, y - 1) + 1.414);
  }
for (let y = H - 1; y >= 0; y--)
  for (let x = W - 1; x >= 0; x--) {
    const i = y * W + x;
    if (dist[i]) dist[i] = Math.min(dist[i], at(x + 1, y) + 1, at(x, y + 1) + 1, at(x + 1, y + 1) + 1.414, at(x - 1, y + 1) + 1.414);
  }
let target = { x: W / 2, y: H / 2, r: 0, score: -Infinity };
for (let y = 0; y < H; y++)
  for (let x = 0; x < W; x++) {
    const r = dist[y * W + x];
    const score = r - 0.35 * Math.hypot(x - W / 2, y - H / 2);
    if (r > 0 && score > target.score) target = { x, y, r, score };
  }

// --- Vector outline ---------------------------------------------------------------------

const svg: string = await new Promise((resolve, reject) =>
  potrace.trace(binaryPng, { threshold: 128, turdSize: 24, optTolerance: 0.35 }, (err: Error, out: string) =>
    err ? reject(err) : resolve(out),
  ),
);
const d = svg.match(/ d="([^"]+)"/)?.[1];
if (!d) throw new Error("potrace produced no path");

// --- Output ----------------------------------------------------------------------------

fs.writeFileSync(
  OUT,
  JSON.stringify({
    width: W,
    height: H,
    d,
    timeMap,
    drawEnd: Math.round(drawEnd),
    target: { x: target.x, y: target.y, r: Math.round(target.r * 10) / 10 },
    strokes: timed.map((s) => ({ name: s.name, start: Math.round(s.start), duration: Math.round(s.duration) })),
  }),
);

// Icon: a square around the ink's bounding box, with a little paper margin.
let [bx0, by0, bx1, by1] = [W, H, 0, 0];
for (let y = 0; y < H; y++)
  for (let x = 0; x < W; x++)
    if (ink[y * W + x]) [bx0, by0, bx1, by1] = [Math.min(bx0, x), Math.min(by0, y), Math.max(bx1, x), Math.max(by1, y)];
const side = Math.max(bx1 - bx0, by1 - by0) * 1.12;
const ix = (bx0 + bx1) / 2 - side / 2;
const iy = (by0 + by1) / 2 - side / 2;
const vb = [ix, iy, side, side].map((v) => Math.round(v)).join(" ");
fs.writeFileSync(
  ICON,
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}"><rect x="${Math.round(ix)}" y="${Math.round(iy)}" width="${Math.round(side)}" height="${Math.round(side)}" fill="#fff"/><path fill="#0b0a09" fill-rule="evenodd" d="${d}"/></svg>\n`,
);

console.log(`zhang.json: ${W}×${H}, writing ${Math.round(drawEnd)}ms, path ${(d.length / 1024).toFixed(1)}KB, timeMap ${(timeMap.length / 1024).toFixed(1)}KB`);
console.log("target", target);
for (const s of timed) console.log(`  ${s.name.padEnd(4, "　")} ${Math.round(s.start)}ms +${Math.round(s.duration)}ms`);
