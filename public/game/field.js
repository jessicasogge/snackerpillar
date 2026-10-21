import { CELL_R } from './config.js';

// Keep the head on the field. At an edge she just stops, still facing the
// way you steered her, and can slide along it; she isn't turned around.
export function keepInField(head, halfH) {
  const mx = 1 - CELL_R * 1.2;
  const my = halfH - CELL_R * 1.2;
  head.x = Math.max(-mx, Math.min(mx, head.x));
  head.y = Math.max(-my, Math.min(my, head.y));
}

// Rocks and mushrooms, kept away from her and from each other. On level 1
// she starts in the middle with her body trailing below; on later levels she
// starts wherever she finished the last one, so `her` gives the spots of her
// head and every circle (her.points) and which way she's facing (her.head):
// they're kept clear of her whole body and of the way ahead of her face.
// `existing` are obstacles already on the grass (from the level before),
// which stay where they are; only the rest are placed. If they don't all fit
// it starts over, and then leaves a little less room between them, rather
// than leaving any out.
export function placeObstacles(halfH, count, rand = Math.random, her = null, existing = []) {
  const clearOfHer = her ? (x, y, r) => clearOfBody(her, x, y, r) : clearOfStart;
  let best = [];
  for (const gap of [0.22, 0.18, 0.14, 0.1]) {
    for (let attempt = 0; attempt < 15; attempt++) {
      const placed = tryPlacing(halfH, count, gap, rand, clearOfHer, existing);
      if (placed.length === count) return placed;
      if (placed.length > best.length) best = placed;
    }
  }
  return best;
}

// Level 1: clear of the middle, and of the line her body trails along below it.
const clearOfStart = (x, y, r) => Math.hypot(x, y) > 0.42 + r && !(Math.abs(x) < 0.15 + r && y > 0);

// Later levels: clear of every circle of her, and of the space ahead of her
// face, so she doesn't start a level about to bump into something; and clear
// of the dots still on the grass (`dots`), so none ends up under a rock.
function clearOfBody({ points, head, dots = [] }, x, y, r) {
  if (!points.every((p) => Math.hypot(x - p.x, y - p.y) > r + CELL_R + 0.06)) return false;
  if (!dots.every((d) => Math.hypot(x - d.x, y - d.y) > r + d.r + 0.05)) return false;
  for (let k = 1; k <= 5; k++) {
    const ax = head.x + Math.cos(head.dir) * k * 0.08;
    const ay = head.y + Math.sin(head.dir) * k * 0.08;
    if (Math.hypot(x - ax, y - ay) < r + CELL_R + 0.06) return false;
  }
  return true;
}

function tryPlacing(halfH, count, gap, rand, clearOfHer, existing) {
  const obstacles = existing.map((o) => ({ ...o }));
  for (let i = obstacles.length; i < count; i++) {
    for (let tries = 0; tries < 80; tries++) {
      const r = 0.055 + rand() * 0.04;
      const x = (rand() * 2 - 1) * (1 - r - 0.05);
      const y = (rand() * 2 - 1) * (halfH - r - 0.05);
      const clearOfOthers = obstacles.every((o) => Math.hypot(x - o.x, y - o.y) > o.r + r + gap);
      if (clearOfHer(x, y, r) && clearOfOthers) {
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

// A new dot somewhere clear of the head, her body (`body`, the spots of her
// circles), the other dots and the obstacles, or null if the field is too
// crowded to find one.
export function newSnack({ halfH, head, body = [], snacks, obstacles, time, rand = Math.random }) {
  const mx = 1 - 0.08;
  const my = halfH - 0.08;
  for (let tries = 0; tries < 100; tries++) {
    const x = (rand() * 2 - 1) * mx;
    const y = (rand() * 2 - 1) * my;
    const clearOfHead = Math.hypot(x - head.x, y - head.y) > 0.3;
    const clearOfOthers = snacks.every((s) => Math.hypot(x - s.x, y - s.y) > 0.13);
    const clearOfObstacles = obstacles.every((o) => Math.hypot(x - o.x, y - o.y) > o.r + 0.07);
    const clearOfBody = body.every((p) => Math.hypot(x - p.x, y - p.y) > CELL_R + 0.04);
    if (clearOfHead && clearOfOthers && clearOfObstacles && clearOfBody) {
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
