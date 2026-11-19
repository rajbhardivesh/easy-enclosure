import { geom3, poly3 } from '@jscad/modeling/src/geometries';
import type { Geom3, Poly3 } from '@jscad/modeling/src/geometries/types';
import type { Vec3 } from '@jscad/modeling/src/maths/types';
import measureBoundingBox from '@jscad/modeling/src/measurements/measureBoundingBox';
import { union } from '@jscad/modeling/src/operations/booleans';
import { translate } from '@jscad/modeling/src/operations/transforms';
import { cuboid, cylinder } from '@jscad/modeling/src/primitives';

import type { PCBModelType } from '../params';

export interface ParsedPcbModel {
  name: string;
  geom: Geom3;
  dims: [number, number, number];
  triangleCount: number;
}

export const parseBinaryStl = (buffer: ArrayBuffer): Geom3 => {
  const view = new DataView(buffer);
  if (buffer.byteLength < 84) {
    throw new Error('STL file too small to be binary STL');
  }
  const triangleCount = view.getUint32(80, true);
  const polys: Poly3[] = [];

  for (let i = 0; i < triangleCount; i++) {
    const offset = 84 + i * 50;
    if (offset + 48 > buffer.byteLength) break;

    const v1: Vec3 = [
      view.getFloat32(offset + 12, true),
      view.getFloat32(offset + 16, true),
      view.getFloat32(offset + 20, true),
    ];
    const v2: Vec3 = [
      view.getFloat32(offset + 24, true),
      view.getFloat32(offset + 28, true),
      view.getFloat32(offset + 32, true),
    ];
    const v3: Vec3 = [
      view.getFloat32(offset + 36, true),
      view.getFloat32(offset + 40, true),
      view.getFloat32(offset + 44, true),
    ];

    polys.push(poly3.create([v1, v2, v3]));
  }

  return geom3.create(polys);
};

export const parseAsciiStl = (text: string): Geom3 => {
  const vertexRegex = /vertex\s+([-\d.eE+]+)\s+([-\d.eE+]+)\s+([-\d.eE+]+)/g;
  const vertices: Vec3[] = [];
  let m: RegExpExecArray | null;

  while ((m = vertexRegex.exec(text)) !== null) {
    vertices.push([parseFloat(m[1]), parseFloat(m[2]), parseFloat(m[3])]);
  }

  const polys: Poly3[] = [];
  for (let i = 0; i + 2 < vertices.length; i += 3) {
    polys.push(poly3.create([vertices[i], vertices[i + 1], vertices[i + 2]]));
  }

  return geom3.create(polys);
};

export const parseStl = (data: ArrayBuffer | string): Geom3 => {
  if (typeof data === 'string') {
    return parseAsciiStl(data);
  }

  // Check if buffer starts with 'solid' or is binary
  const headerBytes = new Uint8Array(data, 0, Math.min(80, data.byteLength));
  const headerStr = String.fromCharCode(...headerBytes);
  const view = new DataView(data);

  if (headerStr.startsWith('solid') && data.byteLength > 84) {
    const declaredTriangles = view.getUint32(80, true);
    const expectedBinarySize = 84 + declaredTriangles * 50;
    if (data.byteLength !== expectedBinarySize) {
      const decoder = new TextDecoder('utf-8');
      return parseAsciiStl(decoder.decode(data));
    }
  }

  return parseBinaryStl(data);
};

export const parseObj = (text: string): Geom3 => {
  const lines = text.split('\n');
  const vertices: Vec3[] = [];
  const polys: Poly3[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('v ')) {
      const parts = trimmed.split(/\s+/).slice(1).map(Number);
      if (parts.length >= 3) {
        vertices.push([parts[0], parts[1], parts[2]]);
      }
    } else if (trimmed.startsWith('f ')) {
      const parts = trimmed
        .split(/\s+/)
        .slice(1)
        .map((p) => {
          const idx = parseInt(p.split('/')[0], 10);
          return idx > 0 ? idx - 1 : vertices.length + idx;
        });

      for (let i = 1; i + 1 < parts.length; i++) {
        const i0 = parts[0];
        const i1 = parts[i];
        const i2 = parts[i + 1];
        if (vertices[i0] && vertices[i1] && vertices[i2]) {
          polys.push(poly3.create([vertices[i0], vertices[i1], vertices[i2]]));
        }
      }
    }
  }

  return geom3.create(polys);
};

