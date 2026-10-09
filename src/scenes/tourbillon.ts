import {
  BufferGeometry,
  Color,
  DoubleSide,
  EdgesGeometry,
  ExtrudeGeometry,
  Float32BufferAttribute,
  Group,
  LineBasicMaterial,
  LineSegments,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  Path,
  Shape,
  Vector2,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { clamp01, easeInOutCubic, easeOutCubic } from "../lib/motion";
import { createStage } from "./stage";

/*
 * A tourbillon wristwatch, drawn in line, assembling itself part by part from an exploded
 * view.
 *
 * The movement goes together first: mainplate with Côtes de Genève, barrel and mainspring,
 * barrel bridge with ratchet, crown wheel and click, the gear train under its bridge, then
 * the tourbillon (cage, escapement, balance, hairspring), with ruby jewels and slotted
 * screws. Then the watch closes round it: cushion case with integrated lugs, caseback,
 * crown, waffle dial (open at six onto the tourbillon), hands, flat bezel, crystal and an
 * articulated link bracelet.
 *
 * Case proportions follow a 40 mm integrated-bracelet sports watch in forged carbon
 * (cushion case, flat round bezel, ~11 mm thick, small crown); the carbon is suggested by
 * faint fibre strokes. It is a wireframe throughout: each part's solid only hides the
 * lines behind it once the part has seated, like a hidden-line drawing. Once whole the
 * watch runs: the hands show the viewer's local time (seconds in tenths), the cage turns,
 * the balance swings, the escape wheel ticks and the train turns.
 */

// --- Timeline (ms) ---------------------------------------------------------------------

const STAGGER = 260; // between parts starting
const APPEAR = [0, 450]; // the part fades in above its place
const ASSEMBLE = [200, 1100]; // and drops into it
const LIFT = 0.8; // exploded-view height a part forms at

const DISTANCE = 5.6; // camera to watch, on landscape screens
const BALANCE_HZ = 2;
const CAGE_PERIOD = 12_000; // a real cage turns once a minute; quicker reads better here
const TRAIN_SPEED = 0.6; // centre wheel, rad/s

// --- Palette --------------------------------------------------------------------------------

const EDGE = new Color(0xd8d8d8);
const RUBY = new Color(0xc8312b); // the site's seal red: jewels and the seconds hand
const ENGRAVED = new Color(0x4a4a4a); // finishing cut into surfaces: stripes, waffle

const TAU = Math.PI * 2;
const v2 = (x: number, y: number) => new Vector2(x, y);
const polar = (r: number, a: number, c = v2(0, 0)) => v2(c.x + Math.cos(a) * r, c.y + Math.sin(a) * r);

/** Cheap integer hash → [0, 1). */
function rand(n: number) {
  n = Math.imul(n ^ (n >>> 16), 0x45d9f3b);
  n = Math.imul(n ^ (n >>> 16), 0x45d9f3b);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

// --- Layout ---------------------------------------------------------------------------------

// Movement-local (the movement is scaled into the case below).
const BARREL = v2(-0.42, 0.38);
const CENTER = polar(0.63, -0.35, BARREL); // meshes with the barrel
const THIRD = polar(0.47, -1.31, CENTER); // meshes with the centre wheel
const CAGE = v2(-0.02, -0.47); // the tourbillon, at six o'clock
const CROWN_WHEEL = polar(0.35, -0.05, BARREL); // meshes with the ratchet, toward the crown
const ESCAPE = v2(0.13, 0.04); // inside the cage, cage-local
const PALLET = v2(0.075, 0.023);

const MOVEMENT_SCALE = 0.72;
const MOVEMENT_Z = -0.24; // mainplate top, in watch units

// Watch-level.
const DIAL_R = 0.76;
const LUG_HALF = 0.66; // integrated lugs: half-width where the strap joins
const LUG_END = 1.12;
const APERTURE = { c: CAGE.clone().multiplyScalar(MOVEMENT_SCALE), r: 0.34 * MOVEMENT_SCALE };

// --- 2D outlines ----------------------------------------------------------------------------

function circle(r: number, c = v2(0, 0), shape = false) {
  const p = shape ? new Shape() : new Path();
  p.absarc(c.x, c.y, r, 0, TAU, false);
  return p;
}

const disc = (r: number, c = v2(0, 0)) => circle(r, c, true) as Shape;

function gearOutline(r: number, teeth: number, depth: number) {
  const pts: Vector2[] = [];
  const p = TAU / teeth;
  for (let k = 0; k < teeth; k++) {
    const a = k * p;
    pts.push(polar(r - depth, a), polar(r, a + 0.22 * p), polar(r, a + 0.5 * p), polar(r - depth, a + 0.72 * p));
  }
  return new Shape(pts);
}

/** Escape wheel: hooked club teeth. */
function escapeOutline(r: number, teeth: number) {
  const pts: Vector2[] = [];
  const p = TAU / teeth;
  for (let k = 0; k < teeth; k++) {
    const a = k * p;
    pts.push(polar(r * 0.72, a), polar(r, a + 0.12 * p), polar(r * 0.94, a + 0.24 * p), polar(r * 0.72, a + 0.8 * p));
  }
  return new Shape(pts);
}

/** Ratchet wheel: sawtooth teeth that only let the mainspring wind one way. */
function ratchetOutline(r: number, teeth: number, depth: number) {
  const pts: Vector2[] = [];
  const p = TAU / teeth;
  for (let k = 0; k < teeth; k++) pts.push(polar(r - depth, k * p), polar(r, (k + 0.85) * p));
  return new Shape(pts);
}

/** Windows between `n` spokes, from the hub out to the rim. */
function spokeWindows(n: number, hub: number, rim: number, halfW: number, phase = 0) {
  const holes: Path[] = [];
  const dRim = Math.asin(halfW / rim);
  const dHub = Math.asin(halfW / hub);
  for (let k = 0; k < n; k++) {
    const a0 = phase + (k * TAU) / n;
    const a1 = a0 + TAU / n;
    const h = new Path();
    h.moveTo(...polar(rim, a0 + dRim).toArray());
    h.absarc(0, 0, rim, a0 + dRim, a1 - dRim, false);
    h.lineTo(...polar(hub, a1 - dHub).toArray());
    h.absarc(0, 0, hub, a1 - dHub, a0 + dHub, true);
    holes.push(h);
  }
  return holes;
}

/** A wheel: toothed (or plain) rim, spokes, hub and pivot hole. */
function wheel(r: number, o: { teeth?: number; depth?: number; spokes?: number; rim?: number; hub?: number }) {
  const shape = o.teeth ? gearOutline(r, o.teeth, o.depth ?? 0.015) : disc(r);
  const rim = o.rim ?? r * 0.82;
  const hub = o.hub ?? r * 0.22;
  if (o.spokes) shape.holes.push(...spokeWindows(o.spokes, hub, rim, Math.max(0.008, r * 0.05)));
  shape.holes.push(circle(Math.min(0.018, hub * 0.4)));
  return shape;
}

/**
 * A bridge: a bar from p0 to p1 with round ends and, optionally, a round boss part-way along
 * it (where it carries a jewel). Built in the bar's own frame, then placed.
 */
function bridge(p0: Vector2, p1: Vector2, w: number, boss?: { at: number; r: number }) {
  const len = p0.distanceTo(p1);
  const pts: Vector2[] = [];
  const arc = (c: Vector2, r: number, a0: number, a1: number) => {
    const n = Math.max(4, Math.ceil(Math.abs(a1 - a0) / 0.12));
    for (let i = 0; i <= n; i++) pts.push(polar(r, a0 + ((a1 - a0) * i) / n, c));
  };
  const s = boss && boss.r > w ? Math.sqrt(boss.r * boss.r - w * w) : 0;
  const al = boss && boss.r > w ? Math.asin(w / boss.r) : 0;
  const bc = v2(boss?.at ?? 0, 0);

  arc(v2(0, 0), w, Math.PI / 2, (3 * Math.PI) / 2); // start cap, round the back
  if (s) arc(bc, boss!.r, Math.PI + al, TAU - al); // under the boss
  arc(v2(len, 0), w, -Math.PI / 2, Math.PI / 2); // end cap
  if (s) arc(bc, boss!.r, al, Math.PI - al); // over the boss

  const angle = Math.atan2(p1.y - p0.y, p1.x - p0.x);
  const place = (p: Vector2) => p.rotateAround(v2(0, 0), angle).add(p0);
  return new Shape(pts.map(place));
}

/**
 * Case outline: a cushion (superellipse) with the lugs carried straight out at twelve and
 * six, where the strap integrates. Subdivided so the lugs can bend toward the wrist.
 */
function caseOutline() {
  const a = 1.0;
  const b = 0.92;
  const n = 4;
  const lugX = 0.74;
  const se = (t: number) => {
    const c = Math.cos(t);
    const s = Math.sin(t);
    return v2(a * Math.sign(c) * Math.abs(c) ** (2 / n), b * Math.sign(s) * Math.abs(s) ** (2 / n));
  };
  const pts: Vector2[] = [];
  const lug = (sy: number) => {
    // From the shoulder at +x (sy=1) or -x (sy=-1), out along the lug and back.
    const side = (x0: number, x1: number, y0: number) =>
      Array.from({ length: 9 }, (_, i) => v2(x0 + ((x1 - x0) * i) / 8, sy * (y0 + ((LUG_END - y0) * i) / 8)));
    const y0 = b * (1 - lugX ** n) ** (1 / n);
    const out = side(sy * lugX, sy * LUG_HALF, y0);
    const back = side(-sy * lugX, -sy * LUG_HALF, y0).reverse();
    return [...out, ...back];
  };
  let inTop = false;
  let inBottom = false;
  for (let k = 0; k < 360; k++) {
    const p = se((k / 360) * TAU);
    if (Math.abs(p.x) < 0.74 && p.y > 0) {
      if (!inTop) pts.push(...lug(1));
      inTop = true;
      continue;
    }
    if (Math.abs(p.x) < 0.74 && p.y < 0) {
      if (!inBottom) pts.push(...lug(-1));
      inBottom = true;
      continue;
    }
    pts.push(p);
  }
  return new Shape(pts);
}

// --- 3D parts: solids (faces + edges) and engraved lines ------------------------------------

/** Line geometry, carrying the solid faces it outlines (used only to hide lines behind them). */
type Piece = BufferGeometry & { userData: { faces?: BufferGeometry[] } };

function paint(g: BufferGeometry, color: Color) {
  const n = g.getAttribute("position").count;
  const c = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) c.set([color.r, color.g, color.b], i * 3);
  g.setAttribute("color", new Float32BufferAttribute(c, 3));
  return g;
}

/** An extruded solid: its feature edges, carrying its faces. */
function solid(shape: Shape, depth: number, z: number): Piece {
  const g = new ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 40 }).translate(0, 0, z);
  const e = new EdgesGeometry(g, 25) as Piece;
  e.userData.faces = [g];
  return e;
}

