// @vitest-environment jsdom
// startGame wires the game to the page, so these tests run in jsdom, a
// simulated browser page, with a stand-in for the canvas.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

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
});

const text = (id) => document.getElementById(id).textContent;
const key = (type, k) => window.dispatchEvent(new KeyboardEvent(type, { key: k, cancelable: true }));
const pointer = (type, x, y, id = 1) => {
  const e = new Event(type, { bubbles: true });
  Object.assign(e, { pointerId: id, clientX: x, clientY: y });
  document.getElementById('field').dispatchEvent(e);
};

describe('the page', () => {
  it('starts with a one-circle caterpillar and nothing to report', () => {
    startGame();
    expect(text('count')).toBe('1');
    expect(text('unit')).toBe('circle long');
    expect(text('status')).toBe('');
    expect(text('restart')).toBe('Start over');
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
    expect(hint).not.toMatch(/WASD|\bW\b/);
  });

  it('has no popups', () => {
    expect(document.querySelector('[role="dialog"], [role="alertdialog"], .toast, .over')).toBeNull();
  });
});

describe('the length counter', () => {
  it('counts each dot he eats', () => {
    const game = startGame();
    game.state.obstacles = [];
    game.state.snacks = [{ x: 0, y: -0.06, r: 0.02, hue: 50, born: 0, eatenAt: null }];
    game.tick(0.05);
    expect(text('count')).toBe('2');
    expect(text('unit')).toBe('circles long');
  });
});

describe('game over', () => {
  it('says what he bumped into, and offers to play again', () => {
    const game = startGame();
    game.state.snacks = [];
    game.state.obstacles = [{ x: 0, y: -0.1, r: 0.07, kind: 'mushroom' }];
    game.tick(0.05);
    expect(text('status')).toBe('Bonk! He ran into a mushroom.');
    expect(text('restart')).toBe('Play again');
  });

  it('starts a fresh game from the button', () => {
    const game = startGame();
    game.state.snacks = [];
    game.state.obstacles = [{ x: 0, y: -0.1, r: 0.07, kind: 'rock', lumps: [1, 1, 1], turn: 0 }];
    game.tick(0.05);
    document.getElementById('restart').click();
    expect(game.state.over).toBeNull();
    expect(text('status')).toBe('');
    expect(text('count')).toBe('1');
    expect(text('restart')).toBe('Start over');
  });

  it("doesn't remember a best score", () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    const game = startGame();
    game.state.obstacles = [{ x: 0, y: -0.1, r: 0.07, kind: 'rock', lumps: [1, 1, 1], turn: 0 }];
    game.tick(0.05);
    expect(setItem).not.toHaveBeenCalled();
    expect(document.body.textContent).not.toMatch(/best/i);
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
