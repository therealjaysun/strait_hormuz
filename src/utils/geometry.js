// Geometry utility functions

export function distance(p1, p2) {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function isInRange(p1, p2, range) {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return dx * dx + dy * dy <= range * range;
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function lerpPoint(p1, p2, t) {
  return {
    x: lerp(p1.x, p2.x, t),
    y: lerp(p1.y, p2.y, t),
  };
}

export function normalizeAngle(angle) {
  const TWO_PI = Math.PI * 2;
  angle = angle % TWO_PI;
  if (angle < 0) angle += TWO_PI;
  return angle;
}

export function angleBetween(p1, p2) {
  return Math.atan2(p2.y - p1.y, p2.x - p1.x);
}

export function pointOnCircle(center, radius, angle) {
  return {
    x: center.x + Math.cos(angle) * radius,
    y: center.y + Math.sin(angle) * radius,
  };
}

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function pointInPolygon(point, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;
    const intersect = ((yi > point.y) !== (yj > point.y)) &&
      (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

export function segmentLength(waypoints) {
  let total = 0;
  for (let i = 1; i < waypoints.length; i++) {
    total += distance(waypoints[i - 1], waypoints[i]);
  }
  return total;
}

export function pointAlongPath(waypoints, t) {
  const totalLen = segmentLength(waypoints);
  let targetDist = t * totalLen;

  for (let i = 1; i < waypoints.length; i++) {
    const segLen = distance(waypoints[i - 1], waypoints[i]);
    if (targetDist <= segLen) {
      const segT = targetDist / segLen;
      return lerpPoint(waypoints[i - 1], waypoints[i], segT);
    }
    targetDist -= segLen;
  }

  return waypoints[waypoints.length - 1];
}
