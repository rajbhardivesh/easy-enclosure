import { rotate, translate } from '@jscad/modeling/src/operations/transforms';
import { degToRad } from '@jscad/modeling/src/utils';
import {
  cuboid,
  cylinder,
  cylinderElliptic,
  rectangle,
  roundedRectangle,
} from '@jscad/modeling/src/primitives';
import { intersect, union } from '@jscad/modeling/src/operations/booleans';
import { extrudeLinear } from '@jscad/modeling/src/operations/extrusions';
import { hull } from '@jscad/modeling/src/operations/hulls';

import { Params } from '../params';
import { Geom3 } from '@jscad/modeling/src/geometries/types';
import { Vec3 } from '@jscad/modeling/src/maths/types';
import { Surface, SURFACES } from '.';

const TOP_HOLE_DEPTH_TOLERANCE = 0.2;
const HOLE_DEPTH_OVERCUT = 1;

export const createRoundedRectCutter = (
  width: number,
  length: number,
  depth: number,
  radius: number,
): Geom3 => {
  const maxR = Math.min(width, length) / 2;
  const safeR = Math.min(radius, maxR - 0.005);
  if (safeR <= 0) {
    return cuboid({ size: [width, length, depth] });
  }
  const r2d = roundedRectangle({
    size: [width, length],
    roundRadius: safeR,
    segments: 32,
  });
  return translate([0, 0, -depth / 2], extrudeLinear({ height: depth }, r2d));
};

export const createCircleChamfer = (
  radius: number,
  holeDepth: number,
  chamfer: number,
  sign: number,
): Geom3 => {
  const main = cylinder({ radius, height: holeDepth });
  const safeCh = Math.min(chamfer, radius * 0.9, holeDepth / 2 - 0.1);
  if (safeCh <= 0) return main;

  const zExt = sign * (holeDepth / 2);
  const zIn = zExt - sign * safeCh;
  const midZ = (zExt + zIn) / 2;
  const [startR, endR] = sign === 1 ? [radius, radius + safeCh] : [radius + safeCh, radius];
  const cone = translate(
    [0, 0, midZ],
    cylinderElliptic({
      startRadius: [startR, startR],
      endRadius: [endR, endR],
      height: safeCh,
      segments: 32,
    }),
  );
  return union(main, cone);
};

export const createRectChamfer = (
  width: number,
  length: number,
  holeDepth: number,
  cornerRadius: number,
  chamfer: number,
  sign: number,
): Geom3 => {
  const maxCh = Math.min(width, length) / 2 - 0.1;
  const safeCh = Math.min(chamfer, maxCh, holeDepth / 2 - 0.1);
  const mainCutter = createRoundedRectCutter(width, length, holeDepth, cornerRadius);
  if (safeCh <= 0) return mainCutter;

  const eps = 0.02;
  const maxInR = Math.min(width, length) / 2;
  const safeInR = Math.min(cornerRadius, maxInR - 0.005);
  const safeOutR = safeInR > 0 ? safeInR + safeCh : safeCh;

  const zExt = sign * (holeDepth / 2);
  const zIn = zExt - sign * safeCh;
  const pIn = sign === 1 ? zIn : zIn - eps;
  const pExt = sign === 1 ? zExt - eps : zExt;

  const gIn = translate(
    [0, 0, pIn],
    extrudeLinear(
      { height: eps },
      safeInR > 0
        ? roundedRectangle({ size: [width, length], roundRadius: safeInR, segments: 16 })
        : rectangle({ size: [width, length] }),
    ),
  );
  const gOut = translate(
    [0, 0, pExt],
    extrudeLinear(
      { height: eps },
      safeOutR > 0
        ? roundedRectangle({
            size: [width + safeCh * 2, length + safeCh * 2],
            roundRadius: safeOutR,
            segments: 16,
          })
        : rectangle({ size: [width + safeCh * 2, length + safeCh * 2] }),
    ),
  );
  const flare = hull(gIn, gOut);
  return union(mainCutter, flare);
};

export const createHexagonChamfer = (
  radius: number,
  holeDepth: number,
  chamfer: number,
  sign: number,
): Geom3 => {
  const main = cylinder({ radius, height: holeDepth, segments: 6 });
  const safeCh = Math.min(chamfer, radius * 0.9, holeDepth / 2 - 0.1);
  if (safeCh <= 0) return main;

  const zExt = sign * (holeDepth / 2);
  const zIn = zExt - sign * safeCh;
  const midZ = (zExt + zIn) / 2;
  const [startR, endR] = sign === 1 ? [radius, radius + safeCh] : [radius + safeCh, radius];
  const cone = translate(
    [0, 0, midZ],
    cylinderElliptic({
      startRadius: [startR, startR],
      endRadius: [endR, endR],
      height: safeCh,
      segments: 6,
    }),
  );
  return union(main, cone);
};

