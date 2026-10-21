// The burst of rainbow dots when she finishes a level, with the confetti
// library swapped for a stand-in that records what it was asked to do.
import { beforeEach, describe, expect, it, vi } from 'vitest';

const confetti = vi.fn();
vi.mock('../public/game/vendor/confetti.js', () => ({ default: (...args) => confetti(...args) }));
const { RAINBOW, burstOrigin, dotBurst } = await import('../public/game/burst.js');

const fakeWindow = () => ({ innerWidth: 800, innerHeight: 600, setTimeout: (fn) => fn() });

// mockClear (not mockReset), then a fresh do-nothing confetti for each test.
beforeEach(() => {
  confetti.mockClear();
  confetti.mockImplementation(() => {});
});

describe('burstOrigin', () => {
  it('turns a spot on the page into fractions of the window', () => {
    expect(burstOrigin({ x: 200, y: 450 }, 800, 600)).toEqual({ x: 0.25, y: 0.75 });
  });

  it('keeps a spot past the edge of the window inside it', () => {
    expect(burstOrigin({ x: -50, y: 900 }, 800, 600)).toEqual({ x: 0, y: 1 });
  });

  it('uses the middle of the window when there is no spot', () => {
    expect(burstOrigin(null, 800, 600)).toEqual({ x: 0.5, y: 0.5 });
    expect(burstOrigin({ x: 1, y: 1 }, 0, 0)).toEqual({ x: 0.5, y: 0.5 });
  });
});

describe('dotBurst', () => {
  it('puffs a few rainbow dots out of her head for a level', () => {
    dotBurst({ x: 400, y: 300 }, { win: fakeWindow() });
    expect(confetti).toHaveBeenCalledTimes(1);
    const [options] = confetti.mock.calls[0];
    expect(options).toMatchObject({ origin: { x: 0.5, y: 0.5 }, colors: RAINBOW, shapes: ['circle'], spread: 360, disableForReducedMotion: true });
    expect(options.particleCount).toBeLessThan(50);
  });

  it('bursts much bigger, in three waves, for beating the last level', () => {
    dotBurst({ x: 400, y: 300 }, { big: true, win: fakeWindow() });
    expect(confetti).toHaveBeenCalledTimes(3);
    const total = confetti.mock.calls.reduce((sum, [o]) => sum + o.particleCount, 0);
    expect(total).toBeGreaterThan(400);
  });

  it('never breaks the game if the confetti fails', () => {
    confetti.mockImplementation(() => {
      throw new Error('no canvas');
    });
    expect(() => dotBurst({ x: 1, y: 1 }, { win: fakeWindow() })).not.toThrow();
  });
});
