import { parseTemplate, requiredSlots } from '../../src/domain/template';

const raw = {
  id: 'x', name: 'コンテナ・バンニング — TSR (FESCO)', carrier: 'FESCO', route: 'TSR',
  anchor_type: 'container_no', min_count: 8, warning_text: 'w',
  rules: { container_no_visible: true, seal_type: 'bolt' },
  required_photos: [
    { key: 'empty', label: '空コンテナ', instruction: '番号が見えるように', required: true },
    { key: 'csc', label: 'CSC プレート', instruction: '番号規則の例外', required: false },
  ],
};

test('parses a raw template row into typed slots and rules', () => {
  const t = parseTemplate(raw as any);
  expect(t.route).toBe('TSR');
  expect(t.requiredPhotos).toHaveLength(2);
  expect(t.requiredPhotos[0]).toEqual({ key: 'empty', label: '空コンテナ', instruction: '番号が見えるように', required: true });
  expect(t.rules.seal_type).toBe('bolt');
});

test('requiredSlots returns only required slots', () => {
  const t = parseTemplate(raw as any);
  expect(requiredSlots(t).map((s) => s.key)).toEqual(['empty']);
});

test('throws when required_photos is not an array', () => {
  expect(() => parseTemplate({ ...raw, required_photos: {} } as any)).toThrow();
});

test('throws when a slot is missing its key', () => {
  expect(() => parseTemplate({ ...raw, required_photos: [{ label: 'x' }] } as any)).toThrow();
});
