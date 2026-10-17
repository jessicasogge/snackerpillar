import { describe, expect, it } from 'vitest';
import { CELL_R, SPEED } from '../public/game/config.js';
import { steer } from '../public/game/steer.js';

const noDrag = () => ({ x: 0, y: 0 });

describe('steering with the arrow keys', () => {
  it('moves her the way she faces at full speed', () => {
    const head = { dir: 0 };
    const { vx, vy } = steer(head, { keys: new Set(['right']), drag: noDrag(), dt: 0.1 });
    expect(vx).toBeCloseTo(SPEED.steer * 0.1);
    expect(vy).toBeCloseTo(0);
  });

  it('turns her quickly toward the pressed key', () => {
    const head = { dir: 0 };
    steer(head, { keys: new Set(['down']), drag: noDrag(), dt: 0.1 });
    expect(head.dir).toBeCloseTo(SPEED.turn * 0.1);
  });

  it('turns her all the way around in well under half a second', () => {
    const head = { dir: 0 };
    for (let i = 0; i < 6; i++) steer(head, { keys: new Set(['left']), drag: noDrag(), dt: 0.05 });
    expect(Math.abs(head.dir)).toBeCloseTo(Math.PI);
  });

  it('makes a U-turn about one circle wide, so she clears her own body', () => {
    // How far apart the way there and the way back are: twice the turn radius.
    const width = (2 * SPEED.steer) / SPEED.turn;
    expect(width).toBeGreaterThan(2 * CELL_R);
    expect(width).toBeLessThan(2.5 * CELL_R);
  });

  it('heads diagonally with two keys held', () => {
    const head = { dir: -Math.PI / 4 };
    steer(head, { keys: new Set(['up', 'right']), drag: noDrag(), dt: 0.01 });
    expect(head.dir).toBeCloseTo(-Math.PI / 4);
  });

  it('keeps her still when opposite keys cancel out', () => {
    const head = { dir: 0 };
    expect(steer(head, { keys: new Set(['left', 'right']), drag: noDrag(), dt: 0.1 })).toEqual({ vx: 0, vy: 0 });
  });
});

describe('left alone', () => {
  it("doesn't move or turn her at all", () => {
    const head = { dir: 1 };
    expect(steer(head, { keys: new Set(), drag: noDrag(), dt: 0.1 })).toEqual({ vx: 0, vy: 0 });
    expect(head.dir).toBe(1);
  });
});

describe('dragging', () => {
  it('moves her with the finger and faces her that way', () => {
    const head = { dir: 0 };
    const drag = { x: 0, y: 0.05 };
    const { vx, vy } = steer(head, { keys: new Set(), drag, dt: 0.1 });
    expect(vx).toBeCloseTo(0);
    expect(vy).toBeCloseTo(0.05);
    expect(head.dir).toBeCloseTo(Math.PI / 2);
    expect(drag).toEqual({ x: 0, y: 0 });
  });

  it('caps a fast fling and saves the rest for the next frames', () => {
    const head = { dir: 0 };
    const drag = { x: 1, y: 0 };
    const { vx } = steer(head, { keys: new Set(), drag, dt: 0.1 });
    expect(vx).toBeCloseTo(SPEED.drag * 0.1);
    expect(drag.x).toBeCloseTo(1 - SPEED.drag * 0.1);
  });

  it('wins over the arrow keys', () => {
    const head = { dir: 0 };
    steer(head, { keys: new Set(['up']), drag: { x: -0.02, y: 0 }, dt: 0.1 });
    expect(head.dir).toBeCloseTo(Math.PI);
  });

  it("doesn't spin her on a tiny leftover", () => {
    const head = { dir: 1 };
    steer(head, { keys: new Set(), drag: { x: 1e-6, y: 0 }, dt: 0.1 });
    expect(head.dir).toBe(1);
  });
});