/** Applies a transform to a piece's edges and faces alike. */
function xf(g: Piece, m: Matrix4) {
  g.applyMatrix4(m);
  for (const f of g.userData.faces ?? []) f.applyMatrix4(m);
  return g;
}

function lines(points: number[]): Piece {
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(points, 3));
  return g as Piece;
}

/** A circle drawn as a line loop. */
function hoop(r: number, z: number, c = v2(0, 0), n = 64) {
  const pts: number[] = [];
  for (let k = 0; k < n; k++) {
    const a = polar(r, (k * TAU) / n, c);
    const b = polar(r, ((k + 1) * TAU) / n, c);
    pts.push(a.x, a.y, z, b.x, b.y, z);
  }
  return lines(pts);
}

/** A closed polygon drawn as lines (lume inlays on hands and indices). */
function outline(pts: Vector2[], z: number) {
  const out: number[] = [];
  pts.forEach((a, i) => {
    const b = pts[(i + 1) % pts.length];
    out.push(a.x, a.y, z, b.x, b.y, z);
  });
  return lines(out);
}

/** Flat Archimedean spiral, as line segments. */
function spiral(r0: number, r1: number, turns: number, z: number) {
  const n = Math.ceil(turns * 72);
  const pts: number[] = [];
  let prev = polar(r0, 0);
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    const p = polar(r0 + (r1 - r0) * t, t * turns * TAU);
    pts.push(prev.x, prev.y, z, p.x, p.y, z);
    prev = p;
  }
  return lines(pts);
}

