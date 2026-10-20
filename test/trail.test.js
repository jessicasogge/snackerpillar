import { describe, expect, it } from 'vitest';
import { extendTrail, pointAlong, spotsAlong, trailLength, trimTrail } from '../public/game/trail.js';

// Trails are oldest point first, with the head's spot last.

describe('extendTrail', () => {
  it("adds the head's spot to the end once she has moved far enough", () => {
    const trail = [{ x: 0, y: 0 }];
    extendTrail(trail, 0.1, 0);
    expect(trail).toEqual([{ x: 0, y: 0 }, { x: 0.1, y: 0 }]);
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
  // Head at x = 0.5, oldest point at x = 0.
  const trail = () => [0, 1, 2, 3, 4, 5].map((x) => ({ x: x / 10, y: 0 }));

  it('drops the points further back than the body needs', () => {
    const t = trail();
    trimTrail(t, 0.25, 0);
    // Keeps the first point past the cut, so the tail still has somewhere to sit.
    expect(t.map((p) => p.x)).toEqual([0.2, 0.3, 0.4, 0.5]);
  });

  it('waits until there are enough points to drop, then drops them all at once', () => {
    const t = trail();
    trimTrail(t, 0.25, 3);
    expect(t).toHaveLength(6); // only 2 to drop: not yet
    const long = Array.from({ length: 100 }, (_, i) => ({ x: i / 100, y: 0 }));
    trimTrail(long, 0.25, 64);
    expect(long).toHaveLength(27); // 0.25 back from the head, plus the point past it
    expect(long.at(-1)).toEqual({ x: 0.99, y: 0 });
  });

  it('leaves a trail that is already short enough alone', () => {
    const t = [{ x: 0, y: 0 }, { x: 0.1, y: 0 }];
    trimTrail(t, 1, 0);
    expect(t).toHaveLength(2);
  });
});

describe('pointAlong', () => {
  // The head at (1, 1), with the trail going back down to (1, 0) and left to (0, 0).
  const trail = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }];

  it('finds a spot partway along the first stretch back from the head', () => {
    expect(pointAlong(trail, 0.25)).toEqual({ x: 1, y: 0.75 });
  });

  it('follows the trail around a corner', () => {
    const p = pointAlong(trail, 1.5);
    expect(p.x).toBeCloseTo(0.5);
    expect(p.y).toBeCloseTo(0);
  });

  it('is the head at no distance', () => {
    expect(pointAlong(trail, 0)).toEqual({ x: 1, y: 1 });
  });

  it('stops at the far end of a trail that is too short', () => {
    expect(pointAlong(trail, 5)).toEqual({ x: 0, y: 0 });
  });

  it('handles two points in the same spot', () => {
    expect(pointAlong([{ x: 0.3, y: 0.3 }, { x: 0.3, y: 0.3 }], 0.1)).toEqual({ x: 0.3, y: 0.3 });
  });

  it('returns a copy, so moving the trail later does not move the spot', () => {
    const t = [{ x: 0, y: 0 }];
    const p = pointAlong(t, 1);
    t[0].x = 9;
    expect(p.x).toBe(0);
  });
});

describe('spotsAlong', () => {
  // A winding trail of short steps, head last.
  const winding = Array.from({ length: 400 }, (_, i) => ({ x: Math.cos(i / 30) * 0.5 + i / 800, y: Math.sin(i / 21) * 0.4 }));

  it('finds the same spots as looking each one up on its own', () => {
    const spots = spotsAlong(winding, 0.0765, 20);
    expect(spots).toHaveLength(20);
    spots.forEach((s, i) => {
      const p = pointAlong(winding, (i + 1) * 0.0765);
      expect(s.x).toBeCloseTo(p.x, 9);
      expect(s.y).toBeCloseTo(p.y, 9);
    });
  });

  it('stops where the trail runs out', () => {
    const spots = spotsAlong([{ x: 0, y: 0 }, { x: 0.25, y: 0 }], 0.1, 5);
    expect(spots.map((s) => +s.x.toFixed(9))).toEqual([0.15, 0.05]);
  });

  it('counts a circle sitting exactly at the far end', () => {
    expect(spotsAlong([{ x: 0, y: 0 }, { x: 0.2, y: 0 }], 0.1, 5)).toHaveLength(2);
  });

  it('finds several spots on one long straight stretch', () => {
    expect(spotsAlong([{ x: 0, y: 0 }, { x: 1, y: 0 }], 0.25, 3).map((s) => s.x)).toEqual([0.75, 0.5, 0.25]);
  });

  it('is empty for a trail that is just the head', () => {
    expect(spotsAlong([{ x: 0, y: 0 }], 0.1, 3)).toEqual([]);
  });
});

describe('trailLength', () => {
  it('adds up the trail from the head to its far end', () => {
    expect(trailLength([{ x: 0, y: 0 }, { x: 0.3, y: 0 }, { x: 0.3, y: 0.4 }])).toBeCloseTo(0.7);
  });

  it('is 0 for a trail that is just the head', () => {
    expect(trailLength([{ x: 0.2, y: 0.2 }])).toBe(0);
  });
});
