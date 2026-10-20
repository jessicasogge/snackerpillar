// The path the head has taken, oldest point first and the head's spot last.
// The body follows it, one circle every SPACING back along the path.
//
// New spots go on the end, and old ones are only cut off the front in
// batches (see trimTrail), so a frame never has to shift the whole trail
// along by one.

const head = (trail) => trail[trail.length - 1];

// Add the head's spot to the end of the trail once she has moved far enough.
export function extendTrail(trail, x, y, minStep = 0.004) {
  const last = head(trail);
  if (!last || Math.hypot(x - last.x, y - last.y) > minStep) trail.push({ x, y });
}

// Drop the part of the trail further back from the head than `length`,
// keeping the first point past the cut so the tail still has somewhere to
// sit. The points to drop are only cut once there are at least `slack` of
// them, so most frames cut nothing; a few spare points at the far end are
// never used.
export function trimTrail(trail, length, slack = 64) {
  let total = 0;
  for (let i = trail.length - 2; i >= 0; i--) {
    total += Math.hypot(trail[i + 1].x - trail[i].x, trail[i + 1].y - trail[i].y);
    if (total > length) {
      if (i >= slack) trail.splice(0, i);
      return;
    }
  }
}

// How long the trail is, from the head to its far end.
export function trailLength(trail) {
  let total = 0;
  for (let i = 1; i < trail.length; i++) total += Math.hypot(trail[i].x - trail[i - 1].x, trail[i].y - trail[i - 1].y);
  return total;
}

// The spots `spacing`, 2 * `spacing`, … `count` * `spacing` back along the
// trail from the head: where each of her body circles sits. Found in one walk
// along the trail, so it costs the same however long she is. Stops early if
// the trail runs out, so the result can be shorter than `count`: circles with
// no trail to sit on yet.
export function spotsAlong(trail, spacing, count) {
  const spots = [];
  let walked = 0;
  let want = spacing;
  for (let i = trail.length - 1; i > 0 && spots.length < count; i--) {
    const a = trail[i];
    const b = trail[i - 1];
    const seg = Math.hypot(b.x - a.x, b.y - a.y);
    while (spots.length < count && walked + seg >= want - 1e-9) {
      const k = seg ? Math.min(1, (want - walked) / seg) : 0;
      spots.push({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k });
      want += spacing;
    }
    walked += seg;
  }
  return spots;
}

// The spot `dist` back along the trail from the head, or the trail's far end
// if it's shorter than that.
export function pointAlong(trail, dist) {
  if (dist <= 0) return { ...head(trail) };
  const [spot] = spotsAlong(trail, dist, 1);
  return spot ?? { x: trail[0].x, y: trail[0].y };
}
