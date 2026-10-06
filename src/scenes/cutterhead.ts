import {
  BoxGeometry,
  BufferGeometry,
  CylinderGeometry,
  EdgesGeometry,
  ExtrudeGeometry,
  Float32BufferAttribute,
  Fog,
  Group,
  LatheGeometry,
  LineBasicMaterial,
  LineSegments,
  Matrix4,
  Path,
  Shape,
  Vector2,
  Vector3,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { clamp01, easeInOutCubic, easeOutCubic } from "../lib/motion";
import { createStage, introGate, type MountOptions, type Mounted } from "./stage";

/*
 * Wireframe EPB cutterhead, built procedurally (radius 1 = 3 m, tunnel axis along Z).
 * A flat mixed-face wheel: six spokes with face plates between them, muck openings along
 * the spokes, and a flat centre carrying twin disc cutters. At the periphery the face rolls
 * back through a curved gauge zone carrying tilted gauge cutters and buckets.
 * Disc cutters are 17" rings (hub, shoulder, narrow tip) set in housings recessed into the
 * face, so only the tip stands proud.
 * Every part is reduced to its feature edges and merged, so the whole machine
 * renders in two draw calls.
 */

const SPOKES = 6;
const SECTOR = (Math.PI * 2) / SPOKES;
const IDLE_RPM = 1.6; // close to a real cutterhead's working speed
const IDLE_SPEED = (IDLE_RPM * Math.PI * 2) / 60;

const FACE = 0.1; // z of the flat front face
const HUB_R = 0.3; // flat centre section
const SPOKE_W = 0.22;
const OPENING = 0.08; // muck opening along the leading edge of each spoke
const PLATE_IN = 0.34; // inside this the spokes take up the whole sector
const PLATE_OUT = 0.86; // where the flat face ends and the gauge zone begins
const GAUGE_R = 0.14; // radius of the curved gauge zone
const BACK = -0.3; // rear of the cutterhead body

const DISC_R = 0.072; // 17" disc
const DISC_PROUD = 0.058; // how far the tip stands off the face

const rotX = (a: number) => new Matrix4().makeRotationX(a);
const rotZ = (a: number) => new Matrix4().makeRotationZ(a);
const move = (x: number, y: number, z: number) => new Matrix4().makeTranslation(x, y, z);
const polar = (r: number, a: number) => new Vector2(Math.cos(a) * r, Math.sin(a) * r);
const deg = (d: number) => (d * Math.PI) / 180;

/** Feature edges of `geometry`, with transforms applied in order (local first). */
function edges(geometry: BufferGeometry, ...transforms: Matrix4[]) {
  const e = new EdgesGeometry(geometry, 20);
  geometry.dispose();
  for (const m of transforms) e.applyMatrix4(m);
  return e;
}

/** Angle of the point at radius `r` on a line parallel to the +Y axis, offset by `x`. */
const along = (r: number, x: number) => Math.PI / 2 + Math.asin(x / r);

/** Rounded radial slot centred on angle `a`, from radius `r0` to `r1`. */
function slot(a: number, r0: number, r1: number, half: number) {
  const points: Vector2[] = [];
  const dir = polar(1, a);
  for (const [r, from] of [[r1, a - Math.PI / 2], [r0, a + Math.PI / 2]] as const) {
    const c = dir.clone().multiplyScalar(r);
    for (let i = 0; i <= 12; i++) points.push(polar(half, from + (i / 12) * Math.PI).add(c));
  }
  return new Path(points);
}

/**
 * Face plate filling the sector between the spoke on +Y and the next one counter-clockwise,
 * leaving a muck opening beside the first spoke and a radial slot through the middle.
 */
function facePlate() {
  const near = -(SPOKE_W / 2 + OPENING); // edge facing the opening (plate lies at -x)
  const far = SPOKE_W / 2; // flush against the next spoke, in that spoke's frame
  const a0 = (r: number) => along(r, -near);
  const a1 = (r: number) => along(r, -far) + SECTOR;

  const shape = new Shape();
  shape.moveTo(...polar(PLATE_IN, a0(PLATE_IN)).toArray());
  shape.lineTo(...polar(PLATE_OUT, a0(PLATE_OUT)).toArray());
  shape.absarc(0, 0, PLATE_OUT, a0(PLATE_OUT), a1(PLATE_OUT), false);
  shape.lineTo(...polar(PLATE_IN, a1(PLATE_IN)).toArray());
  shape.absarc(0, 0, PLATE_IN, a1(PLATE_IN), a0(PLATE_IN), true);
  shape.holes.push(slot(Math.PI / 2 + SECTOR * 0.57, 0.44, 0.62, 0.035));

  const depth = 0.04;
  return edges(
    new ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 32 }),
    move(0, 0, FACE - depth),
  );
}

