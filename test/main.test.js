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

// Win levels until she's on `level` (at most 5 tries, so a mistake here
// fails the test rather than looping forever).
function reach(game, level) {
  for (let tries = 0; game.state.level < level; tries++) {
    if (tries >= 5) throw new Error(`couldn't reach level ${level}`);
    win(game);
    click('play-again');
  }
}

describe('the page', () => {
  it('starts on level 1 with a two-circle caterpillar and no pop-up', () => {
    startGame();
    expect(text('level')).toBe('Level 1');
    expect(text('count')).toBe('2');
    expect(text('unit')).toBe('/ 20 circles');
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
    expect(hint.textContent).toMatch(/all 5 levels/);
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
    expect(text('count')).toBe('3');
    expect(text('unit')).toBe('/ 20 circles');
  });
});

describe('winning a level', () => {
  it('waits a moment for the last circle to pop in, then shows the pop-up', () => {
    const game = startGame();
    win(game);
    expect(banner().hidden).toBe(false);
    expect(text('banner-title')).toBe('Level 1 complete!');
    expect(text('banner-message')).toBe("She's 20 circles long! Next, grow her to 30.");
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

  it('goes on to the next level keeping all her circles, with one more obstacle and 10 more to grow', () => {
    const game = startGame();
    win(game);
    const hues = game.state.body.map((c) => c.hue);
    click('play-again');
    expect(banner().hidden).toBe(true);
    expect(text('level')).toBe('Level 2');
    expect(text('count')).toBe('20');
    expect(text('unit')).toBe('/ 30 circles');
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

  it('goes up to level 5, played to 60 circles', () => {
    const game = startGame();
    reach(game, 5);
    expect(text('level')).toBe('Level 5');
    expect(text('count')).toBe('50');
    expect(text('unit')).toBe('/ 60 circles');
    expect(game.state.obstacles).toHaveLength(7);
  });

  it('celebrates beating level 5, then starts again from level 1 with 2 circles', () => {
    const game = startGame();
    reach(game, 5);
    win(game);
    expect(text('banner-title')).toBe('You won!');
    expect(text('banner-message')).toBe('You beat all 5 levels with a caterpillar 60 circles long!');
    expect(text('play-again')).toBe('Play again');
    click('play-again');
    expect(text('level')).toBe('Level 1');
    expect(text('count')).toBe('2');
    expect(text('unit')).toBe('/ 20 circles');
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
    expect(text('level')).toBe('Level 1');
    expect(text('count')).toBe('2');
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
    game.state.trail = Array.from({ length: 60 }, (_, i) => ({ x: game.state.head.x, y: game.state.head.y + (i < 30 ? i : 60 - i) * 0.01 }));
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

describe('Start over', () => {
  it('goes back to level 1 with 2 circles from any level', () => {
    const game = startGame();
    reach(game, 2);
    expect(text('restart')).toBe('Start over');
    click('restart');
    expect(game.state.level).toBe(1);
    expect(game.state.body).toHaveLength(1);
    expect(text('count')).toBe('2');
  });

  it("cancels a pop-up that hasn't come up yet", () => {
    const game = startGame();
    game.state.snacks = [];
    game.state.obstacles = [{ x: 0, y: -0.1, r: 0.07, kind: 'rock', lumps: [1, 1, 1], turn: 0 }];
    game.keys.add('up');
    game.tick(0.05);
    click('restart');
    vi.advanceTimersByTime(GAME_OVER_DELAY_MS);
    expect(banner().hidden).toBe(true);
    expect(game.state.over).toBeNull();
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
