import { describe, expect, it } from 'vitest';
import { CELL_R, LEVELS, RESPAWN_SECONDS, SPACING, START_HUE } from '../public/game/config.js';
import { seeded } from '../public/game/draw.js';
import { hasNextLevel, herPoints, length, newGame, step } from '../public/game/game.js';
import { trailLength } from '../public/game/trail.js';
import { placeObstacles } from '../public/game/field.js';

const HALF_H = 0.75;
const idle = () => ({ keys: new Set(), drag: { x: 0, y: 0 }, halfH: HALF_H });

// A game with no obstacles and one dot right in front of her face.
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

  it('starts in the middle with her head and one purple circle behind it', () => {
    expect(length(state)).toBe(2);
    expect(state.body).toEqual([{ hue: START_HUE, born: expect.any(Number) }]);
    expect(state.head).toMatchObject({ x: 0, y: 0 });
    expect(state.over).toBeNull();
  });

  it('scatters dots and obstacles', () => {
    expect(state.snacks).toHaveLength(12);
    expect(state.obstacles).toHaveLength(3);
  });

  it('starts on level 1', () => {
    expect(state.level).toBe(1);
    expect(state.won).toBe(false);
  });
});

describe('levels', () => {
  it.each([
    [1, 3, 20],
    [2, 4, 40],
    [3, 5, 60],
    [4, 6, 80],
    [5, 7, 100],
    [6, 8, 120],
    [7, 9, 140],
    [8, 10, 160],
  ])('level %i has %i obstacles and is played to %i circles', (level, obstacles, goal) => {
    const state = newGame({ halfH: HALF_H, level, rand: seeded(level) });
    expect(state.obstacles).toHaveLength(obstacles);
    expect(state.goal).toBe(goal);
  });

  it('has eight levels, with a next one after every level but the last', () => {
    expect(LEVELS).toHaveLength(8);
    for (let level = 1; level <= 7; level++) expect(hasNextLevel(newGame({ halfH: HALF_H, level }))).toBe(true);
    expect(hasNextLevel(newGame({ halfH: HALF_H, level: 8 }))).toBe(false);
  });

  it('always fits every obstacle, even on the most crowded level, on a wide or a square field', () => {
    for (const halfH of [0.75, 1]) {
      for (let seed = 1; seed <= 200; seed++) {
        expect(newGame({ halfH, level: 8, rand: seeded(seed) }).obstacles).toHaveLength(10);
      }
    }
  });

  it('finishes the level when she grows to the goal', () => {
    const state = gameWithSnackAhead();
    state.body = Array.from({ length: state.goal - 2 }, () => ({ hue: 0, born: -1 }));
    step(state, { ...idle(), dt: 0.05 });
    expect(length(state)).toBe(20);
    expect(state.won).toBe(true);
    expect(state.over).toBeNull();
  });

  it("isn't finished one circle short of the goal", () => {
    const state = gameWithSnackAhead();
    state.body = Array.from({ length: state.goal - 3 }, () => ({ hue: 0, born: -1 }));
    step(state, { ...idle(), dt: 0.05 });
    expect(length(state)).toBe(19);
    expect(state.won).toBe(false);
  });

  it('counts the win even if she reaches the goal right next to a rock', () => {
    const state = gameWithSnackAhead();
    state.body = Array.from({ length: state.goal - 2 }, () => ({ hue: 0, born: -1 }));
    state.obstacles = [{ x: 0, y: -0.12, r: 0.07, kind: 'rock' }];
    step(state, { ...idle(), dt: 0.05 });
    expect(state.won).toBe(true);
    expect(state.over).toBeNull();
  });

  it('holds still once the level is finished', () => {
    const state = gameWithSnackAhead();
    state.won = true;
    const before = JSON.stringify(state);
    expect(step(state, { ...idle(), dt: 0.05 })).toEqual([]);
    expect(JSON.stringify(state)).toBe(before);
  });
});

