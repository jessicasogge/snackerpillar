// @vitest-environment jsdom
// startGame wires the game to the page, so these tests run in jsdom, a
// simulated browser page, with a stand-in for the canvas.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { GAME_OVER_DELAY_MS, WIN_DELAY_MS } from '../public/game/config.js';

let startGame;
beforeAll(async () => {
  globalThis.__SNACKERPILLAR_TEST__ = true;
  ({ startGame } = await import('../public/game/main.js'));
});

const page = readFileSync(resolve(__dirname, '../public/play.html'), 'utf8');

beforeEach(() => {
  document.documentElement.innerHTML = page.replace(/^<!doctype html>/i, '');
  // jsdom has no canvas drawing, so hand out a context that ignores it all.
  const noop = new Proxy({}, {
    get: (t, name) => (name in t ? t[name] : name === 'createRadialGradient' ? () => ({ addColorStop() {} }) : () => {}),
    set: (t, name, v) => ((t[name] = v), true),
  });
  HTMLCanvasElement.prototype.getContext = () => noop;
  Object.defineProperty(HTMLCanvasElement.prototype, 'clientWidth', { configurable: true, get: () => 600 });
  Object.defineProperty(HTMLCanvasElement.prototype, 'clientHeight', { configurable: true, get: () => 450 });
  window.requestAnimationFrame = vi.fn();
  // Only the pop-up's timers; the animation frames are stubbed above.
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
});

afterEach(() => {
  vi.useRealTimers();
});

const text = (id) => document.getElementById(id).textContent;
// The line under the garden, like "Level 1 · 2 / 20 circles", in parts.
const shown = () => {
  const [, level, count, goal] = text('circle-count').match(/^Level (\d+) · (\d+) \/ (\d+) circles$/);
  return { level, count, goal };
};
const key = (type, k) => window.dispatchEvent(new KeyboardEvent(type, { key: k, cancelable: true }));
const pointer = (type, x, y, id = 1) => {
  const e = new Event(type, { bubbles: true });
  Object.assign(e, { pointerId: id, clientX: x, clientY: y });
  document.getElementById('field').dispatchEvent(e);
};

const banner = () => document.getElementById('banner');
const click = (id) => document.getElementById(id).click();

// Grow her to one circle short of the goal, then feed her the last dot.
function win(game) {
  game.state.obstacles = [];
  game.state.body = Array.from({ length: game.state.goal - 2 }, () => ({ hue: 0, born: -1 }));
  game.state.snacks = [{ x: game.state.head.x, y: game.state.head.y - 0.06, r: 0.02, hue: 90, born: 0, eatenAt: null }];
  game.state.head.dir = -Math.PI / 2;
  game.tick(0.05);
  vi.advanceTimersByTime(WIN_DELAY_MS);
}

// Run her into a rock or a mushroom right in front of her.
function bump(game, kind = 'rock') {
  game.state.snacks = [];
  game.state.obstacles = [{ x: game.state.head.x, y: game.state.head.y - 0.1, r: 0.07, kind, lumps: [1, 1, 1], turn: 0 }];
  game.state.head.dir = -Math.PI / 2;
  game.keys.add('up');
  game.tick(0.05);
  vi.advanceTimersByTime(GAME_OVER_DELAY_MS);
}

// Win levels until she's on `level` (at most 10 tries, so a mistake here
// fails the test rather than looping forever).
function reach(game, level) {
  for (let tries = 0; game.state.level < level; tries++) {
    if (tries >= 10) throw new Error(`couldn't reach level ${level}`);
    win(game);
    click('play-again');
  }
}

