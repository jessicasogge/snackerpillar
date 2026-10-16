import { describe, expect, it } from 'vitest';
import { CELL_R, SAFE_NECK, SPACING } from '../public/game/config.js';
import { obstacleHit, tailHit, touchesSnack } from '../public/game/collide.js';

describe('touchesSnack', () => {
  const head = { x: 0, y: 0 };

  it('counts a dot touching the head', () => {
    expect(touchesSnack(head, { x: CELL_R, y: 0, r: 0.02 })).toBe(true);
  });

  it("doesn't count a dot out of reach", () => {
    expect(touchesSnack(head, { x: 0.2, y: 0, r: 0.02 })).toBe(false);
  });
});

describe('obstacleHit', () => {
  const rock = { x: 0.5, y: 0, r: 0.08, kind: 'rock' };
  const mushroom = { x: -0.5, y: 0, r: 0.08, kind: 'mushroom' };

  it('names the obstacle he ran into', () => {
    expect(obstacleHit({ x: 0.45, y: 0 }, [rock, mushroom])).toBe(rock);
    expect(obstacleHit({ x: -0.45, y: 0 }, [rock, mushroom])).toBe(mushroom);
  });

  it('is a little forgiving at the edges', () => {
    // The outlines just overlap, but not by enough to count.
    expect(obstacleHit({ x: 0.5 - 0.08 - CELL_R + 0.005, y: 0 }, [rock])).toBeNull();
  });

  it('is null when nothing is near', () => {
    expect(obstacleHit({ x: 0, y: 0 }, [rock, mushroom])).toBeNull();
  });
});

describe('tailHit', () => {
  // A straight trail going right from the head at (0, 0).
  const straight = Array.from({ length: 40 }, (_, i) => ({ x: i * 0.02, y: 0 }));

  it("doesn't count his own body when he's going straight", () => {
    expect(tailHit({ x: 0, y: 0 }, straight, 10)).toBe(false);
  });

  it('counts running into a circle further down his body', () => {
    const spot = { x: (SAFE_NECK + 3) * SPACING, y: 0.01 };
    expect(tailHit(spot, straight, 10)).toBe(true);
  });

  it('never counts the circles right behind his head', () => {
    const spot = { x: SPACING, y: 0 };
    expect(tailHit(spot, straight, SAFE_NECK)).toBe(false);
  });
});
