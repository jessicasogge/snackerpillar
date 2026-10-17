import { CELL_R, SAFE_NECK, SPACING } from './config.js';
import { pointAlong, trailLength } from './trail.js';

// Whether the head is touching a dot.
export function touchesSnack(head, snack) {
  return Math.hypot(snack.x - head.x, snack.y - head.y) < CELL_R + snack.r;
}

// The rock or mushroom the head ran into, or null. A little forgiving: the
// edges of both shapes can overlap a bit before it counts.
export function obstacleHit(head, obstacles) {
  return obstacles.find((o) => Math.hypot(o.x - head.x, o.y - head.y) < o.r * 0.85 + CELL_R * 0.9) ?? null;
}

// Whether the head ran into her own body. The circles just behind the head
// (SAFE_NECK of them) don't count, so an ordinary turn is safe, and neither
// does a circle with no trail to sit on yet (see draw.js).
export function tailHit(head, trail, bodyLength) {
  const out = trailLength(trail);
  for (let i = SAFE_NECK; i < bodyLength; i++) {
    if ((i + 1) * SPACING > out + 1e-9) break;
    const p = pointAlong(trail, (i + 1) * SPACING);
    if (Math.hypot(p.x - head.x, p.y - head.y) < CELL_R * 1.5) return true;
  }
  return false;
}