/** Merges pieces: edges into one geometry (unpainted edges are steel), faces carried along. */
function merge(...gs: Piece[]): Piece {
  const faces = gs.flatMap((g) => g.userData.faces ?? []);
  const merged = mergeGeometries(
    gs.map((g) => {
      const flat = g.index ? g.toNonIndexed() : g;
      return flat.getAttribute("color") ? flat : paint(flat, EDGE);
    }),
  ) as Piece;
  merged.userData = { faces };
  return merged;
}

/** A slotted screw head sitting on a surface at height z. */
function screw(c: Vector2, z: number, r = 0.026) {
  const a = rand(Math.round(c.x * 1000) * 31 + Math.round(c.y * 1000)) * Math.PI;
  const s0 = polar(r * 0.8, a, c);
  const s1 = polar(r * 0.8, a + Math.PI, c);
  const d = polar(r * 0.18, a + Math.PI / 2);
  return merge(
    solid(disc(r, c), 0.012, z),
    lines([
      s0.x + d.x, s0.y + d.y, z + 0.012, s1.x + d.x, s1.y + d.y, z + 0.012,
      s0.x - d.x, s0.y - d.y, z + 0.012, s1.x - d.x, s1.y - d.y, z + 0.012,
    ]),
  );
}

/** A ruby jewel in its chaton, held by two small screws. */
function jewel(c: Vector2, z: number) {
  const ruby = paint(merge(hoop(0.026, z + 0.012, c, 32), hoop(0.01, z + 0.012, c, 24)), RUBY) as Piece;
  ruby.userData = { faces: [] };
  const a = rand(Math.round(c.x * 997) + Math.round(c.y * 991)) * TAU;
  return merge(
    solid(disc(0.042, c), 0.012, z),
    ruby,
    screw(polar(0.058, a, c), z, 0.012),
    screw(polar(0.058, a + Math.PI, c), z, 0.012),
  );
}

