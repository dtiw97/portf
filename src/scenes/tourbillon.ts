import {
  BufferGeometry,
  Color,
  EdgesGeometry,
  ExtrudeGeometry,
  Float32BufferAttribute,
  Group,
  LatheGeometry,
  LineBasicMaterial,
  LineSegments,
  Matrix4,
  Path,
  Shape,
  Vector2,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { clamp01, easeInOutCubic, easeOutCubic } from "../lib/motion";
import { createStage } from "./stage";

/*
 * A tourbillon wristwatch assembling itself, part by part, from an exploded view.
 *
 * The movement goes together first, down in the case: mainplate with Côtes de Genève,
 * barrel and mainspring, barrel bridge with ratchet, crown wheel and click, the gear
 * train and its bridge, then the tourbillon (cage, escapement, balance, hairspring) under
 * its bridge, with ruby jewels and slotted screws throughout. Then the case closes round
 * it: case, crown, open-worked dial, hands, bezel, domed crystal and straps.
 *
 * Proportions follow a 41 mm dive-watch case (50 mm lug to lug, 22 mm lugs, 14.75 mm
 * thick, a large crown), in units where the case radius is 1. Once whole, the watch runs:
 * the hands show the viewer's local time, the cage turns, the balance swings, the escape
 * wheel ticks and the train turns.
 */

// --- Timeline (ms) ---------------------------------------------------------------------

const STAGGER = 260; // between parts starting
const APPEAR = [0, 450]; // the wireframe fades in above its place
const ASSEMBLE = [200, 1100]; // and drops into it
const LIFT = 0.8; // exploded-view height a part forms at

const DISTANCE = 5.4; // camera to watch, on landscape screens
const BALANCE_HZ = 2;
const CAGE_PERIOD = 12_000; // a real cage turns once a minute; quicker reads better here
const TRAIN_SPEED = 0.6; // centre wheel, rad/s

// --- Palette --------------------------------------------------------------------------------

const STEEL = new Color(0xededed);
const RUBY = new Color(0xc8312b); // the site's seal red: jewels and the seconds hand
const ENGRAVED = new Color(0x3a3a3a); // finishing lines cut into surfaces

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

const MOVEMENT_SCALE = 0.82;
const MOVEMENT_Z = -0.32; // mainplate top, in watch units

// Watch-level (case radius 1).
const DIAL_R = 0.8;
const DIAL_IN = 0.6; // the open centre of the dial
const LUG_GAP = 0.537; // half the 22 mm lug width
const LUG_TIP = 1.22; // half the 50 mm lug to lug
const APERTURE = { c: CAGE.clone().multiplyScalar(MOVEMENT_SCALE), r: 0.33 * MOVEMENT_SCALE };

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

// --- 3D wireframes --------------------------------------------------------------------------

function paint(g: BufferGeometry, color: Color) {
  const n = g.getAttribute("position").count;
  const c = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) c.set([color.r, color.g, color.b], i * 3);
  g.setAttribute("color", new Float32BufferAttribute(c, 3));
  return g;
}

function solid(shape: Shape, depth: number, z: number) {
  const g = new ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 40 });
  const e = new EdgesGeometry(g, 25);
  g.dispose();
  return e.translate(0, 0, z);
}

function lines(points: number[]) {
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(points, 3));
  return g;
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

/** A closed polygon drawn as lines (e.g. lume inlays on hands and indices). */
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

/** Merges wireframes; anything not painted is steel. */
const merge = (...gs: BufferGeometry[]) =>
  mergeGeometries(
    gs.map((g) => {
      const flat = g.index ? g.toNonIndexed() : g;
      return flat.getAttribute("color") ? flat : paint(flat, STEEL);
    }),
  );

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
  const ruby = paint(merge(hoop(0.026, z, c, 32), hoop(0.01, z, c, 24)), RUBY);
  const a = rand(Math.round(c.x * 997) + Math.round(c.y * 991)) * TAU;
  return merge(ruby, hoop(0.042, z, c, 40), screw(polar(0.058, a, c), z, 0.012), screw(polar(0.058, a + Math.PI, c), z, 0.012));
}

