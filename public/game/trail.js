// The path the head has taken, newest point first. The body follows it, one
// circle every SPACING along the path.

// Add the head's spot to the trail once it has moved far enough.
export function extendTrail(trail, x, y, minStep = 0.004) {
  const last = trail[0];
  if (!last || Math.hypot(x - last.x, y - last.y) > minStep) trail.unshift({ x, y });
}

// Drop the part of the trail further back than `length`.
export function trimTrail(trail, length) {
  let total = 0;
  for (let i = 1; i < trail.length; i++) {
    total += Math.hypot(trail[i].x - trail[i - 1].x, trail[i].y - trail[i - 1].y);
    if (total > length) {
      trail.length = i + 1;
      return;
    }
  }
}

// The spot `dist` along the trail from the head, or the trail's end if it's
// shorter than that.
export function pointAlong(trail, dist) {
  let walked = 0;
  for (let i = 1; i < trail.length; i++) {
    const a = trail[i - 1];
    const b = trail[i];
    const seg = Math.hypot(b.x - a.x, b.y - a.y);
    if (walked + seg >= dist) {
      const k = seg ? (dist - walked) / seg : 0;
      return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
    }
    walked += seg;
  }
  const end = trail[trail.length - 1];
  return { x: end.x, y: end.y };
}
