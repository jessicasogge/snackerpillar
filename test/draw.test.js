import { describe, expect, it } from 'vitest';
import { makeRenderer, mushroomColor, popSize, seeded } from '../public/game/draw.js';
import { LEVELS, MUSHROOM_COLORS } from '../public/game/config.js';
import { newGame } from '../public/game/game.js';

// A stand-in for a canvas's 2D context that records what was called.
function fakeContext() {
  const calls = [];
  const styles = []; // every fillStyle set, in order
  const ctx = new Proxy({}, {
    get(target, name) {
      if (name in target) return target[name];
      if (name === 'createRadialGradient') return () => ({ addColorStop() {} });
      return (...args) => calls.push([name, ...args]);
    },
    set(target, name, value) {
      target[name] = value;
      if (name === 'fillStyle') styles.push(value);
      return true;
    },
  });
  return { ctx, calls, styles };
}

function fakeCanvas(width = 600, height = 450) {
  const { ctx, calls, styles } = fakeContext();
  return { clientWidth: width, clientHeight: height, width: 0, height: 0, getContext: () => ctx, calls, styles };
}

// The first canvas the renderer makes is the lawn; the rest are the sprites
// it draws each color of circle on.
function setup(opts = {}) {
  const canvas = fakeCanvas(opts.width, opts.height);
  const lawn = fakeCanvas();
  const sprites = [];
  let made = 0;
  const renderer = makeRenderer(canvas, {
    colors: () => ({ light: '#cfc', shade: '#9c9', blade: 'green' }),
    makeCanvas: () => {
      if (made++ === 0) return lawn;
      const sprite = fakeCanvas();
      sprites.push(sprite);
      return sprite;
    },
    reduceMotion: opts.reduceMotion,
  });
  return { canvas, lawn, sprites, renderer };
}

describe('resize', () => {
  it('matches the canvas to its size on screen, sharper on high-density screens', () => {
    const { canvas, renderer } = setup();
    const halfH = renderer.resize(2);
    expect(canvas.width).toBe(1200);
    expect(canvas.height).toBe(900);
    expect(halfH).toBeCloseTo(0.75);
  });

  it("doesn't go past 2x, to keep big screens fast", () => {
    const { canvas, renderer } = setup();
    renderer.resize(4);
    expect(canvas.width).toBe(1200);
  });

  it('paints the lawn with grass and daisies', () => {
    const { lawn, renderer } = setup();
    renderer.resize(1);
    const names = lawn.calls.map((c) => c[0]);
    expect(names).toContain('fillRect');
    expect(names.filter((n) => n === 'quadraticCurveTo').length).toBeGreaterThan(100);
    expect(names.filter((n) => n === 'ellipse').length).toBe(9 * 6);
  });

  it('copes with a canvas that is not on screen yet', () => {
    const { lawn, renderer } = setup({ width: 0, height: 0 });
    expect(renderer.resize(1)).toBe(0.75);
    expect(lawn.calls).toEqual([]);
  });
});