/** Parallel lines across a disc of radius r, clear of a round hole (stripes, waffle). */
function hatch(r: number, angle: number, pitch: number, hole: { c: Vector2; r: number }, z: number) {
  const pts: number[] = [];
  const dir = polar(1, angle);
  const n = polar(1, angle + Math.PI / 2);
  for (let off = -r + pitch / 2; off < r; off += pitch) {
    const half = Math.sqrt(r * r - off * off);
    let spans: [number, number][] = [[-half, half]];
    const rel = hole.c.dot(n) - off;
    if (Math.abs(rel) < hole.r) {
      const mid = hole.c.dot(dir);
      const h = Math.sqrt(hole.r * hole.r - rel * rel);
      spans = [[-half, mid - h], [mid + h, half]];
    }
    for (const [t0, t1] of spans) {
      if (t1 <= t0) continue;
      const a = dir.clone().multiplyScalar(t0).addScaledVector(n, off);
      const b = dir.clone().multiplyScalar(t1).addScaledVector(n, off);
      pts.push(a.x, a.y, z, b.x, b.y, z);
    }
  }
  return paint(lines(pts), ENGRAVED) as Piece;
}

/** Forged carbon, in line: short curved fibre strokes scattered over a ring's top face. */
function carbonFibres(r0: number, r1: number, z: number, count: number, seed: number) {
  const pts: number[] = [];
  for (let i = 0; i < count; i++) {
    const r = r0 + 0.01 + rand(seed + i * 5) * (r1 - r0 - 0.02);
    const c = polar(r, rand(seed + i * 5 + 1) * TAU);
    const a = rand(seed + i * 5 + 2) * Math.PI;
    const len = 0.03 + rand(seed + i * 5 + 3) * 0.06;
    const bow = (rand(seed + i * 5 + 4) - 0.5) * 0.02;
    let prev = polar(-len / 2, a, c);
    for (let k = 1; k <= 4; k++) {
      const t = k / 4 - 0.5;
      const q = polar(t * len, a, c).add(polar(bow * (1 - 4 * t * t), a + Math.PI / 2));
      pts.push(prev.x, prev.y, z, q.x, q.y, z);
      prev = q;
    }
  }
  return paint(lines(pts), ENGRAVED) as Piece;
}

/** Bends everything beyond |y| = from down and away, the way lugs and straps follow a wrist. */
function bendAway(g: Piece, from: number, k: number) {
  const faces = g.userData.faces ?? [];
  for (const geo of [g, ...faces]) {
    const p = geo.getAttribute("position");
    for (let i = 0; i < p.count; i++) {
      const over = Math.max(0, Math.abs(p.getY(i)) - from);
      p.setZ(i, p.getZ(i) - over * over * k);
    }
  }
  for (const geo of faces) geo.computeVertexNormals(); // edges carry no normals
  return g;
}

/** Turns a piece built along +Z to lie along +X (crown and tube), then places it. */
const alongX = (g: Piece, x: number, z: number) =>
  xf(g, new Matrix4().makeRotationY(Math.PI / 2).premultiply(new Matrix4().makeTranslation(x, 0, z)));

// --- Parts ----------------------------------------------------------------------------------

type PartDef = {
  name: string;
  /** "movement" parts sit in the scaled movement; "case" parts are at watch scale. */
  layer: "movement" | "case";
  /** Pivot (for cage parts: relative to the cage centre). */
  at: Vector2;
  inCage?: boolean;
  /** Built off-centre (bridges, straps): drops straight rather than spinning round the centre. */
  straight?: boolean;
  build: () => Piece;
};

const cageFrame = (z: number) => solid(wheel(0.28, { spokes: 3, rim: 0.255, hub: 0.05 }), 0.02, z);

