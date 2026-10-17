import { SPEED } from './config.js';

// How far the head moves this frame, as { vx, vy }, turning her as it goes.
// A drag moves her with the finger, like a trackpad; arrow keys turn her
// quickly toward the pressed direction; left alone she stays put.
// `keys` holds 'up', 'down', 'left' and 'right'; `drag` is how far the finger
// has moved since she last caught up, and is used up here.
export function steer(head, { keys, drag, dt }) {
  const dragLen = Math.hypot(drag.x, drag.y);
  if (dragLen > 0) {
    // Capped, so a fling can't teleport her.
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
  if (!kx && !ky) return { vx: 0, vy: 0 };
  const want = Math.atan2(ky, kx);
  const diff = Math.atan2(Math.sin(want - head.dir), Math.cos(want - head.dir));
  const most = SPEED.turn * dt;
  head.dir += Math.max(-most, Math.min(most, diff));
  return { vx: Math.cos(head.dir) * SPEED.steer * dt, vy: Math.sin(head.dir) * SPEED.steer * dt };
}