describe('starting the next level', () => {
  // Finish level 1 after crawling a winding path, 20 circles long.
  function finishedLevel1(seed = 6, halfH = HALF_H) {
    const rand = seeded(seed);
    const state = newGame({ halfH, rand });
    state.obstacles = [];
    state.snacks = [];
    state.body = Array.from({ length: 19 }, (_, i) => ({ hue: i * 15, born: -1 }));
    const dirs = ['left', 'up', 'right', 'down'];
    // Ignore any bumps on the way, and don't stop at the level's goal: this
    // only lays her out along a path.
    state.goal = Infinity;
    for (let i = 0; i < 160; i++) {
      state.over = null;
      step(state, { ...idle(), halfH, keys: new Set([dirs[Math.floor(i / 25) % 4]]), dt: 0.03 });
    }
    state.over = null;
    state.won = true;
    return state;
  }

  it('starts her exactly where she was, facing the same way', () => {
    const done = finishedLevel1();
    const next = newGame({ halfH: HALF_H, level: 2, from: done, rand: seeded(1) });
    expect(next.head).toEqual(done.head);
    expect(next.trail).toEqual(done.trail);
  });

  it('keeps all her circles, in their colors and in the same places', () => {
    const done = finishedLevel1();
    const next = newGame({ halfH: HALF_H, level: 2, from: done, rand: seeded(1) });
    expect(length(next)).toBe(20);
    expect(next.body.map((c) => c.hue)).toEqual(done.body.map((c) => c.hue));
    expect(herPoints(next)).toEqual(herPoints(done));
    expect(next.goal).toBe(40);
  });

  it('shows every circle from the start', () => {
    const done = finishedLevel1();
    const next = newGame({ halfH: HALF_H, level: 2, from: done, rand: seeded(1) });
    expect(trailLength(next.trail)).toBeGreaterThanOrEqual(next.body.length * SPACING);
  });

  it('keeps the rocks and mushrooms where they were, and adds one more', () => {
    const done = finishedLevel1();
    done.obstacles = placeObstacles(HALF_H, 3, seeded(2), { points: herPoints(done), head: done.head });
    const next = newGame({ halfH: HALF_H, level: 2, from: done, rand: seeded(1) });
    expect(next.obstacles).toHaveLength(4);
    expect(next.obstacles.slice(0, 3)).toEqual(done.obstacles);
    const added = next.obstacles[3];
    for (const o of done.obstacles) expect(Math.hypot(added.x - o.x, added.y - o.y)).toBeGreaterThan(added.r + o.r);
  });

  it('keeps the dots where they were, without popping them in again', () => {
    const done = finishedLevel1();
    done.snacks = [
      { x: 0.7, y: 0.5, r: 0.02, hue: 10, born: 0.5, eatenAt: null },
      { x: -0.8, y: -0.6, r: 0.016, hue: 200, born: 1, eatenAt: null },
    ];
    const next = newGame({ halfH: HALF_H, level: 2, from: done, rand: seeded(1) });
    expect(next.snacks.map(({ x, y, r, hue }) => ({ x, y, r, hue }))).toEqual(done.snacks.map(({ x, y, r, hue }) => ({ x, y, r, hue })));
    for (const s of next.snacks) expect(s.born).toBeLessThan(0);
  });

  it('brings back the dot she just ate on its usual timer', () => {
    const done = finishedLevel1();
    done.time = 40;
    done.snacks = [{ x: 0.7, y: 0.5, r: 0.02, hue: 10, born: 0, eatenAt: 39.9 }];
    done.respawns = [39.9 + RESPAWN_SECONDS];
    const next = newGame({ halfH: HALF_H, level: 2, from: done, rand: seeded(1) });
    expect(next.snacks).toHaveLength(0); // the eaten one is gone
    for (let t = 0; t < RESPAWN_SECONDS; t += 0.05) step(next, { ...idle(), dt: 0.05 });
    expect(next.snacks).toHaveLength(1);
  });

  it("doesn't put the new obstacle on top of a dot", () => {
    for (let seed = 1; seed <= 30; seed++) {
      const done = finishedLevel1(seed);
      done.snacks = Array.from({ length: 12 }, (_, i) => ({ x: -0.9 + (i % 6) * 0.36, y: i < 6 ? -0.6 : 0.6, r: 0.022, hue: 0, born: 0, eatenAt: null }));
      const next = newGame({ halfH: HALF_H, level: 2, from: done, rand: seeded(seed) });
      for (const o of next.obstacles) {
        for (const d of next.snacks) expect(Math.hypot(o.x - d.x, o.y - d.y)).toBeGreaterThan(o.r + d.r);
      }
    }
  });

  it("doesn't change the level she finished", () => {
    const done = finishedLevel1();
    const before = JSON.stringify(done);
    const next = newGame({ halfH: HALF_H, level: 2, from: done, rand: seeded(1) });
    next.head.x += 0.5;
    next.trail[0].x += 0.5;
    expect(JSON.stringify(done)).toBe(before);
  });

  it.each([0.75, 1])('puts every obstacle and dot clear of her, and none right ahead of her face (field %s tall)', (halfH) => {
    for (let seed = 1; seed <= 40; seed++) {
      const done = finishedLevel1(seed, halfH);
      const next = newGame({ halfH, level: 2, from: done, rand: seeded(seed) });
      expect(next.obstacles).toHaveLength(4);
      const her = herPoints(next);
      for (const o of next.obstacles) {
        for (const p of her) expect(Math.hypot(o.x - p.x, o.y - p.y)).toBeGreaterThan(o.r + CELL_R);
      }
      for (const s of next.snacks) {
        for (const p of her.slice(1)) expect(Math.hypot(s.x - p.x, s.y - p.y)).toBeGreaterThan(CELL_R);
      }
      // Crawling straight on for a moment doesn't bump into anything.
      for (let i = 0; i < 6; i++) {
        const dir = next.head.dir;
        step(next, { ...idle(), halfH, keys: new Set([Math.abs(Math.cos(dir)) > Math.abs(Math.sin(dir)) ? (Math.cos(dir) > 0 ? 'right' : 'left') : (Math.sin(dir) > 0 ? 'down' : 'up')]), dt: 0.03 });
      }
      expect(next.over === 'rock' || next.over === 'mushroom').toBe(false);
    }
  });
});

