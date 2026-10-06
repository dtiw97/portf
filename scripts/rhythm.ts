/*
 * How a hand moves a brush along one stroke: it lands and presses, sweeps a run, stops at
 * each sharp turn (longer for sharper turns), and flicks quickly out of a hook.
 */

export type Pt = [number, number];

type Kind = "press" | "move" | "hold";
type Key = { at: number; frac: number; kind: Kind };

const BREAK_ANGLE = 40; // a turn sharp enough that the brush stops and re-presses
const LAST_BREAK_ANGLE = 25; // the pause before a final flick or the foot of a 捺

const turnAngle = (a: Pt, b: Pt, c: Pt) => {
  const u = [b[0] - a[0], b[1] - a[1]];
  const v = [c[0] - b[0], c[1] - b[1]];
  const cos = (u[0] * v[0] + u[1] * v[1]) / (Math.hypot(u[0], u[1]) * Math.hypot(v[0], v[1]) || 1);
  return (Math.acos(Math.max(-1, Math.min(1, cos))) * 180) / Math.PI;
};

/** Pauses are fixed milliseconds; moves are weights, scaled later to fit the time budget. */
export function strokeRhythm(path: Pt[], { press = 60, pausePerDegree = 1.6, pace = 1 } = {}) {
  const seg = path.slice(1).map((p, i) => Math.hypot(p[0] - path[i][0], p[1] - path[i][1]));
  const total = seg.reduce((a, b) => a + b, 0);

  const breaks: { index: number; angle: number }[] = [];
  for (let i = 1; i < path.length - 1; i++) {
    const angle = turnAngle(path[i - 1], path[i], path[i + 1]);
    const isLast = i === path.length - 2;
    if (angle >= BREAK_ANGLE || (isLast && angle >= LAST_BREAK_ANGLE)) breaks.push({ index: i, angle });
  }

  const runs: { to: number; length: number; flick: boolean; pause: number }[] = [];
  let start = 0;
  let travelled = 0;
  for (const [n, b] of [...breaks, { index: path.length - 1, angle: 0 }].entries()) {
    const length = seg.slice(start, b.index).reduce((a, c) => a + c, 0);
    const prev = breaks[n - 1];
    travelled += length;
    runs.push({
      to: travelled / total,
      length,
      flick: !!prev && prev.angle >= 60, // the short run after a hook turn is a fast flick
      pause: b.angle ? Math.round(pausePerDegree * (b.angle - 15)) : 0,
    });
    start = b.index;
  }

  const moveWeights = runs.map((r) => Math.pow(r.length, 0.85) * (r.flick ? 0.55 : 1) * pace);
  const fixed = press + runs.reduce((a, r) => a + r.pause, 0);

  const keys = (msPerWeight: number) => {
    const out: Key[] = [{ at: 0, frac: 0, kind: "press" }];
    let t = press;
    out.push({ at: t, frac: 0.012, kind: "move" }); // the brush spreads as it lands
    runs.forEach((r, i) => {
      t += moveWeights[i] * msPerWeight;
      const end = Math.max(r.to, 0.012);
      out.push({ at: t, frac: end, kind: r.pause ? "hold" : "move" });
      if (r.pause) {
        t += r.pause;
        out.push({ at: t, frac: Math.min(1, end + 0.004), kind: "move" }); // presses a touch
      }
    });
    return { keys: out, duration: t };
  };

  return { fixed, moveWeight: moveWeights.reduce((a, b) => a + b, 0), keys };
}

// Inverse easings: progress fraction → time fraction within a segment.
const inverse: Record<Kind, (u: number) => number> = {
  press: (u) => 1 - Math.sqrt(1 - u), // ease-out landing
  move: (u) => Math.acos(1 - 2 * u) / Math.PI, // ease-in-out sweep
  hold: (u) => u,
};

/** When (ms from stroke start) the brush reaches `frac` of the way along the stroke. */
export function timeAtFrac(keys: Key[], frac: number) {
  for (let i = 1; i < keys.length; i++) {
    const a = keys[i - 1];
    const b = keys[i];
    if (frac <= b.frac || i === keys.length - 1) {
      const u = b.frac > a.frac ? Math.min(1, Math.max(0, (frac - a.frac) / (b.frac - a.frac))) : 1;
      return a.at + (b.at - a.at) * inverse[a.kind](u);
    }
  }
  return keys[keys.length - 1].at;
}
