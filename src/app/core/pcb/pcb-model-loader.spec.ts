import measureBoundingBox from '@jscad/modeling/src/measurements/measureBoundingBox';
import measureVolume from '@jscad/modeling/src/measurements/measureVolume';
import type { Vec3 } from '@jscad/modeling/src/maths/types';

import {
  createArduinoUnoBoard,
  createEsp32DevKitBoard,
  createFlipperModuleBoard,
  createRpiPicoBoard,
  getPredefinedPcbModel,
  loadPcbModelFromBuffer,
  normalizePcbModel,
  parseAsciiStl,
  parseBinaryStl,
  parseObj,
  parseStl,
} from './pcb-model-loader';

describe('pcb-model-loader', () => {
  describe('parseAsciiStl', () => {
    it('parses simple ASCII STL string into valid Geom3', () => {
      const asciiStl = `
        solid test
          facet normal 0 0 1
            outer loop
              vertex 0 0 0
              vertex 10 0 0
              vertex 10 10 0
            endloop
          endfacet
          facet normal 0 0 1
            outer loop
              vertex 0 0 0
              vertex 10 10 0
              vertex 0 10 0
            endloop
          endfacet
        endsolid test
      `;
      const geom = parseAsciiStl(asciiStl);
      expect(geom.polygons.length).toBe(2);
    });
  });

  describe('parseBinaryStl', () => {
    it('parses valid binary STL buffer into Geom3', () => {
      // 80 bytes header + 4 bytes triangle count (1) + 50 bytes per triangle = 134 bytes
      const buffer = new ArrayBuffer(134);
      const view = new DataView(buffer);
      // Triangle count = 1
      view.setUint32(80, 1, true);

      // Normal vector (offset 84..95)
      view.setFloat32(84, 0, true);
      view.setFloat32(88, 0, true);
      view.setFloat32(92, 1, true);

      // Vertex 1 (offset 96..107)
      view.setFloat32(96, 0, true);
      view.setFloat32(100, 0, true);
      view.setFloat32(104, 0, true);

      // Vertex 2 (offset 108..119)
      view.setFloat32(108, 20, true);
      view.setFloat32(112, 0, true);
      view.setFloat32(116, 0, true);

      // Vertex 3 (offset 120..131)
      view.setFloat32(120, 0, true);
      view.setFloat32(124, 20, true);
      view.setFloat32(128, 0, true);

      // Attribute byte count (offset 132..133) = 0
      view.setUint16(132, 0, true);

      const geom = parseBinaryStl(buffer);
      expect(geom.polygons.length).toBe(1);
    });

    it('throws error for undersized binary buffer', () => {
      const buffer = new ArrayBuffer(50);
      expect(() => parseBinaryStl(buffer)).toThrowError(/too small/i);
    });
  });

  describe('parseObj', () => {
    it('parses simple wavefront OBJ text with 1-based and quad indices', () => {
      const objText = `
        # Simple quad
        v 0.0 0.0 0.0
        v 10.0 0.0 0.0
        v 10.0 20.0 0.0
        v 0.0 20.0 0.0
        f 1 2 3 4
      `;
      const geom = parseObj(objText);
      // A quad (4 vertices) triangulates into 2 triangles
      expect(geom.polygons.length).toBe(2);
    });

    it('parses OBJ with vertex/texture/normal format (e.g. f 1/1/1 2/2/2 3/3/3)', () => {
      const objText = `
        v 0 0 0
        v 5 0 0
        v 5 5 0
        f 1/1/1 2/2/2 3/3/3
      `;
      const geom = parseObj(objText);
      expect(geom.polygons.length).toBe(1);
    });
  });

  describe('normalizePcbModel', () => {
    it('centers geometry at origin (X=0, Y=0) and aligns bottom to Z=0', () => {
      const asciiStl = `
        solid test
          facet normal 0 0 1
            outer loop
              vertex 10 20 5
              vertex 30 20 5
              vertex 30 50 5
            endloop
          endfacet
          facet normal 0 0 1
            outer loop
              vertex 10 20 5
              vertex 30 50 5
              vertex 10 50 5
            endloop
          endfacet
        endsolid test
      `;
      const raw = parseAsciiStl(asciiStl);
      const { normalized, dims } = normalizePcbModel(raw);

      expect(dims[0]).toBe(20); // Width: 30 - 10
      expect(dims[1]).toBe(30); // Length: 50 - 20

      const [min, max] = measureBoundingBox(normalized) as [Vec3, Vec3];
      expect(min[0]).toBeCloseTo(-10, 1);
      expect(max[0]).toBeCloseTo(10, 1);
      expect(min[1]).toBeCloseTo(-15, 1);
      expect(max[1]).toBeCloseTo(15, 1);
      expect(min[2]).toBeCloseTo(0, 1);
    });
  });

  describe('loadPcbModelFromBuffer', () => {
    it('detects and loads OBJ files properly', () => {
      const objText = `
        v 0 0 0
        v 10 0 0
        v 10 10 0
        f 1 2 3
      `;
      const parsed = loadPcbModelFromBuffer('custom_board.obj', objText);
      expect(parsed.name).toBe('custom_board.obj');
      expect(parsed.triangleCount).toBe(1);
      expect(parsed.dims[0]).toBe(10);
    });
  });

  describe('Procedural 3D PCB Models', () => {
    it('generates Raspberry Pi Pico 3D board with expected dimensions', () => {
      const pico = createRpiPicoBoard();
      const [min, max] = measureBoundingBox(pico) as [Vec3, Vec3];
      const width = max[0] - min[0];
      const length = max[1] - min[1];
      const height = max[2] - min[2];

      expect(width).toBeCloseTo(21, 0);
      // USB port overhangs board edge slightly (total ~52.5mm)
      expect(length).toBeCloseTo(52.5, 0.5);
      expect(height).toBeGreaterThan(2);
      expect(measureVolume(pico)).toBeGreaterThan(100);
    });

    it('generates Arduino Uno R3 board with components and headers', () => {
      const uno = createArduinoUnoBoard();
      const [min, max] = measureBoundingBox(uno) as [Vec3, Vec3];
      const width = max[0] - min[0];
      const length = max[1] - min[1];

      expect(width).toBeCloseTo(53.4, 0);
      expect(length).toBeCloseTo(68.6, 0);
      expect(measureVolume(uno)).toBeGreaterThan(1000);
    });

    it('generates ESP32 DevKit board with RF shield can', () => {
      const esp32 = createEsp32DevKitBoard();
      const [min, max] = measureBoundingBox(esp32) as [Vec3, Vec3];
      const width = max[0] - min[0];
      const length = max[1] - min[1];

      expect(width).toBeCloseTo(28, 0);
      // USB port overhangs edge (total ~53mm)
      expect(length).toBeCloseTo(53, 0.5);
    });

    it('generates Flipper Zero Expansion Module board', () => {
      const flipper = createFlipperModuleBoard();
      const [min, max] = measureBoundingBox(flipper) as [Vec3, Vec3];
      const width = max[0] - min[0];
      const length = max[1] - min[1];

      expect(width).toBeCloseTo(32, 0);
      // USB port overhangs edge (total ~67.25mm)
      expect(length).toBeCloseTo(67.25, 0.5);
    });

    it('resolves models via getPredefinedPcbModel', () => {
      expect(getPredefinedPcbModel('rpi-pico')).not.toBeNull();
      expect(getPredefinedPcbModel('arduino-uno')).not.toBeNull();
      expect(getPredefinedPcbModel('esp32')).not.toBeNull();
      expect(getPredefinedPcbModel('flipper-module')).not.toBeNull();
      expect(getPredefinedPcbModel('box')).toBeNull();
      expect(getPredefinedPcbModel('custom')).toBeNull();
    });
  });
});
