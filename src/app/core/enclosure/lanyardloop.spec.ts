import measureBoundingBox from '@jscad/modeling/src/measurements/measureBoundingBox';
import { cloneParams, DEFAULT_PARAMS } from '../params';
import { lanyardLoopBar, lanyardLoopCutout } from './lanyardloop';

describe('lanyardloop', () => {
  it('returns null when lanyard loop is disabled', () => {
    const params = cloneParams(DEFAULT_PARAMS);
    params.lanyardLoop = { ...params.lanyardLoop!, enabled: false };
    expect(lanyardLoopCutout(params)).toBeNull();
    expect(lanyardLoopBar(params)).toBeNull();
  });

  it('creates corner slot cutout and retention bar when enabled', () => {
    const params = cloneParams(DEFAULT_PARAMS);
    params.lanyardLoop = {
      enabled: true,
      corner: 'bottom-right',
      slotWidth: 4,
      slotLength: 12,
      barDiameter: 2,
    };

    const cutout = lanyardLoopCutout(params);
    const bar = lanyardLoopBar(params);

    expect(cutout).not.toBeNull();
    expect(bar).not.toBeNull();

    const [[cMinX, cMinY], [cMaxX, cMaxY]] = measureBoundingBox(cutout!);
    expect(cMaxX - cMinX).toBeCloseTo(4, 1);
    expect(cMaxY - cMinY).toBeCloseTo(12, 1);

    const [[bMinX, , bMinZ], [bMaxX, , bMaxZ]] = measureBoundingBox(bar!);
    expect(bMaxX - bMinX).toBeGreaterThan(4); // Bar spans across the slot
    expect(bMaxZ - bMinZ).toBeCloseTo(2, 1); // 2mm diameter bar
  });
});