const MOVEMENT: PartDef[] = [
  {
    name: "mainplate",
    at: v2(0, 0),
    build: () => {
      const plate = disc(0.98);
      plate.holes.push(circle(0.33, CAGE));
      for (const p of [BARREL, CENTER, THIRD]) plate.holes.push(circle(0.025, p));
      const rim = [0, 1, 2].map((k) => screw(polar(0.92, 0.6 + (k * TAU) / 3), 0));
      return merge(solid(plate, 0.06, -0.06), hatch(0.95, 0.5, 0.075, { c: CAGE, r: 0.36 }, 0.002), ...rim);
    },
  },
  {
    name: "barrel",
    at: BARREL,
    build: () => {
      const drum = gearOutline(0.36, 72, 0.018);
      drum.holes.push(circle(0.31));
      return merge(solid(drum, 0.09, 0), solid(disc(0.055), 0.09, 0));
    },
  },
  { name: "mainspring", at: BARREL, build: () => spiral(0.065, 0.3, 9, 0.045) },
  {
    name: "barrel bridge",
    at: BARREL,
    build: () => {
      const arms = [0, 1, 2].map((k) => screw(polar(0.35, TAU / 6 + (k * TAU) / 3), 0.13));
      return merge(solid(wheel(0.37, { spokes: 3, rim: 0.33, hub: 0.07 }), 0.03, 0.1), ...arms);
    },
  },
  {
    name: "ratchet wheel",
    at: BARREL,
    build: () => {
      const r = ratchetOutline(0.24, 36, 0.03);
      r.holes.push(...spokeWindows(4, 0.07, 0.18, 0.02, Math.PI / 4));
      return merge(solid(r, 0.025, 0.13), screw(v2(0, 0), 0.155, 0.045));
    },
  },
  {
    name: "crown wheel",
    at: CROWN_WHEEL,
    build: () => {
      const g = gearOutline(0.1, 24, 0.014);
      g.holes.push(...spokeWindows(3, 0.03, 0.075, 0.01));
      return merge(solid(g, 0.022, 0.13), screw(v2(0, 0), 0.152, 0.022));
    },
  },
  {
    name: "click",
    at: polar(0.3, 2.3, BARREL),
    straight: true,
    build: () => {
      // The pawl that rides the ratchet teeth, with its return spring.
      const pawl = new Shape([v2(-0.02, -0.02), v2(0.09, -0.012), v2(0.13, 0.02), v2(0.07, 0.018), v2(-0.02, 0.02)]);
      pawl.holes.push(circle(0.008));
      const spring: number[] = [];
      for (let i = 0; i < 12; i++) {
        const a = polar(0.05 + i * 0.006, 2 + i * 0.12);
        const b = polar(0.05 + (i + 1) * 0.006, 2 + (i + 1) * 0.12);
        spring.push(a.x, a.y, 0.145, b.x, b.y, 0.145);
      }
      const m = new Matrix4().makeRotationZ(-0.9);
      return merge(xf(solid(pawl, 0.015, 0.13), m), xf(lines(spring), m), screw(v2(0, 0), 0.145, 0.014));
    },
  },
  { name: "centre wheel", at: CENTER, build: () => solid(wheel(0.27, { teeth: 64, spokes: 5 }), 0.025, 0.02) },
  { name: "third wheel", at: THIRD, build: () => solid(wheel(0.2, { teeth: 48, spokes: 4 }), 0.025, 0.02) },
  {
    name: "train bridge",
    at: v2(0, 0),
    straight: true,
    build: () => {
      const d = THIRD.clone().sub(CENTER).normalize().multiplyScalar(0.1);
      const p0 = CENTER.clone().sub(d);
      const p1 = THIRD.clone().add(d);
      return merge(
        solid(bridge(p0, p1, 0.05), 0.03, 0.08),
        jewel(CENTER, 0.11),
        jewel(THIRD, 0.11),
        screw(p0, 0.11, 0.022),
        screw(p1, 0.11, 0.022),
      );
    },
  },
  {
    name: "fixed fourth wheel",
    at: CAGE,
    build: () => {
      const g = gearOutline(0.31, 70, 0.014);
      g.holes.push(circle(0.285));
      return solid(g, 0.03, 0);
    },
  },
  { name: "cage frame", at: v2(0, 0), inCage: true, build: () => cageFrame(0.04) },
  {
    name: "escape wheel",
    at: ESCAPE,
    inCage: true,
    build: () => {
      const g = escapeOutline(0.07, 15);
      g.holes.push(...spokeWindows(5, 0.018, 0.045, 0.006), circle(0.008));
      return solid(g, 0.015, 0.07);
    },
  },
  {
    name: "pallet fork",
    at: PALLET,
    inCage: true,
    build: () => {
      const pts = [
        [-0.13, -0.008], [-0.02, -0.008], [0.03, -0.05], [0.06, -0.05], [0.06, -0.034], [0.04, -0.034],
        [0.012, 0], [0.04, 0.034], [0.06, 0.034], [0.06, 0.05], [0.03, 0.05], [-0.02, 0.008],
        [-0.13, 0.008], [-0.145, 0.022], [-0.152, 0.014], [-0.142, 0], [-0.152, -0.014], [-0.145, -0.022],
      ].map(([x, y]) => v2(x, y));
      const s = new Shape(pts);
      s.holes.push(circle(0.007));
      // Ruby pallet stones on each arm.
      const stones = [-1, 1].map((sy) =>
        paint(outline([v2(0.045, sy * 0.034), v2(0.06, sy * 0.034), v2(0.06, sy * 0.05), v2(0.045, sy * 0.05)], 0.083), RUBY) as Piece,
      );
      return xf(merge(solid(s, 0.012, 0.07), ...stones), new Matrix4().makeRotationZ(Math.atan2(ESCAPE.y, ESCAPE.x)));
    },
  },
  {
    name: "balance",
    at: v2(0, 0),
    inCage: true,
    build: () => {
      const parts = [solid(wheel(0.155, { spokes: 3, rim: 0.135, hub: 0.025 }), 0.02, 0.11)];
      for (let k = 0; k < 12; k++) parts.push(solid(disc(0.009, polar(0.164, (k * TAU) / 12)), 0.02, 0.11));
      return merge(...parts);
    },
  },
  { name: "hairspring", at: v2(0, 0), inCage: true, build: () => spiral(0.03, 0.115, 12, 0.135) },
  {
    name: "cage bridge",
    at: v2(0, 0),
    inCage: true,
    build: () => {
      const pillars: number[] = [];
      for (const a of [TAU / 6, Math.PI, (5 * TAU) / 6]) {
        const p = polar(0.268, a);
        pillars.push(p.x, p.y, 0.06, p.x, p.y, 0.16);
      }
      const screws = [0, 1, 2].map((k) => screw(polar(0.268, (k * TAU) / 3), 0.18, 0.016));
      return merge(cageFrame(0.16), lines(pillars), jewel(v2(0, 0), 0.18), ...screws);
    },
  },
  {
    name: "tourbillon bridge",
    at: v2(0, 0),
    straight: true,
    build: () => {
      const dir = polar(1, 0.35);
      const p0 = CAGE.clone().sub(dir.clone().multiplyScalar(0.55));
      const p1 = CAGE.clone().add(dir.clone().multiplyScalar(0.55));
      return merge(
        solid(bridge(p0, p1, 0.05, { at: 0.55, r: 0.085 }), 0.03, 0.22),
        jewel(CAGE, 0.25),
        screw(p0, 0.25, 0.024),
        screw(p1, 0.25, 0.024),
      );
    },
  },
].map((p) => ({ ...p, layer: "movement" as const }));

