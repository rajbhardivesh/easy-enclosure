import measureBoundingBox from '@jscad/modeling/src/measurements/measureBoundingBox';
import { cloneParams, DEFAULT_PARAMS } from '../params';
import { displayBezelCutters } from './displaybezel';

describe('displaybezel', () => {
  it('returns null when display bezel is disabled', () => {
    const params = cloneParams(DEFAULT_PARAMS);
    params.displayBezel = { ...params.displayBezel!, enabled: false };
    expect(displayBezelCutters(params)).toBeNull();
  });

  it('creates stepped screen window and recess cutters when enabled', () => {
    const params = cloneParams(DEFAULT_PARAMS);
    params.displayBezel = {
      enabled: true,
      surface: 'top',
      x: 0,
      y: 0,
      width: 32,
      length: 20,
      cornerRadius: 2,
      recessWidth: 38,
      recessLength: 26,
      recessDepth: 1.2,
    };

    const cutters = displayBezelCutters(params);
    expect(cutters).not.toBeNull();
    const [[xMin, yMin], [xMax, yMax]] = measureBoundingBox(cutters!);
    // Total bounding box should match the larger recess pocket (38 x 26)
    expect(xMax - xMin).toBeCloseTo(38, 1);
    expect(yMax - yMin).toBeCloseTo(26, 1);
  });
});
