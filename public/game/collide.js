import { CELL_R, NECK_OVERLAP, SAFE_NECK, SPACING } from './config.js';
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

// Whether the head ran into her own body. `spots` are where her circles are,
// if already worked out this frame (see spotsAlong); a circle with no trail
// to sit on yet doesn't count (see draw.js).
//
// The circles just behind the head (SAFE_NECK of them) come close to it in
// any tight turn, and in a turn on the spot against the edge of the garden,
// so they only count when she's been flipped straight back over them: just
// after a drag flipped her round (head.flippedAt, see steer.js), until she's
// crawled past them, and only when one is in front of her face and
// overlapping it. That catches backing into her own tail at any length, and
// keeps turning, at an edge or anywhere else, safe.
export function tailHit(head, trail, bodyLength, spots = spotsAlong(trail, SPACING, bodyLength)) {
  const fx = Math.cos(head.dir);
  const fy = Math.sin(head.dir);
  const flipped = head.flippedAt
    && Math.hypot(head.x - head.flippedAt.x, head.y - head.flippedAt.y) < SAFE_NECK * SPACING + CELL_R;
  for (let i = 0; i < spots.length; i++) {
    const dx = spots[i].x - head.x;
    const dy = spots[i].y - head.y;
    const dist = Math.hypot(dx, dy);
    if (i >= SAFE_NECK) {
      if (dist < CELL_R * 1.5) return true;
    } else if (flipped && dist < CELL_R * NECK_OVERLAP && dx * fx + dy * fy > 0) {
      return true;
    }
  }
  return false;
}