describe('the page', () => {
  it('starts on level 1 with a two-circle caterpillar and no pop-up', () => {
    startGame();
    expect(shown().level).toBe('1');
    expect(shown().count).toBe('2');
    expect(shown().goal).toBe('20');
    expect(banner().hidden).toBe(true);
  });

  it('starts the animation loop and keeps it going', () => {
    startGame();
    expect(window.requestAnimationFrame).toHaveBeenCalledTimes(1);
    const frame = window.requestAnimationFrame.mock.calls[0][0];
    frame(1000);
    frame(1016);
    expect(window.requestAnimationFrame).toHaveBeenCalledTimes(3);
  });

  it('goes straight from the title to the garden, with no tagline', () => {
    expect(document.querySelector('h1').nextElementSibling.classList.contains('garden')).toBe(true);
    expect(document.body.textContent).not.toMatch(/very hungry/);
  });

  it('has keyboard and touch directions in the hint, for the stylesheet to pick between', () => {
    const hint = document.querySelector('.hint');
    expect(hint.querySelector('.for-keys').textContent).toBe('Use the arrow keys to move.');
    expect(hint.querySelector('.for-touch').textContent).toMatch(/^Drag anywhere on the grass/);
    expect(hint.querySelector('.for-keys').textContent).not.toMatch(/touch|drag/i);
    expect(hint.querySelector('.for-touch').textContent).not.toMatch(/arrow|key/i);
    expect(hint.textContent).toMatch(/all 10 levels/);
    expect(hint.textContent).not.toMatch(/WASD|\bW\b/);
  });

  it('calls the caterpillar she and her, never he, him or his', () => {
    const game = startGame();
    const said = [document.body.textContent];
    for (const kind of ['rock', 'mushroom']) {
      bump(game, kind);
      said.push(text('banner-message'));
      click('play-again');
    }
    win(game);
    said.push(text('banner-message'));
    const all = said.join(' ');
    expect(all).toMatch(/\bher\b/);
    expect(all).toMatch(/\bShe\b/);
    expect(all).not.toMatch(/\b(he|him|his|himself)\b/i);
  });

  it('marks the page with the directions to show once the game starts', () => {
    startGame();
    expect(document.documentElement.classList.contains('input-keys')).toBe(true);
    key('keydown', 'ArrowUp');
    expect(document.documentElement.classList.contains('input-keys')).toBe(true);
  });
});

describe('the length counter', () => {
  it('counts each dot she eats', () => {
    const game = startGame();
    game.state.obstacles = [];
    game.state.snacks = [{ x: 0, y: -0.06, r: 0.02, hue: 50, born: 0, eatenAt: null }];
    game.tick(0.05);
    expect(shown().count).toBe('3');
    expect(shown().goal).toBe('20');
  });
});

describe('winning a level', () => {
  it('waits a moment for the last circle to pop in, then shows the pop-up', () => {
    const game = startGame();
    win(game);
    expect(banner().hidden).toBe(false);
    expect(text('banner-title')).toBe('Level 1 complete!');
    expect(text('banner-message')).toBe("She's 20 circles long! Next, grow her to 40.");
    expect(text('play-again')).toBe('Play level 2');
    expect(document.activeElement).toBe(document.getElementById('play-again'));
  });

  it("doesn't show the pop-up before the moment is up", () => {
    const game = startGame();
    game.state.obstacles = [];
    game.state.body = Array.from({ length: game.state.goal - 2 }, () => ({ hue: 0, born: -1 }));
    game.state.snacks = [{ x: 0, y: -0.06, r: 0.02, hue: 90, born: 0, eatenAt: null }];
    game.tick(0.05);
    expect(game.state.won).toBe(true);
    vi.advanceTimersByTime(WIN_DELAY_MS - 1);
    expect(banner().hidden).toBe(true);
  });

  it('goes on to the next level keeping all her circles, with one more obstacle and 20 more to grow', () => {
    const game = startGame();
    win(game);
    const hues = game.state.body.map((c) => c.hue);
    click('play-again');
    expect(banner().hidden).toBe(true);
    expect(shown().level).toBe('2');
    expect(shown().count).toBe('20');
    expect(shown().goal).toBe('40');
    expect(game.state.body.map((c) => c.hue)).toEqual(hues);
    expect(game.state.obstacles).toHaveLength(4);
  });

  it('keeps the colors of the dots she ate', () => {
    const game = startGame();
    game.state.obstacles = [];
    game.state.body = Array.from({ length: game.state.goal - 2 }, (_, i) => ({ hue: i * 10, born: -1 }));
    game.state.snacks = [{ x: 0, y: -0.06, r: 0.02, hue: 333, born: 0, eatenAt: null }];
    game.tick(0.05);
    vi.advanceTimersByTime(WIN_DELAY_MS);
    click('play-again');
    expect(game.state.body[0].hue).toBe(0);
    expect(game.state.body.at(-1).hue).toBe(333);
  });

  it('goes up to level 10, played to 200 circles', () => {
    const game = startGame();
    reach(game, 10);
    expect(shown().level).toBe('10');
    expect(shown().count).toBe('180');
    expect(shown().goal).toBe('200');
    expect(game.state.obstacles).toHaveLength(12);
  });

  it('celebrates beating level 10, then starts again from level 1 with 2 circles', () => {
    const game = startGame();
    reach(game, 10);
    win(game);
    expect(text('banner-title')).toBe('You won!');
    expect(text('banner-message')).toBe('You beat all 10 levels with a caterpillar 200 circles long!');
    expect(text('play-again')).toBe('Play again');
    click('play-again');
    expect(shown().level).toBe('1');
    expect(shown().count).toBe('2');
    expect(shown().goal).toBe('20');
  });
});

