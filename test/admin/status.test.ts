import { statusLabel, statusColor } from '../../src/admin/status';
test('maps every status to a Korean label', () => {
  expect(statusLabel('draft')).toBe('作成中');
  expect(statusLabel('sent')).toBe('送信済み');
  expect(statusLabel('in_progress')).toBe('進行中');
  expect(statusLabel('submitted')).toBe('提出済み');
  expect(statusLabel('published')).toBe('発行済み');
});
test('published is the success color, submitted the caution color', () => {
  expect(statusColor('published')).toBe('#15A34A');
  expect(statusColor('submitted')).toBe('#E0A100');
});
