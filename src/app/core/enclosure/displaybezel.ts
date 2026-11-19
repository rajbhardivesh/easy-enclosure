import { Geom3 } from '@jscad/modeling/src/geometries/types';
import { union } from '@jscad/modeling/src/operations/booleans';
import { extrudeLinear } from '@jscad/modeling/src/operations/extrusions';
import { translate } from '@jscad/modeling/src/operations/transforms';
import { cuboid, roundedRectangle } from '@jscad/modeling/src/primitives';

import { DisplayBezel, Params } from '../params';

export const displayBezelCutters = (params: Params): Geom3 | null => {
  const bezel: DisplayBezel | undefined = params.displayBezel;
  if (!bezel || !bezel.enabled) {
    return null;
  }

  const { width: encWidth, length: encLength, roof, insertHeight } = params;

  const winW = Math.max(1, bezel.width);
  const winL = Math.max(1, bezel.length);
  const winR = Math.max(0, bezel.cornerRadius || 0);

  const recW = Math.max(winW, bezel.recessWidth);
  const recL = Math.max(winL, bezel.recessLength);
  const recR = Math.max(0, Math.min(winR, recW / 2 - 0.01));
  const maxRecDepth = Math.max(0.2, roof - 0.4);
  const recDepth = Math.min(Math.max(0.2, bezel.recessDepth), maxRecDepth);

  const posX = encWidth / 2 - bezel.y;
  const posY = encLength / 2 - bezel.x;

  const totalHeight = roof + insertHeight + 4;
  const safeWinR = Math.min(winR, Math.min(winW, winL) / 2 - 0.005);
  let windowCutter: Geom3;
  if (safeWinR > 0) {
    const r2d = roundedRectangle({
      size: [winW, winL],
      roundRadius: safeWinR,
      segments: 32,
    });
    windowCutter = translate([0, 0, -2], extrudeLinear({ height: totalHeight }, r2d));
  } else {
    windowCutter = translate([0, 0, -2], cuboid({ size: [winW, winL, totalHeight] }));
  }

  const recessZ = roof - recDepth;
  const recessH = totalHeight - recessZ;
  const safeRecR = Math.min(recR, Math.min(recW, recL) / 2 - 0.005);
  let recessCutter: Geom3;
  if (safeRecR > 0) {
    const rec2d = roundedRectangle({
      size: [recW, recL],
      roundRadius: safeRecR,
      segments: 32,
    });
    recessCutter = translate([0, 0, recessZ], extrudeLinear({ height: recessH }, rec2d));
  } else {
    recessCutter = translate(
      [0, 0, recessZ + recessH / 2],
      cuboid({ size: [recW, recL, recessH] }),
    );
  }

  const combined = union(windowCutter, recessCutter);
  return translate([posX, posY, 0], combined);
};
