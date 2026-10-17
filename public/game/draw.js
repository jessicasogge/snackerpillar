import { CELL_R, HEAD_HUE, SPACING } from './config.js';
import { pointAlong, trailLength } from './trail.js';

// Draws the game on a canvas: the lawn, the dots, the obstacles and her.
// `colors` returns the lawn's colors ({ light, shade, blade }), read from the
// page's theme, so the lawn can be repainted when the theme changes.
export function makeRenderer(canvas, { colors, reduceMotion = false, makeCanvas = () => document.createElement('canvas') }) {
  const ctx = canvas.getContext('2d');
  const lawn = makeCanvas();
  let w = 0;
  let h = 0;
  let dpr = 1;
  let scale = 1;
  const px = (v) => v * scale;

  // Match the canvas to its size on screen. Returns the field's halfH.
  function resize(devicePixelRatio = 1) {
    dpr = Math.min(devicePixelRatio || 1, 2);
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    scale = w / 2;
    paintLawn();
    return w ? h / w : 0.75;
  }

  // The lawn: soft light and shade, little grass blades, and a few daisies.
  // Seeded, so it looks the same every time it's repainted.
  function paintLawn() {
    if (!w) return;
    const { light, shade, blade } = colors();
    lawn.width = canvas.width;
    lawn.height = canvas.height;
    const g = lawn.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const grad = g.createRadialGradient(w * 0.3, h * 0.25, 0, w * 0.5, h * 0.5, Math.max(w, h) * 0.8);
    grad.addColorStop(0, light);
    grad.addColorStop(1, shade);
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);

    const rand = seeded(7);
    g.strokeStyle = blade;
    g.lineCap = 'round';
    g.lineWidth = Math.max(1, w / 400);
    const blades = Math.round((w * h) / 260);
    for (let i = 0; i < blades; i++) {
      const x = rand() * w;
      const y = rand() * h;
      const len = (4 + rand() * 6) * (w / 600);
      const lean = (rand() - 0.5) * len * 0.8;
      g.beginPath();
      g.moveTo(x, y);
      g.quadraticCurveTo(x + lean * 0.3, y - len * 0.6, x + lean, y - len);
      g.stroke();
    }

    for (let i = 0; i < 9; i++) {
      const x = rand() * w;
      const y = rand() * h;
      const r = (3 + rand() * 2) * (w / 600);
      g.save();
      g.translate(x, y);
      g.rotate(rand() * Math.PI);
      g.globalAlpha = 0.75;
      g.fillStyle = '#ffffff';
      for (let p = 0; p < 6; p++) {
        g.rotate(Math.PI / 3);
        g.beginPath();
        g.ellipse(r * 1.3, 0, r, r * 0.55, 0, 0, Math.PI * 2);
        g.fill();
      }
      g.fillStyle = '#f6c945';
      g.beginPath();
      g.arc(0, 0, r * 0.8, 0, Math.PI * 2);
      g.fill();
      g.restore();
    }
  }

  function drawSnack(s, time) {
    let k = Math.min(1, (time - s.born) / 0.35);
    if (s.eatenAt !== null) k = Math.max(0, 1 - (time - s.eatenAt) / 0.25);
    const r = px(s.r) * k;
    if (r <= 0.3) return;
    ctx.save();
    ctx.globalAlpha = s.eatenAt === null ? 1 : k;
    ctx.translate(px(s.x), px(s.y));
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = `hsl(${s.hue} 85% 55%)`;
    ctx.fill();
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = 'rgba(30, 50, 20, 0.35)';
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(-r * 0.3, -r * 0.35, r * 0.28, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.fill();
    ctx.restore();
  }

  function drawObstacle(o) {
    const r = px(o.r);
    ctx.save();
    ctx.translate(px(o.x), px(o.y));
    ctx.beginPath();
    ctx.ellipse(r * 0.12, r * 0.35, r * 1.05, r * 0.8, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(30, 50, 20, 0.22)';
    ctx.fill();
    ctx.lineWidth = Math.max(1.5, r * 0.08);
    if (o.kind === 'rock') {
      ctx.rotate(o.turn);
      ctx.beginPath();
      const n = o.lumps.length;
      for (let i = 0; i <= n; i++) {
        const a = (i / n) * Math.PI * 2;
        const rr = r * o.lumps[i % n];
        if (i === 0) ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
        else ctx.quadraticCurveTo(Math.cos(a - Math.PI / n) * rr * 1.05, Math.sin(a - Math.PI / n) * rr * 1.05, Math.cos(a) * rr, Math.sin(a) * rr);
      }
      ctx.closePath();
      ctx.fillStyle = '#a8a29a';
      ctx.fill();
      ctx.strokeStyle = '#5f5a54';
      ctx.stroke();
      ctx.rotate(-o.turn);
      ctx.beginPath();
      ctx.ellipse(-r * 0.3, -r * 0.35, r * 0.28, r * 0.16, -0.5, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.fill();
    } else {
      // A red toadstool seen from above: a round cap with white spots.
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fillStyle = '#e0483e';
      ctx.fill();
      ctx.strokeStyle = '#8f231d';
      ctx.stroke();
      ctx.fillStyle = '#fff6ee';
      for (const [sx, sy, sr] of MUSHROOM_SPOTS) {
        ctx.beginPath();
        ctx.arc(sx * r, sy * r, sr * r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  // One body circle, with a darker outline, a little shine, and a soft shadow.
  function drawCircle(x, y, hue, size, wobble) {
    const r = px(CELL_R) * size;
    if (r <= 0.5) return;
    ctx.save();
    ctx.translate(px(x), px(y));
    ctx.beginPath();
    ctx.ellipse(r * 0.12, r * 0.3, r * 1.02, r * 0.9, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(30, 50, 20, 0.16)';
    ctx.fill();
    ctx.scale(1 + wobble, 1 - wobble);
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = `hsl(${hue} 72% 64%)`;
    ctx.fill();
    ctx.lineWidth = Math.max(1.5, r * 0.17);
    ctx.strokeStyle = `hsl(${hue} 55% 32%)`;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(-r * 0.3, -r * 0.36, r * 0.17, 0, Math.PI * 2);
    ctx.fillStyle = `hsl(${hue} 90% 88%)`;
    ctx.fill();
    ctx.restore();
  }

  // Her face and antennae. Her pupils look where she's going; after a bump,
  // her eyes are dizzy X's.
  function drawFace(head, time, over) {
    const u = px(CELL_R) / 10; // face units: the head's radius is 10
    const lx = Math.cos(head.dir) * u * 0.7;
    const ly = Math.sin(head.dir) * u * 0.7;
    const dark = `hsl(${HEAD_HUE} 60% 16%)`;
    ctx.save();
    ctx.translate(px(head.x), px(head.y));
    ctx.lineCap = 'round';
    ctx.strokeStyle = dark;
    ctx.fillStyle = dark;
    ctx.lineWidth = 1.1 * u;
    for (const side of [-1, 1]) {
      const sway = reduceMotion ? 0 : Math.sin(time * 4 + side) * 0.8;
      ctx.beginPath();
      ctx.moveTo(side * 3.5 * u, -8.5 * u);
      ctx.quadraticCurveTo(side * 5 * u, -13 * u, side * (7 + sway) * u, -14.5 * u);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(side * (7 + sway) * u, -14.5 * u, 1.5 * u, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.lineWidth = 1.2 * u;
    for (const ex of [-3.6, 3.6]) {
      if (over) {
        ctx.beginPath();
        ctx.moveTo((ex - 1.6) * u, -1.6 * u);
        ctx.lineTo((ex + 1.6) * u, 1.6 * u);
        ctx.moveTo((ex + 1.6) * u, -1.6 * u);
        ctx.lineTo((ex - 1.6) * u, 1.6 * u);
        ctx.stroke();
        continue;
      }
      ctx.beginPath();
      ctx.arc(ex * u + lx, ly, 2 * u, 0, Math.PI * 2);
      ctx.fillStyle = dark;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(ex * u + lx + 0.6 * u, ly - 0.6 * u, 0.75 * u, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(249, 128, 160, 0.85)';
    for (const cx of [-6.3, 6.3]) {
      ctx.beginPath();
      ctx.ellipse(cx * u, 3.8 * u, 1.8 * u, 1.2 * u, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.beginPath();
    ctx.moveTo(-2 * u, 3.8 * u);
    ctx.quadraticCurveTo(0, 6 * u, 2 * u, 3.8 * u);
    ctx.stroke();
    ctx.restore();
  }

  function draw(state) {
    if (!w) return;
    const { time } = state;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(lawn, 0, 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.save();
    ctx.translate(w / 2, h / 2);
    for (const s of state.snacks) drawSnack(s, time);
    for (const o of state.obstacles) drawObstacle(o);
    // Tail first, so each circle tucks under the one in front of it. A circle
    // with no trail to sit on yet isn't drawn (and can't be bumped into; see
    // tailHit). That only happens for a moment, if ever: when she's just
    // eaten and hasn't crawled far enough for the new circle's spot.
    const out = trailLength(state.trail);
    for (let i = state.body.length - 1; i >= 0; i--) {
      if ((i + 1) * SPACING > out + 1e-9) continue;
      const seg = state.body[i];
      const p = pointAlong(state.trail, (i + 1) * SPACING);
      const wob = reduceMotion ? 0 : Math.sin(time * 6 - i * 0.7) * 0.035;
      drawCircle(p.x, p.y, seg.hue, popSize(time - seg.born), wob);
    }
    drawCircle(state.head.x, state.head.y, HEAD_HUE, 1.1, 0);
    drawFace(state.head, time, state.over);
    ctx.restore();
  }

  return { resize, paintLawn, draw };
}

const MUSHROOM_SPOTS = [
  [-0.35, -0.3, 0.2], [0.35, -0.15, 0.16], [0, 0.4, 0.18],
  [-0.45, 0.3, 0.12], [0.25, -0.55, 0.11], [0.5, 0.35, 0.1],
];

// How big a new circle is `age` seconds after she ate the dot: it pops in with
// a little overshoot, then settles at full size.
export function popSize(age) {
  if (age >= 0.45) return 1;
  const t = Math.max(0, age) / 0.45;
  return Math.max(0, 1 + Math.sin(t * Math.PI) * 0.25 - (1 - t) * (1 - t));
}

// A repeatable random number generator, from 0 up to (not including) 1.
export function seeded(seed) {
  return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
}
