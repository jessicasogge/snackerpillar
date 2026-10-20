import { CELL_R, SAFE_NECK, SPACING } from './config.js';
import { spotsAlong } from './trail.js';

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
// does a circle with no trail to sit on yet (see draw.js). `spots` are where
// her circles are, if already worked out this frame (see spotsAlong).
export function tailHit(head, trail, bodyLength, spots = spotsAlong(trail, SPACING, bodyLength)) {
  for (let i = SAFE_NECK; i < spots.length; i++) {
    if (Math.hypot(spots[i].x - head.x, spots[i].y - head.y) < CELL_R * 1.5) return true;
  }
  return false;
}
