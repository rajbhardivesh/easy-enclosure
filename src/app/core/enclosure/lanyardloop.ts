import { Geom3 } from '@jscad/modeling/src/geometries/types';
import { extrudeLinear } from '@jscad/modeling/src/operations/extrusions';
import { rotateX, rotateY, translate } from '@jscad/modeling/src/operations/transforms';
import { cuboid, cylinder, roundedRectangle } from '@jscad/modeling/src/primitives';

import { LanyardCorner, LanyardLoop, Params } from '../params';

export const getLanyardCornerCenter = (
  corner: LanyardCorner,
  width: number,
  length: number,
  cornerRadius: number,
  inset = 8,
): [number, number] => {
  const margin = Math.max(cornerRadius + 2, inset);
  switch (corner) {
    case 'bottom-right':
      return [margin, margin];
    case 'bottom-left':
      return [width - margin, margin];
    case 'top-right':
      return [margin, length - margin];
    case 'top-left':
      return [width - margin, length - margin];
  }
};

export const lanyardLoopCutout = (params: Params): Geom3 | null => {
  const loop: LanyardLoop | undefined = params.lanyardLoop;
  if (!loop || !loop.enabled) {
    return null;
  }

  const { width, length, height, cornerRadius, floor } = params;
  const slotW = Math.max(2, loop.slotWidth);
  const slotL = Math.max(4, loop.slotLength);
  const [cx, cy] = getLanyardCornerCenter(loop.corner, width, length, cornerRadius);

  const slotH = height + 4;
  const safeR = Math.min(slotW, slotL) / 2 - 0.005;
  let slotGeom: Geom3;
  if (safeR > 0) {
    const r2d = roundedRectangle({
      size: [slotW, slotL],
      roundRadius: safeR,
      segments: 16,
    });
    slotGeom = translate([0, 0, -2], extrudeLinear({ height: slotH }, r2d));
  } else {
    slotGeom = translate([0, 0, -2], cuboid({ size: [slotW, slotL, slotH] }));
  }

  return translate([cx, cy, 0], slotGeom);
};

export const lanyardLoopBar = (params: Params): Geom3 | null => {
  const loop: LanyardLoop | undefined = params.lanyardLoop;
  if (!loop || !loop.enabled) {
    return null;
  }

  const { width, length, cornerRadius, floor } = params;
  const slotW = Math.max(2, loop.slotWidth);
  const barD = Math.max(1, loop.barDiameter);
  const [cx, cy] = getLanyardCornerCenter(loop.corner, width, length, cornerRadius);

  const barLength = slotW + 6;
  const barZ = floor + barD / 2 + 1;
  const bar = translate(
    [0, 0, barZ],
    rotateY(Math.PI / 2, cylinder({ radius: barD / 2, height: barLength })),
  );

  return translate([cx, cy, 0], bar);
};
