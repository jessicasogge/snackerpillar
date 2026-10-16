import { describe, expect, it } from 'vitest';
import { SPEED } from '../public/game/config.js';
import { steer } from '../public/game/steer.js';

const noDrag = () => ({ x: 0, y: 0 });

describe('steering with the arrow keys', () => {
  it('moves him the way he faces at full speed', () => {
    const head = { dir: 0 };
    const { vx, vy } = steer(head, { keys: new Set(['right']), drag: noDrag(), time: 0, dt: 0.1 });
    expect(vx).toBeCloseTo(SPEED.steer * 0.1);
    expect(vy).toBeCloseTo(0);
  });

  it('turns him gradually toward the pressed key', () => {
    const head = { dir: 0 };
    steer(head, { keys: new Set(['down']), drag: noDrag(), time: 0, dt: 0.1 });
    expect(head.dir).toBeCloseTo(SPEED.turn * 0.1);
  });

  it('turns him all the way once he has had time', () => {
    const head = { dir: 0 };
    for (let i = 0; i < 20; i++) steer(head, { keys: new Set(['up']), drag: noDrag(), time: 0, dt: 0.05 });
    expect(head.dir).toBeCloseTo(-Math.PI / 2);
  });

  it('heads diagonally with two keys held', () => {
    const head = { dir: -Math.PI / 4 };
    steer(head, { keys: new Set(['up', 'right']), drag: noDrag(), time: 0, dt: 0.01 });
    expect(head.dir).toBeCloseTo(-Math.PI / 4);
  });

  it('cancels out opposite keys and lets him wander', () => {
    const head = { dir: 0 };
    const { vx } = steer(head, { keys: new Set(['left', 'right']), drag: noDrag(), time: 0, dt: 0.1 });
    expect(vx).toBeCloseTo(SPEED.wander * 0.1);
  });
});

describe('left alone', () => {
  it('keeps him wandering slowly', () => {
    const head = { dir: 0 };
    const { vx, vy } = steer(head, { keys: new Set(), drag: noDrag(), time: 1, dt: 0.1 });
    expect(Math.hypot(vx, vy)).toBeCloseTo(SPEED.wander * 0.1);
    expect(head.dir).not.toBe(0);
  });
});

describe('dragging', () => {
  it('moves him with the finger and faces him that way', () => {
    const head = { dir: 0 };
    const drag = { x: 0, y: 0.05 };
    const { vx, vy } = steer(head, { keys: new Set(), drag, time: 0, dt: 0.1 });
    expect(vx).toBeCloseTo(0);
    expect(vy).toBeCloseTo(0.05);
    expect(head.dir).toBeCloseTo(Math.PI / 2);
    expect(drag).toEqual({ x: 0, y: 0 });
  });

  it('caps a fast fling and saves the rest for the next frames', () => {
    const head = { dir: 0 };
    const drag = { x: 1, y: 0 };
    const { vx } = steer(head, { keys: new Set(), drag, time: 0, dt: 0.1 });
    expect(vx).toBeCloseTo(SPEED.drag * 0.1);
    expect(drag.x).toBeCloseTo(1 - SPEED.drag * 0.1);
  });

  it('wins over the arrow keys', () => {
    const head = { dir: 0 };
    steer(head, { keys: new Set(['up']), drag: { x: -0.02, y: 0 }, time: 0, dt: 0.1 });
    expect(head.dir).toBeCloseTo(Math.PI);
  });

  it("doesn't spin him on a tiny leftover", () => {
    const head = { dir: 1 };
    steer(head, { keys: new Set(), drag: { x: 1e-6, y: 0 }, time: 0, dt: 0.1 });
    expect(head.dir).toBe(1);
  });
});
