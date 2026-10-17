// @vitest-environment jsdom
// The home page's caterpillar: drawn from game/home.js, and fed a dot each
// time she's tapped.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { HEAD_HUE, START_HUE } from '../public/game/config.js';
import { seeded } from '../public/game/draw.js';

let caterpillarSvg, setUpHome, HOME_HUES, MAX_HOME_CIRCLES;
beforeAll(async () => {
  globalThis.__SNACKERPILLAR_TEST__ = true;
  ({ caterpillarSvg, setUpHome, HOME_HUES, MAX_HOME_CIRCLES } = await import('../public/game/home.js'));
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
  it('shows her with a rainbow body, starting from her purple circle', () => {
    const button = document.querySelector('.home-caterpillar');
    setUpHome(button);
    expect(fills(button)).toHaveLength(HOME_HUES.length + 1);
    expect(fills(button)[0]).toBe(`hsl(${START_HUE} 72% 64%)`);
  });

  it('grows her a circle each time she is tapped', () => {
    const button = document.querySelector('.home-caterpillar');
    const home = setUpHome(button, seeded(3));
    button.click();
    button.click();
    expect(home.hues).toHaveLength(HOME_HUES.length + 2);
    expect(fills(button)).toHaveLength(HOME_HUES.length + 3);
    expect(button.classList.contains('fed')).toBe(true);
  });

  it('starts her over small once she gets too long for the page', () => {
    const button = document.querySelector('.home-caterpillar');
    const home = setUpHome(button, seeded(3));
    while (home.hues.length + 1 < MAX_HOME_CIRCLES) button.click();
    button.click();
    expect(home.hues).toEqual([START_HUE]);
  });

  it('has a Start button that goes to the game', () => {
    const start = document.querySelector('.start-btn');
    expect(start.textContent).toBe('Press Start to Play');
    expect(start.getAttribute('href')).toBe('play.html');
  });

  it('tells screen readers what tapping her does', () => {
    expect(document.querySelector('.home-caterpillar').getAttribute('aria-label')).toBe('Feed the caterpillar a dot');
  });

  it('links to PetriPals and is signed', () => {
    expect(document.querySelector('.sister-game a').href).toBe('https://jessicasogge.github.io/petripals/');
    expect(document.querySelector('.signature').textContent).toBe('jsogge 2026');
  });
});

describe('the game page', () => {
  it('links its title back home', () => {
    const play = readFileSync(resolve(__dirname, '../public/play.html'), 'utf8');
    expect(play).toContain('<h1><a class="home-link" href="./">Snackerpillar</a></h1>');
  });
});
