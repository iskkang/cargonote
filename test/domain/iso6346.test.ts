import { iso6346Valid, iso6346CheckDigit } from '../../src/domain/iso6346';

test('validates a correct ISO 6346 container number', () => {
  expect(iso6346Valid('CSQU3054383')).toBe(true);       // canonical valid example
  expect(iso6346Valid('csqu 305438 3')).toBe(true);     // normalizes spacing/case
});

test('rejects a wrong check digit or malformed number', () => {
  expect(iso6346Valid('CSQU3054384')).toBe(false);      // wrong check digit
  expect(iso6346Valid('ABCD123')).toBe(false);          // too short
  expect(iso6346Valid('1234567890X')).toBe(false);      // not 4 letters + 7 digits
});

test('computes the check digit for a body', () => {
  expect(iso6346CheckDigit('CSQU305438')).toBe(3);
  expect(iso6346CheckDigit('nope')).toBeNull();
});
