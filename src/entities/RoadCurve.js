/**
 * Pure analytical road spline math (SRP & testable in Node without Three.js).
 * Intersections occur at Z = 95 + k * 160 where dx/dz = 0.
 */
export const ROAD_WIDTH = 10.8;
export const HALF_ROAD_WIDTH = 5.4;
export const SIDEWALK_HEIGHT = 0.25;
export const INTERSECTION_FIRST_Z = 95.0;
export const INTERSECTION_SPACING = 160.0;

export function getRoadCenterX(z, roadStraight = false) {
  if (roadStraight) return 0;
  const ramp = Math.min(1.0, Math.max(0.0, (z - 15.0) / 40.0));
  const u = (Math.PI * (z - INTERSECTION_FIRST_Z)) / INTERSECTION_SPACING;
  return ramp * ((Math.cos(u) - 1.0) * 4.5);
}

export function getRoadAngle(z, roadStraight = false) {
  if (roadStraight) return 0;
  const delta = 1.0;
  const x1 = getRoadCenterX(z - delta, false);
  const x2 = getRoadCenterX(z + delta, false);
  return Math.atan2(x2 - x1, delta * 2);
}

export function getRoadCurvature(z, roadStraight = false) {
  if (roadStraight) return 0;
  const delta = 2.0;
  const xPrev = getRoadCenterX(z - delta, false);
  const xCurr = getRoadCenterX(z, false);
  const xNext = getRoadCenterX(z + delta, false);
  return (xNext - 2 * xCurr + xPrev) / (delta * delta);
}

export function getSidewalkLift(absLateralX) {
  if (absLateralX >= 6.05) return SIDEWALK_HEIGHT;
  if (absLateralX <= 4.75) return 0.0;
  return Math.min(1, Math.max(0, (absLateralX - 4.75) / 1.3)) * SIDEWALK_HEIGHT;
}
