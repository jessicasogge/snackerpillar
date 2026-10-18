// @vitest-environment jsdom
// The home page's caterpillar, drawn by game/home.js: just a picture.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { HEAD_HUE, START_HUE } from '../public/game/config.js';

let caterpillarSvg, drawHome, HOME_HUES;
beforeAll(async () => {
  globalThis.__SNACKERPILLAR_TEST__ = true;
  ({ caterpillarSvg, drawHome, HOME_HUES } = await import('../public/game/home.js'));
});

const page = readFileSync(resolve(__dirname, '../public/index.html'), 'utf8');

beforeEach(() => {
  document.documentElement.innerHTML = page.replace(/^<!doctype html>/i, '');
});

// The body circles' fill colors, tail first, then the head.
const fills = (el) => [...el.querySelectorAll('circle[stroke]')].map((c) => c.getAttribute('fill'));

describe('caterpillarSvg', () => {
  it('draws a circle for each hue, then her orange head', () => {
    const el = document.createElement('div');
    el.innerHTML = caterpillarSvg([10, 200]);
    expect(fills(el)).toEqual(['hsl(10 72% 64%)', 'hsl(200 72% 64%)', `hsl(${HEAD_HUE} 72% 64%)`]);
  });

  it('gives her a face and antennae', () => {
    const el = document.createElement('div');
    el.innerHTML = caterpillarSvg([10]);
    const head = el.querySelector('.head');
    expect(head.querySelector('.antennae').children.length).toBe(4);
    expect(head.querySelectorAll('ellipse[fill^="rgba(249"]').length).toBe(2); // rosy cheeks
    expect(head.querySelector('path[d*="Q"]')).not.toBeNull(); // smile
  });

  it('makes the picture wide enough for every circle', () => {
    const narrow = caterpillarSvg([1]).match(/viewBox="0 0 (\d+)/)[1];
    const wide = caterpillarSvg([1, 2, 3, 4]).match(/viewBox="0 0 (\d+)/)[1];
    expect(Number(wide) - Number(narrow)).toBe(3 * 32);
  });

  it('numbers each circle so the wave can run down her body', () => {
    const el = document.createElement('div');
    el.innerHTML = caterpillarSvg([1, 2, 3]);
    expect([...el.querySelectorAll('.seg')].map((g) => g.style.getPropertyValue('--i'))).toEqual(['0', '1', '2', '3']);
  });
});

describe('the home page', () => {
  it('shows her with a long rainbow body, starting from her purple circle', () => {
    const el = document.querySelector('.home-caterpillar');
    drawHome(el);
    expect(fills(el)).toHaveLength(18); // 17 body circles and her head
    expect(fills(el)[0]).toBe(`hsl(${START_HUE} 72% 64%)`);
    expect(new Set(HOME_HUES).size).toBe(17); // every circle a different color
  });

  it("isn't something you can click or tab to", () => {
    const el = document.querySelector('.home-caterpillar');
    drawHome(el);
    expect(el.tagName).toBe('DIV');
    expect(el.getAttribute('aria-hidden')).toBe('true');
    expect(el.querySelector('button, a, [tabindex]')).toBeNull();
    const before = el.innerHTML;
    el.click();
    expect(el.innerHTML).toBe(before);
  });

  it('describes the game under the Start button', () => {
    expect(document.querySelector('.about').textContent.replace(/\s+/g, ' ').trim()).toBe(
      'Guide a hungry caterpillar through 8 garden levels. Eat dots to grow a colorful tail, and dodge rocks, mushrooms and yourself!',
    );
  });

  it('has a Start button that goes to the game', () => {
    const start = document.querySelector('.start-btn');
    expect(start.textContent).toBe('Press Start to Play');
    expect(start.getAttribute('href')).toBe('play.html');
  });

  it("doesn't put a patch of grass under her", () => {
    expect(document.querySelector('.lawn')).toBeNull();
  });


  it('says it is a Tiny Game Arcade game, with a link to the arcade, and is signed', () => {
    const line = document.querySelector('.sister-game');
    expect(line.textContent.replace(/\s+/g, ' ').trim()).toBe('A Tiny Game Arcade game.');
    expect(line.querySelector('a').href).toBe('https://jessicasogge.github.io/tiny-game-arcade/');
    expect(document.body.textContent).not.toMatch(/From the maker/);
    expect(document.querySelector('.signature').textContent).toBe('jsogge 2026');
  });
});

describe('the game page', () => {
  it('links its title back home', () => {
    const play = readFileSync(resolve(__dirname, '../public/play.html'), 'utf8');
    expect(play).toContain('<h1><a class="home-link" href="./">Snackerpillar</a></h1>');
  });
});