/**
 * Articulated link bracelet for one side (sy = 1 at twelve, -1 at six): wide links, each
 * with one rounded window, joined by pins whose ends show at the edges. Tapers away from
 * the case.
 */
function bracelet(sy: number) {
  const LINKS = 6;
  const pitch = 0.26;
  const gap = 0.025;
  const parts: Piece[] = [];
  for (let k = 0; k < LINKS; k++) {
    const y0 = LUG_END + 0.01 + k * pitch;
    const y1 = y0 + pitch - gap;
    const half = (y: number) => LUG_HALF - 0.012 - ((y - LUG_END) / (LINKS * pitch)) * 0.14;
    const corner = 0.04;
    const link = new Shape();
    link.moveTo(-half(y0) + corner, y0);
    link.lineTo(half(y0) - corner, y0);
    link.quadraticCurveTo(half(y0), y0, half(y0), y0 + corner);
    link.lineTo(half(y1), y1 - corner);
    link.quadraticCurveTo(half(y1), y1, half(y1) - corner, y1);
    link.lineTo(-half(y1) + corner, y1);
    link.quadraticCurveTo(-half(y1), y1, -half(y1), y1 - corner);
    link.lineTo(-half(y0), y0 + corner);
    link.quadraticCurveTo(-half(y0), y0, -half(y0) + corner, y0);
    // One rounded window across the middle of the link.
    const ry = (y1 - y0) / 2 - 0.065;
    const cy = (y0 + y1) / 2;
    const reach = half(y1) - 0.12 - ry;
    const w = new Path();
    w.absarc(reach, cy, ry, -Math.PI / 2, Math.PI / 2, false);
    w.absarc(-reach, cy, ry, Math.PI / 2, (3 * Math.PI) / 2, false);
    link.holes.push(w);
    parts.push(solid(link, 0.07, -0.18));
    // Pin through the joint, its ends showing at each edge.
    const yp = y1 + gap / 2;
    const pin: number[] = [-half(yp), yp, -0.145, half(yp), yp, -0.145];
    for (const sx of [-1, 1]) {
      // Pin end: a small circle in the YZ plane at the bracelet's edge.
      for (let j = 0; j < 16; j++) {
        const p = polar(0.022, (j * TAU) / 16);
        const q = polar(0.022, ((j + 1) * TAU) / 16);
        pin.push(sx * half(yp), yp + p.x, -0.145 + p.y, sx * half(yp), yp + q.x, -0.145 + q.y);
      }
    }
    parts.push(lines(pin));
  }
  return bendAway(xf(merge(...parts), new Matrix4().makeScale(1, sy, 1)), 1.2, 0.45);
}

