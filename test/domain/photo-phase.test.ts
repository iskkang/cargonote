import { slotPhase, groupByPhase } from '../../src/domain/photoPhase';
import type { RequiredPhotoSlot } from '../../src/domain/types';

const slot = (key: string, label = key): RequiredPhotoSlot => ({ key, label, instruction: '', required: true });

test('slotPhase maps known slot keys to phases and unknown to その他', () => {
  expect(slotPhase('empty')).toBe('搬入');
  expect(slotPhase('full')).toBe('バンニング');
  expect(slotPhase('seal')).toBe('封印');
  expect(slotPhase('csc')).toBe('封印');
  expect(slotPhase('mystery')).toBe('その他');
  expect(slotPhase(null)).toBe('その他');
});

test('groupByPhase groups slots and orders 搬入 → バンニング → 封印 → その他', () => {
  const groups = groupByPhase([slot('seal'), slot('empty'), slot('full'), slot('mystery')]);
  expect(groups.map((g) => g.phase)).toEqual(['搬入', 'バンニング', '封印', 'その他']);
  expect(groups.find((g) => g.phase === '搬入')!.slots.map((s) => s.key)).toEqual(['empty']);
  expect(groups.find((g) => g.phase === '封印')!.slots.map((s) => s.key)).toEqual(['seal']);
});
