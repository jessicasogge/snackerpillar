import { LEVELS, RESPAWN_SECONDS, SNACKS, SPACING, START_HUE } from './config.js';
import { obstacleHit, tailHit, touchesSnack } from './collide.js';
import { keepInField, newSnack, placeObstacles } from './field.js';
import { steer } from './steer.js';
import { extendTrail, trimTrail } from './trail.js';

// A fresh game of a level (1 to 10): his head in the middle, facing up, with
// one circle behind it, and that level's obstacles and the dots scattered
// around him.
export function newGame({ halfH, level = 1, rand = Math.random }) {
  const { obstacles, goal } = LEVELS[level - 1];
  const state = {
    level,
    goal, // how many circles long he has to grow to finish the level
    head: { x: 0, y: 0, dir: -Math.PI / 2 },
    trail: [{ x: 0, y: 0 }],
    body: [{ hue: START_HUE, born: -1 }], // { hue, born }, from just behind the head to the tail
    snacks: [],
    obstacles: placeObstacles(halfH, obstacles, rand),
    respawns: [], // when each eaten dot comes back, in game seconds
    time: 0,
    over: null, // what he ran into, once the game is over
    won: false, // whether he grew long enough to finish the level
  };
  // A short straight trail below him, so his first circles have somewhere to go.
  for (let i = 1; i <= 12; i++) state.trail.push({ x: 0, y: (i * SPACING) / 6 });
  for (let i = 0; i < SNACKS; i++) addSnack(state, halfH, rand);
  return state;
}

function addSnack(state, halfH, rand) {
  const snack = newSnack({ halfH, head: state.head, snacks: state.snacks, obstacles: state.obstacles, time: state.time, rand });
  if (snack) state.snacks.push(snack);
}

// The body's length, counting the head.
export const length = (state) => state.body.length + 1;

// Whether there's a level after this one.
export const hasNextLevel = (state) => state.level < LEVELS.length;

// Move the game on by `dt` seconds. Returns the hues of any dots he ate.
// Once he finishes the level or bumps into something, nothing moves.
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
  state.respawns = state.respawns.filter((t) => {
    if (t > state.time) return true;
    addSnack(state, halfH, rand);
    return false;
  });

  if (length(state) >= state.goal) {
    state.won = true;
    return eaten;
  }

  const obstacle = obstacleHit(h, state.obstacles);
  if (obstacle) state.over = obstacle.kind;
  else if (tailHit(h, state.trail, state.body.length)) state.over = 'tail';
  return eaten;
}