const CASE: PartDef[] = [
  {
    name: "case",
    at: v2(0, 0),
    straight: true,
    build: () => {
      const body = caseOutline();
      body.holes.push(circle(0.8));
      const back = disc(0.8);
      back.holes.push(circle(0.6)); // display back
      return merge(
        bendAway(solid(body, 0.38, -0.26), 0.95, 0.8),
        solid(back, 0.04, -0.3),
        hoop(0.62, -0.3),
        carbonFibres(0.9, 1.0, 0.121, 70, 3), // the case shoulders outside the bezel
      );
    },
  },
  {
    name: "crown",
    at: v2(0, 0),
    straight: true,
    build: () => {
      const tube = alongX(solid(disc(0.06), 0.08, 0), 0.98, -0.07);
      const knurl = solid(gearOutline(0.12, 24, 0.014), 0.12, 0);
      return merge(tube, alongX(merge(knurl, hoop(0.07, 0.121)), 1.04, -0.07));
    },
  },
  {
    name: "dial",
    at: v2(0, 0),
    build: () => {
      const dial = disc(DIAL_R);
      dial.holes.push(circle(APERTURE.r + 0.015, APERTURE.c));
      const z = 0.02;
      const hole = { c: APERTURE.c, r: APERTURE.r + 0.015 };
      // Waffle: a fine engraved grid both ways, clear of the aperture.
      const waffle = [hatch(0.66, 0, 0.045, hole, z + 0.001), hatch(0.66, Math.PI / 2, 0.045, hole, z + 0.001)];
      const parts: Piece[] = [solid(dial, 0.02, 0), ...waffle, hoop(0.735, z + 0.001, v2(0, 0), 128), hoop(APERTURE.r + 0.04, z + 0.001, APERTURE.c, 64)];
      const ticks: number[] = [];
      for (let k = 0; k < 60; k++) {
        const a = Math.PI / 2 - (k * TAU) / 60;
        const p0 = polar(0.705, a);
        const p1 = polar(0.735, a);
        ticks.push(p0.x, p0.y, z + 0.001, p1.x, p1.y, z + 0.001);
      }
      // Applied batons with lume; double at twelve; none at six, over the tourbillon.
      for (let h = 0; h < 12; h++) {
        if (h === 6) continue;
        const a = Math.PI / 2 - (h * TAU) / 12;
        for (const off of h === 0 ? [-0.03, 0.03] : [0]) {
          const w = 0.02;
          const baton = [v2(off - w, 0.55), v2(off + w, 0.55), v2(off + w, 0.69), v2(off - w, 0.69)];
          const lume = [v2(off - w * 0.4, 0.57), v2(off + w * 0.4, 0.57), v2(off + w * 0.4, 0.67), v2(off - w * 0.4, 0.67)];
          const m = new Matrix4().makeRotationZ(a - Math.PI / 2);
          parts.push(xf(solid(new Shape(baton), 0.025, z), m), xf(outline(lume, z + 0.026), m));
        }
      }
      return merge(...parts, lines(ticks));
    },
  },
  {
    name: "hour hand",
    at: v2(0, 0),
    build: () => {
      const s = new Shape([v2(-0.024, -0.08), v2(0.024, -0.08), v2(0.024, 0.4), v2(0, 0.43), v2(-0.024, 0.4)]);
      s.holes.push(circle(0.012));
      return merge(solid(s, 0.01, 0.07), outline([v2(-0.01, 0.06), v2(0.01, 0.06), v2(0.01, 0.38), v2(-0.01, 0.38)], 0.081));
    },
  },
  {
    name: "minute hand",
    at: v2(0, 0),
    build: () => {
      const s = new Shape([v2(-0.018, -0.1), v2(0.018, -0.1), v2(0.018, 0.66), v2(0, 0.69), v2(-0.018, 0.66)]);
      s.holes.push(circle(0.012));
      return merge(solid(s, 0.01, 0.085), outline([v2(-0.007, 0.08), v2(0.007, 0.08), v2(0.007, 0.64), v2(-0.007, 0.64)], 0.096));
    },
  },
  {
    name: "seconds hand",
    at: v2(0, 0),
    build: () => {
      const needle = new Shape([v2(-0.005, -0.18), v2(0.005, -0.18), v2(0.003, 0.72), v2(-0.003, 0.72)]);
      const red = paint(merge(solid(needle, 0.006, 0.1), solid(disc(0.03, v2(0, -0.14)), 0.006, 0.1), solid(disc(0.026), 0.016, 0.1)), RUBY) as Piece;
      return red;
    },
  },
  {
    name: "bezel",
    at: v2(0, 0),
    build: () => {
      // Flat, wide and round, sitting on the cushion case.
      const ring = disc(0.9);
      ring.holes.push(circle(DIAL_R));
      return merge(solid(ring, 0.08, 0.12), hoop(0.78, 0.2, v2(0, 0), 128), carbonFibres(DIAL_R, 0.9, 0.201, 140, 7));
    },
  },
  {
    name: "crystal",
    at: v2(0, 0),
    build: () => {
      const glint: number[] = [];
      for (const [a0, a1, r] of [[2.0, 2.5, 0.68], [2.05, 2.35, 0.6]]) {
        for (let k = 0; k < 12; k++) {
          const p = polar(r, a0 + ((a1 - a0) * k) / 12);
          const q = polar(r, a0 + ((a1 - a0) * (k + 1)) / 12);
          glint.push(p.x, p.y, 0.19, q.x, q.y, 0.19);
        }
      }
      return merge(hoop(DIAL_R, 0.19, v2(0, 0), 128), lines(glint));
    },
  },
  { name: "bracelet", at: v2(0, 0), straight: true, build: () => merge(bracelet(1), bracelet(-1)) },
].map((p) => ({ ...p, layer: "case" as const }));

const PARTS: PartDef[] = [...MOVEMENT, ...CASE];

// --- Hidden lines -------------------------------------------------------------------------

/**
 * Invisible solids: they write depth but no colour, so lines behind a seated part are
 * hidden and the drawing reads as a whole object, while staying pure line work.
 */
const occluder = new MeshBasicMaterial({
  colorWrite: false,
  side: DoubleSide, // mirrored bracelet and bent lugs flip some faces
  polygonOffset: true,
  polygonOffsetFactor: 1,
  polygonOffsetUnits: 1,
});

// --- Scene ----------------------------------------------------------------------------------

type Part = PartDef & {
  group: Group;
  edges: LineBasicMaterial;
  solid: Mesh | null;
  spin: number; // rotation it forms at, unwound as it drops in
};

