import { SPEED } from './config.js';

// How far the head moves this frame, as { vx, vy }, turning him as it goes.
// A drag moves him with the finger, like a trackpad; arrow keys turn him
// smoothly toward the pressed direction; left alone he wanders slowly.
// `keys` holds 'up', 'down', 'left' and 'right'; `drag` is how far the finger
// has moved since he last caught up, and is used up here.
export function steer(head, { keys, drag, time, dt }) {
  const dragLen = Math.hypot(drag.x, drag.y);
  if (dragLen > 0) {
    // Capped, so a fling can't teleport him.
    const k = Math.min(1, (SPEED.drag * dt) / dragLen);
    const vx = drag.x * k;
    const vy = drag.y * k;
    drag.x -= vx;
    drag.y -= vy;
    if (Math.hypot(vx, vy) > 1e-4) head.dir = Math.atan2(vy, vx);
    return { vx, vy };
  }

  const kx = (keys.has('right') ? 1 : 0) - (keys.has('left') ? 1 : 0);
  const ky = (keys.has('down') ? 1 : 0) - (keys.has('up') ? 1 : 0);
  let speed = SPEED.wander;
  if (kx || ky) {
    const want = Math.atan2(ky, kx);
    const diff = Math.atan2(Math.sin(want - head.dir), Math.cos(want - head.dir));
    const most = SPEED.turn * dt;
    head.dir += Math.max(-most, Math.min(most, diff));
    speed = SPEED.steer;
  } else {
    head.dir += Math.sin(time * 0.9) * 0.5 * dt;
  }
  return { vx: Math.cos(head.dir) * speed * dt, vy: Math.sin(head.dir) * speed * dt };
}
