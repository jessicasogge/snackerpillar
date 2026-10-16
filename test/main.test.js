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

const page = readFileSync(resolve(__dirname, '../public/index.html'), 'utf8');

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

// Grow him to one circle short of the goal, then feed him the last dot.
function win(game) {
  game.state.obstacles = [];
  game.state.body = Array.from({ length: game.state.goal - 2 }, () => ({ hue: 0, born: -1 }));
  game.state.snacks = [{ x: game.state.head.x, y: game.state.head.y - 0.06, r: 0.02, hue: 90, born: 0, eatenAt: null }];
  game.state.head.dir = -Math.PI / 2;
  game.tick(0.05);
  vi.advanceTimersByTime(WIN_DELAY_MS);
}

// Run him into a rock or a mushroom right in front of him.
function bump(game, kind = 'rock') {
  game.state.snacks = [];
  game.state.obstacles = [{ x: game.state.head.x, y: game.state.head.y - 0.1, r: 0.07, kind, lumps: [1, 1, 1], turn: 0 }];
  game.state.head.dir = -Math.PI / 2;
  game.keys.add('up');
  game.tick(0.05);
  vi.advanceTimersByTime(GAME_OVER_DELAY_MS);
}

// Win levels until he's on `level`.
function reach(game, level) {
  while (game.state.level < level) {
    win(game);
    click('play-again');
  }
}

describe('the page', () => {
  it('starts on level 1 with a one-circle caterpillar and no pop-up', () => {
    startGame();
    expect(text('level')).toBe('Level 1');
    expect(text('count')).toBe('1');
    expect(text('unit')).toBe('/ 15 circles');
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

  it('only mentions the arrow keys and dragging in the hint', () => {
    const hint = document.querySelector('.hint').textContent;
    expect(hint).toMatch(/arrow keys/);
    expect(hint).toMatch(/10 levels/);
    expect(hint).not.toMatch(/WASD|\bW\b/);
  });
});

describe('the length counter', () => {
  it('counts each dot he eats', () => {
    const game = startGame();
    game.state.obstacles = [];
    game.state.snacks = [{ x: 0, y: -0.06, r: 0.02, hue: 50, born: 0, eatenAt: null }];
    game.tick(0.05);
    expect(text('count')).toBe('2');
    expect(text('unit')).toBe('/ 15 circles');
  });
});

describe('winning a level', () => {
  it('waits a moment for the last circle to pop in, then shows the pop-up', () => {
    const game = startGame();
    win(game);
    expect(banner().hidden).toBe(false);
    expect(text('banner-title')).toBe('Level 1 complete!');
    expect(text('banner-message')).toBe('He grew to 15 circles long!');
    expect(text('play-again')).toBe('Play level 2');
    expect(document.getElementById('start-over').hidden).toBe(true);
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

  it('goes on to the next level, with one more obstacle and a longer goal', () => {
    const game = startGame();
    win(game);
    click('play-again');
    expect(banner().hidden).toBe(true);
    expect(text('level')).toBe('Level 2');
    expect(text('unit')).toBe('/ 20 circles');
    expect(text('count')).toBe('1');
    expect(game.state.obstacles).toHaveLength(4);
  });

  it('goes all the way up to level 10, played to 60 circles', () => {
    const game = startGame();
    reach(game, 10);
    expect(text('level')).toBe('Level 10');
    expect(text('unit')).toBe('/ 60 circles');
    expect(game.state.obstacles).toHaveLength(12);
  });

  it('celebrates beating level 10, then starts again from level 1', () => {
    const game = startGame();
    reach(game, 10);
    win(game);
    expect(text('banner-title')).toBe('You won!');
    expect(text('banner-message')).toBe('You beat all 10 levels with a caterpillar 60 circles long!');
    expect(text('play-again')).toBe('Play again');
    click('play-again');
    expect(text('level')).toBe('Level 1');
    expect(text('unit')).toBe('/ 15 circles');
  });
});

describe('game over', () => {
  it('shows a pop-up saying what he bumped into, after a moment to see it', () => {
    const game = startGame();
    game.state.snacks = [];
    game.state.obstacles = [{ x: 0, y: -0.1, r: 0.07, kind: 'mushroom' }];
    game.keys.add('up');
    game.tick(0.05);
    expect(banner().hidden).toBe(true); // his eyes go dizzy first
    vi.advanceTimersByTime(GAME_OVER_DELAY_MS);
    expect(banner().hidden).toBe(false);
    expect(text('banner-title')).toBe('Game over');
    expect(text('banner-message')).toBe('Bonk! He ran into a mushroom.');
    expect(text('play-again')).toBe('Try level 1 again');
  });

  it("doesn't offer Start over on level 1, where it would just be trying again", () => {
    bump(startGame());
    expect(document.getElementById('start-over').hidden).toBe(true);
  });

  it('tries the same level again', () => {
    const game = startGame();
    reach(game, 3);
    bump(game);
    expect(text('play-again')).toBe('Try level 3 again');
    click('play-again');
    expect(game.state.level).toBe(3);
    expect(game.state.over).toBeNull();
    expect(text('count')).toBe('1');
    expect(banner().hidden).toBe(true);
  });

  it('offers Start over past level 1, which goes back to level 1', () => {
    const game = startGame();
    reach(game, 2);
    bump(game);
    expect(document.getElementById('start-over').hidden).toBe(false);
    click('start-over');
    expect(game.state.level).toBe(1);
    expect(text('level')).toBe('Level 1');
  });

  it('says when he ran into his own tail', () => {
    const game = startGame();
    game.state.snacks = [];
    game.state.obstacles = [];
    game.state.over = null;
    game.tick(0.05);
    // Make the next step a tail bump: his trail runs down and back up to his
    // head, so the far end of his 9-circle body sits right on it.
    game.state.body = Array.from({ length: 8 }, () => ({ hue: 0, born: -1 }));
    game.state.trail = Array.from({ length: 60 }, (_, i) => ({ x: game.state.head.x, y: game.state.head.y + (i < 30 ? i : 60 - i) * 0.01 }));
    game.tick(0.01);
    vi.advanceTimersByTime(GAME_OVER_DELAY_MS);
    expect(text('banner-message')).toBe('Bonk! He ran into his own tail.');
  });

  it("doesn't remember a best score", () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    bump(startGame());
    expect(setItem).not.toHaveBeenCalled();
    expect(document.body.textContent).not.toMatch(/best/i);
  });
});

describe('Restart level', () => {
  it('starts the level he is on over', () => {
    const game = startGame();
    reach(game, 2);
    game.state.body.push({ hue: 0, born: 0 });
    click('restart');
    expect(game.state.level).toBe(2);
    expect(game.state.body).toHaveLength(0);
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

  it('moves him like a trackpad when you drag on the grass', () => {
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
