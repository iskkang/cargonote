import type { Placement } from '../domain/pack';
import { C } from '../ui/tokens';

const A = 0.866, B = 0.5; // isometric projection factors

function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const t = amt < 0 ? 0 : 255, p = Math.abs(amt);
  r = Math.round(r + (t - r) * p); g = Math.round(g + (t - g) * p); b = Math.round(b + (t - b) * p);
  return `rgb(${r},${g},${b})`;
}

/** Isometric SVG of a packed container. No external 3D library. */
export function PackView3D({ placements, L, W, H }: { placements: Placement[]; L: number; W: number; H: number }) {
  const proj = (x: number, y: number, z: number) => ({ X: (x - y) * A, Y: (x + y) * B - z });

  // Bounds from the container corners.
  const corners: [number, number, number][] = [];
  for (const x of [0, L]) for (const y of [0, W]) for (const z of [0, H]) corners.push([x, y, z]);
  const ps = corners.map((c) => proj(...c));
  const minX = Math.min(...ps.map((p) => p.X)), maxX = Math.max(...ps.map((p) => p.X));
  const minY = Math.min(...ps.map((p) => p.Y)), maxY = Math.max(...ps.map((p) => p.Y));
  const pad = 14, scale = 460 / Math.max(1, maxX - minX);
  const vw = (maxX - minX) * scale + pad * 2, vh = (maxY - minY) * scale + pad * 2;
  const to = (x: number, y: number, z: number) => { const p = proj(x, y, z); return [(p.X - minX) * scale + pad, (p.Y - minY) * scale + pad]; };
  const pts = (cs: [number, number, number][]) => cs.map((c) => to(...c).join(',')).join(' ');
  const line = (a: [number, number, number], b: [number, number, number]) => { const [x1, y1] = to(...a); const [x2, y2] = to(...b); return { x1, y1, x2, y2 }; };

  // Container wireframe edges.
  const c = (x: number, y: number, z: number): [number, number, number] => [x, y, z];
  const edges: [[number, number, number], [number, number, number]][] = [
    [c(0, 0, 0), c(L, 0, 0)], [c(0, 0, 0), c(0, W, 0)], [c(L, 0, 0), c(L, W, 0)], [c(0, W, 0), c(L, W, 0)],
    [c(0, 0, H), c(L, 0, H)], [c(0, 0, H), c(0, W, H)], [c(L, 0, H), c(L, W, H)], [c(0, W, H), c(L, W, H)],
    [c(0, 0, 0), c(0, 0, H)], [c(L, 0, 0), c(L, 0, H)], [c(0, W, 0), c(0, W, H)], [c(L, W, 0), c(L, W, H)],
  ];

  const ordered = [...placements].sort((a, b) => (a.x + a.y + a.z) - (b.x + b.y + b.z));

  return (
    <svg viewBox={`0 0 ${vw} ${vh}`} width="100%" style={{ height: 'auto', display: 'block' }} role="img" aria-label="3D 적재도">
      {edges.map((e, i) => { const l = line(e[0], e[1]); return <line key={`e${i}`} {...l} stroke={C.line} strokeWidth={1} />; })}
      {ordered.map((p, i) => {
        const { x, y, z, dx, dy, dz, color } = p;
        const top: [number, number, number][] = [[x, y, z + dz], [x + dx, y, z + dz], [x + dx, y + dy, z + dz], [x, y + dy, z + dz]];
        const east: [number, number, number][] = [[x + dx, y, z], [x + dx, y + dy, z], [x + dx, y + dy, z + dz], [x + dx, y, z + dz]];
        const south: [number, number, number][] = [[x, y + dy, z], [x + dx, y + dy, z], [x + dx, y + dy, z + dz], [x, y + dy, z + dz]];
        const stroke = 'rgba(15,27,38,.28)';
        return (
          <g key={i}>
            <polygon points={pts(south)} fill={shade(color, -0.18)} stroke={stroke} strokeWidth={0.6} />
            <polygon points={pts(east)} fill={color} stroke={stroke} strokeWidth={0.6} />
            <polygon points={pts(top)} fill={shade(color, 0.28)} stroke={stroke} strokeWidth={0.6} />
          </g>
        );
      })}
    </svg>
  );
}