/** Rectangular frame (w × h outside, hw × hh opening) whose top sits `top` above z = 0. */
function frame(w: number, h: number, hw: number, hh: number, depth: number, top: number) {
  const shape = new Shape();
  shape.moveTo(-w / 2, -h / 2).lineTo(w / 2, -h / 2).lineTo(w / 2, h / 2).lineTo(-w / 2, h / 2);
  const hole = new Path();
  hole.moveTo(-hw / 2, -hh / 2).lineTo(-hw / 2, hh / 2).lineTo(hw / 2, hh / 2).lineTo(hw / 2, -hh / 2);
  shape.holes.push(hole);
  return new ExtrudeGeometry(shape, { depth, bevelEnabled: false }).translate(0, 0, top - depth);
}

/** A 17" disc ring around the Y axis: bore, hub, shoulder, then a taper to a narrow tip. */
function discRing() {
  const half = [
    [0.012, 0.022],
    [0.035, 0.022],
    [0.035, 0.013],
    [0.05, 0.013],
    [0.068, 0.004],
    [DISC_R, 0.003],
  ];
  const profile = [
    ...half.map(([r, w]) => new Vector2(r, -w)),
    ...half.reverse().map(([r, w]) => new Vector2(r, w)),
  ];
  profile.push(profile[0].clone());
  return new LatheGeometry(profile, 24);
}

/**
 * Disc cutter in its housing, local to the face: rolls along X, axis along Y, face at z = 0.
 * The ring sits mostly below the face and rises through the housing slot.
 */
function cutter(...transforms: Matrix4[]) {
  return [
    edges(discRing(), move(0, 0, DISC_PROUD - DISC_R), ...transforms),
    edges(frame(0.18, 0.085, 0.15, 0.05, 0.05, 0.01), ...transforms),
  ];
}

/** Face disc at radius `r` along the +Y axis. */
const disc = (r: number, ...transforms: Matrix4[]) => cutter(move(0, r, FACE), ...transforms);

/**
 * Local frame on the gauge zone at angle `t` (0 = facing forward, 90° = facing outward),
 * on the +Y axis: local Z becomes the surface normal.
 */
const onGauge = (t: number) =>
  new Matrix4()
    .makeTranslation(0, PLATE_OUT + GAUGE_R * Math.sin(t), FACE - GAUGE_R + GAUGE_R * Math.cos(t))
    .multiply(rotX(-t));

/** The cutterhead body: flat face ring, curved gauge zone, then the rim back to the rear. */
function body() {
  const profile = [new Vector2(PLATE_OUT, BACK), new Vector2(PLATE_OUT, FACE)];
  for (let i = 1; i <= 4; i++) {
    const t = (i / 4) * (Math.PI / 2);
    profile.push(new Vector2(PLATE_OUT + GAUGE_R * Math.sin(t), FACE - GAUGE_R + GAUGE_R * Math.cos(t)));
  }
  profile.push(new Vector2(PLATE_OUT + GAUGE_R, BACK), new Vector2(PLATE_OUT, BACK));
  return new LatheGeometry(profile, 128);
}

function buildHead() {
  const parts: BufferGeometry[] = [];
  const axial = rotX(Math.PI / 2); // lathes and cylinders default to a Y axis
  const sideways = rotZ(Math.PI / 2);

  parts.push(edges(body(), axial));

  // Flat centre: hub plate carrying two twin disc housings that cut the core.
  parts.push(edges(new CylinderGeometry(HUB_R, HUB_R, 0.2, 48), axial, move(0, 0, FACE - 0.1)));
  for (const side of [-1, 1]) {
    parts.push(edges(frame(0.13, 0.18, 0.11, 0.15, 0.05, 0.01), move(side * 0.075, 0, FACE)));
    for (const x of [0.05, 0.1]) {
      parts.push(edges(discRing(), sideways, move(side * x, 0, FACE + DISC_PROUD - DISC_R)));
    }
    // Conditioning ports either side of the housings
    parts.push(
      edges(new CylinderGeometry(0.018, 0.018, 0.01, 12), axial, move(0, side * 0.15, FACE)),
    );
  }

  for (let s = 0; s < SPOKES; s++) {
    const a = s * SECTOR;
    const spin = rotZ(a);

    // Main spoke, flush with the face plates
    const length = PLATE_OUT - HUB_R;
    parts.push(
      edges(new BoxGeometry(SPOKE_W, length, 0.18), move(0, HUB_R + length / 2, FACE - 0.09), spin),
    );
    parts.push(facePlate().applyMatrix4(spin));

    // Face discs along the spoke, staggered per spoke so the kerfs interleave.
    for (let k = 0; k < 5; k++) {
      const r = 0.36 + k * 0.12 + (s % 3) * 0.04;
      if (r < 0.82) parts.push(...disc(r, spin));
    }
    // One more on the outer face plate, beyond the slot
    parts.push(...disc(0.72 + (s % 2) * 0.04, rotZ(a + SECTOR * 0.57)));

    // Gauge discs around the curved periphery, tilted further outward the further round they sit
    const gauge = s % 2 ? [[22, 32], [40, 58]] : [[0, 20], [22, 45], [42, 70]];
    for (const [offset, t] of gauge) {
      parts.push(...cutter(onGauge(deg(t)), rotZ(a + deg(offset))));
    }

    // Scrapers on the spoke edge facing the opening, lower than the disc tips
    for (let k = 0; k < 3; k++) {
      parts.push(
        edges(
          new BoxGeometry(0.03, 0.12, 0.05),
          move(-(SPOKE_W / 2 + 0.015), 0.38 + k * 0.2, FACE + 0.005),
          spin,
        ),
      );
    }

    // Conditioning port on the face plate
    parts.push(
      edges(
        new CylinderGeometry(0.018, 0.018, 0.01, 12),
        axial,
        move(0, 0.66, FACE),
        rotZ(a + SECTOR * 0.75),
      ),
    );

    // Bucket on the gauge zone at the mouth of the muck opening
    parts.push(
      edges(
        new BoxGeometry(0.07, 0.06, 0.06),
        move(-(SPOKE_W / 2 + OPENING / 2), 0, 0.02),
        onGauge(deg(35)),
        spin,
      ),
    );
  }

  return mergeGeometries(parts);
}

