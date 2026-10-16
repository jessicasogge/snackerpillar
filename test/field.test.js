import { describe, expect, it } from 'vitest';
import { CELL_R } from '../public/game/config.js';
import { keepInField, newSnack, placeObstacles } from '../public/game/field.js';
import { seeded } from '../public/game/draw.js';

const HALF_H = 0.75;

describe('keepInField', () => {
  it('leaves him alone in the middle of the field', () => {
    const head = { x: 0.2, y: -0.1, dir: 1 };
    keepInField(head, HALF_H);
    expect(head).toEqual({ x: 0.2, y: -0.1, dir: 1 });
  });

  it('stops him at the right edge and turns him back left', () => {
    const head = { x: 1.2, y: 0, dir: 0 };
    keepInField(head, HALF_H);
    expect(head.x).toBeCloseTo(1 - CELL_R * 1.2);
    expect(Math.cos(head.dir)).toBeLessThan(0);
  });

  it('stops him at the bottom edge and turns him back up', () => {
    const head = { x: 0, y: 2, dir: Math.PI / 2 };
    keepInField(head, HALF_H);
    expect(head.y).toBeCloseTo(HALF_H - CELL_R * 1.2);
    expect(Math.sin(head.dir)).toBeLessThan(0);
  });

  it("doesn't turn him if he's already heading away from the edge", () => {
    const head = { x: -1.5, y: 0, dir: 0 };
    keepInField(head, HALF_H);
    expect(head.dir).toBe(0);
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

  it('keeps them clear of where he starts', () => {
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

  it('gives up on one it cannot fit rather than looping forever', () => {
    expect(placeObstacles(0.2, 3, () => 0.5)).toEqual([]);
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