/** Côtes de Genève: parallel stripes across the plate, clear of the tourbillon aperture. */
function genevaStripes(r: number, hole: { c: Vector2; r: number }, z: number) {
  const pts: number[] = [];
  const dir = polar(1, 0.5);
  const n = polar(1, 0.5 + Math.PI / 2);
  for (let off = -r + 0.04; off < r; off += 0.075) {
    const half = Math.sqrt(r * r - off * off);
    const spans: [number, number][] = [[-half, half]];
    // Cut out where the stripe crosses the aperture.
    const rel = hole.c.dot(n) - off;
    if (Math.abs(rel) < hole.r) {
      const mid = hole.c.dot(dir);
      const h = Math.sqrt(hole.r * hole.r - rel * rel);
      spans.splice(0, 1, [-half, mid - h], [mid + h, half]);
    }
    for (const [t0, t1] of spans) {
      if (t1 <= t0) continue;
      const a = dir.clone().multiplyScalar(t0).addScaledVector(n, off);
      const b = dir.clone().multiplyScalar(t1).addScaledVector(n, off);
      pts.push(a.x, a.y, z, b.x, b.y, z);
    }
  }
  return paint(lines(pts), ENGRAVED);
}

/** Bends anything beyond |y| = from down and away, the way lugs and straps follow a wrist. */
function bendAway(g: BufferGeometry, from: number, k: number) {
  const p = g.getAttribute("position");
  for (let i = 0; i < p.count; i++) {
    const over = Math.max(0, Math.abs(p.getY(i)) - from);
    p.setZ(i, p.getZ(i) - over * over * k);
  }
  return g;
}

/** Turns a shape built along +Z to lie along +X (crown and tube), then places it. */
const alongX = (g: BufferGeometry, x: number, z: number) =>
  g.applyMatrix4(new Matrix4().makeRotationY(Math.PI / 2).premultiply(new Matrix4().makeTranslation(x, 0, z)));

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
  opacity?: number;
  build: () => BufferGeometry;
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
      return merge(solid(plate, 0.06, -0.06), genevaStripes(0.95, { c: CAGE, r: 0.36 }, 0.001), ...rim);
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
      return merge(solid(pawl, 0.015, 0.13).applyMatrix4(m), lines(spring).applyMatrix4(m), screw(v2(0, 0), 0.145, 0.014));
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
      const stones = [-1, 1].map((sy) => paint(outline([v2(0.045, sy * 0.034), v2(0.06, sy * 0.034), v2(0.06, sy * 0.05), v2(0.045, sy * 0.05)], 0.083), RUBY));
      return merge(solid(s, 0.012, 0.07), ...stones).applyMatrix4(
        new Matrix4().makeRotationZ(Math.atan2(ESCAPE.y, ESCAPE.x)),
      );
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

/** Lug outline (top right), subdivided so it can bend down toward the wrist. */
function lugShape() {
  const pts: Vector2[] = [];
  const x0 = LUG_GAP;
  const x1 = LUG_GAP + 0.13;
  const y0 = 0.74;
  const y1 = LUG_TIP - 0.065;
  for (let i = 0; i <= 12; i++) pts.push(v2(x1 - 0.012 * (i / 12), y0 + ((y1 - y0) * i) / 12));
  for (let i = 0; i <= 10; i++) pts.push(polar(0.0645, (i / 10) * Math.PI, v2((x0 + x1 - 0.012) / 2, y1)));
  for (let i = 12; i >= 0; i--) pts.push(v2(x0, y0 + ((y1 - y0) * i) / 12));
  return new Shape(pts);
}

/** Inner contour of the dial: the open centre, merged with the tourbillon aperture at six. */
function dialInner(theta: number) {
  const d = polar(1, theta);
  const along = d.dot(APERTURE.c);
  const disc2 = along * along - APERTURE.c.lengthSq() + APERTURE.r * APERTURE.r;
  const toAperture = disc2 > 0 ? along + Math.sqrt(disc2) : 0;
  return Math.max(DIAL_IN, toAperture + 0.025);
}

