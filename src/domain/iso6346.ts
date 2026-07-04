/** ISO 6346 container-number check-digit validation. 4 letters + 6 digits + 1 check digit. */

function letterValues(): Record<string, number> {
  const val: Record<string, number> = {};
  let v = 10; // A=10, then increment skipping multiples of 11 (11, 22, 33)
  for (let c = 0; c < 26; c++) {
    if (v % 11 === 0) v++;
    val[String.fromCharCode(65 + c)] = v;
    v++;
  }
  return val;
}

export function iso6346CheckDigit(body: string): number | null {
  const s = body.replace(/\s+/g, '').toUpperCase();
  if (!/^[A-Z]{4}\d{6}$/.test(s)) return null;
  const val = letterValues();
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    const ch = s[i];
    sum += (i < 4 ? val[ch] : Number(ch)) * Math.pow(2, i);
  }
  return (sum % 11) % 10;
}

export function iso6346Valid(no: string): boolean {
  const s = no.replace(/\s+/g, '').toUpperCase();
  const m = /^([A-Z]{4}\d{6})(\d)$/.exec(s);
  if (!m) return false;
  return iso6346CheckDigit(m[1]) === Number(m[2]);
}