export const normalizePcbModel = (
  rawGeom: Geom3,
): {
  normalized: Geom3;
  dims: [number, number, number];
  bbox: [[number, number, number], [number, number, number]];
} => {
  const [min, max] = measureBoundingBox(rawGeom) as [Vec3, Vec3];
  const width = Math.max(0.1, max[0] - min[0]);
  const length = Math.max(0.1, max[1] - min[1]);
  const height = Math.max(0.1, max[2] - min[2]);
  const cx = (min[0] + max[0]) / 2;
  const cy = (min[1] + max[1]) / 2;
  const minZ = min[2];

  const normalized = translate([-cx, -cy, -minZ], rawGeom);
  return {
    normalized,
    dims: [Number(width.toFixed(2)), Number(length.toFixed(2)), Number(height.toFixed(2))],
    bbox: [min, max],
  };
};

export const loadPcbModelFromBuffer = (
  name: string,
  data: ArrayBuffer | string,
): ParsedPcbModel => {
  const isObj = name.toLowerCase().endsWith('.obj');
  const rawGeom = isObj
    ? parseObj(typeof data === 'string' ? data : new TextDecoder('utf-8').decode(data))
    : parseStl(data);

  const { normalized, dims } = normalizePcbModel(rawGeom);
  return {
    name,
    geom: normalized,
    dims,
    triangleCount: rawGeom.polygons.length,
  };
};

// Procedural 3D PCB Boards for Instant One-Click Preview:
export const createRpiPicoBoard = (): Geom3 => {
  const substrate = cuboid({ size: [21, 51, 1.6] });
  const chip = translate([0, -5, 1.3], cuboid({ size: [7, 7, 1] }));
  const usb = translate([0, 24, 2.3], cuboid({ size: [7.5, 6, 3] }));
  const flash = translate([0, -16, 1.2], cuboid({ size: [3.5, 4.5, 0.8] }));
  const button = translate([5, -2, 1.3], cuboid({ size: [2.5, 3.5, 1] }));
  const crystal = translate([6, 5, 1.2], cylinder({ radius: 1.2, height: 0.8 }));
  const board = union(substrate, chip, usb, flash, button, crystal);
  return normalizePcbModel(board).normalized;
};

export const createArduinoUnoBoard = (): Geom3 => {
  const substrate = cuboid({ size: [53.4, 68.6, 1.6] });
  const usb = translate([-16, 26, 6.3], cuboid({ size: [12, 16, 11] }));
  const powerJack = translate([-18, -26, 6.3], cuboid({ size: [9, 13.5, 11] }));
  const dip = translate([8, -8, 2.6], cuboid({ size: [8, 35, 3.5] }));
  const headerL = translate([-23, 5, 5], cuboid({ size: [2.5, 30, 8.5] }));
  const headerR = translate([23, 0, 5], cuboid({ size: [2.5, 45, 8.5] }));
  const resetBtn = translate([-21, 26, 3], cylinder({ radius: 2, height: 4 }));
  const board = union(substrate, usb, powerJack, dip, headerL, headerR, resetBtn);
  return normalizePcbModel(board).normalized;
};

export const createEsp32DevKitBoard = (): Geom3 => {
  const substrate = cuboid({ size: [28, 52, 1.6] });
  const can = translate([0, -10, 2.3], cuboid({ size: [18, 25.5, 3] }));
  const usb = translate([0, 24, 2.3], cuboid({ size: [7.5, 6, 3] }));
  const cp2102 = translate([0, 10, 1.3], cuboid({ size: [5, 5, 1] }));
  const headerL = translate([-12.5, 0, 4.5], cuboid({ size: [2.5, 38, 8.5] }));
  const headerR = translate([12.5, 0, 4.5], cuboid({ size: [2.5, 38, 8.5] }));
  const btn1 = translate([-8, 23, 1.5], cuboid({ size: [3, 4, 1.5] }));
  const btn2 = translate([8, 23, 1.5], cuboid({ size: [3, 4, 1.5] }));
  const board = union(substrate, can, usb, cp2102, headerL, headerR, btn1, btn2);
  return normalizePcbModel(board).normalized;
};

export const createFlipperModuleBoard = (): Geom3 => {
  const substrate = cuboid({ size: [32, 65, 1.6] });
  const moduleCan = translate([0, -12, 2.3], cuboid({ size: [18, 22, 3] }));
  const usb = translate([0, -31, 2.3], cuboid({ size: [9, 7.5, 3.2] }));
  const gpioHeader = translate([0, 18, 5.5], cuboid({ size: [5, 23, 8.5] }));
  const sma = translate([10, -28, 4], cylinder({ radius: 3, height: 6 }));
  const board = union(substrate, moduleCan, usb, gpioHeader, sma);
  return normalizePcbModel(board).normalized;
};

export const getPredefinedPcbModel = (type: PCBModelType): Geom3 | null => {
  switch (type) {
    case 'rpi-pico':
      return createRpiPicoBoard();
    case 'arduino-uno':
      return createArduinoUnoBoard();
    case 'esp32':
      return createEsp32DevKitBoard();
    case 'flipper-module':
      return createFlipperModuleBoard();
    default:
      return null;
  }
};
