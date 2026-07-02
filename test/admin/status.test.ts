import { statusLabel, statusColor } from '../../src/admin/status';
test('maps every status to a Korean label', () => {
  expect(statusLabel('draft')).toBe('작성 중');
  expect(statusLabel('sent')).toBe('전송됨');
  expect(statusLabel('in_progress')).toBe('진행 중');
  expect(statusLabel('submitted')).toBe('제출됨');
  expect(statusLabel('published')).toBe('발행됨');
});
test('published is the success color, submitted the caution color', () => {
  expect(statusColor('published')).toBe('#15A34A');
  expect(statusColor('submitted')).toBe('#E0A100');
});
