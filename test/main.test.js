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
  it('starts on level 1 with a one-circle caterpillar and nothing to report', () => {
    startGame();
    expect(text('level')).toBe('Level 1');
    expect(text('count')).toBe('1');
    expect(text('unit')).toBe('/ 10 circles');
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
    expect(text('unit')).toBe('/ 10 circles');
  });
});

describe('game over', () => {
  it('says what he bumped into, and offers to try again', () => {
    const game = startGame();
    game.state.snacks = [];
    game.state.obstacles = [{ x: 0, y: -0.1, r: 0.07, kind: 'mushroom' }];
    game.tick(0.05);
    expect(text('status')).toBe('Bonk! He ran into a mushroom.');
    expect(text('restart')).toBe('Try again');
  });

  it('starts the same level over from the button', () => {
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

  it('retries the level he was on, not level 1', () => {
    const game = startGame();
    win(game);
    document.getElementById('restart').click(); // on to level 2
    bump(game);
    document.getElementById('restart').click();
    expect(game.state.level).toBe(2);
    expect(text('level')).toBe('Level 2');
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

// Grow him to one circle short of the goal, then feed him the last dot.
function win(game) {
  game.state.obstacles = [];
  game.state.body = Array.from({ length: game.state.goal - 2 }, () => ({ hue: 0, born: -1 }));
  game.state.snacks = [{ x: game.state.head.x, y: game.state.head.y - 0.06, r: 0.02, hue: 90, born: 0, eatenAt: null }];
  game.state.head.dir = -Math.PI / 2;
  game.tick(0.05);
}

function bump(game) {
  game.state.snacks = [];
  game.state.obstacles = [{ x: game.state.head.x, y: game.state.head.y - 0.1, r: 0.07, kind: 'rock', lumps: [1, 1, 1], turn: 0 }];
  game.tick(0.05);
}

describe('levels', () => {
  it('says the level is done and offers the next one', () => {
    const game = startGame();
    win(game);
    expect(text('count')).toBe('10');
    expect(text('status')).toBe('Level 1 done! He grew to 10 circles.');
    expect(text('restart')).toBe('Next level');
    expect(document.activeElement).toBe(document.getElementById('restart'));
  });

  it('goes on to level 2, then level 3, each with its own goal', () => {
    const game = startGame();
    win(game);
    document.getElementById('restart').click();
    expect(text('level')).toBe('Level 2');
    expect(text('unit')).toBe('/ 15 circles');
    expect(text('count')).toBe('1');
    expect(text('status')).toBe('');
    expect(game.state.obstacles).toHaveLength(3);
    win(game);
    expect(text('status')).toBe('Level 2 done! He grew to 15 circles.');
    document.getElementById('restart').click();
    expect(text('level')).toBe('Level 3');
    expect(text('unit')).toBe('/ 20 circles');
    expect(game.state.obstacles).toHaveLength(4);
  });

  it('celebrates beating level 3, then starts again from level 1', () => {
    const game = startGame();
    for (let level = 1; level <= 3; level++) {
      win(game);
      if (level < 3) document.getElementById('restart').click();
    }
    expect(text('status')).toBe('You beat all 3 levels! He grew to 20 circles.');
    expect(text('restart')).toBe('Play again');
    document.getElementById('restart').click();
    expect(text('level')).toBe('Level 1');
    expect(text('unit')).toBe('/ 10 circles');
  });

  it('restarts the current level from Start over while playing', () => {
    const game = startGame();
    win(game);
    document.getElementById('restart').click();
    game.state.body.push({ hue: 0, born: 0 });
    document.getElementById('restart').click();
    expect(game.state.level).toBe(2);
    expect(game.state.body).toHaveLength(0);
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
