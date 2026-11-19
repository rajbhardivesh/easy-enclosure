import measureBoundingBox from '@jscad/modeling/src/measurements/measureBoundingBox';
import { DEFAULT_PARAMS, cloneParams } from '../params';
import { holes } from './holes';
import { base } from './base';

describe('holes', () => {
  it('creates top hole cutters that span the full lid thickness', () => {
    const params = cloneParams(DEFAULT_PARAMS);
    params.roof = 6;
    params.insertHeight = 2;
    params.holes = [
      {
        shape: 'circle',
        surface: 'top',
        diameter: 10,
        width: 10,
        length: 10,
        x: 0,
        y: 0,
      },
    ];

    const topHole = holes(params, ['top']);
    const [[, , zMin], [, , zMax]] = measureBoundingBox(topHole);

    expect(zMin).toBe(0);
    expect(zMax).toBeGreaterThan(params.roof + params.insertHeight);
  });

  it('creates a double-d hole with parallel flats and correct dimensions on top surface', () => {
    const params = cloneParams(DEFAULT_PARAMS);
    params.holes = [
      {
        shape: 'double-d',
        surface: 'top',
        diameter: 13,
        flatWidth: 11.8,
        rotation: 0,
        width: 10,
        length: 10,
        x: 0,
        y: 0,
      },
    ];

    const topHole = holes(params, ['top']);
    const [[xMin, yMin], [xMax, yMax]] = measureBoundingBox(topHole);

    expect(xMax - xMin).toBeCloseTo(13, 1);
    expect(yMax - yMin).toBeCloseTo(11.8, 1);
  });

  it('rotates double-d hole flats with rotation angle', () => {
    const params = cloneParams(DEFAULT_PARAMS);
    params.holes = [
      {
        shape: 'double-d',
        surface: 'top',
        diameter: 13,
        flatWidth: 11.8,
        rotation: 90,
        width: 10,
        length: 10,
        x: 0,
        y: 0,
      },
    ];

    const topHole = holes(params, ['top']);
    const [[xMin, yMin], [xMax, yMax]] = measureBoundingBox(topHole);

    expect(xMax - xMin).toBeCloseTo(11.8, 1);
    expect(yMax - yMin).toBeCloseTo(13, 1);
  });

  it('creates double-d holes on side walls with flats oriented horizontally at 0 deg', () => {
    const params = cloneParams(DEFAULT_PARAMS);
    params.holes = [
      {
        shape: 'double-d',
        surface: 'front',
        diameter: 13,
        flatWidth: 11.8,
        rotation: 0,
        width: 10,
        length: 10,
        x: 0,
        y: 0,
      },
    ];

    const frontHole = holes(params, ['front']);
    const [[xMin, , zMin], [xMax, , zMax]] = measureBoundingBox(frontHole);

    // Across the front face: X is horizontal (13mm diameter), Z is vertical (11.8mm across flats)
    expect(xMax - xMin).toBeCloseTo(13, 1);
    expect(zMax - zMin).toBeCloseTo(11.8, 1);
  });

  it('preserves circular shape when flatWidth is greater than or equal to diameter', () => {
    const params = cloneParams(DEFAULT_PARAMS);
    params.holes = [
      {
        shape: 'double-d',
        surface: 'top',
        diameter: 13,
        flatWidth: 15,
        rotation: 0,
        width: 10,
        length: 10,
        x: 0,
        y: 0,
      },
    ];

    const topHole = holes(params, ['top']);
    const [[xMin, yMin], [xMax, yMax]] = measureBoundingBox(topHole);

    expect(xMax - xMin).toBeCloseTo(13, 1);
    expect(yMax - yMin).toBeCloseTo(13, 1);
  });

  it('creates bottom hole cutters that cleanly span the entire floor thickness', () => {
    const params = cloneParams(DEFAULT_PARAMS);
    params.floor = 3;
    params.holes = [
      {
        shape: 'circle',
        surface: 'bottom',
        diameter: 10,
        width: 10,
        length: 10,
        x: 0,
        y: 0,
      },
    ];

    const bottomHole = holes(params, ['bottom']);
    const [[, , zMin], [, , zMax]] = measureBoundingBox(bottomHole);

    expect(zMin).toBeLessThan(0);
    expect(zMax).toBeGreaterThan(params.floor);
  });

  it('cuts completely through side walls without leaving coplanar membranes', () => {
    const params = cloneParams(DEFAULT_PARAMS);
    const b = base(params);
    const { toPolygons } = require('@jscad/modeling').geometries.geom3;
    const polys = toPolygons(b);

    const frontMembranes = polys.filter((poly: any) =>
      poly.vertices.every(
        (v: number[]) =>
          Math.abs(v[1] - 75.92) < 0.01 && v[0] >= 44 && v[0] <= 56 && v[2] >= 9 && v[2] <= 21,
      ),
    );
    const leftMembranes = polys.filter((poly: any) =>
      poly.vertices.every(
        (v: number[]) =>
          Math.abs(v[0] - 95.92) < 0.01 && v[1] >= 34 && v[1] <= 46 && v[2] >= 9 && v[2] <= 21,
      ),
    );

    expect(frontMembranes.length).toBe(0);
    expect(leftMembranes.length).toBe(0);
  });

  it('creates rectangular hole with rounded corners', () => {
    const params = cloneParams(DEFAULT_PARAMS);
    params.holes = [
      {
        shape: 'rectangle',
        surface: 'top',
        width: 20,
        length: 30,
        cornerRadius: 4,
        diameter: 10,
        x: 0,
        y: 0,
      },
    ];

    const topHole = holes(params, ['top']);
    const [[xMin, yMin], [xMax, yMax]] = measureBoundingBox(topHole);

    expect(xMax - xMin).toBeCloseTo(20, 1);
    expect(yMax - yMin).toBeCloseTo(30, 1);
  });

  it('creates square hole with rounded corners', () => {
    const params = cloneParams(DEFAULT_PARAMS);
    params.holes = [
      {
        shape: 'square',
        surface: 'top',
        width: 16,
        length: 16,
        cornerRadius: 3,
        diameter: 10,
        x: 0,
        y: 0,
      },
    ];

    const topHole = holes(params, ['top']);
    const [[xMin, yMin], [xMax, yMax]] = measureBoundingBox(topHole);

    expect(xMax - xMin).toBeCloseTo(16, 1);
    expect(yMax - yMin).toBeCloseTo(16, 1);
  });

  it('rotates rectangular hole with rotation angle', () => {
    const params = cloneParams(DEFAULT_PARAMS);
    params.holes = [
      {
        shape: 'rectangle',
        surface: 'top',
        width: 10,
        length: 20,
        rotation: 90,
        diameter: 10,
        x: 0,
        y: 0,
      },
    ];

    const topHole = holes(params, ['top']);
    const [[xMin, yMin], [xMax, yMax]] = measureBoundingBox(topHole);

    expect(xMax - xMin).toBeCloseTo(20, 1);
    expect(yMax - yMin).toBeCloseTo(10, 1);
  });

  it('creates dpad cross hole with corner radius', () => {
    const params = cloneParams(DEFAULT_PARAMS);
    params.holes = [
      {
        shape: 'dpad',
        surface: 'top',
        width: 6,
        length: 18,
        cornerRadius: 1,
        diameter: 10,
        x: 0,
        y: 0,
      },
    ];

    const topHole = holes(params, ['top']);
    const [[xMin, yMin], [xMax, yMax]] = measureBoundingBox(topHole);

    expect(xMax - xMin).toBeCloseTo(18, 1);
    expect(yMax - yMin).toBeCloseTo(18, 1);
  });

  it('creates hexagon hole', () => {
    const params = cloneParams(DEFAULT_PARAMS);
    params.holes = [
      {
        shape: 'hexagon',
        surface: 'top',
        diameter: 12,
        width: 12,
        length: 12,
        x: 0,
        y: 0,
      },
    ];

    const topHole = holes(params, ['top']);
    const [[xMin, yMin], [xMax, yMax]] = measureBoundingBox(topHole);

    expect(xMax - xMin).toBeCloseTo(12, 1);
  });

  it('creates chamfered circular hole expanding outer entry flare', () => {
    const params = cloneParams(DEFAULT_PARAMS);
    params.holes = [
      {
        shape: 'circle',
        surface: 'top',
        diameter: 10,
        chamfer: 1.5,
        width: 10,
        length: 10,
        x: 0,
        y: 0,
      },
    ];

    const topHole = holes(params, ['top']);
    const [[xMin, yMin], [xMax, yMax]] = measureBoundingBox(topHole);

    // 10 + 1.5 * 2 = 13mm outer span
    expect(xMax - xMin).toBeCloseTo(13, 0.5);
    expect(yMax - yMin).toBeCloseTo(13, 0.5);
  });

  it('creates chamfered rectangular hole with corner radius', () => {
    const params = cloneParams(DEFAULT_PARAMS);
    params.holes = [
      {
        shape: 'rectangle',
        surface: 'top',
        width: 20,
        length: 10,
        cornerRadius: 2,
        chamfer: 1.0,
        diameter: 10,
        x: 0,
        y: 0,
      },
    ];

    const topHole = holes(params, ['top']);
    const [[xMin, yMin], [xMax, yMax]] = measureBoundingBox(topHole);

    // 20 + 2 = 22, 10 + 2 = 12
    expect(xMax - xMin).toBeCloseTo(22, 0.5);
    expect(yMax - yMin).toBeCloseTo(12, 0.5);
  });

  it('creates chamfered holes across side and end walls', () => {
    const params = cloneParams(DEFAULT_PARAMS);
    params.holes = [
      {
        shape: 'circle',
        surface: 'front',
        diameter: 8,
        chamfer: 0.8,
        width: 8,
        length: 8,
        x: 0,
        y: 0,
      },
      {
        shape: 'square',
        surface: 'back',
        width: 12,
        length: 12,
        chamfer: 1.0,
        diameter: 12,
        x: 0,
        y: 0,
      },
      {
        shape: 'hexagon',
        surface: 'left',
        diameter: 10,
        chamfer: 0.5,
        width: 10,
        length: 10,
        x: 0,
        y: 0,
      },
    ];

    const sideHoles = holes(params, ['front', 'back', 'left']);
    expect(sideHoles).toBeDefined();
  });
});
