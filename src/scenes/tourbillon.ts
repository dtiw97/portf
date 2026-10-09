import {
  BufferGeometry,
  EdgesGeometry,
  ExtrudeGeometry,
  Float32BufferAttribute,
  Group,
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
 * A tourbillon wristwatch assembling itself, part by part, from an exploded view: the
 * movement first, then the case, bezel, chapter ring, hands, crystal and straps. Each part
 * fades in as a wireframe above its place and drops in. Once the watch is whole it runs:
 * the hands show the viewer's local time, the cage turns, the balance swings and the
 * escape wheel ticks.
 *
 * Units: the case is radius ~1, the dial plane is XY and Z rises off the mainplate.
 */

// --- Timeline (ms) ---------------------------------------------------------------------

const STAGGER = 300; // between parts starting
const APPEAR = [0, 450]; // the wireframe fades in above its place
const ASSEMBLE = [200, 1100]; // and drops into it
const LIFT = 0.8; // exploded-view height a part forms at

const DISTANCE = 5.6; // camera to movement, on landscape screens
const BALANCE_HZ = 2;
const CAGE_PERIOD = 24_000; // a real cage turns once a minute; quicker reads better here

const TAU = Math.PI * 2;
const v2 = (x: number, y: number) => new Vector2(x, y);
const polar = (r: number, a: number, c = v2(0, 0)) => v2(c.x + Math.cos(a) * r, c.y + Math.sin(a) * r);

/** Cheap integer hash → [0, 1). */
function rand(n: number) {
  n = Math.imul(n ^ (n >>> 16), 0x45d9f3b);
  n = Math.imul(n ^ (n >>> 16), 0x45d9f3b);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

// --- Layout: where the wheels sit on the mainplate ----------------------------------------

const BARREL = v2(-0.42, 0.38);
const CENTER = polar(0.63, -0.35, BARREL); // meshes with the barrel
const THIRD = polar(0.47, -1.31, CENTER); // meshes with the centre wheel
const CAGE = v2(-0.02, -0.47); // the tourbillon, at six o'clock
const ESCAPE = v2(0.13, 0.04); // inside the cage, cage-local
const PALLET = v2(0.075, 0.023);

// --- 2D outlines --------------------------------------------------------------------------

function circle(r: number, c = v2(0, 0), shape = false) {
  const p = shape ? new Shape() : new Path();
  p.absarc(c.x, c.y, r, 0, TAU, false);
  return p;
}

function gearOutline(r: number, teeth: number, depth: number) {
  const pts: Vector2[] = [];
  const p = TAU / teeth;
  for (let k = 0; k < teeth; k++) {
    const a = k * p;
    pts.push(polar(r - depth, a), polar(r, a + 0.22 * p), polar(r, a + 0.5 * p), polar(r - depth, a + 0.72 * p));
  }
  return new Shape(pts);
}

/** Escape wheel: hooked ratchet teeth. */
function escapeOutline(r: number, teeth: number) {
  const pts: Vector2[] = [];
  const p = TAU / teeth;
  for (let k = 0; k < teeth; k++) {
    const a = k * p;
    pts.push(polar(r * 0.72, a), polar(r, a + 0.12 * p), polar(r * 0.94, a + 0.24 * p), polar(r * 0.72, a + 0.8 * p));
  }
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
  const shape = o.teeth ? gearOutline(r, o.teeth, o.depth ?? 0.015) : (circle(r, v2(0, 0), true) as Shape);
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
  const shape = new Shape(pts.map(place));
  if (boss) shape.holes.push(circle(0.018, place(v2(boss.at, 0))));
  shape.holes.push(circle(0.013, place(v2(w * 0.2, 0))), circle(0.013, place(v2(len - w * 0.2, 0))));
  return shape;
}

// --- 3D wireframes ------------------------------------------------------------------------

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

const merge = (...gs: BufferGeometry[]) => mergeGeometries(gs.map((g) => (g.index ? g.toNonIndexed() : g)));

type PartDef = {
  name: string;
  /** Pivot of the part on the mainplate (for cage parts: relative to the cage centre). */
  at: Vector2;
  inCage?: boolean;
  /** Built off-centre (bridges, straps): drops straight rather than spinning round the centre. */
  straight?: boolean;
  build: () => BufferGeometry;
};

const cageFrame = (z: number) =>
  solid(wheel(0.28, { spokes: 3, rim: 0.255, hub: 0.05 }), 0.02, z);

const PARTS: PartDef[] = [
  {
    name: "mainplate",
    at: v2(0, 0),
    build: () => {
      const plate = circle(0.98, v2(0, 0), true) as Shape;
      plate.holes.push(circle(0.33, CAGE));
      for (const p of [BARREL, CENTER, THIRD]) plate.holes.push(circle(0.025, p));
      return solid(plate, 0.06, -0.06);
    },
  },
  {
    name: "barrel",
    at: BARREL,
    build: () => {
      const drum = gearOutline(0.36, 72, 0.018);
      drum.holes.push(circle(0.31));
      return merge(solid(drum, 0.09, 0), solid(circle(0.055, v2(0, 0), true) as Shape, 0.09, 0));
    },
  },
  { name: "mainspring", at: BARREL, build: () => spiral(0.065, 0.3, 8, 0.045) },
  {
    name: "barrel bridge",
    at: BARREL,
    build: () => solid(wheel(0.37, { spokes: 3, rim: 0.33, hub: 0.07 }), 0.03, 0.1),
  },
  { name: "centre wheel", at: CENTER, build: () => solid(wheel(0.27, { teeth: 64, spokes: 5 }), 0.025, 0.02) },
  { name: "third wheel", at: THIRD, build: () => solid(wheel(0.2, { teeth: 48, spokes: 4 }), 0.025, 0.02) },
  {
    name: "train bridge",
    at: v2(0, 0),
    straight: true,
    build: () => {
      const d = THIRD.clone().sub(CENTER).normalize().multiplyScalar(0.08);
      return solid(bridge(CENTER.clone().sub(d), THIRD.clone().add(d), 0.04), 0.03, 0.08);
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
      const outline = [
        [-0.13, -0.008], [-0.02, -0.008], [0.03, -0.05], [0.06, -0.05], [0.06, -0.034], [0.04, -0.034],
        [0.012, 0], [0.04, 0.034], [0.06, 0.034], [0.06, 0.05], [0.03, 0.05], [-0.02, 0.008],
        [-0.13, 0.008], [-0.145, 0.022], [-0.152, 0.014], [-0.142, 0], [-0.152, -0.014], [-0.145, -0.022],
      ].map(([x, y]) => v2(x, y));
      const s = new Shape(outline);
      s.holes.push(circle(0.007));
      return solid(s, 0.012, 0.07).applyMatrix4(new Matrix4().makeRotationZ(Math.atan2(ESCAPE.y, ESCAPE.x)));
    },
  },
  {
    name: "balance",
    at: v2(0, 0),
    inCage: true,
    build: () => {
      const parts = [solid(wheel(0.155, { spokes: 3, rim: 0.135, hub: 0.025 }), 0.02, 0.11)];
      for (let k = 0; k < 10; k++) {
        parts.push(solid(circle(0.009, polar(0.164, (k * TAU) / 10), true) as Shape, 0.02, 0.11));
      }
      return merge(...parts);
    },
  },
  { name: "hairspring", at: v2(0, 0), inCage: true, build: () => spiral(0.03, 0.115, 11, 0.135) },
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
      return merge(cageFrame(0.16), lines(pillars));
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
      return solid(bridge(p0, p1, 0.045, { at: 0.55, r: 0.075 }), 0.03, 0.2);
    },
  },
  {
    name: "case",
    at: v2(0, 0),
    straight: true,
    build: () => {
      const ring = circle(1.08, v2(0, 0), true) as Shape;
      ring.holes.push(circle(1.0));
      const crown = solid(gearOutline(0.06, 18, 0.01), 0.09, 0).applyMatrix4(
        new Matrix4().makeRotationY(Math.PI / 2).premultiply(new Matrix4().makeTranslation(1.07, 0, 0.035)),
      );
      // Four lugs, at twelve and six, each with the spring bar the strap hangs on.
      const lug = new Shape();
      lug.moveTo(0.36, 0.96).lineTo(0.47, 0.96).lineTo(0.47, 1.3);
      lug.absarc(0.415, 1.3, 0.055, 0, Math.PI, false);
      lug.lineTo(0.36, 0.96);
      const lugs = [1, -1].flatMap((sy) =>
        [1, -1].map((sx) => solid(lug, 0.16, -0.06).applyMatrix4(new Matrix4().makeScale(sx, sy, 1))),
      );
      const bars = lines([-0.36, 1.3, 0.02, 0.36, 1.3, 0.02, -0.36, -1.3, 0.02, 0.36, -1.3, 0.02]);
      return merge(solid(ring, 0.22, -0.08), crown, ...lugs, bars);
    },
  },
  {
    name: "bezel",
    at: v2(0, 0),
    build: () => {
      const ring = circle(1.1, v2(0, 0), true) as Shape;
      ring.holes.push(circle(0.99));
      const ticks: number[] = [];
      for (let k = 0; k < 60; k++) {
        const a = (k * TAU) / 60;
        const p0 = polar(1.0, a);
        const p1 = polar(k % 5 ? 1.03 : 1.065, a);
        ticks.push(p0.x, p0.y, 0.26, p1.x, p1.y, 0.26);
      }
      return merge(solid(ring, 0.12, 0.14), lines(ticks));
    },
  },
  {
    name: "chapter ring",
    at: v2(0, 0),
    build: () => {
      const ring = circle(0.97, v2(0, 0), true) as Shape;
      ring.holes.push(circle(0.84));
      const parts = [solid(ring, 0.015, 0.225)];
      const ticks: number[] = [];
      for (let k = 0; k < 60; k++) {
        if (k % 5 === 0) continue;
        const a = (k * TAU) / 60;
        const p0 = polar(0.93, a);
        const p1 = polar(0.955, a);
        ticks.push(p0.x, p0.y, 0.24, p1.x, p1.y, 0.24);
      }
      // Hour batons, except at six where the tourbillon shows through.
      const baton = new Shape([v2(-0.016, 0.855), v2(0.016, 0.855), v2(0.016, 0.955), v2(-0.016, 0.955)]);
      for (let h = 0; h < 12; h++) {
        if (h === 6) continue;
        parts.push(solid(baton, 0.012, 0.24).applyMatrix4(new Matrix4().makeRotationZ((-h * TAU) / 12)));
      }
      return merge(...parts, lines(ticks));
    },
  },
  {
    name: "hour hand",
    at: v2(0, 0),
    build: () => {
      const s = new Shape([v2(-0.025, -0.09), v2(0.025, -0.09), v2(0.038, 0.22), v2(0, 0.5), v2(-0.038, 0.22)]);
      s.holes.push(circle(0.012));
      return solid(s, 0.01, 0.27);
    },
  },
  {
    name: "minute hand",
    at: v2(0, 0),
    build: () => {
      const s = new Shape([v2(-0.018, -0.11), v2(0.018, -0.11), v2(0.026, 0.32), v2(0, 0.8), v2(-0.026, 0.32)]);
      s.holes.push(circle(0.012));
      return solid(s, 0.01, 0.285);
    },
  },
  {
    name: "seconds hand",
    at: v2(0, 0),
    build: () => {
      const needle = new Shape([v2(-0.006, -0.2), v2(0.006, -0.2), v2(0.003, 0.9), v2(-0.003, 0.9)]);
      const weight = circle(0.032, v2(0, -0.17), true) as Shape;
      const cap = circle(0.03, v2(0, 0), true) as Shape;
      return merge(solid(needle, 0.008, 0.3), solid(weight, 0.008, 0.3), solid(cap, 0.02, 0.3));
    },
  },
  {
    name: "crystal",
    at: v2(0, 0),
    build: () => {
      // A domed sapphire: its rim and two contour rings rising to the dome.
      const rings: number[] = [];
      for (const [r, z] of [[0.99, 0.27], [0.8, 0.34], [0.45, 0.375]]) {
        const n = 96;
        for (let k = 0; k < n; k++) {
          const a = polar(r, (k * TAU) / n);
          const b = polar(r, ((k + 1) * TAU) / n);
          rings.push(a.x, a.y, z, b.x, b.y, z);
        }
      }
      return lines(rings);
    },
  },
  {
    name: "straps",
    at: v2(0, 0),
    straight: true,
    build: () => {
      // Each strap runs from the spring bar and curves away under the wrist.
      const side = (x0: number, x1: number, n: number) =>
        Array.from({ length: n + 1 }, (_, i) => v2(x0 + ((x1 - x0) * i) / n, 1.22 + (1.3 * i) / n));
      const left = side(-0.355, -0.3, 16);
      const right = side(0.355, 0.3, 16);
      const strap = new Shape([...right, ...left.reverse()]);
      const stitches: number[] = [];
      for (const sx of [-1, 1]) {
        for (let i = 0; i < 24; i += 2) {
          const y0 = 1.3 + (1.15 * i) / 24;
          const y1 = 1.3 + (1.15 * (i + 1)) / 24;
          const x = (y: number) => sx * (0.325 - ((y - 1.22) / 1.3) * 0.055);
          stitches.push(x(y0), y0, 0.045, x(y1), y1, 0.045);
        }
      }
      const one = merge(solid(strap, 0.05, -0.01), lines(stitches));
      const bend = (g: BufferGeometry) => {
        const p = g.getAttribute("position");
        for (let i = 0; i < p.count; i++) {
          const over = Math.max(0, Math.abs(p.getY(i)) - 1.55);
          p.setZ(i, p.getZ(i) - over * over * 0.45);
        }
        return g;
      };
      const top = bend(one.clone());
      const bottom = bend(one.applyMatrix4(new Matrix4().makeScale(1, -1, 1)));
      return merge(top, bottom);
    },
  },
];