describe('celebrating', () => {
  it('bursts dots out of her head, a little one for a level', () => {
    const celebrate = vi.fn();
    const game = startGame({ celebrate });
    const field = document.getElementById('field');
    field.getBoundingClientRect = () => ({ left: 100, top: 50, width: 600, height: 450 });
    win(game);
    expect(celebrate).toHaveBeenCalledTimes(1);
    const [spot, options] = celebrate.mock.calls[0];
    expect(options.big).toBe(false);
    // Her head, turned into page pixels.
    expect(spot.x).toBeCloseTo(100 + ((game.state.head.x + 1) / 2) * 600);
    expect(spot.y).toBeCloseTo(50 + ((game.state.head.y + 0.75) / 1.5) * 450);
  });

  it('bursts big for beating the last level', () => {
    const celebrate = vi.fn();
    const game = startGame({ celebrate });
    reach(game, 10);
    celebrate.mockClear();
    win(game);
    expect(celebrate).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ big: true }));
  });

  it("doesn't burst for a bump", () => {
    const celebrate = vi.fn();
    bump(startGame({ celebrate }));
    expect(celebrate).not.toHaveBeenCalled();
  });
});

describe('the Tiny Game Arcade', () => {
  const arcade = () => document.getElementById('banner-arcade');

  it('is linked under the game', () => {
    expect(document.querySelector('.arcade-link a').href).toBe('https://jessicasogge.github.io/tiny-game-arcade/');
  });

  it('is offered in the pop-up after the last level, and only then', () => {
    const game = startGame({ celebrate: () => {} });
    win(game);
    expect(arcade().hidden).toBe(true);
    click('play-again');
    bump(game);
    expect(arcade().hidden).toBe(true);
    click('play-again');
    reach(game, 10);
    win(game);
    expect(arcade().hidden).toBe(false);
    expect(arcade().querySelector('a').href).toBe('https://jessicasogge.github.io/tiny-game-arcade/');
    click('play-again');
    win(game);
    expect(arcade().hidden).toBe(true);
  });
});

describe('game over', () => {
  it('shows a pop-up saying what she bumped into, after a moment to see it', () => {
    const game = startGame();
    game.state.snacks = [];
    game.state.obstacles = [{ x: 0, y: -0.1, r: 0.07, kind: 'mushroom' }];
    game.keys.add('up');
    game.tick(0.05);
    expect(banner().hidden).toBe(true); // her eyes go dizzy first
    vi.advanceTimersByTime(GAME_OVER_DELAY_MS);
    expect(banner().hidden).toBe(false);
    expect(text('banner-title')).toBe('Game over');
    expect(text('banner-message')).toBe('Bonk! She ran into a mushroom. Back to level 1!');
    expect(text('play-again')).toBe('Start over');
  });

  it("doesn't let you try a level again: a bump on a later level goes back to level 1", () => {
    const game = startGame();
    reach(game, 3);
    bump(game);
    expect(text('play-again')).toBe('Start over');
    expect(document.body.textContent).not.toMatch(/Try level|try again/i);
    click('play-again');
    expect(game.state.level).toBe(1);
    expect(game.state.over).toBeNull();
    expect(shown().level).toBe('1');
    expect(shown().count).toBe('2');
    expect(banner().hidden).toBe(true);
  });

  it('says when she ran into her own tail', () => {
    const game = startGame();
    game.state.snacks = [];
    game.state.obstacles = [];
    game.state.over = null;
    game.tick(0.05);
    // Make the next step a tail bump: her trail runs down and back up to her
    // head, so the far end of her 9-circle body sits right on it.
    game.state.body = Array.from({ length: 8 }, () => ({ hue: 0, born: -1 }));
    game.state.trail = Array.from({ length: 60 }, (_, i) => ({ x: game.state.head.x, y: game.state.head.y + (i < 30 ? i : 60 - i) * 0.01 })).reverse();
    game.tick(0.01);
    vi.advanceTimersByTime(GAME_OVER_DELAY_MS);
    expect(text('banner-message')).toBe('Bonk! She ran into her own tail. Back to level 1!');
  });

  it("doesn't remember a best score", () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    bump(startGame());
    expect(setItem).not.toHaveBeenCalled();
    expect(document.body.textContent).not.toMatch(/best/i);
  });
});

