import { Geom3 } from '@jscad/modeling/src/geometries/types';
import { union } from '@jscad/modeling/src/operations/booleans';
import { translate } from '@jscad/modeling/src/operations/transforms';
import { cuboid } from '@jscad/modeling/src/primitives';

import { Params, SideGrips } from '../params';

export const sideGripsBody = (params: Params): Geom3 | null => {
  const grips: SideGrips | undefined = params.sideGrips;
  if (!grips || !grips.enabled || grips.style !== 'ribs') {
    return null;
  }

  const { width, length, height } = params;
  const count = Math.max(1, grips.count);
  const w = Math.max(0.5, grips.width);
  const h = Math.min(height - 4, Math.max(2, grips.length));
  const d = Math.max(0.2, grips.depth);
  const spacing = Math.max(w + 0.5, grips.spacing);

  const totalSpan = (count - 1) * spacing;
  const startY = length / 2 - totalSpan / 2;
  const midZ = height / 2;

  const elements: Geom3[] = [];
  for (let i = 0; i < count; i++) {
    const y = startY + i * spacing;
    // Positioned so depth/2 protrudes outwards and depth/2 is embedded in the wall
    const rightRib = translate([0, y, midZ], cuboid({ size: [d * 2, w, h] }));
    const leftRib = translate([width, y, midZ], cuboid({ size: [d * 2, w, h] }));
    elements.push(rightRib, leftRib);
  }

  return elements.length === 1 ? elements[0] : union(elements);
};

export const sideGripsCutout = (params: Params): Geom3 | null => {
  const grips: SideGrips | undefined = params.sideGrips;
  if (!grips || !grips.enabled || grips.style !== 'grooves') {
    return null;
  }

  const { width, length, height } = params;
  const count = Math.max(1, grips.count);
  const w = Math.max(0.5, grips.width);
  const h = Math.min(height - 4, Math.max(2, grips.length));
  const d = Math.max(0.2, grips.depth);
  const spacing = Math.max(w + 0.5, grips.spacing);

  const totalSpan = (count - 1) * spacing;
  const startY = length / 2 - totalSpan / 2;
  const midZ = height / 2;

  const cutters: Geom3[] = [];
  for (let i = 0; i < count; i++) {
    const y = startY + i * spacing;
    // Cuts d into the exterior wall
    const rightGroove = translate([0, y, midZ], cuboid({ size: [d * 2, w, h] }));
    const leftGroove = translate([width, y, midZ], cuboid({ size: [d * 2, w, h] }));
    cutters.push(rightGroove, leftGroove);
  }

  return cutters.length === 1 ? cutters[0] : union(cutters);
};