const CASE: PartDef[] = [
  {
    name: "case",
    at: v2(0, 0),
    straight: true,
    build: () => {
      // Turned case body: caseback edge, flanks, then the seat for the bezel.
      const profile = [
        [0.84, -0.4], [0.93, -0.4], [0.975, -0.33], [1.0, -0.22], [1.0, 0.08], [0.985, 0.14], [0.86, 0.14],
        [0.86, -0.4],
      ].map(([r, z]) => v2(r, z));
      const body = new EdgesGeometry(new LatheGeometry(profile, 128), 20).applyMatrix4(
        new Matrix4().makeRotationX(Math.PI / 2),
      );
      // Screw-down caseback with six notches round an exhibition window.
      const back: Vector2[] = [];
      for (let k = 0; k < 180; k++) {
        const a = (k * TAU) / 180;
        const notch = Math.abs(((a + TAU / 12) % (TAU / 6)) - TAU / 12) < 0.07;
        back.push(polar(notch ? 0.8 : 0.84, a));
      }
      const caseback = new Shape(back);
      caseback.holes.push(circle(0.62));
      const lugs = [1, -1].flatMap((sy) =>
        [1, -1].map((sx) =>
          bendAway(solid(lugShape(), 0.3, -0.24).applyMatrix4(new Matrix4().makeScale(sx, sy, 1)), 0.95, 1.4),
        ),
      );
      const bar = LUG_TIP - 0.08;
      const bars = lines([-LUG_GAP, bar, -0.12, LUG_GAP, bar, -0.12, -LUG_GAP, -bar, -0.12, LUG_GAP, -bar, -0.12]);
      return merge(body, solid(caseback, 0.05, -0.45), ...lugs, bendAway(bars, 0.95, 1.4));
    },
  },
  {
    name: "crown",
    at: v2(0, 0),
    straight: true,
    build: () => {
      const tube = alongX(solid(disc(0.075), 0.1, 0), 0.98, -0.08);
      const knurl = solid(gearOutline(0.185, 30, 0.02), 0.17, 0);
      const face = merge(hoop(0.12, 0.171), hoop(0.06, 0.171), hoop(0.15, 0.171));
      return merge(tube, alongX(merge(knurl, face), 1.07, -0.08));
    },
  },
  {
    name: "dial",
    at: v2(0, 0),
    build: () => {
      const inner: Vector2[] = [];
      for (let k = 0; k < 240; k++) {
        const a = (k * TAU) / 240;
        inner.push(polar(dialInner(a), a));
      }
      const dial = disc(DIAL_R);
      dial.holes.push(new Path(inner));
      const z = 0.0;
      const parts = [solid(dial, 0.025, z), hoop(0.78, z + 0.026, v2(0, 0), 128), hoop(0.745, z + 0.026, v2(0, 0), 128)];
      const ticks: number[] = [];
      for (let k = 0; k < 60; k++) {
        const a = Math.PI / 2 - (k * TAU) / 60;
        if (dialInner(a) > 0.72) continue;
        const p0 = polar(0.745, a);
        const p1 = polar(0.78, a);
        ticks.push(p0.x, p0.y, z + 0.026, p1.x, p1.y, z + 0.026);
      }
      // Applied indices with lume inlays; a double baton at twelve.
      for (let h = 0; h < 12; h++) {
        const a = Math.PI / 2 - (h * TAU) / 12;
        if (dialInner(a) > DIAL_IN + 0.03) continue;
        const offsets = h === 0 ? [-0.026, 0.026] : [0];
        for (const off of offsets) {
          const w = h % 3 === 0 ? 0.024 : 0.018;
          const baton = [v2(off - w, 0.625), v2(off + w, 0.625), v2(off + w * 0.8, 0.725), v2(off - w * 0.8, 0.725)];
          const lume = baton.map((p) => v2(off + (p.x - off) * 0.5, 0.675 + (p.y - 0.675) * 0.72));
          const m = new Matrix4().makeRotationZ(a - Math.PI / 2);
          parts.push(solid(new Shape(baton), 0.035, z + 0.025).applyMatrix4(m), outline(lume, z + 0.061).applyMatrix4(m));
        }
      }
      return merge(...parts, lines(ticks));
    },
  },
  {
    name: "hour hand",
    at: v2(0, 0),
    build: () => {
      const s = new Shape([v2(-0.02, -0.1), v2(0.02, -0.1), v2(0.042, 0.0), v2(0.036, 0.36), v2(0, 0.45), v2(-0.036, 0.36), v2(-0.042, 0.0)]);
      s.holes.push(circle(0.014));
      const lume = [v2(0.022, 0.04), v2(0.019, 0.33), v2(0, 0.39), v2(-0.019, 0.33), v2(-0.022, 0.04)];
      return merge(solid(s, 0.012, 0.07), outline(lume, 0.083));
    },
  },
  {
    name: "minute hand",
    at: v2(0, 0),
    build: () => {
      const s = new Shape([v2(-0.016, -0.12), v2(0.016, -0.12), v2(0.03, 0.0), v2(0.025, 0.66), v2(0, 0.745), v2(-0.025, 0.66), v2(-0.03, 0.0)]);
      s.holes.push(circle(0.014));
      const lume = [v2(0.015, 0.05), v2(0.012, 0.63), v2(0, 0.69), v2(-0.012, 0.63), v2(-0.015, 0.05)];
      return merge(solid(s, 0.012, 0.09), outline(lume, 0.103));
    },
  },
  {
    name: "seconds hand",
    at: v2(0, 0),
    build: () => {
      const needle = new Shape([v2(-0.006, -0.2), v2(0.006, -0.2), v2(0.004, 0.77), v2(-0.004, 0.77)]);
      const tip = new Shape([v2(-0.022, 0.6), v2(0.022, 0.6), v2(0, 0.68)]);
      return paint(
        merge(solid(needle, 0.008, 0.11), solid(tip, 0.008, 0.11), solid(disc(0.035, v2(0, -0.15)), 0.008, 0.11), solid(disc(0.03), 0.022, 0.11)),
        RUBY,
      );
    },
  },
  {
    name: "bezel",
    at: v2(0, 0),
    build: () => {
      // Smooth body with a thin coin-edge band on top for grip.
      const body = disc(0.995);
      body.holes.push(circle(0.82));
      const grip = gearOutline(1.0, 120, 0.014);
      grip.holes.push(circle(0.82));
      const z = 0.28;
      const marks: number[] = [];
      for (let k = 0; k < 60; k++) {
        const a = Math.PI / 2 - (k * TAU) / 60;
        const p0 = polar(0.86, a);
        const p1 = polar(k % 5 ? 0.9 : 0.95, a);
        if (k !== 0) marks.push(p0.x, p0.y, z, p1.x, p1.y, z);
      }
      const pip = [v2(0, 0.86), v2(0.035, 0.95), v2(-0.035, 0.95)]; // triangle at twelve
      return merge(solid(body, 0.1, 0.14), solid(grip, 0.04, 0.24), hoop(0.845, z, v2(0, 0), 128), hoop(0.965, z, v2(0, 0), 128), lines(marks), outline(pip, z));
    },
  },
  {
    name: "crystal",
    at: v2(0, 0),
    opacity: 0.3,
    build: () => merge(...[[0.83, 0.28], [0.72, 0.33], [0.5, 0.37], [0.25, 0.39]].map(([r, z]) => hoop(r, z, v2(0, 0), 96))),
  },
  {
    name: "straps",
    at: v2(0, 0),
    straight: true,
    build: () => {
      const y0 = LUG_TIP - 0.14;
      const len = 1.4;
      const side = (x0: number, x1: number) =>
        Array.from({ length: 21 }, (_, i) => v2(x0 + ((x1 - x0) * i) / 20, y0 + (len * i) / 20));
      const right = side(LUG_GAP - 0.005, 0.46);
      const left = side(-LUG_GAP + 0.005, -0.46).reverse();
      const strap = new Shape([...right, ...left]);
      const stitches: number[] = [];
      for (const sx of [-1, 1]) {
        for (let i = 2; i < 28; i += 2) {
          const ya = y0 + (len * i) / 28;
          const yb = y0 + (len * (i + 1)) / 28;
          const x = (y: number) => sx * (LUG_GAP - 0.04 - ((y - y0) / len) * 0.07);
          stitches.push(x(ya), ya, -0.07, x(yb), yb, -0.07);
        }
      }
      const one = merge(solid(strap, 0.07, -0.14), lines(stitches));
      const flip = one.clone().applyMatrix4(new Matrix4().makeScale(1, -1, 1));
      return merge(bendAway(one, 1.15, 0.55), bendAway(flip, 1.15, 0.55));
    },
  },
].map((p) => ({ ...p, layer: "case" as const }));

const PARTS: PartDef[] = [...MOVEMENT, ...CASE];

// --- Scene ----------------------------------------------------------------------------------

type Part = PartDef & {
  group: Group;
  line: LineBasicMaterial;
  spin: number; // rotation it forms at, unwound as it drops in
};

/** Hand angles for the viewer's local time; the seconds hand steps four times a second. */
function handAngles(now: Date) {
  const sec = now.getSeconds() + Math.floor(now.getMilliseconds() / 250) / 4;
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
    const line = new LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0, depthWrite: false });
    group.add(new LineSegments(merge(def.build()), line));
    (def.layer === "movement" ? movement : watch).add(group);
    return { ...def, group, line, spin: def.straight ? 0 : (rand(i + 9) - 0.5) * 1.2 };
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
      const appear = clamp01((u - APPEAR[0]) / (APPEAR[1] - APPEAR[0]));
      const drop = easeInOutCubic(clamp01((u - ASSEMBLE[0]) / (ASSEMBLE[1] - ASSEMBLE[0])));

      p.line.opacity = (p.opacity ?? 0.95) * easeOutCubic(appear);
      p.group.visible = u > 0;

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
      stage.dispose();
    },
  };
}
