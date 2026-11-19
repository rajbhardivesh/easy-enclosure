import measureBoundingBox from '@jscad/modeling/src/measurements/measureBoundingBox';
import { cloneParams, DEFAULT_PARAMS } from '../params';
import { ventGrillesOnBase, ventGrillesOnLid } from './ventgrille';

describe('ventgrille', () => {
  it('returns null when no vent grilles are defined', () => {
    const params = cloneParams(DEFAULT_PARAMS);
    params.ventGrilles = [];
    expect(ventGrillesOnBase(params)).toBeNull();
    expect(ventGrillesOnLid(params)).toBeNull();
  });

  it('creates slot grille cutters on base surfaces', () => {
    const params = cloneParams(DEFAULT_PARAMS);
    params.ventGrilles = [
      {
        surface: 'back',
        x: 0,
        y: 0,
        pattern: 'slots',
        count: 5,
        slotWidth: 2,
        slotLength: 16,
        spacing: 4,
        cornerRadius: 1,
        rotation: 0,
      },
    ];

    const baseGrilles = ventGrillesOnBase(params);
    expect(baseGrilles).not.toBeNull();
    const [[xMin, , zMin], [xMax, , zMax]] = measureBoundingBox(baseGrilles!);
    // 5 slots spaced by 4mm = 16mm span + 2mm slot width = 18mm
    expect(xMax - xMin).toBeCloseTo(18, 1);
    expect(zMax - zMin).toBeCloseTo(16, 1);
  });

  it('creates perforated circular grille cutters on lid', () => {
    const params = cloneParams(DEFAULT_PARAMS);
    params.ventGrilles = [
      {
        surface: 'top',
        x: 0,
        y: 0,
        pattern: 'perforated',
        count: 4,
        slotWidth: 3,
        slotLength: 3,
        spacing: 5,
        rotation: 0,
      },
    ];

    const lidGrilles = ventGrillesOnLid(params);
    expect(lidGrilles).not.toBeNull();
    const [[xMin], [xMax]] = measureBoundingBox(lidGrilles!);
    // 4 holes spaced by 5mm = 15mm span + 3mm diameter = 18mm
    expect(xMax - xMin).toBeCloseTo(18, 1);
  });

  it('creates honeycomb hex grille cutters', () => {
    const params = cloneParams(DEFAULT_PARAMS);
    params.ventGrilles = [
      {
        surface: 'top',
        x: 0,
        y: 0,
        pattern: 'honeycomb',
        count: 3,
        slotWidth: 6,
        slotLength: 6,
        spacing: 8,
        rotation: 0,
      },
    ];

    const lidGrilles = ventGrillesOnLid(params);
    expect(lidGrilles).not.toBeNull();
    const [[xMin], [xMax]] = measureBoundingBox(lidGrilles!);
    expect(xMax - xMin).toBeCloseTo(22, 1);
  });
});