/** Hand angles for the viewer's local time; the seconds hand moves in tenths of a second. */
function handAngles(now: Date) {
  const sec = now.getSeconds() + Math.floor(now.getMilliseconds() / 100) / 10;
  const min = now.getMinutes() + sec / 60;
  const hour = (now.getHours() % 12) + min / 60;
  return { hour: (-hour / 12) * TAU, minute: (-min / 60) * TAU, second: (-sec / 60) * TAU };
}

export function mount(canvas: HTMLCanvasElement, { gentle }: { gentle: boolean }) {
  const stage = createStage(canvas, 30);
  const { scene, camera, pointer } = stage;
  stage.setShift(1);
  camera.position.set(0, 0, DISTANCE);

  const watch = new Group();
  const movement = new Group();
  movement.scale.setScalar(MOVEMENT_SCALE);
  movement.position.z = MOVEMENT_Z;
  watch.add(movement);
  scene.add(watch);

  const parts: Part[] = PARTS.map((def, i) => {
    const group = new Group();
    const piece = merge(def.build());
    const edges = new LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0, depthWrite: false });
    group.add(new LineSegments(piece, edges));
    const faces = piece.userData.faces ?? [];
    let solid: Mesh | null = null;
    if (faces.length) {
      solid = new Mesh(mergeGeometries(faces.map((g) => (g.index ? g.toNonIndexed() : g))), occluder);
      solid.visible = false; // hides nothing until the part has seated
      group.add(solid);
    }
    (def.layer === "movement" ? movement : watch).add(group);
    return { ...def, group, edges, solid, spin: def.straight ? 0 : (rand(i + 9) - 0.5) * 1.2 };
  });

  const total = (parts.length - 1) * STAGGER + ASSEMBLE[1];
  if (gentle) stage.seek(total + 2000);

  let cage = 0;
  let train = 0;
  const cagePivot = new Vector2();
  const origin = new Vector2();

  stage.start((t, dt) => {
    // Running: the movement ramps up once the watch is whole.
    const run = gentle ? 0 : easeInOutCubic(clamp01((t - total - 300) / 1500));
    const s = t / 1000;
    cage += run * (dt / CAGE_PERIOD) * TAU;
    train += run * (dt / 1000) * TRAIN_SPEED;
    const swing = Math.sin(TAU * BALANCE_HZ * s);
    const balance = run * 2.4 * swing;
    const beat = s * BALANCE_HZ * 2;
    const step = Math.floor(beat) + easeOutCubic(clamp01((beat % 1) / 0.12));
    const time = handAngles(new Date());

    const own: Record<string, number> = {
      barrel: train * 0.75,
      "ratchet wheel": train * 0.08,
      "crown wheel": -train * 0.08 * (0.24 / 0.1),
      "centre wheel": -train,
      "third wheel": train * (0.27 / 0.2),
      "escape wheel": run ? -(step * Math.PI) / 15 : 0,
      "pallet fork": run * 0.14 * Math.tanh(3 * swing),
      balance,
      hairspring: balance * 0.35,
      "hour hand": time.hour,
      "minute hand": time.minute,
      "seconds hand": time.second,
    };

    for (const [i, p] of parts.entries()) {
      const u = t - i * STAGGER;
      const appear = easeOutCubic(clamp01((u - APPEAR[0]) / (APPEAR[1] - APPEAR[0])));
      const drop = easeInOutCubic(clamp01((u - ASSEMBLE[0]) / (ASSEMBLE[1] - ASSEMBLE[0])));

      p.group.visible = u > 0;
      p.edges.opacity = 0.9 * appear;
      if (p.solid) p.solid.visible = drop >= 1;

      // Assembled place: in the movement or case, or riding the turning cage.
      let x = p.at.x;
      let y = p.at.y;
      let rot = own[p.name] ?? 0;
      if (p.inCage) {
        cagePivot.copy(p.at).rotateAround(origin, cage).add(CAGE);
        x = cagePivot.x;
        y = cagePivot.y;
        rot += cage;
      }
      if (p.name === "hairspring") p.group.scale.setScalar(1 + run * 0.035 * swing);
      p.group.position.set(x, y, (1 - drop) * LIFT);
      p.group.rotation.z = rot + (1 - drop) * p.spin;
    }

    // Pull back on portrait screens so the whole case fits the width.
    camera.position.z = DISTANCE * (camera.aspect < 1 ? Math.min(1.8, 0.8 / camera.aspect) : 1);

    watch.rotation.x = -0.62 - pointer.y * 0.06;
    watch.rotation.y = pointer.x * 0.12;
    watch.rotation.z = 0.2 + Math.sin(s * 0.15) * 0.04;
  });

  // Only render while the hero is on screen.
  const view = new IntersectionObserver(([e]) => stage.setPaused(!e.isIntersecting));
  view.observe(canvas);

  return {
    /** Jump the timeline forward to `ms` (e.g. to show the finished watch). */
    seek: stage.seek,
    dispose() {
      view.disconnect();
      occluder.dispose();
      stage.dispose();
    },
  };
}
