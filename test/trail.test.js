import { describe, expect, it } from 'vitest';
import { extendTrail, pointAlong, trimTrail } from '../public/game/trail.js';

describe('extendTrail', () => {
  it('adds the head spot to the front once he has moved far enough', () => {
    const trail = [{ x: 0, y: 0 }];
    extendTrail(trail, 0.1, 0);
    expect(trail).toEqual([{ x: 0.1, y: 0 }, { x: 0, y: 0 }]);
  });

  it('skips tiny moves, so the trail does not fill up with duplicate points', () => {
    const trail = [{ x: 0, y: 0 }];
    extendTrail(trail, 0.001, 0);
    expect(trail).toHaveLength(1);
  });

  it('starts an empty trail', () => {
    const trail = [];
    extendTrail(trail, 0.5, 0.5);
    expect(trail).toEqual([{ x: 0.5, y: 0.5 }]);
  });
});

describe('trimTrail', () => {
  it('drops the points further back than the body needs', () => {
    const trail = [0, 1, 2, 3, 4, 5].map((x) => ({ x: x / 10, y: 0 }));
    trimTrail(trail, 0.25);
    // Keeps the first point past the cut, so the tail still has somewhere to sit.
    expect(trail.map((p) => p.x)).toEqual([0, 0.1, 0.2, 0.3]);
  });

  it('leaves a trail that is already short enough alone', () => {
    const trail = [{ x: 0, y: 0 }, { x: 0.1, y: 0 }];
    trimTrail(trail, 1);
    expect(trail).toHaveLength(2);
  });
});

describe('pointAlong', () => {
  const trail = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }];

  it('finds a spot partway along the first stretch', () => {
    expect(pointAlong(trail, 0.25)).toEqual({ x: 0.25, y: 0 });
  });

  it('follows the trail around a corner', () => {
    const p = pointAlong(trail, 1.5);
    expect(p.x).toBeCloseTo(1);
    expect(p.y).toBeCloseTo(0.5);
  });

  it('stops at the end of a trail that is too short', () => {
    expect(pointAlong(trail, 5)).toEqual({ x: 1, y: 1 });
  });

  it('handles two points in the same spot', () => {
    expect(pointAlong([{ x: 0.3, y: 0.3 }, { x: 0.3, y: 0.3 }], 0)).toEqual({ x: 0.3, y: 0.3 });
  });

  it('returns a copy, so moving the trail later does not move the spot', () => {
    const t = [{ x: 0, y: 0 }];
    const p = pointAlong(t, 1);
    t[0].x = 9;
    expect(p.x).toBe(0);
  });
});
