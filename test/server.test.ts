import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { app } from '../src/index.js';

let server: ReturnType<typeof app.listen>;
let base = '';

beforeAll(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://localhost:${(server.address() as AddressInfo).port}`;
});

afterAll(() => {
  server.close();
});

describe('the server', () => {
  it('reports that it is healthy', async () => {
    const res = await fetch(`${base}/health`);
    expect(await res.json()).toEqual({ ok: true });
  });

  it('serves the game page', async () => {
    const res = await fetch(`${base}/`);
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('<title>Snackerpillar</title>');
  });

  it('serves the game code', async () => {
    const res = await fetch(`${base}/game/main.js`);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toMatch(/javascript/);
  });
});
