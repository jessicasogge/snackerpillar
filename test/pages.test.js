// GitHub Pages serves the game from a folder (jessicasogge.github.io/snackerpillar/),
// not the site's root, so every link between the game's own files has to be
// relative. A path starting with "/" would point outside the game there.
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const pub = resolve(__dirname, '../public');
const read = (path) => readFileSync(resolve(pub, path), 'utf8');

describe('working from a folder on GitHub Pages', () => {
  it.each([
    ['index.html', ['favicon.svg', 'favicon-32.png', 'apple-touch-icon.png', 'styles.css', 'game/home.js', 'play.html']],
    ['play.html', ['favicon.svg', 'favicon-32.png', 'apple-touch-icon.png', 'styles.css', 'game/main.js', './']],
  ])('links %s to its own files with relative paths', (page, expected) => {
    const links = [...read(page).matchAll(/(?:href|src)="([^"]+)"/g)].map((m) => m[1]);
    expect(links).toEqual(expect.arrayContaining(expected));
    for (const link of links) expect(link).not.toMatch(/^\//);
  });

  it('loads the fonts with relative paths', () => {
    const urls = [...read('styles.css').matchAll(/url\(([^)]+)\)/g)].map((m) => m[1]);
    expect(urls.length).toBeGreaterThan(0);
    for (const url of urls) expect(url).toMatch(/^\.\//);
  });

  it('imports the game modules with relative paths', () => {
    // Every module, the copied-in confetti library under vendor/ included.
    const files = readdirSync(resolve(pub, 'game'), { recursive: true }).filter((f) => f.endsWith('.js'));
    expect(files).toContain('vendor/confetti.js');
    for (const file of files) {
      const imports = [...read(`game/${file}`).matchAll(/from '([^']+)'/g)].map((m) => m[1]);
      for (const path of imports) expect(path).toMatch(/^\.\//);
    }
  });
});

describe('the picture shown when the link is shared', () => {
  const png = readFileSync(resolve(pub, 'social-preview.png'));

  it('is a 1200 by 630 PNG, the size link previews expect', () => {
    expect(png.subarray(1, 4).toString()).toBe('PNG');
    expect(png.readUInt32BE(16)).toBe(1200);
    expect(png.readUInt32BE(20)).toBe(630);
  });

  it.each(['index.html', 'play.html'])('is named in %s with its full web address, size and a description', (page) => {
    const html = read(page);
    const meta = (property) => html.match(new RegExp(`<meta (?:property|name)="${property}" content="([^"]*)"`))?.[1];
    expect(meta('og:image')).toBe('https://jessicasogge.github.io/snackerpillar/social-preview.png');
    expect(meta('og:image:width')).toBe('1200');
    expect(meta('og:image:height')).toBe('630');
    expect(meta('og:image:alt')).toMatch(/caterpillar/);
    expect(meta('og:title')).toMatch(/Snackerpillar/);
    expect(meta('og:description')).toBeTruthy();
    expect(meta('twitter:card')).toBe('summary_large_image');
  });
});

describe('counting visits on GoatCounter', () => {
  it.each(['index.html', 'play.html'])('loads the GoatCounter script on %s, counting on petripals.goatcounter.com with PetriPals', (page) => {
    const html = read(page);
    const tag = html.match(/<script data-goatcounter="([^"]+)"\s+async src="([^"]+)"><\/script>/);
    expect(tag?.[1]).toBe('https://petripals.goatcounter.com/count');
    expect(tag?.[2]).toBe('https://gc.zgo.at/count.js');
  });
});

describe('being found on Google', () => {
  const base = 'https://jessicasogge.github.io/snackerpillar/';
  const sitemap = read('sitemap.xml');
  const listed = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);

  it('lists both pages in the sitemap', () => {
    expect(listed).toEqual([base, `${base}play.html`]);
  });

  it.each([
    ['index.html', base],
    ['play.html', `${base}play.html`],
  ])('gives %s its own canonical address, the one in the sitemap', (page, url) => {
    expect(read(page).match(/<link rel="canonical" href="([^"]+)">/)?.[1]).toBe(url);
    expect(listed).toContain(url);
  });

  it('has the Google Search Console verification file, published at the site root', () => {
    expect(read('google32efa8321a61b455.html').trim()).toBe('google-site-verification: google32efa8321a61b455.html');
  });

  it.each(['index.html', 'play.html'])('gives %s a title and a description', (page) => {
    const html = read(page);
    expect(html.match(/<title>([^<]+)<\/title>/)?.[1]).toMatch(/Snackerpillar/);
    expect(html.match(/<meta name="description" content="([^"]+)">/)?.[1].length).toBeGreaterThan(40);
  });
});

describe('icons', () => {
  const size = (file) => {
    const png = readFileSync(resolve(pub, file));
    expect(png.subarray(1, 4).toString()).toBe('PNG');
    return [png.readUInt32BE(16), png.readUInt32BE(20)];
  };

  it('has a 32 by 32 PNG favicon, for browsers that skip the SVG one', () => {
    expect(size('favicon-32.png')).toEqual([32, 32]);
  });

  it('has a 180 by 180 icon for adding the game to an iPhone home screen', () => {
    expect(size('apple-touch-icon.png')).toEqual([180, 180]);
  });
});
