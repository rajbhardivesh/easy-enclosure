import { Geom3 } from '@jscad/modeling/src/geometries/types';
import { Vec3 } from '@jscad/modeling/src/maths/types';
import { union } from '@jscad/modeling/src/operations/booleans';
import { extrudeLinear } from '@jscad/modeling/src/operations/extrusions';
import { rotate, translate } from '@jscad/modeling/src/operations/transforms';
import { cuboid, cylinder, roundedRectangle } from '@jscad/modeling/src/primitives';
import { degToRad } from '@jscad/modeling/src/utils';

import { Params, VentGrille } from '../params';
import { Surface, SURFACES } from '.';

const TOP_HOLE_DEPTH_TOLERANCE = 0.2;
const HOLE_DEPTH_OVERCUT = 1;

export const createVentGrilleCutter = (grille: VentGrille, holeDepth: number): Geom3 => {
  const count = Math.max(1, grille.count || 5);
  const spacing = Math.max(0.1, grille.spacing || 3.5);
  const w = Math.max(0.2, grille.slotWidth || 2);
  const l = Math.max(0.2, grille.slotLength || 15);
  const pattern = grille.pattern || 'slots';

  const cutters: Geom3[] = [];
  const totalSpan = (count - 1) * spacing;
  const start = -totalSpan / 2;

  for (let i = 0; i < count; i++) {
    const offset = start + i * spacing;
    if (pattern === 'slots') {
      const r = grille.cornerRadius !== undefined ? grille.cornerRadius : w / 2;
      const safeR = Math.min(r, Math.min(w, l) / 2 - 0.005);
      let s: Geom3;
      if (safeR > 0) {
        const r2d = roundedRectangle({
          size: [w, l],
          roundRadius: safeR,
          segments: 16,
        });
        s = translate([0, 0, -holeDepth / 2], extrudeLinear({ height: holeDepth }, r2d));
      } else {
        s = cuboid({ size: [w, l, holeDepth] });
      }
      cutters.push(translate([offset, 0, 0], s));
    } else if (pattern === 'perforated') {
      const radius = Math.max(0.1, w / 2);
      const c = cylinder({
        radius,
        height: holeDepth,
        segments: 24,
      });
      cutters.push(translate([offset, 0, 0], c));
    } else if (pattern === 'honeycomb') {
      const radius = Math.max(0.1, w / 2);
      const h = cylinder({
        radius,
        height: holeDepth,
        segments: 6,
      });
      cutters.push(translate([offset, 0, 0], h));
    }
  }

  let result = cutters.length === 1 ? cutters[0] : union(cutters);
  if (grille.rotation) {
    result = rotate([0, 0, degToRad(grille.rotation)], result);
  }
  return result;
};

export const ventGrilles = (
  params: Params,
  surfacesFilter: Surface[] = ['bottom', 'left', 'right', 'back', 'front'],
): Geom3 | null => {
  const grillesList = params.ventGrilles ?? [];
  if (grillesList.length === 0) {
    return null;
  }

  const {
    length,
    width,
    height,
    roof,
    floor,
    wall,
    insertHeight,
    insertThickness,
    insertClearance,
  } = params;

  const result: Geom3[] = [];
  SURFACES.forEach((surface) => {
    const surfaceGrilles = grillesList.filter(
      (spec) => surfacesFilter.includes(surface) && spec.surface === surface,
    );

    surfaceGrilles.forEach((grille) => {
      let x: number;
      let y: number;
      let z: number;
      let rot: Vec3;

      const totalWallThickness = insertThickness + insertClearance * 2 + wall * 2;
      let holeDepth = totalWallThickness + HOLE_DEPTH_OVERCUT * 2;

      if (surface === 'front') {
        y = length - totalWallThickness / 2;
        x = width / 2 - grille.y;
        z = height / 2 + grille.x;
        rot = [degToRad(90), 0, 0];
      } else if (surface === 'right') {
        x = totalWallThickness / 2;
        y = length / 2 - grille.y;
        z = height / 2 + grille.x;
        rot = [degToRad(90), 0, degToRad(90)];
      } else if (surface === 'back') {
        y = totalWallThickness / 2;
        x = width / 2 - grille.y;
        z = height / 2 + grille.x;
        rot = [degToRad(90), 0, 0];
      } else if (surface === 'left') {
        x = width - totalWallThickness / 2;
        y = length / 2 - grille.y;
        z = height / 2 + grille.x;
        rot = [degToRad(90), 0, degToRad(90)];
      } else if (surface === 'bottom' || surface === 'top') {
        y = length / 2 - grille.x;
        x = width / 2 - grille.y;
        z = 0;
        if (surface === 'top') {
          holeDepth = roof + insertHeight + TOP_HOLE_DEPTH_TOLERANCE;
          z = holeDepth / 2;
        } else if (surface === 'bottom') {
          holeDepth = floor + HOLE_DEPTH_OVERCUT * 2;
          z = floor / 2;
        }
        rot = [0, 0, 0];
      } else {
        throw new Error(`Invalid surface: ${surface}`);
      }

      const cutter = createVentGrilleCutter(grille, holeDepth);
      result.push(translate([x, y, z], rotate(rot, cutter)));
    });
  });

  if (result.length === 0) {
    return null;
  }
  return result.length === 1 ? result[0] : union(result);
};

export const ventGrillesOnBase = (params: Params): Geom3 | null => {
  return ventGrilles(params, ['bottom', 'left', 'right', 'back', 'front']);
};

export const ventGrillesOnLid = (params: Params): Geom3 | null => {
  return ventGrilles(params, ['top']);
};