function buildShield() {
  const parts: BufferGeometry[] = [];
  const axial = rotX(Math.PI / 2);
  const length = 2.6;

  const r = 0.985; // a touch under the gauge cut

  parts.push(edges(new CylinderGeometry(r, r, length, 96), axial, move(0, 0, BACK - length / 2)));
  for (const z of [-0.9, -1.7]) {
    parts.push(edges(new CylinderGeometry(r, r, 0.04, 96), axial, move(0, 0, z)));
  }
  // Bulkhead with screw conveyor opening
  parts.push(edges(new CylinderGeometry(0.97, 0.97, 0.02, 96), axial, move(0, 0, -0.55)));
  parts.push(edges(new CylinderGeometry(0.16, 0.16, 1.9, 24), axial, rotX(-0.25), move(0, -0.55, -1.4)));

  const lines: number[] = [];
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    lines.push(x, y, BACK, x, y, BACK - length);
  }
  const longitudinal = new BufferGeometry();
  longitudinal.setAttribute("position", new Float32BufferAttribute(lines, 3));
  parts.push(longitudinal);

  return mergeGeometries(parts);
}

export function mount(canvas: HTMLCanvasElement, { introMs, gentle, onIntroEnd }: MountOptions): Mounted {
  const stage = createStage(canvas, 32);
  const { scene, camera } = stage;
  const pointer = gentle ? { x: 0, y: 0 } : stage.pointer;
  const fog = new Fog(0x000000, 3.2, 8);
  scene.fog = fog;

  const headMaterial = new LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 });
  const shieldMaterial = new LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 });

  const machine = new Group();
  const head = new LineSegments(buildHead(), headMaterial);
  const shield = new LineSegments(buildShield(), shieldMaterial);
  machine.add(head, shield);
  scene.add(machine);

  const from = new Vector3(0.2, 0.15, 10);
  const to = new Vector3(1.9, 0.8, 3.5);
  const target = new Vector3(0, 0, -0.6);
  const gate = introGate(introMs, onIntroEnd);

  stage.start((t, dt) => {
    const p = introMs > 0 ? clamp01(t / introMs) : 1;

    camera.position.lerpVectors(from, to, easeInOutCubic(p));
    camera.position.x += pointer.x * 0.35 * p;
    camera.position.y -= pointer.y * 0.2 * p;
    camera.lookAt(target);
    stage.setShift(easeInOutCubic(clamp01((p - 0.55) / 0.45)));

    // Fog follows the camera so the far shield fades but the head is never swallowed.
    const dist = camera.position.distanceTo(target);
    fog.near = dist - 0.8;
    fog.far = dist + 4.5;

    // Spins up on entry, then settles to a slow working speed.
    const speed = IDLE_SPEED + (gentle ? 0 : 2.2) * (1 - easeOutCubic(p));
    head.rotation.z -= speed * (dt / 1000);

    headMaterial.opacity = 0.9 * easeOutCubic(clamp01(p / 0.6));
    shieldMaterial.opacity = 0.32 * easeOutCubic(clamp01((p - 0.2) / 0.6));

    gate(t);
  });

  return { skip: () => stage.seek(introMs), dispose: stage.dispose };
}
