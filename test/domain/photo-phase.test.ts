import { slotPhase, groupByPhase } from '../../src/domain/photoPhase';
import type { RequiredPhotoSlot } from '../../src/domain/types';

const slot = (key: string, label = key): RequiredPhotoSlot => ({ key, label, instruction: '', required: true });

test('slotPhase maps known slot keys to phases and unknown to 기타', () => {
  expect(slotPhase('empty')).toBe('반입');
  expect(slotPhase('full')).toBe('적입');
  expect(slotPhase('seal')).toBe('봉인');
  expect(slotPhase('csc')).toBe('봉인');
  expect(slotPhase('mystery')).toBe('기타');
  expect(slotPhase(null)).toBe('기타');
});

test('groupByPhase groups slots and orders 반입 → 적입 → 봉인 → 기타', () => {
  const groups = groupByPhase([slot('seal'), slot('empty'), slot('full'), slot('mystery')]);
  expect(groups.map((g) => g.phase)).toEqual(['반입', '적입', '봉인', '기타']);
  expect(groups.find((g) => g.phase === '반입')!.slots.map((s) => s.key)).toEqual(['empty']);
  expect(groups.find((g) => g.phase === '봉인')!.slots.map((s) => s.key)).toEqual(['seal']);
});
