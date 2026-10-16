import { hasNextLevel, length, newGame, step } from './game.js';
import { makeRenderer } from './draw.js';

const KEYS = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };

const BUMPED = {
  rock: 'Bonk! He ran into a rock.',
  mushroom: 'Bonk! He ran into a mushroom.',
  tail: 'Bonk! He ran into his own tail.',
};

// Wire the game to the page: input, the animation loop, the level and length
// counter, and the button under the field. Returns a few handles for tests.
export function startGame({ doc = document, win = window } = {}) {
  const canvas = doc.getElementById('field');
  const levelEl = doc.getElementById('level');
  const countEl = doc.getElementById('count');
  const unitEl = doc.getElementById('unit');
  const statusEl = doc.getElementById('status');
  const button = doc.getElementById('restart');
  const reduceMotion = win.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

  const colors = () => {
    const css = win.getComputedStyle(doc.documentElement);
    const read = (name, fallback) => css.getPropertyValue(name).trim() || fallback;
    return { light: read('--field-1', '#b8de86'), shade: read('--field-2', '#8fc566'), blade: read('--blade', 'rgba(60, 110, 40, 0.28)') };
  };
  const renderer = makeRenderer(canvas, { colors, reduceMotion, makeCanvas: () => doc.createElement('canvas') });
  let halfH = renderer.resize(win.devicePixelRatio);

  let state;
  function play(level) {
    state = newGame({ halfH, level });
    show();
  }

  // What the button does now: go on to the next level once he finishes one,
  // start again from level 1 after the last, or retry this level.
  function next() {
    if (state.won) return hasNextLevel(state) ? state.level + 1 : 1;
    return state.level;
  }

  // The level, how long he is out of how long he needs to be, and what
  // happened once the level is over.
  function show() {
    levelEl.textContent = `Level ${state.level}`;
    countEl.textContent = String(length(state));
    unitEl.textContent = `/ ${state.goal} circles`;
    if (state.won) {
      statusEl.textContent = hasNextLevel(state)
        ? `Level ${state.level} done! He grew to ${state.goal} circles.`
        : `You beat all 3 levels! He grew to ${state.goal} circles.`;
      button.textContent = hasNextLevel(state) ? 'Next level' : 'Play again';
    } else if (state.over) {
      statusEl.textContent = BUMPED[state.over];
      button.textContent = 'Try again';
    } else {
      statusEl.textContent = '';
      button.textContent = 'Start over';
    }
  }

  // Arrow keys steer.
  const keys = new Set();
  win.addEventListener('keydown', (e) => {
    const k = KEYS[e.key];
    if (!k) return;
    keys.add(k);
    e.preventDefault();
  });
  win.addEventListener('keyup', (e) => keys.delete(KEYS[e.key]));
  win.addEventListener('blur', () => keys.clear());

  // A drag anywhere on the grass moves him like a trackpad.
  let pointer = null;
  const drag = { x: 0, y: 0 };
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

  button.addEventListener('click', () => {
    keys.clear();
    drag.x = drag.y = 0;
    play(next());
    canvas.focus({ preventScroll: true });
  });

  if (win.ResizeObserver) {
    new win.ResizeObserver(() => {
      halfH = renderer.resize(win.devicePixelRatio);
    }).observe(canvas);
  }
  win.matchMedia?.('(prefers-color-scheme: dark)').addEventListener?.('change', renderer.paintLawn);

  // One frame: move the game on, update the counter if anything changed, draw.
  function tick(seconds) {
    const wasOver = state.over;
    const eaten = step(state, { dt: Math.max(0, Math.min(0.05, seconds)), keys, drag, halfH });
    if (eaten.length || state.over !== wasOver) show();
    // Once the level is over, the button is the next thing to press.
    if (state.over !== wasOver || (eaten.length && state.won)) button.focus({ preventScroll: true });
    renderer.draw(state);
  }

  let last = null;
  function frame(now) {
    tick(last === null ? 0 : (now - last) / 1000);
    last = now;
    win.requestAnimationFrame(frame);
  }

  play(1);
  win.requestAnimationFrame(frame);
  return { get state() { return state; }, tick, keys, drag };
}

if (typeof document !== 'undefined' && document.getElementById('field') && !globalThis.__SNACKERPILLAR_TEST__) {
  startGame();
}
