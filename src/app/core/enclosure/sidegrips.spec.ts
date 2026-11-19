import measureBoundingBox from '@jscad/modeling/src/measurements/measureBoundingBox';
import { cloneParams, DEFAULT_PARAMS } from '../params';
import { sideGripsBody, sideGripsCutout } from './sidegrips';

describe('sidegrips', () => {
  it('returns null when side grips are disabled', () => {
    const params = cloneParams(DEFAULT_PARAMS);
    params.sideGrips = { ...params.sideGrips!, enabled: false };
    expect(sideGripsBody(params)).toBeNull();
    expect(sideGripsCutout(params)).toBeNull();
  });

  it('creates raised ribs on exterior sides when style is ribs', () => {
    const params = cloneParams(DEFAULT_PARAMS);
    params.sideGrips = {
      enabled: true,
      style: 'ribs',
      count: 5,
      width: 2,
      length: 12,
      depth: 1,
      spacing: 4,
    };

    const ribs = sideGripsBody(params);
    expect(ribs).not.toBeNull();
    expect(sideGripsCutout(params)).toBeNull();

    const [[xMin], [xMax]] = measureBoundingBox(ribs!);
    // Ribs span across width (from x ~ -1 to x ~ width + 1)
    expect(xMin).toBeLessThan(1);
    expect(xMax).toBeGreaterThan(params.width - 1);
  });

  it('creates groove cutters when style is grooves', () => {
    const params = cloneParams(DEFAULT_PARAMS);
    params.sideGrips = {
      enabled: true,
      style: 'grooves',
      count: 4,
      width: 2,
      length: 12,
      depth: 1,
      spacing: 4,
    };

    expect(sideGripsBody(params)).toBeNull();
    const grooves = sideGripsCutout(params);
    expect(grooves).not.toBeNull();
  });
});
