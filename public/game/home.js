import { HEAD_HUE, START_HUE } from './config.js';

// The caterpillar on the home page (and in the link preview): a wavy line of
// colored circles, tail on the left, head on the right with her face and
// antennae. Tap her to feed her a dot and she grows another circle.

export const HOME_HUES = [START_HUE, 200, 140, 50, 345, 185, 300];
export const MAX_HOME_CIRCLES = 14;

const R = 20; // a circle's radius
const STEP = 32; // from one circle's middle to the next
const WAVE = 9; // how far up and down the body waves

// SVG markup for a caterpillar whose body circles have these hues, tail first.
export function caterpillarSvg(hues) {
  const n = hues.length + 1; // the body, then the head
  const width = (n - 1) * STEP + 2 * R + 16;
  const height = 2 * R + 2 * WAVE + 40; // room for the antennae
  const at = (i) => ({ x: R + 4 + i * STEP, y: 32 + WAVE + R + Math.sin(i * 0.9) * WAVE });

  const circle = (i, hue, r = R) => {
    const { x, y } = at(i);
    return (
      `<g class="seg" style="--i:${i}">` +
      `<ellipse cx="${x + 2}" cy="${y + r * 0.3}" rx="${r}" ry="${r * 0.9}" fill="rgba(30, 50, 20, 0.16)" />` +
      `<circle cx="${x}" cy="${y}" r="${r}" fill="hsl(${hue} 72% 64%)" stroke="hsl(${hue} 55% 32%)" stroke-width="3.4" />` +
      `<circle cx="${x - r * 0.3}" cy="${y - r * 0.36}" r="${r * 0.17}" fill="hsl(${hue} 90% 88%)" />` +
      '</g>'
    );
  };

  const head = () => {
    const i = n - 1;
    const r = R * 1.1;
    const { x, y } = at(i);
    const u = r / 10;
    const dark = `hsl(${HEAD_HUE} 60% 16%)`;
    const antenna = (side) =>
      `<path d="M${x + side * 3.5 * u} ${y - 8.5 * u} Q${x + side * 5 * u} ${y - 13 * u} ${x + side * 7 * u} ${y - 14.5 * u}" ` +
      `stroke="${dark}" stroke-width="${1.1 * u}" fill="none" stroke-linecap="round" />` +
      `<circle cx="${x + side * 7 * u}" cy="${y - 14.5 * u}" r="${1.5 * u}" fill="${dark}" />`;
    const eye = (side) =>
      `<circle cx="${x + side * 3.6 * u + 0.7 * u}" cy="${y}" r="${2 * u}" fill="${dark}" />` +
      `<circle cx="${x + side * 3.6 * u + 1.3 * u}" cy="${y - 0.6 * u}" r="${0.75 * u}" fill="#fff" />`;
    const cheek = (side) =>
      `<ellipse cx="${x + side * 6.3 * u}" cy="${y + 3.8 * u}" rx="${1.8 * u}" ry="${1.2 * u}" fill="rgba(249, 128, 160, 0.85)" />`;
    return (
      `<g class="seg head" style="--i:${i}">` +
      `<g class="antennae">${antenna(-1)}${antenna(1)}</g>` +
      circle(i, HEAD_HUE, r).replace(/^<g[^>]*>|<\/g>$/g, '') +
      eye(-1) + eye(1) + cheek(-1) + cheek(1) +
      `<path d="M${x - 2 * u} ${y + 3.8 * u} Q${x} ${y + 6 * u} ${x + 2 * u} ${y + 3.8 * u}" stroke="${dark}" stroke-width="${1.2 * u}" fill="none" stroke-linecap="round" />` +
      '</g>'
    );
  };

  return (
    `<svg viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" aria-hidden="true" focusable="false">` +
    hues.map((hue, i) => circle(i, hue)).join('') +
    head() +
    '</svg>'
  );
}

// Draw her into the button `el`, and feed her a dot each time it's pressed,
// until she reaches MAX_HOME_CIRCLES; then she starts over small.
export function setUpHome(el, rand = Math.random) {
  let hues = [...HOME_HUES];
  const draw = () => {
    el.innerHTML = caterpillarSvg(hues);
  };
  el.addEventListener('click', () => {
    hues = hues.length + 1 >= MAX_HOME_CIRCLES ? [START_HUE] : [...hues, Math.floor(rand() * 360)];
    draw();
    el.classList.remove('fed');
    void el.offsetWidth; // restart the little bounce
    el.classList.add('fed');
  });
  draw();
  return { get hues() { return hues; } };
}

if (typeof document !== 'undefined' && document.querySelector('.home-caterpillar') && !globalThis.__SNACKERPILLAR_TEST__) {
  setUpHome(document.querySelector('.home-caterpillar'));
}
