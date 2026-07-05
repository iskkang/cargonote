import { useEffect, useRef } from 'react';
import type { Placement } from '../domain/pack';

/** Three.js orbit/zoom viewer for a packed container. three is loaded lazily. */
export function PackView3DGL({ placements, L, W, H, highlight, cog, axisWords }: {
  placements: Placement[]; L: number; W: number; H: number; highlight: number | null;
  cog?: { x: number; y: number; z: number } | null;
  axisWords?: { h: string; w: string; l: string }; // localized 높이/폭/길이 for the in-3D free-space labels
}) {
  const mount = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ref = useRef<any>({});
  const hlRef = useRef(highlight);
  hlRef.current = highlight;
  const cogRef = useRef(cog);
  cogRef.current = cog;
  const awRef = useRef(axisWords);
  awRef.current = axisWords;

  const applyHighlight = () => {
    const r = ref.current;
    if (!r.boxes) return;
    const hl = hlRef.current;
    for (const b of r.boxes) {
      const on = hl == null || b.line === hl;
      b.mat.opacity = on ? 1 : 0.1; b.mat.transparent = !on;
      b.edge.opacity = on ? 0.25 : 0.04;
    }
  };

  const build = () => {
    const r = ref.current;
    if (!r.THREE) return;
    const THREE = r.THREE, s = 0.01; // cm → m
    while (r.group.children.length) {
      const c = r.group.children.pop();
      c.geometry?.dispose?.(); c.material?.dispose?.();
      r.group.remove(c);
    }
    r.boxes = [];
    const cg = new THREE.BoxGeometry(L * s, H * s, W * s);
    const cont = new THREE.LineSegments(new THREE.EdgesGeometry(cg), new THREE.LineBasicMaterial({ color: 0xc8d2db }));
    cont.position.set(L * s / 2, H * s / 2, W * s / 2); r.group.add(cont); cg.dispose();
    for (const p of placements) {
      const g = new THREE.BoxGeometry(p.dx * s, p.dz * s, p.dy * s); // our z (up) → three Y
      const mat = new THREE.MeshLambertMaterial({ color: new THREE.Color(p.color) });
      const m = new THREE.Mesh(g, mat);
      m.position.set((p.x + p.dx / 2) * s, (p.z + p.dz / 2) * s, (p.y + p.dy / 2) * s);
      const em = new THREE.LineBasicMaterial({ color: 0x0f1b26, transparent: true, opacity: 0.25 });
      m.add(new THREE.LineSegments(new THREE.EdgesGeometry(g), em));
      r.group.add(m); r.boxes.push({ line: p.line, mat, edge: em });
    }
    const cg2 = cogRef.current;
    if (cg2) {
      const rad = Math.max(L, W, H) * s * 0.04;
      const sph = new THREE.Mesh(new THREE.SphereGeometry(rad, 18, 18), new THREE.MeshBasicMaterial({ color: 0xdc2626 }));
      sph.position.set(cg2.x * s, cg2.z * s, cg2.y * s); r.group.add(sph);
      const drop = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(cg2.x * s, cg2.z * s, cg2.y * s), new THREE.Vector3(cg2.x * s, 0, cg2.y * s),
      ]);
      r.group.add(new THREE.Line(drop, new THREE.LineBasicMaterial({ color: 0xdc2626, transparent: true, opacity: 0.6 })));
    }
    // Free space: translucent teal slabs filling the room left between the cargo envelope and the walls.
    const aw = awRef.current;
    if (aw && placements.length) {
      let ux = 0, uy = 0, uz = 0;
      for (const p of placements) { ux = Math.max(ux, p.x + p.dx); uy = Math.max(uy, p.y + p.dy); uz = Math.max(uz, p.z + p.dz); }
      const rh = H - uz, rw = W - uy, rl = L - ux;
      const labelScale = Math.max(L, W, H) * s;
      const addSlab = (dx: number, dy: number, dz: number, cx: number, cy: number, cz: number) => {
        if (dx <= 0.5 || dy <= 0.5 || dz <= 0.5) return;
        const g = new THREE.BoxGeometry(dx * s, dy * s, dz * s);
        const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: 0x16a9b0, transparent: true, opacity: 0.1, depthWrite: false }));
        m.position.set(cx * s, cy * s, cz * s);
        m.add(new THREE.LineSegments(new THREE.EdgesGeometry(g), new THREE.LineBasicMaterial({ color: 0x16a9b0, transparent: true, opacity: 0.35 })));
        r.group.add(m);
      };
      const addLabel = (text: string, cx: number, cy: number, cz: number) => {
        const sp = makeLabel(THREE, text);
        sp.position.set(cx * s, cy * s, cz * s);
        const h = labelScale * 0.11; sp.scale.set(h * 4.2, h, 1);
        r.group.add(sp);
      };
      addSlab(ux, rh, uy, ux / 2, uz + rh / 2, uy / 2);      // headroom above the load
      addSlab(rl, H, W, ux + rl / 2, H / 2, W / 2);          // gap toward the far end (length)
      addSlab(ux, H, rw, ux / 2, H / 2, uy + rw / 2);        // gap toward the side (width)
      if (rh > 1) addLabel(`${aw.h} ${Math.round(rh)}cm`, ux / 2, uz + rh / 2, uy / 2);
      if (rl > 1) addLabel(`${aw.l} ${Math.round(rl)}cm`, ux + rl / 2, H * 0.6, W / 2);
      if (rw > 1) addLabel(`${aw.w} ${Math.round(rw)}cm`, ux / 2, H * 0.4, uy + rw / 2);
    }
    r.group.position.set(-L * s / 2, -H * s / 2, -W * s / 2);
    const maxDim = Math.max(L, W, H) * s;
    r.cam.position.set(maxDim * 0.95, maxDim * 0.85, maxDim * 1.25);
    r.controls.target.set(0, 0, 0); r.controls.update();
    applyHighlight();
  };

  // init once
  useEffect(() => {
    let disposed = false; let raf = 0;
    (async () => {
      const THREE = await import('three');
      const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js');
      const el = mount.current;
      if (disposed || !el) return;
      const w = el.clientWidth || 480, h = 340;
      const scene = new THREE.Scene(); scene.background = new THREE.Color('#F4F7F9');
      const cam = new THREE.PerspectiveCamera(45, w / h, 0.05, 1000);
      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(w, h); renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      el.appendChild(renderer.domElement);
      scene.add(new THREE.AmbientLight(0xffffff, 0.8));
      const dir = new THREE.DirectionalLight(0xffffff, 0.55); dir.position.set(4, 9, 6); scene.add(dir);
      const controls = new OrbitControls(cam, renderer.domElement); controls.enablePan = false; controls.minDistance = 0.5;
      const group = new THREE.Group(); scene.add(group);
      const onResize = () => { const ww = el.clientWidth || w; renderer.setSize(ww, h); cam.aspect = ww / h; cam.updateProjectionMatrix(); };
      window.addEventListener('resize', onResize);
      ref.current = { THREE, scene, cam, renderer, controls, group, boxes: [], el, onResize };
      build();
      const loop = () => { raf = requestAnimationFrame(loop); controls.update(); renderer.render(scene, cam); };
      loop();
    })();
    return () => {
      disposed = true; cancelAnimationFrame(raf);
      const r = ref.current;
      if (r.onResize) window.removeEventListener('resize', r.onResize);
      if (r.renderer) { try { r.el?.removeChild(r.renderer.domElement); } catch { /* gone */ } r.renderer.dispose(); }
      ref.current = {};
    };
  }, []);

  useEffect(() => { build(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [placements, L, W, H, cog?.x, cog?.y, cog?.z, axisWords?.h, axisWords?.w, axisWords?.l]);
  useEffect(() => { applyHighlight(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [highlight]);

  return <div ref={mount} style={{ width: '100%', height: 340, cursor: 'grab' }} />;
}

// A text sprite (canvas texture) so cm labels float inside the 3D scene, always facing the camera.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeLabel(THREE: any, text: string) {
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 64;
  const ctx = cv.getContext('2d')!;
  ctx.fillStyle = 'rgba(15,27,38,0.85)';
  const r = 12, w = 256, h = 64;
  ctx.beginPath();
  ctx.moveTo(r, 0); ctx.arcTo(w, 0, w, h, r); ctx.arcTo(w, h, 0, h, r); ctx.arcTo(0, h, 0, 0, r); ctx.arcTo(0, 0, w, 0, r); ctx.closePath(); ctx.fill();
  ctx.font = 'bold 30px system-ui, sans-serif'; ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, 128, 34);
  const tex = new THREE.CanvasTexture(cv); tex.needsUpdate = true;
  return new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
}
