import {
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  Group,
  InstancedMesh,
  LineBasicMaterial,
  LineSegments,
  MeshBasicMaterial,
  Object3D,
  PlaneGeometry,
} from "three";
import { TRANSFER_TOPIC } from "../lib/erc20";
import { clamp01, easeInOutCubic, easeOutCubic } from "../lib/motion";
import { createStage, introGate, type MountOptions, type Mounted } from "./stage";

/*
 * A square of 16×16 cells is 256 bits: the grid scrambles like hash rounds and locks,
 * diagonal by diagonal, into the real keccak256 topic of the ERC-20 Transfer event.
 */

const N = 16;
const SIZE = 2;
const PITCH = SIZE / N;
const FLIP_MS = 60;
const RIPPLE_MS = 3600;

const bits = Array.from(TRANSFER_TOPIC, (h) => parseInt(h, 16).toString(2).padStart(4, "0"))
  .join("")
  .split("")
  .map((b) => b === "1");

/** Cheap integer hash → [0, 1). */
function rand(n: number) {
  n = Math.imul(n ^ (n >>> 16), 0x45d9f3b);
  n = Math.imul(n ^ (n >>> 16), 0x45d9f3b);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

function squarePath(h: number, bracket?: number) {
  const pts: number[] = [];
  const corners = [
    [-h, -h],
    [h, -h],
    [h, h],
    [-h, h],
  ];
  for (let i = 0; i < 4; i++) {
    const [x0, y0] = corners[i];
    const [x1, y1] = corners[(i + 1) % 4];
    if (bracket) {
      // Corner brackets only: a short segment from each end of the side.
      const dx = Math.sign(x1 - x0) * bracket;
      const dy = Math.sign(y1 - y0) * bracket;
      pts.push(x0, y0, 0, x0 + dx, y0 + dy, 0, x1, y1, 0, x1 - dx, y1 - dy, 0);
    } else {
      pts.push(x0, y0, 0, x1, y1, 0);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(pts, 3));
  return g;
}

export function mount(canvas: HTMLCanvasElement, { introMs, gentle, onIntroEnd }: MountOptions): Mounted {
  const stage = createStage(canvas, 32);
  const { scene, camera } = stage;
  const pointer = gentle ? { x: 0, y: 0 } : stage.pointer;
  camera.position.set(0, 0, 5.4);

  const board = new Group();
  scene.add(board);

  const frameMaterial = new LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 });
  const frame = new LineSegments(squarePath(SIZE / 2 + 0.08), frameMaterial);
  const brackets = new LineSegments(squarePath(SIZE / 2 + 0.2, 0.14), frameMaterial);
  board.add(frame, brackets);

  const cells = new InstancedMesh(
    new PlaneGeometry(PITCH * 0.8, PITCH * 0.8),
    new MeshBasicMaterial({ color: 0xffffff }),
    N * N,
  );
  board.add(cells);

  const on = new Color(0xf2f2f2);
  const off = new Color(0x161616);
  const flash = new Color(0xc8312b);
  const tmp = new Color();
  const dummy = new Object3D();

  // Each cell appears, scrambles, then locks along a jittered diagonal front.
  const appearAt = Array.from({ length: N * N }, (_, i) => 0.1 + 0.15 * rand(i + 7));
  const lockAt = Array.from({ length: N * N }, (_, i) => {
    const row = Math.floor(i / N);
    const col = i % N;
    return 0.38 + 0.48 * ((row + col) / (2 * N - 2)) + 0.08 * rand(i + 101);
  });

  const gate = introGate(introMs, onIntroEnd);

  stage.start((t) => {
    const p = introMs > 0 ? clamp01(t / introMs) : 1;
    // Slower flips under reduced motion to avoid flicker.
    const step = Math.floor(t / (gentle ? FLIP_MS * 4 : FLIP_MS));

    // Diamond to square: the frame rotates 45° into place while growing.
    const f = easeInOutCubic(clamp01(p / 0.35));
    frame.rotation.z = brackets.rotation.z = (1 - f) * (Math.PI / 4);
    frame.scale.setScalar(0.2 + 0.8 * f);
    brackets.scale.setScalar(0.2 + 0.8 * f);
    frameMaterial.opacity = 0.85 * f;

    const settle = easeInOutCubic(clamp01((p - 0.55) / 0.45));
    camera.position.z = 5.4 + 1.4 * settle;
    stage.setShift(settle);

    board.rotation.x = 0.55 * (1 - easeOutCubic(p)) + pointer.y * 0.18 * p;
    board.rotation.y = pointer.x * 0.25 * p;

    // After the intro, a slow ripple re-hashes a diagonal band and lets it settle again.
    const ripple = !gentle && t > introMs ? (((t - introMs) % RIPPLE_MS) / RIPPLE_MS) * (2 * N + 8) - 4 : -99;

    for (let i = 0; i < N * N; i++) {
      const row = Math.floor(i / N);
      const col = i % N;

      const grow = easeOutCubic(clamp01((p - appearAt[i]) / 0.12));
      const sinceLock = p - lockAt[i];
      const locked = sinceLock >= 0;
      const inRipple = Math.abs(row + col - ripple) < 1.2;

      const value = locked && !inRipple ? bits[i] : rand(i * 977 + step * 7919) > 0.5;
      tmp.copy(value ? on : off);
      // Brief seal-red flash as each cell locks.
      if (locked && sinceLock < 0.06) tmp.lerp(flash, 1 - sinceLock / 0.06);
      cells.setColorAt(i, tmp);

      const pulse = locked && sinceLock < 0.08 ? 1 + 0.35 * (1 - sinceLock / 0.08) : 1;
      dummy.position.set(-SIZE / 2 + PITCH * (col + 0.5), SIZE / 2 - PITCH * (row + 0.5), 0);
      dummy.scale.setScalar(Math.max(grow * pulse, 1e-4));
      dummy.updateMatrix();
      cells.setMatrixAt(i, dummy.matrix);
    }
    cells.instanceMatrix.needsUpdate = true;
    if (cells.instanceColor) cells.instanceColor.needsUpdate = true;

    gate(t);
  });

  return { skip: () => stage.seek(introMs), dispose: stage.dispose };
}