describe('moving', () => {
  it("stays put when you aren't steering her", () => {
    const state = newGame({ halfH: HALF_H, rand: seeded(4) });
    const before = { ...state.head };
    for (let i = 0; i < 100; i++) step(state, { ...idle(), dt: 0.05 });
    expect(state.head).toEqual(before);
    expect(state.over).toBeNull();
  });

  it('crawls up when you hold the up arrow', () => {
    const state = newGame({ halfH: HALF_H, rand: seeded(4) });
    state.obstacles = [];
    step(state, { ...idle(), keys: new Set(['up']), dt: 0.05 });
    expect(state.head.y).toBeLessThan(0);
  });

  it('stops at the edge of the garden instead of turning around', () => {
    const state = newGame({ halfH: HALF_H, rand: seeded(4) });
    state.obstacles = [];
    state.snacks = [];
    for (let i = 0; i < 100; i++) step(state, { ...idle(), keys: new Set(['up']), dt: 0.05 });
    expect(state.head.y).toBeCloseTo(-(HALF_H - CELL_R * 1.2));
    expect(state.head.dir).toBeCloseTo(-Math.PI / 2);
  });
});

describe('eating', () => {
  it('adds a circle in the color of the dot she ate', () => {
    const state = gameWithSnackAhead(200);
    const eaten = step(state, { ...idle(), dt: 0.05 });
    expect(eaten).toEqual([200]);
    expect(length(state)).toBe(3);
    expect(state.body.at(-1).hue).toBe(200);
  });

  it('adds each new circle to the end of her body', () => {
    const state = gameWithSnackAhead(10);
    step(state, { ...idle(), dt: 0.05 });
    state.snacks.push({ x: state.head.x, y: state.head.y - 0.06, r: 0.02, hue: 300, born: 0, eatenAt: null });
    step(state, { ...idle(), dt: 0.05 });
    expect(state.body.map((c) => c.hue)).toEqual([START_HUE, 10, 300]);
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
  it('ends when she runs into a rock', () => {
    const state = gameWithSnackAhead();
    state.snacks = [];
    state.obstacles = [{ x: 0, y: -0.1, r: 0.07, kind: 'rock' }];
    step(state, { ...idle(), keys: new Set(['up']), dt: 0.05 });
    expect(state.over).toBe('rock');
  });

  it('ends when she runs into a mushroom', () => {
    const state = gameWithSnackAhead();
    state.snacks = [];
    state.obstacles = [{ x: 0, y: -0.1, r: 0.07, kind: 'mushroom' }];
    step(state, { ...idle(), keys: new Set(['up']), dt: 0.05 });
    expect(state.over).toBe('mushroom');
  });

  it('ends when she crawls into her own body', () => {
    // Level 3, so her 13 circles aren't already long enough to finish it (60).
    const state = newGame({ halfH: HALF_H, level: 3, rand: seeded(2) });
    state.obstacles = [];
    state.snacks = [];
    state.body = Array.from({ length: 12 }, () => ({ hue: 0, born: -1 }));
    // She has just crawled around a small square loop, so her body curls back
    // to sit just in front of her head.
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