describe('under the garden', () => {
  it('has just the level and the counter, with no Start over button', () => {
    expect(document.getElementById('restart')).toBeNull();
    expect(document.querySelector('main > button')).toBeNull();
  });

  it('shows the level and her length on one line, like PetriPals', () => {
    startGame();
    expect(text('circle-count')).toBe('Level 1 · 2 / 20 circles');
    expect(document.getElementById('circle-count').getAttribute('aria-live')).toBe('polite');
  });
});

describe('turning the phone', () => {
  // A stand-in for the browser's ResizeObserver, so a test can say when the
  // garden has been resized.
  let resized;
  beforeEach(() => {
    window.ResizeObserver = class {
      constructor(callback) { resized = callback; }
      observe() {}
    };
  });
  afterEach(() => {
    delete window.ResizeObserver;
  });
  const sizeField = (w, h) => {
    Object.defineProperty(HTMLCanvasElement.prototype, 'clientWidth', { configurable: true, get: () => w });
    Object.defineProperty(HTMLCanvasElement.prototype, 'clientHeight', { configurable: true, get: () => h });
  };

  it('fixes the garden to the shape it first had', () => {
    startGame();
    expect(document.getElementById('field').style.aspectRatio).toBe('2 / 1.5');
  });

  it('keeps everything inside the garden after the phone is turned, even on the next level', () => {
    const game = startGame();
    sizeField(800, 300); // much wider than it is tall now
    resized();
    win(game);
    click('play-again');
    expect(game.state.level).toBe(2);
    for (const o of game.state.obstacles) expect(Math.abs(o.y) + o.r).toBeLessThanOrEqual(0.75);
    for (const d of game.state.snacks) expect(Math.abs(d.y)).toBeLessThanOrEqual(0.75);
    // And she still stops at the top edge of the same garden (her body
    // trails below her, so she crawls up, away from it).
    game.state.obstacles = [];
    game.state.snacks = [];
    game.state.head.dir = -Math.PI / 2;
    game.keys.add('up');
    for (let i = 0; i < 80 && !game.state.over; i++) game.tick(0.05);
    expect(game.state.over).toBeNull();
    expect(game.state.head.y).toBeLessThan(-0.6);
    expect(game.state.head.y).toBeGreaterThan(-0.75);
  });
});

describe('controls', () => {
  it('steers with the arrow keys', () => {
    const game = startGame();
    key('keydown', 'ArrowLeft');
    expect(game.keys.has('left')).toBe(true);
    key('keyup', 'ArrowLeft');
    expect(game.keys.has('left')).toBe(false);
  });

  it('stops the page from scrolling on arrow keys', () => {
    startGame();
    expect(key('keydown', 'ArrowDown')).toBe(false); // default prevented
    expect(key('keydown', 'a')).toBe(true);
  });

  it('lets go of every key when the window loses focus', () => {
    const game = startGame();
    key('keydown', 'ArrowUp');
    window.dispatchEvent(new Event('blur'));
    expect(game.keys.size).toBe(0);
  });

  it('lets go of keys held when a new level starts', () => {
    const game = startGame();
    win(game);
    key('keydown', 'ArrowUp');
    click('play-again');
    expect(game.keys.size).toBe(0);
  });

  it('moves her like a trackpad when you drag on the grass', () => {
    const game = startGame();
    pointer('pointerdown', 100, 100);
    pointer('pointermove', 130, 100);
    expect(game.drag.x).toBeCloseTo(30 / 300);
    pointer('pointermove', 130, 70, 2); // another finger: ignored
    expect(game.drag.y).toBe(0);
    pointer('pointerup', 130, 100);
    pointer('pointermove', 200, 100);
    expect(game.drag.x).toBeCloseTo(30 / 300);
  });

  it('forgets a drag the browser cancels', () => {
    const game = startGame();
    pointer('pointerdown', 0, 0);
    pointer('pointercancel', 0, 0);
    pointer('pointermove', 50, 0);
    expect(game.drag.x).toBe(0);
  });
});