// --- Scene --------------------------------------------------------------------------------

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
  scene.add(watch);

  const parts: Part[] = PARTS.map((def, i) => {
    const group = new Group();
    const line = new LineBasicMaterial({ color: 0xededed, transparent: true, opacity: 0, depthWrite: false });
    group.add(new LineSegments(def.build(), line));
    watch.add(group);
    return { ...def, group, line, spin: def.straight ? 0 : (rand(i + 9) - 0.5) * 1.2 };
  });

  const total = (parts.length - 1) * STAGGER + ASSEMBLE[1];
  if (gentle) stage.seek(total + 2000);

  let cage = 0;
  const cagePivot = new Vector2();

  stage.start((t, dt) => {
    // Running: the movement ramps up once the watch is whole.
    const run = gentle ? 0 : easeInOutCubic(clamp01((t - total - 300) / 1500));
    const s = t / 1000;
    cage += run * (dt / CAGE_PERIOD) * TAU;
    const balance = run * 2.4 * Math.sin(TAU * BALANCE_HZ * s);
    const beats = Math.floor(s * BALANCE_HZ * 2);
    const step = beats + easeOutCubic(clamp01(((s * BALANCE_HZ * 2) % 1) / 0.12));
    const train = run * s * 0.15;

    const own: Record<string, number> = {
      barrel: train * 0.75,
      "centre wheel": -train,
      "third wheel": train * (0.27 / 0.2),
      "escape wheel": run ? -(step * Math.PI) / 15 : 0,
      "pallet fork": run * 0.14 * Math.tanh(3 * Math.sin(TAU * BALANCE_HZ * s)),
      balance,
      hairspring: balance * 0.35,
    };
    const time = handAngles(new Date());
    own["hour hand"] = time.hour;
    own["minute hand"] = time.minute;
    own["seconds hand"] = time.second;

    for (const [i, p] of parts.entries()) {
      const u = t - i * STAGGER;
      const appear = clamp01((u - APPEAR[0]) / (APPEAR[1] - APPEAR[0]));
      const drop = easeInOutCubic(clamp01((u - ASSEMBLE[0]) / (ASSEMBLE[1] - ASSEMBLE[0])));

      p.line.opacity = (p.name === "crystal" ? 0.35 : 0.85) * easeOutCubic(appear);
      p.group.visible = u > 0;

      // Assembled place: on the mainplate, or riding the turning cage.
      let x = p.at.x;
      let y = p.at.y;
      let rot = own[p.name] ?? 0;
      if (p.inCage) {
        cagePivot.copy(p.at).rotateAround(new Vector2(0, 0), cage).add(CAGE);
        x = cagePivot.x;
        y = cagePivot.y;
        rot += cage;
      }
      if (p.name === "hairspring") p.group.scale.setScalar(1 + run * 0.035 * Math.sin(TAU * BALANCE_HZ * s));
      p.group.position.set(x, y, (1 - drop) * LIFT);
      p.group.rotation.z = rot + (1 - drop) * p.spin;
    }

    // Pull back on portrait screens so the whole case fits the width.
    camera.position.z = DISTANCE * (camera.aspect < 1 ? Math.min(1.8, 0.75 / camera.aspect) : 1);

    watch.rotation.x = -0.62 - pointer.y * 0.06;
    watch.rotation.y = pointer.x * 0.12;
    watch.rotation.z = 0.2 + Math.sin(s * 0.15) * 0.04;
  });

  // Only render while the hero is on screen.
  const view = new IntersectionObserver(([e]) => stage.setPaused(!e.isIntersecting));
  view.observe(canvas);

  return {
    /** Jump the timeline forward to `ms` (e.g. to show the finished movement). */
    seek: stage.seek,
    dispose() {
      view.disconnect();
      stage.dispose();
    },
  };
}
