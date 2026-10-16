import { describe, expect, it } from 'vitest';
import { OBSTACLES, RESPAWN_SECONDS, SNACKS } from '../public/game/config.js';
import { seeded } from '../public/game/draw.js';
import { length, newGame, step } from '../public/game/game.js';

const HALF_H = 0.75;
const idle = () => ({ keys: new Set(), drag: { x: 0, y: 0 }, halfH: HALF_H });

// A game with no obstacles and one dot right in front of his face.
function gameWithSnackAhead(hue = 120) {
  const state = newGame({ halfH: HALF_H, rand: seeded(1) });
  state.obstacles = [];
  state.snacks = [{ x: 0, y: -0.06, r: 0.02, hue, born: 0, eatenAt: null }];
  return state;
}

// Corner points joined by points every 0.01 along the straight lines between them.
function densify(corners) {
  const out = [];
  for (let i = 1; i < corners.length; i++) {
    const [ax, ay] = corners[i - 1];
    const [bx, by] = corners[i];
    const steps = Math.ceil(Math.hypot(bx - ax, by - ay) / 0.01);
    for (let k = 0; k < steps; k++) out.push({ x: ax + ((bx - ax) * k) / steps, y: ay + ((by - ay) * k) / steps });
  }
  return out;
}

describe('a new game', () => {
  const state = newGame({ halfH: HALF_H, rand: seeded(5) });

  it('starts with just his head in the middle', () => {
    expect(length(state)).toBe(1);
    expect(state.head).toMatchObject({ x: 0, y: 0 });
    expect(state.over).toBeNull();
  });

  it('scatters dots and obstacles', () => {
    expect(state.snacks).toHaveLength(SNACKS);
    expect(state.obstacles).toHaveLength(OBSTACLES);
  });
});

describe('eating', () => {
  it('adds a circle in the color of the dot he ate', () => {
    const state = gameWithSnackAhead(200);
    const eaten = step(state, { ...idle(), dt: 0.05 });
    expect(eaten).toEqual([200]);
    expect(length(state)).toBe(2);
    expect(state.body[0].hue).toBe(200);
  });

  it('adds each new circle to the end of his body', () => {
    const state = gameWithSnackAhead(10);
    step(state, { ...idle(), dt: 0.05 });
    state.snacks.push({ x: state.head.x, y: state.head.y - 0.06, r: 0.02, hue: 300, born: 0, eatenAt: null });
    step(state, { ...idle(), dt: 0.05 });
    expect(state.body.map((c) => c.hue)).toEqual([10, 300]);
  });

  it('lets the eaten dot shrink away, then brings a new one back later', () => {
    const state = gameWithSnackAhead();
    step(state, { ...idle(), dt: 0.05 });
    expect(state.snacks).toHaveLength(1); // still shrinking
    for (let t = 0; t < 0.4; t += 0.05) step(state, { ...idle(), dt: 0.05 });
    expect(state.snacks).toHaveLength(0);
    for (let t = 0; t < RESPAWN_SECONDS; t += 0.05) step(state, { ...idle(), dt: 0.05 });
    expect(state.snacks).toHaveLength(1);
    expect(state.snacks[0].eatenAt).toBeNull();
  });
});

describe('game over', () => {
  it('ends when he runs into a rock', () => {
    const state = gameWithSnackAhead();
    state.snacks = [];
    state.obstacles = [{ x: 0, y: -0.1, r: 0.07, kind: 'rock' }];
    step(state, { ...idle(), dt: 0.05 });
    expect(state.over).toBe('rock');
  });

  it('ends when he runs into a mushroom', () => {
    const state = gameWithSnackAhead();
    state.snacks = [];
    state.obstacles = [{ x: 0, y: -0.1, r: 0.07, kind: 'mushroom' }];
    step(state, { ...idle(), dt: 0.05 });
    expect(state.over).toBe('mushroom');
  });

  it('ends when he crawls into his own body', () => {
    const state = newGame({ halfH: HALF_H, rand: seeded(2) });
    state.obstacles = [];
    state.snacks = [];
    state.body = Array.from({ length: 12 }, () => ({ hue: 0, born: -1 }));
    // He has just crawled around a small square loop, so his body curls back
    // to sit just in front of his head.
    state.head = { x: 0, y: 0, dir: 0 };
    state.trail = densify([[0, 0], [0, 0.15], [0.15, 0.15], [0.15, 0], [0.04, 0], [-0.3, 0]]);
    for (let i = 0; i < 10 && !state.over; i++) step(state, { ...idle(), keys: new Set(['right']), dt: 0.02 });
    expect(state.over).toBe('tail');
  });

  it('freezes everything once it is over', () => {
    const state = gameWithSnackAhead();
    state.over = 'rock';
    const before = JSON.stringify(state);
    expect(step(state, { ...idle(), dt: 0.05 })).toEqual([]);
    expect(JSON.stringify(state)).toBe(before);
  });
});
