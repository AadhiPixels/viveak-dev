/**
 * The route the pulse travels: a gently winding curve parameterised by
 * distance. Pure functions so the renderer, the camera and the tests agree.
 */

export interface RoutePoint {
  x: number;
  y: number;
  z: number;
}

/** Centre of the route at distance s (world units). z runs forward (negative into the screen). */
export function routeAt(s: number): RoutePoint {
  return {
    x: 2.4 * Math.sin(s * 0.045) + 1.1 * Math.sin(s * 0.021 + 1.3),
    y: 0.7 * Math.sin(s * 0.03 + 0.4) + 0.25 * Math.sin(s * 0.11),
    z: -s,
  };
}

/** Unit tangent at s (finite difference). */
export function routeTangent(s: number): RoutePoint {
  const a = routeAt(s - 0.5);
  const b = routeAt(s + 0.5);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dz = b.z - a.z;
  const len = Math.hypot(dx, dy, dz) || 1;
  return { x: dx / len, y: dy / len, z: dz / len };
}

/** Horizontal side vector (tangent × up), used for lane offsets. */
export function routeSide(s: number): RoutePoint {
  const t = routeTangent(s);
  // up = (0,1,0); side = t × up = (t.z*1 - t.y*0, t.x*0 - t.z*0... ) computed explicitly:
  const sx = t.y * 0 - t.z * 1;
  const sy = t.z * 0 - t.x * 0;
  const sz = t.x * 1 - t.y * 0;
  const len = Math.hypot(sx, sy, sz) || 1;
  return { x: -sx / len, y: -sy / len, z: -sz / len };
}

/** World position of a lane offset (in lane units) at distance s. */
export function lanePosition(s: number, laneX: number, laneWidth: number, lift = 0): RoutePoint {
  const c = routeAt(s);
  const side = routeSide(s);
  return {
    x: c.x + side.x * laneX * laneWidth,
    y: c.y + side.y * laneX * laneWidth + lift,
    z: c.z + side.z * laneX * laneWidth,
  };
}
