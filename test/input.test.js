// @vitest-environment jsdom
// Which directions show under the garden: arrow keys on a computer, dragging
// on a phone or tablet, switching to whatever the player actually uses.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { watchInputMode } from '../public/game/input.js';

let root;
beforeEach(() => {
  root = document.createElement('html');
});

// A window whose main pointer is a finger (coarse) or a mouse (fine).
function fakeWindow(coarse) {
  const win = new EventTarget();
  win.matchMedia = (query) => ({ matches: coarse && query === '(pointer: coarse)' });
  return win;
}

const mode = () => (root.classList.contains('input-touch') ? 'touch' : root.classList.contains('input-keys') ? 'keys' : null);
const pointerDown = (win, pointerType) => win.dispatchEvent(Object.assign(new Event('pointerdown'), { pointerType }));
const keyDown = (win, key) => win.dispatchEvent(Object.assign(new Event('keydown'), { key }));

describe('picking directions from the device', () => {
  it('shows the arrow keys on a computer', () => {
    watchInputMode(root, fakeWindow(false));
    expect(mode()).toBe('keys');
  });

  it('shows dragging on a phone or tablet', () => {
    watchInputMode(root, fakeWindow(true));
    expect(mode()).toBe('touch');
  });

  it('falls back to the arrow keys when the browser cannot say', () => {
    watchInputMode(root, new EventTarget());
    expect(mode()).toBe('keys');
  });
});

describe('following what the player does', () => {
  it('switches to dragging once a finger touches a touchscreen laptop', () => {
    const win = fakeWindow(false);
    watchInputMode(root, win);
    pointerDown(win, 'touch');
    expect(mode()).toBe('touch');
  });

  it('counts a pen as touch', () => {
    const win = fakeWindow(false);
    watchInputMode(root, win);
    pointerDown(win, 'pen');
    expect(mode()).toBe('touch');
  });

  it("doesn't switch on a mouse click", () => {
    const win = fakeWindow(true);
    watchInputMode(root, win);
    pointerDown(win, 'mouse');
    expect(mode()).toBe('touch');
  });

  it('switches to the arrow keys once one is pressed, say on a tablet with a keyboard', () => {
    const win = fakeWindow(true);
    watchInputMode(root, win);
    keyDown(win, 'ArrowUp');
    expect(mode()).toBe('keys');
  });

  it('ignores keys other than the arrows', () => {
    const win = fakeWindow(true);
    watchInputMode(root, win);
    keyDown(win, 'a');
    expect(mode()).toBe('touch');
  });
});

describe('the stylesheet', () => {
  const css = readFileSync(resolve(__dirname, '../public/styles.css'), 'utf8');

  it('hides the touch directions unless the device or player says otherwise', () => {
    expect(css).toMatch(/\.for-touch \{\s*display: none;/);
    expect(css).toMatch(/@media \(pointer: coarse\) \{\s*\.for-keys \{\s*display: none;/);
    expect(css).toMatch(/html\.input-touch \.for-keys,\s*html\.input-keys \.for-touch \{\s*display: none;/);
    expect(css).toMatch(/html\.input-touch \.for-touch,\s*html\.input-keys \.for-keys \{\s*display: inline;/);
  });
});

describe('a phone turned sideways', () => {
  const css = readFileSync(resolve(__dirname, '../public/styles.css'), 'utf8');
  const rules = css.slice(css.indexOf('@media (orientation: landscape) and (max-height: 520px)'));

  it('has its own layout for short, wide screens', () => {
    expect(css).toContain('@media (orientation: landscape) and (max-height: 520px)');
  });

  it('fits the garden to the height of the screen', () => {
    expect(rules).toMatch(/#field \{[^}]*height: calc\(100dvh/);
    expect(rules).toMatch(/#field \{[^}]*width: auto;/);
  });

  it('hides the title, directions and arcade link on the game page to make room', () => {
    expect(rules).toMatch(/body:not\(\.home\) h1,\s*body:not\(\.home\) \.hint,\s*body:not\(\.home\) \.arcade-link \{\s*display: none;/);
  });
});
