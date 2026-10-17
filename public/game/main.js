import { GAME_OVER_DELAY_MS, LEVELS, WIN_DELAY_MS } from './config.js';
import { hasNextLevel, length, newGame, step } from './game.js';
import { makeRenderer } from './draw.js';
import { watchInputMode } from './input.js';

const KEYS = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };

const BUMPED = {
  rock: 'Bonk! She ran into a rock.',
  mushroom: 'Bonk! She ran into a mushroom.',
  tail: 'Bonk! She ran into her own tail.',
};

// Wire the game to the page: input, the animation loop, the level and length
// counter, the Start over button, and the pop-up at the end of each level.
// Returns a few handles for tests.
export function startGame({ doc = document, win = window } = {}) {
  const canvas = doc.getElementById('field');
  const levelEl = doc.getElementById('level');
  const countEl = doc.getElementById('count');
  const unitEl = doc.getElementById('unit');
  const restartButton = doc.getElementById('restart');
  const banner = doc.getElementById('banner');
  const bannerTitle = doc.getElementById('banner-title');
  const bannerMessage = doc.getElementById('banner-message');
  const playButton = doc.getElementById('play-again');
  const reduceMotion = win.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

  const colors = () => {
    const css = win.getComputedStyle(doc.documentElement);
    const read = (name, fallback) => css.getPropertyValue(name).trim() || fallback;
    return { light: read('--field-1', '#b8de86'), shade: read('--field-2', '#8fc566'), blade: read('--blade', 'rgba(60, 110, 40, 0.28)') };
  };
  const renderer = makeRenderer(canvas, { colors, reduceMotion, makeCanvas: () => doc.createElement('canvas') });
  let halfH = renderer.resize(win.devicePixelRatio);
  watchInputMode(doc.documentElement, win);

  let state;
  // Where the pop-up's button goes: the next level with the circles she has
  // now, or back to level 1 with just her first purple circle.
  let next = { level: 1 };
  let bannerTimer = null;

  const keys = new Set();
  const drag = { x: 0, y: 0 };

  function play({ level, hues }) {
    win.clearTimeout(bannerTimer);
    banner.hidden = true;
    keys.clear();
    drag.x = drag.y = 0;
    state = newGame({ halfH, level, hues });
    showCount();
    canvas.focus({ preventScroll: true });
  }

  // The level, and how long she is out of how long she needs to be.
  function showCount() {
    levelEl.textContent = `Level ${state.level}`;
    countEl.textContent = String(length(state));
    unitEl.textContent = `/ ${state.goal} circles`;
  }

  function showBanner(title, message, button) {
    bannerTitle.textContent = title;
    bannerMessage.textContent = message;
    playButton.textContent = button;
    banner.hidden = false;
    playButton.focus({ preventScroll: true });
  }

  function showWin() {
    const n = length(state);
    if (hasNextLevel(state)) {
      next = { level: state.level + 1, hues: state.body.map((c) => c.hue) };
      showBanner(`Level ${state.level} complete!`, `She's ${n} circles long! Next, grow her to ${LEVELS[state.level].goal}.`, `Play level ${next.level}`);
    } else {
      next = { level: 1 };
      showBanner('You won!', `You beat all ${LEVELS.length} levels with a caterpillar ${n} circles long!`, 'Play again');
    }
  }

  // There's no trying a level again: a bump means starting over from level 1.
  function showGameOver() {
    next = { level: 1 };
    showBanner('Game over', `${BUMPED[state.over]} Back to level 1!`, 'Start over');
  }

  // Arrow keys steer.
  win.addEventListener('keydown', (e) => {
    const k = KEYS[e.key];
    if (!k) return;
    keys.add(k);
    e.preventDefault();
  });
  win.addEventListener('keyup', (e) => keys.delete(KEYS[e.key]));
  win.addEventListener('blur', () => keys.clear());

  // A drag anywhere on the grass moves her like a trackpad.
  let pointer = null;
  canvas.addEventListener('pointerdown', (e) => {
    pointer = { id: e.pointerId, x: e.clientX, y: e.clientY };
    canvas.setPointerCapture?.(e.pointerId);
    canvas.focus({ preventScroll: true });
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!pointer || e.pointerId !== pointer.id) return;
    const unit = (canvas.clientWidth || 2) / 2;
    drag.x += (e.clientX - pointer.x) / unit;
    drag.y += (e.clientY - pointer.y) / unit;
    pointer.x = e.clientX;
    pointer.y = e.clientY;
  });
  const endDrag = (e) => {
    if (pointer && e.pointerId === pointer.id) pointer = null;
  };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);

  restartButton.addEventListener('click', () => play({ level: 1 }));
  playButton.addEventListener('click', () => play(next));

  if (win.ResizeObserver) {
    new win.ResizeObserver(() => {
      halfH = renderer.resize(win.devicePixelRatio);
    }).observe(canvas);
  }
  win.matchMedia?.('(prefers-color-scheme: dark)').addEventListener?.('change', renderer.paintLawn);

  // One frame: move the game on, update the counter, draw, and once the level
  // ends, bring up the pop-up after a moment.
  function tick(seconds) {
    const wasDone = state.over || state.won;
    const eaten = step(state, { dt: Math.max(0, Math.min(0.05, seconds)), keys, drag, halfH });
    if (eaten.length) showCount();
    if (!wasDone && state.won) bannerTimer = win.setTimeout(showWin, WIN_DELAY_MS);
    if (!wasDone && state.over) bannerTimer = win.setTimeout(showGameOver, GAME_OVER_DELAY_MS);
    renderer.draw(state);
  }

  let last = null;
  function frame(now) {
    tick(last === null ? 0 : (now - last) / 1000);
    last = now;
    win.requestAnimationFrame(frame);
  }

  play({ level: 1 });
  win.requestAnimationFrame(frame);
  return { get state() { return state; }, tick, keys, drag };
}

if (typeof document !== 'undefined' && document.getElementById('field') && !globalThis.__SNACKERPILLAR_TEST__) {
  startGame();
}
