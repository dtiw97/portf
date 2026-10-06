import { PerspectiveCamera, Scene, WebGLRenderer } from "three";

export type MountOptions = {
  introMs: number;
  /** Reduced motion: no fast moves, flicker or pointer parallax. */
  gentle: boolean;
  onIntroEnd: () => void;
};

export type Mounted = {
  /** Jump the timeline to the end of the intro. */
  skip: () => void;
  dispose: () => void;
};

type Frame = (t: number, dt: number) => void;

/**
 * Shared renderer setup for the project scenes: DPR capped at 2, resize-aware,
 * paused while the tab is hidden, and driven by one timeline in milliseconds.
 */
export function createStage(canvas: HTMLCanvasElement, fov = 35) {
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 1);

  const scene = new Scene();
  const camera = new PerspectiveCamera(fov, 1, 0.1, 100);

  let w = 1;
  let h = 1;
  let shift = 0;

  /**
   * Moves the subject out of the text's way: right on wide screens, up on narrow ones.
   * 0 keeps it centred, 1 is fully moved.
   */
  const applyShift = () => {
    if (shift === 0) camera.clearViewOffset();
    else if (w >= 900) camera.setViewOffset(w, h, -w * 0.2 * shift, 0, w, h);
    else camera.setViewOffset(w, h, 0, h * 0.17 * shift, w, h);
  };

  const resize = () => {
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // Keep the subject framed on portrait phones by widening the vertical FOV.
    camera.fov = w < h ? fov * Math.min(1.8, h / w) * 0.85 : fov;
    applyShift();
    camera.updateProjectionMatrix();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();

  // Smoothed pointer in [-1, 1], used for subtle parallax.
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  const onPointer = (e: PointerEvent) => {
    pointer.tx = (e.clientX / innerWidth) * 2 - 1;
    pointer.ty = (e.clientY / innerHeight) * 2 - 1;
  };
  addEventListener("pointermove", onPointer, { passive: true });

  let raf = 0;
  let last = 0;
  let elapsed = 0;
  let frame: Frame = () => {};

  const tick = (now: number) => {
    const dt = last ? Math.min(now - last, 50) : 16;
    last = now;
    elapsed += dt;
    pointer.x += (pointer.tx - pointer.x) * 0.04;
    pointer.y += (pointer.ty - pointer.y) * 0.04;
    frame(elapsed, dt);
    renderer.render(scene, camera);
    raf = requestAnimationFrame(tick);
  };

  const onVisibility = () => {
    cancelAnimationFrame(raf);
    last = 0;
    if (!document.hidden) raf = requestAnimationFrame(tick);
  };
  document.addEventListener("visibilitychange", onVisibility);

  return {
    renderer,
    scene,
    camera,
    pointer,
    start(cb: Frame) {
      frame = cb;
      raf = requestAnimationFrame(tick);
    },
    setShift(k: number) {
      if (k === shift) return;
      shift = k;
      applyShift();
    },
    seek(ms: number) {
      elapsed = Math.max(elapsed, ms);
    },
    dispose() {
      cancelAnimationFrame(raf);
      observer.disconnect();
      removeEventListener("pointermove", onPointer);
      document.removeEventListener("visibilitychange", onVisibility);
      scene.traverse((o) => {
        const obj = o as { geometry?: { dispose(): void }; material?: { dispose(): void } };
        obj.geometry?.dispose();
        obj.material?.dispose();
      });
      renderer.dispose();
    },
  };
}

/** Calls onIntroEnd exactly once when the timeline crosses introMs. */
export function introGate(introMs: number, onIntroEnd: () => void) {
  let done = false;
  return (t: number) => {
    if (!done && t >= introMs) {
      done = true;
      onIntroEnd();
    }
  };
}
