import { checklistStatus } from '../../src/domain/checklist';
import type { WorkTypeTemplate } from '../../src/domain/types';

const tpl: WorkTypeTemplate = {
  id: 't', name: 'TCR', carrier: '中国税関', route: 'TCR', anchorType: 'container_no',
  minCount: 3, warningText: '返送', rules: {},
  requiredPhotos: [
    { key: 'empty', label: '空コンテナ', instruction: '番号が見えるように', required: true },
    { key: 'seal', label: 'シール', instruction: '判読', required: true },
    { key: 'csc', label: 'CSC', instruction: '例外', required: true },
    { key: 'extra', label: 'その他', instruction: '', required: false },
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