describe('draw', () => {
  function drawn(state, opts) {
    const { canvas, renderer } = setup(opts);
    renderer.resize(1);
    canvas.calls.length = 0;
    renderer.draw(state);
    return canvas;
  }

  const state = newGame({ halfH: 0.75, rand: seeded(9) });
  state.time = 2;
  state.body = [{ hue: 120, born: 0 }, { hue: 280, born: 1.9 }];
  state.obstacles = [
    { x: 0.6, y: 0.5, r: 0.07, kind: 'rock', lumps: Array(9).fill(1), turn: 0 },
    { x: -0.6, y: 0.5, r: 0.07, kind: 'mushroom' },
  ];
  state.snacks[0].eatenAt = 1.95;

  it('draws the lawn first, then everything else on top', () => {
    const canvas = drawn(state);
    expect(canvas.calls[1][0]).toBe('drawImage');
  });

  it('colors each body circle like the dot she ate', () => {
    const { sprites, renderer } = setup();
    renderer.resize(1);
    renderer.draw(state);
    const fills = sprites.flatMap((s) => s.styles);
    expect(fills).toContain('hsl(120 72% 64%)');
    expect(fills).toContain('hsl(280 72% 64%)');
  });

  it('draws each color of circle once, then copies it', () => {
    const { canvas, sprites, renderer } = setup();
    renderer.resize(1);
    const many = { ...state, body: Array.from({ length: 30 }, (_, i) => ({ hue: i % 2 ? 120 : 280, born: -10 })), trail: [{ x: 0, y: 3 }, { x: 0, y: 0 }] };
    renderer.draw(many);
    renderer.draw(many);
    expect(sprites).toHaveLength(3); // green, purple, and her orange head
    // Every circle (and her head) is a copy of a sprite, both times.
    expect(canvas.calls.filter((c) => c[0] === 'drawImage' && c[1] !== undefined && sprites.some((s) => s === c[1]))).toHaveLength(2 * 31);
  });

  it('draws the circles again, crisp, after the garden is resized', () => {
    const { sprites, renderer } = setup();
    renderer.resize(1);
    renderer.draw(state);
    const before = sprites.length;
    renderer.resize(2);
    renderer.draw(state);
    expect(sprites.length).toBe(2 * before);
    expect(sprites.at(-1).width).toBeGreaterThan(sprites[0].width);
  });

  it('draws dizzy X eyes once the game is over', () => {
    const lines = (s) => drawn(s).calls.filter((c) => c[0] === 'lineTo').length;
    expect(lines({ ...state, over: null })).toBe(0);
    expect(lines({ ...state, over: 'rock' })).toBe(4);
  });

  it('holds still for people who prefer less motion', () => {
    const a = drawn({ ...state, time: 2 }, { reduceMotion: true }).calls;
    const b = drawn({ ...state, time: 2.3, body: state.body.map((c) => ({ ...c, born: -10 })) }, { reduceMotion: true }).calls;
    const scales = (calls) => calls.filter((c) => c[0] === 'scale').map((c) => c.slice(1));
    for (const s of scales(b)) expect(s).toEqual([1, 1]);
    expect(scales(a).length).toBeGreaterThan(0);
  });

  it("doesn't draw circles that haven't followed her out yet", () => {
    const circles = (st) => drawn(st).calls.filter((c) => c[0] === 'drawImage').length;
    const short = { ...state, body: state.body.map((c) => ({ ...c, born: -10 })), trail: [{ x: 0, y: 0.2 }, { x: 0, y: 0 }] };
    const longBody = { ...short, body: [...short.body, ...Array.from({ length: 20 }, () => ({ hue: 0, born: -10 }))] };
    expect(circles(longBody)).toBe(circles(short));
  });

  it('draws nothing before the canvas has a size', () => {
    const { canvas, renderer } = setup({ width: 0, height: 0 });
    renderer.resize(1);
    renderer.draw(state);
    expect(canvas.calls).toEqual([]);
  });
});

describe('mushroom colors', () => {
  // A color's hue (0 to 360) and lightness (0 to 1), from '#rrggbb'.
  function hsl(hex) {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const d = max - min;
    let h = 0;
    if (d) h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return { hue: (h * 60 + 360) % 360, light: (max + min) / 2 };
  }

  it('gives every level its own color', () => {
    const caps = LEVELS.map((_, i) => mushroomColor(i + 1).cap);
    expect(new Set(caps).size).toBe(LEVELS.length);
  });

  it('starts with the red toadstool on level 1', () => {
    expect(mushroomColor(1).cap).toBe('#e0483e');
  });

  it('goes round the colors again if there are more levels than colors', () => {
    expect(mushroomColor(MUSHROOM_COLORS.length + 1)).toBe(mushroomColor(1));
  });

  it('sticks to reds, browns, tans and greens', () => {
    for (const { cap } of MUSHROOM_COLORS) {
      const { hue } = hsl(cap);
      const redBrownTan = hue <= 40 || hue >= 350;
      const green = hue >= 55 && hue <= 130; // yellow-greens to forest green, short of teal
      expect(redBrownTan || green, cap).toBe(true);
    }
  });

  it('keeps the outline darker than the cap and the spots paler, so they show up', () => {
    for (const { cap, edge, spots } of MUSHROOM_COLORS) {
      expect(hsl(edge).light).toBeLessThan(hsl(cap).light);
      expect(hsl(spots).light).toBeGreaterThan(hsl(cap).light + 0.2);
    }
  });

  it("paints the mushrooms in the level's color", () => {
    const capsDrawn = (level) => {
      const { canvas, renderer } = setup();
      renderer.resize(1);
      canvas.styles.length = 0;
      const game = newGame({ halfH: 0.75, rand: seeded(9) });
      renderer.draw({ ...game, level, obstacles: [{ x: -0.6, y: 0.5, r: 0.07, kind: 'mushroom' }] });
      return canvas.styles;
    };
    expect(capsDrawn(1)).toContain(mushroomColor(1).cap);
    expect(capsDrawn(4)).toContain(mushroomColor(4).cap);
    expect(capsDrawn(4)).not.toContain(mushroomColor(1).cap);
  });
});

describe('popSize', () => {
  it('starts a new circle at nothing', () => {
    expect(popSize(0)).toBe(0);
  });

  it('overshoots a little on the way in', () => {
    expect(Math.max(...[0.25, 0.3, 0.35, 0.4].map(popSize))).toBeGreaterThan(1);
  });

  it('settles at full size', () => {
    expect(popSize(0.45)).toBe(1);
    expect(popSize(10)).toBe(1);
  });
});

describe('seeded', () => {
  it('gives the same numbers for the same seed', () => {
    const a = seeded(4);
    const b = seeded(4);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it('stays between 0 and 1', () => {
    const r = seeded(99);
    for (let i = 0; i < 1000; i++) {
      const n = r();
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThan(1);
    }
  });
});
