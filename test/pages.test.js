// GitHub Pages serves the game from a folder (jessicasogge.github.io/snackerpillar/),
// not the site's root, so every link between the game's own files has to be
// relative. A path starting with "/" would point outside the game there.
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const pub = resolve(__dirname, '../public');
const read = (path) => readFileSync(resolve(pub, path), 'utf8');

describe('working from a folder on GitHub Pages', () => {
  it('links the page to its icon, stylesheet and script with relative paths', () => {
    const html = read('index.html');
    const links = [...html.matchAll(/(?:href|src)="([^"]+)"/g)].map((m) => m[1]);
    expect(links).toEqual(expect.arrayContaining(['favicon.svg', 'styles.css', 'game/main.js']));
    for (const link of links) expect(link).not.toMatch(/^\//);
  });

  it('loads the fonts with relative paths', () => {
    const urls = [...read('styles.css').matchAll(/url\(([^)]+)\)/g)].map((m) => m[1]);
    expect(urls.length).toBeGreaterThan(0);
    for (const url of urls) expect(url).toMatch(/^\.\//);
  });

  it('imports the game modules with relative paths', () => {
    for (const file of readdirSync(resolve(pub, 'game'))) {
      const imports = [...read(`game/${file}`).matchAll(/from '([^']+)'/g)].map((m) => m[1]);
      for (const path of imports) expect(path).toMatch(/^\.\//);
    }
  });
});
