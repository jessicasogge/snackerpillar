import { LEVELS, RESPAWN_SECONDS, SNACKS, SPACING, START_HUE } from './config.js';
import { obstacleHit, tailHit, touchesSnack } from './collide.js';
import { keepInField, newSnack, placeObstacles } from './field.js';
import { steer } from './steer.js';
import { extendTrail, spotsAlong, trimTrail } from './trail.js';

const RETRY_SECONDS = 0.5; // how soon a dot with nowhere to go tries again

// A level (1 to 10), with that level's obstacles and the dots scattered
// around her. On level 1 she's in the middle facing up, with one purple
// circle behind her head. On later levels, `from` is the level she just
// finished, and everything stays where it was: she starts in the same spot,
// facing the same way, with all her circles in the same places and colors;
// the rocks, mushrooms and dots stay put; and one more obstacle is added,
// clear of her and of everything else. Dots she'd just eaten still come
// back on their usual timer.
export function newGame({ halfH, level = 1, from = null, rand = Math.random }) {
  const { obstacles, goal } = LEVELS[level - 1];
  const state = {
    level,
    goal, // how many circles long she has to grow to finish the level
    head: from ? { ...from.head } : { x: 0, y: 0, dir: -Math.PI / 2 },
    trail: from ? from.trail.map((p) => ({ ...p })) : [{ x: 0, y: 0 }],
    // { hue, born }, from just behind the head to the tail
    body: from ? from.body.map(({ hue }) => ({ hue, born: -1 })) : [{ hue: START_HUE, born: -1 }],
    snacks: [],
    obstacles: [],
    respawns: [], // when each eaten dot comes back, in game seconds
    time: 0,
    over: null, // what she ran into, once the game is over
    won: false, // whether she grew long enough to finish the level
  };
  // On level 1, a short straight trail below her (oldest point first, her
  // head last), so her first circle has somewhere to sit.
  if (!from) for (let i = 1; i <= 12; i++) state.trail.unshift({ x: 0, y: (i * SPACING) / 6 });
  if (from) {
    state.snacks = from.snacks.filter((s) => s.eatenAt === null).map((s) => ({ ...s, born: -1 }));
    state.respawns = from.respawns.map((t) => t - from.time);
  }
  const her = from ? { points: herPoints(state), head: state.head, dots: state.snacks } : null;
  state.obstacles = placeObstacles(halfH, obstacles, rand, her, from ? from.obstacles : []);
  if (!from) for (let i = 0; i < SNACKS; i++) addSnack(state, halfH, rand);
  return state;
}

// Where her head and each of her circles are. A circle with no trail to
// sit on yet counts as being at the trail's far end.
export function herPoints(state) {
  const spots = spotsAlong(state.trail, SPACING, state.body.length);
  const end = state.trail[0];
  while (spots.length < state.body.length) spots.push({ x: end.x, y: end.y });
  return [{ x: state.head.x, y: state.head.y }, ...spots];
}

// Put a new dot somewhere free. Returns whether there was room for one.
function addSnack(state, halfH, rand) {
  const snack = newSnack({ halfH, head: state.head, body: herPoints(state), snacks: state.snacks, obstacles: state.obstacles, time: state.time, rand });
  if (snack) state.snacks.push(snack);
  return Boolean(snack);
}

// The body's length, counting the head.
export const length = (state) => state.body.length + 1;

// Whether there's a level after this one.
export const hasNextLevel = (state) => state.level < LEVELS.length;

// Move the game on by `dt` seconds. Returns the hues of any dots she ate.
// Once she finishes the level or bumps into something, nothing moves.
export function step(state, { dt, keys, drag, halfH, rand = Math.random }) {
  if (state.over || state.won) return [];
  state.time += dt;
  const h = state.head;
  const { vx, vy } = steer(h, { keys, drag, dt });
  h.x += vx;
  h.y += vy;
  keepInField(h, halfH);

  extendTrail(state.trail, h.x, h.y);
  trimTrail(state.trail, (state.body.length + 2) * SPACING);

  const eaten = [];
  for (const s of state.snacks) {
    if (s.eatenAt === null && touchesSnack(h, s)) {
      s.eatenAt = state.time;
      state.body.push({ hue: s.hue, born: state.time });
      state.respawns.push(state.time + RESPAWN_SECONDS);
      eaten.push(s.hue);
    }
  }
  // Eaten dots linger a moment to shrink away.
  state.snacks = state.snacks.filter((s) => s.eatenAt === null || state.time - s.eatenAt < 0.3);
  // A dot that's due comes back. If the garden is too crowded for it right
  // now (she can be very long by the last levels), it tries again a moment
  // later, once she's moved, rather than being lost.
  state.respawns = state.respawns.map((t) => {
    if (t > state.time || addSnack(state, halfH, rand)) return t;
    return state.time + RETRY_SECONDS;
  }).filter((t) => t > state.time);

  if (length(state) >= state.goal) {
    state.won = true;
    return eaten;
  }

  const obstacle = obstacleHit(h, state.obstacles);
  if (obstacle) state.over = obstacle.kind;
  else if (tailHit(h, state.trail, state.body.length)) state.over = 'tail';
  return eaten;
}
