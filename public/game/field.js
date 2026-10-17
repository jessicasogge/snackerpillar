import { CELL_R } from './config.js';

// Keep the head on the field. At an edge she just stops, still facing the
// way you steered her, and can slide along it; she isn't turned around.
export function keepInField(head, halfH) {
  const mx = 1 - CELL_R * 1.2;
  const my = halfH - CELL_R * 1.2;
  head.x = Math.max(-mx, Math.min(mx, head.x));
  head.y = Math.max(-my, Math.min(my, head.y));
}

// Rocks and mushrooms, kept away from where she starts (the middle, and the
// line her body trails along below it) and from each other. Later levels
// crowd the field, so if they don't all fit it starts over, and then leaves
// a little less room between them, rather than leaving any out.
export function placeObstacles(halfH, count, rand = Math.random) {
  let best = [];
  for (const gap of [0.22, 0.18, 0.14, 0.1]) {
    for (let attempt = 0; attempt < 15; attempt++) {
      const placed = tryPlacing(halfH, count, gap, rand);
      if (placed.length === count) return placed;
      if (placed.length > best.length) best = placed;
    }
  }
  return best;
}

function tryPlacing(halfH, count, gap, rand) {
  const obstacles = [];
  for (let i = 0; i < count; i++) {
    for (let tries = 0; tries < 80; tries++) {
      const r = 0.055 + rand() * 0.04;
      const x = (rand() * 2 - 1) * (1 - r - 0.05);
      const y = (rand() * 2 - 1) * (halfH - r - 0.05);
      const clearOfStart = Math.hypot(x, y) > 0.42 + r && !(Math.abs(x) < 0.15 + r && y > 0);
      const clearOfOthers = obstacles.every((o) => Math.hypot(x - o.x, y - o.y) > o.r + r + gap);
      if (clearOfStart && clearOfOthers) {
        const kind = rand() < 0.6 ? 'rock' : 'mushroom';
        // A rock's lumpy outline: a radius for each of 9 points around it.
        const lumps = Array.from({ length: 9 }, () => 0.85 + rand() * 0.2);
        obstacles.push({ x, y, r, kind, lumps, turn: rand() * Math.PI * 2 });
        break;
      }
    }
  }
  return obstacles;
}

// A new dot somewhere clear of the head, the other dots and the obstacles,
// or null if the field is too crowded to find one.
export function newSnack({ halfH, head, snacks, obstacles, time, rand = Math.random }) {
  const mx = 1 - 0.08;
  const my = halfH - 0.08;
  for (let tries = 0; tries < 50; tries++) {
    const x = (rand() * 2 - 1) * mx;
    const y = (rand() * 2 - 1) * my;
    const clearOfHead = Math.hypot(x - head.x, y - head.y) > 0.3;
    const clearOfOthers = snacks.every((s) => Math.hypot(x - s.x, y - s.y) > 0.13);
    const clearOfObstacles = obstacles.every((o) => Math.hypot(x - o.x, y - o.y) > o.r + 0.07);
    if (clearOfHead && clearOfOthers && clearOfObstacles) {
      return {
        x,
        y,
        r: rand() < 0.4 ? 0.016 : 0.022,
        hue: Math.floor(rand() * 360),
        born: time,
        eatenAt: null,
      };
    }
  }
  return null;
}
