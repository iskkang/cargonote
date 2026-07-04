import type { CargoLine } from '../domain/stuffing';

const HEAD: Record<string, string[]> = {
  name: ['name', '품명', 'item', '품목', 'description', 'desc', '货物', '品名'],
  qty: ['qty', '수량', 'quantity', 'q', 'count', '数量'],
  l: ['l', 'length', '길이', 'l(cm)', 'len', '长'],
  w: ['w', 'width', '너비', '폭', 'w(cm)', '宽'],
  h: ['h', 'height', '높이', 'h(cm)', '高'],
  weight: ['weight', '중량', 'kg', '무게', 'weight(kg)', 'wt', '重量'],
  stack: ['stack', 'stackable', '적재', '2단', 'stacking', '可堆叠'],
};

function keyOf(header: string): string | null {
  const s = header.trim().toLowerCase();
  for (const k of Object.keys(HEAD)) if (HEAD[k].includes(s)) return k;
  return null;
}

const num = (v: unknown) => {
  const n = Number(String(v ?? '').replace(/[^0-9.\-]/g, ''));
  return isFinite(n) ? Math.max(0, n) : 0;
};

/** Parse a .csv / .xlsx / .xls cargo list. Headers are auto-detected (ko/en/zh); positional fallback: name,qty,L,W,H,weight,stack. */
export async function parseCargoFile(file: File): Promise<CargoLine[]> {
  const name = file.name.toLowerCase();
  let rows: unknown[][];
  if (name.endsWith('.csv') || file.type === 'text/csv') {
    const text = await file.text();
    rows = text.split(/\r?\n/).filter((l) => l.trim()).map((l) => l.split(',').map((c) => c.trim()));
  } else {
    const XLSX = await import('xlsx');
    const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    rows = XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false }) as unknown[][];
  }
  if (!rows.length) return [];

  const mapped = rows[0].map((c) => keyOf(String(c ?? '')));
  let cols: Record<string, number>;
  let start = 0;
  if (mapped.some(Boolean)) {
    cols = {};
    mapped.forEach((k, i) => { if (k) cols[k] = i; });
    start = 1;
  } else {
    cols = { name: 0, qty: 1, l: 2, w: 3, h: 4, weight: 5, stack: 6 };
  }

  const out: CargoLine[] = [];
  for (let i = start; i < rows.length; i++) {
    const r = rows[i]; if (!r) continue;
    const l = num(r[cols.l]), w = num(r[cols.w]), h = num(r[cols.h]);
    const nm = String(r[cols.name] ?? '').trim();
    if (l <= 0 && w <= 0 && h <= 0 && !nm) continue;
    const stk = String(r[cols.stack] ?? '').trim().toLowerCase();
    const stackable = !['n', 'no', '0', 'x', 'false', '불가', '否'].includes(stk);
    out.push({ name: nm || '-', qty: num(r[cols.qty]) || 1, l, w, h, weight: num(r[cols.weight]), stackable });
  }
  return out;
}
