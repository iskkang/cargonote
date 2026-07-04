import { computeStuffing } from '../../src/domain/stuffing';

const box = (over: Partial<Parameters<typeof computeStuffing>[0][number]> = {}) => ({
  name: 'box', qty: 1, l: 50, w: 40, h: 30, weight: 10, stackable: true, ...over,
});

test('single SKU: max units per container is volume- or weight-bound', () => {
  const r = computeStuffing([box({ qty: 100 })]); // 0.06 m³, 10 kg each
  const c20 = r.perContainer.find((p) => p.spec.id === '20ft')!;
  // 20ft effective ≈ 33.14×0.85 = 28.17 m³ → floor(28.17/0.06) ≈ 469; weight cap far higher
  expect(c20.maxUnitsSingle).toBeGreaterThan(400);
  expect(c20.binding).toBe('volume');
  expect(c20.containersNeeded).toBe(1); // 6 m³ total fits one 20ft
});

test('heavy cargo is weight-bound', () => {
  const r = computeStuffing([box({ qty: 1, weight: 20000 })]); // small volume, near-payload weight
  const c20 = r.perContainer.find((p) => p.spec.id === '20ft')!;
  expect(c20.binding).toBe('weight');
  expect(c20.containersNeeded).toBe(1); // one container, but the weight caps it
});

test('oversize item does not fit a smaller container but fits a larger one', () => {
  const r = computeStuffing([box({ l: 600 })]); // 6.0 m long
  expect(r.perContainer.find((p) => p.spec.id === '20ft')!.fits).toBe(false); // 20ft internal 5.9 m
  expect(r.perContainer.find((p) => p.spec.id === '40ft')!.fits).toBe(true);  // 40ft internal 12.03 m
  expect(r.recommendedId).not.toBe('20ft');
});

test('recommends the cheapest option when freight costs are given', () => {
  const cargo = [box({ qty: 500 })]; // ~30 m³ → 40-class more efficient than two 20ft
  const r = computeStuffing(cargo, { freight: { '20ft': 1000, '40ft': 1600, '40hq': 1800 } });
  expect(r.perContainer.find((p) => p.spec.id === '40ft')!.cost).toBeDefined();
  expect(['20ft', '40ft', '40hq']).toContain(r.recommendedId);
});
