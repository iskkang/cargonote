import { checklistStatus } from '../../src/domain/checklist';
import type { WorkTypeTemplate } from '../../src/domain/types';

const tpl: WorkTypeTemplate = {
  id: 't', name: 'TCR', carrier: '중국세관', route: 'TCR', anchorType: 'container_no',
  minCount: 3, warningText: '반송', rules: {},
  requiredPhotos: [
    { key: 'empty', label: '빈 컨테이너', instruction: '번호 보이게', required: true },
    { key: 'seal', label: '씰', instruction: '판독', required: true },
    { key: 'csc', label: 'CSC', instruction: '예외', required: true },
    { key: 'extra', label: '기타', instruction: '', required: false },
  ],
};

test('reports missing required slots and incompleteness', () => {
  const s = checklistStatus(['empty'], tpl);
  expect(s.satisfied).toEqual(['empty']);
  expect(s.missing.map((m) => m.key)).toEqual(['seal', 'csc']);
  expect(s.complete).toBe(false);
});

test('complete when all required slots captured (optional ignored)', () => {
  const s = checklistStatus(['empty', 'seal', 'csc'], tpl);
  expect(s.complete).toBe(true);
  expect(s.missing).toEqual([]);
});
