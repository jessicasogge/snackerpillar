import { describe, expect, it } from 'vitest';
import { CELL_R } from '../public/game/config.js';
import { keepInField, newSnack, nextKind, placeObstacles } from '../public/game/field.js';
import { seeded } from '../public/game/draw.js';

const HALF_H = 0.75;

describe('keepInField', () => {
  it('leaves her alone in the middle of the field', () => {
    const head = { x: 0.2, y: -0.1, dir: 1 };
    keepInField(head, HALF_H);
    expect(head).toEqual({ x: 0.2, y: -0.1, dir: 1 });
  });

  it("stops her at the right edge without turning her around", () => {
    const head = { x: 1.2, y: 0, dir: 0 };
    keepInField(head, HALF_H);
    expect(head.x).toBeCloseTo(1 - CELL_R * 1.2);
    expect(head.dir).toBe(0);
  });

  it("stops her at the bottom edge without turning her around", () => {
    const head = { x: 0, y: 2, dir: Math.PI / 2 };
    keepInField(head, HALF_H);
    expect(head.y).toBeCloseTo(HALF_H - CELL_R * 1.2);
    expect(head.dir).toBe(Math.PI / 2);
  });

  it('lets her slide along an edge', () => {
    const head = { x: -1.5, y: 0.3, dir: 2.5 };
    keepInField(head, HALF_H);
    expect(head.x).toBeCloseTo(-(1 - CELL_R * 1.2));
    expect(head.y).toBe(0.3);
  });

  it('holds her in a corner', () => {
    const head = { x: 3, y: -3, dir: -0.8 };
    keepInField(head, HALF_H);
    expect(head.x).toBeCloseTo(1 - CELL_R * 1.2);
    expect(head.y).toBeCloseTo(-(HALF_H - CELL_R * 1.2));
  });
});

describe('placeObstacles', () => {
  // More than any level has, to check they still fit without crowding.
  const obstacles = placeObstacles(HALF_H, 7, seeded(42));

  it('places as many rocks and mushrooms as asked', () => {
    expect(obstacles).toHaveLength(7);
    for (const o of obstacles) expect(['rock', 'mushroom']).toContain(o.kind);
  });

  it('keeps them all on the field', () => {
    for (const o of obstacles) {
      expect(Math.abs(o.x) + o.r).toBeLessThanOrEqual(1);
      expect(Math.abs(o.y) + o.r).toBeLessThanOrEqual(HALF_H);
    }
  });

  it('keeps them clear of where she starts', () => {
    for (const o of obstacles) {
      expect(Math.hypot(o.x, o.y)).toBeGreaterThan(0.42 + o.r);
      expect(Math.abs(o.x) < 0.15 + o.r && o.y > 0).toBe(false);
    }
  });

  it('leaves room to get between them', () => {
    for (const a of obstacles) {
      for (const b of obstacles) {
        if (a !== b) expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(a.r + b.r + 0.22);
      }
    }
  });

  it('gives up on ones it cannot fit rather than looping forever', () => {
    expect(placeObstacles(0.2, 3, () => 0.5)).toEqual([]);
  });

  it('squeezes them closer together when the field is crowded, rather than leaving any out', () => {
    const crowded = placeObstacles(HALF_H, 12, seeded(8));
    expect(crowded).toHaveLength(12);
    for (const o of crowded) expect(Math.hypot(o.x, o.y)).toBeGreaterThan(0.42 + o.r);
  });

  it('keeps as many as it could fit when it cannot fit them all', () => {
    // A field barely taller than the start area: only a few fit beside her.
    const placed = placeObstacles(0.2, 30, seeded(5));
    expect(placed.length).toBeGreaterThan(0);
    expect(placed.length).toBeLessThan(30);
  });
});

describe('newSnack', () => {
  const head = { x: 0, y: 0 };
  const obstacles = [{ x: 0.5, y: 0.3, r: 0.08 }];

  it('makes a colored dot clear of the head, the other dots and the obstacles', () => {
    const rand = seeded(3);
    const snacks = [];
    for (let i = 0; i < 12; i++) snacks.push(newSnack({ halfH: HALF_H, head, snacks, obstacles, time: 2, rand }));
    for (const s of snacks) {
      expect(s).not.toBeNull();
      expect(Math.hypot(s.x, s.y)).toBeGreaterThan(0.3);
      expect(Math.hypot(s.x - 0.5, s.y - 0.3)).toBeGreaterThan(0.08 + 0.07);
      expect(s.hue).toBeGreaterThanOrEqual(0);
      expect(s.hue).toBeLessThan(360);
      expect(s.born).toBe(2);
      expect(s.eatenAt).toBeNull();
    }
  });

  it('returns null when there is nowhere to put one', () => {
    // Every try lands in the middle, right on top of the head.
    expect(newSnack({ halfH: HALF_H, head, snacks: [], obstacles: [], time: 0, rand: () => 0.5 })).toBeNull();
  });
});

describe('rocks and mushrooms', () => {
  const count = (obstacles, kind) => obstacles.filter((o) => o.kind === kind).length;
  const rock = { kind: 'rock' };
  const mushroom = { kind: 'mushroom' };

  it('makes the next one whichever kind there are fewer of', () => {
    expect(nextKind([rock, rock, mushroom])).toBe('mushroom');
    expect(nextKind([mushroom, rock, mushroom])).toBe('rock');
  });

  it('picks either at random when there are as many of each', () => {
    expect(nextKind([], () => 0.2)).toBe('rock');
    expect(nextKind([rock, mushroom], () => 0.8)).toBe('mushroom');
  });

  it('puts 2 of one and 1 of the other on level 1, every time', () => {
    for (let seed = 1; seed <= 300; seed++) {
      const placed = placeObstacles(HALF_H, 3, seeded(seed));
      expect([count(placed, 'rock'), count(placed, 'mushroom')].sort()).toEqual([1, 2]);
    }
  });

  it('evens up the kept ones from the level before', () => {
    const kept = [
      { x: 0.8, y: 0.5, r: 0.06, kind: 'rock', lumps: [1], turn: 0 },
      { x: -0.8, y: 0.5, r: 0.06, kind: 'rock', lumps: [1], turn: 0 },
      { x: 0.8, y: -0.5, r: 0.06, kind: 'mushroom', lumps: [1], turn: 0 },
    ];
    const placed = placeObstacles(HALF_H, 4, seeded(3), null, kept);
    expect(placed.slice(0, 3)).toEqual(kept);
    expect(placed[3].kind).toBe('mushroom');
  });
});
