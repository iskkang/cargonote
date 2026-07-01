import { computeTargetSize } from '../src/lib/image';

test('scales down landscape to maxDim on the long edge', () => {
  expect(computeTargetSize(4000, 3000, 1600)).toEqual({ width: 1600, height: 1200 });
});

test('scales down portrait to maxDim on the long edge', () => {
  expect(computeTargetSize(3000, 4000, 1600)).toEqual({ width: 1200, height: 1600 });
});

test('never upscales when smaller than maxDim', () => {
  expect(computeTargetSize(800, 600, 1600)).toEqual({ width: 800, height: 600 });
});