export const holes = (
  params: Params,
  surfacesFilter: Surface[] = ['bottom', 'left', 'right', 'back', 'front'],
) => {
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
    holes: holeParams,
  } = params;

  let result: Geom3[] = [];
  SURFACES.forEach((surface) => {
    const surfaceHoles = holeParams.filter((spec) => {
      if (surfacesFilter.includes(surface) && spec.surface === surface) {
        return spec;
      } else {
        return false;
      }
    });

    surfaceHoles.forEach((hole, i) => {
      let x: number;
      let y: number;
      let z: number;
      let rot: Vec3;

      const totalWallThickness = insertThickness + insertClearance * 2 + wall * 2;
      let holeDepth = totalWallThickness + HOLE_DEPTH_OVERCUT * 2;

      if (surface === 'front') {
        y = length - totalWallThickness / 2;
        x = width / 2 - hole.y;
        z = height / 2 + hole.x;
        rot = [degToRad(90), 0, 0];
      } else if (surface === 'right') {
        x = totalWallThickness / 2;
        y = length / 2 - hole.y;
        z = height / 2 + hole.x;
        if (hole.shape === 'circle') {
          rot = [0, degToRad(90), 0];
        } else {
          rot = [degToRad(90), 0, degToRad(90)];
        }
      } else if (surface === 'back') {
        y = totalWallThickness / 2;
        x = width / 2 - hole.y;
        z = height / 2 + hole.x;
        rot = [degToRad(90), 0, 0];
      } else if (surface === 'left') {
        x = width - totalWallThickness / 2;
        y = length / 2 - hole.y;
        z = height / 2 + hole.x;
        if (hole.shape === 'circle') {
          rot = [0, degToRad(90), 0];
        } else {
          rot = [degToRad(90), 0, degToRad(90)];
        }
      } else if (surface === 'bottom' || surface === 'top') {
        y = length / 2 - hole.x;
        x = width / 2 - hole.y;
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

      const sign = surface === 'back' || surface === 'left' ? 1 : -1;
      const ch = hole.chamfer ?? 0;

      if (hole.shape === 'square') {
        const r = hole.cornerRadius ?? 0;
        let cutter =
          ch > 0
            ? createRectChamfer(hole.width, hole.width, holeDepth, r, ch, sign)
            : r > 0
              ? createRoundedRectCutter(hole.width, hole.width, holeDepth, r)
              : cuboid({
                  size: [hole.width, hole.width, holeDepth],
                });
        if (hole.rotation) {
          cutter = rotate([0, 0, degToRad(hole.rotation)], cutter);
        }
        result.push(translate([x, y, z], rotate(rot, cutter)));
      } else if (hole.shape === 'rectangle') {
        const r = hole.cornerRadius ?? 0;
        let cutter =
          ch > 0
            ? createRectChamfer(hole.width, hole.length, holeDepth, r, ch, sign)
            : r > 0
              ? createRoundedRectCutter(hole.width, hole.length, holeDepth, r)
              : cuboid({
                  size: [hole.width, hole.length, holeDepth],
                });
        if (hole.rotation) {
          cutter = rotate([0, 0, degToRad(hole.rotation)], cutter);
        }
        result.push(translate([x, y, z], rotate(rot, cutter)));
      } else if (hole.shape === 'circle') {
        let cutter =
          ch > 0
            ? createCircleChamfer(hole.diameter / 2, holeDepth, ch, sign)
            : cylinder({
                radius: hole.diameter / 2,
                height: holeDepth,
              });
        if (hole.rotation) {
          cutter = rotate([0, 0, degToRad(hole.rotation)], cutter);
        }
        result.push(translate([x, y, z], rotate(rot, cutter)));
      } else if (hole.shape === 'double-d') {
        const diameter = Math.max(0.1, hole.diameter);
        const radius = diameter / 2;
        const flatW =
          hole.flatWidth !== undefined && hole.flatWidth > 0
            ? Math.min(hole.flatWidth, diameter)
            : diameter * 0.9;
        let cutter =
          ch > 0
            ? createCircleChamfer(radius, holeDepth, ch, sign)
            : cylinder({
                radius,
                height: holeDepth,
              });
        if (flatW < diameter) {
          const flatBox = cuboid({
            size: [
              diameter * 2 + (ch > 0 ? ch * 4 : 0),
              flatW + (ch > 0 ? ch * 2 : 0),
              holeDepth + 2,
            ],
          });
          cutter = intersect(cutter, flatBox);
        }
        if (hole.rotation) {
          cutter = rotate([0, 0, degToRad(hole.rotation)], cutter);
        }
        result.push(translate([x, y, z], rotate(rot, cutter)));
      } else if (hole.shape === 'dpad') {
        const armWidth = Math.min(hole.width, hole.length);
        const totalSpan = Math.max(hole.width, hole.length);
        const r = hole.cornerRadius ?? 0;
        const arm1 =
          ch > 0
            ? createRectChamfer(armWidth, totalSpan, holeDepth, r, ch, sign)
            : r > 0
              ? createRoundedRectCutter(armWidth, totalSpan, holeDepth, r)
              : cuboid({ size: [armWidth, totalSpan, holeDepth] });
        const arm2 =
          ch > 0
            ? createRectChamfer(totalSpan, armWidth, holeDepth, r, ch, sign)
            : r > 0
              ? createRoundedRectCutter(totalSpan, armWidth, holeDepth, r)
              : cuboid({ size: [totalSpan, armWidth, holeDepth] });
        let cutter = union(arm1, arm2);
        if (hole.rotation) {
          cutter = rotate([0, 0, degToRad(hole.rotation)], cutter);
        }
        result.push(translate([x, y, z], rotate(rot, cutter)));
      } else if (hole.shape === 'hexagon') {
        let cutter =
          ch > 0
            ? createHexagonChamfer(hole.diameter / 2, holeDepth, ch, sign)
            : cylinder({
                radius: hole.diameter / 2,
                height: holeDepth,
                segments: 6,
              });
        if (hole.rotation) {
          cutter = rotate([0, 0, degToRad(hole.rotation)], cutter);
        }
        result.push(translate([x, y, z], rotate(rot, cutter)));
      }
    });
  });

  return union(result);
};
