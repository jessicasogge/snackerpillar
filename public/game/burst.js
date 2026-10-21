// A burst of rainbow dots when she finishes a level: a quick little puff for
// each level, and a big burst in three waves for beating the last one. Uses
// canvas-confetti (vendor/confetti.js, v1.9.4, ISC license), copied in
// because the game is plain files with no build step.
import confetti from './vendor/confetti.js';

// The dots' rainbow, like the circles she grows.
export const RAINBOW = ['#e85a5a', '#f2a948', '#f6d84a', '#7fd65b', '#4fc3d9', '#5b7fe0', '#a66ee0', '#e56fc4'];

// Where to burst from, as fractions of the window (0 to 1, what
// canvas-confetti wants), given a spot on the page in pixels. The middle of
// the window if there's no spot.
export function burstOrigin(spot, width, height) {
  if (!spot || !width || !height) return { x: 0.5, y: 0.5 };
  const clamp = (n) => Math.min(1, Math.max(0, n));
  return { x: clamp(spot.x / width), y: clamp(spot.y / height) };
}

// Burst dots out from `spot` (her head, in page pixels). `big` is for
// beating the last level.
export function dotBurst(spot, { big = false, win = window } = {}) {
  try {
    const base = {
      origin: burstOrigin(spot, win.innerWidth, win.innerHeight),
      colors: RAINBOW,
      shapes: ['circle'],
      spread: 360,
      disableForReducedMotion: true,
    };
    if (!big) {
      confetti({ ...base, particleCount: 30, startVelocity: 15, scalar: 0.9, gravity: 0.6, decay: 0.9, ticks: 90 });
      return;
    }
    const floaty = { ...base, gravity: 0.35, decay: 0.92, ticks: 250 };
    confetti({ ...floaty, particleCount: 240, startVelocity: 30, scalar: 1.1 });
    win.setTimeout(() => confetti({ ...floaty, particleCount: 120, startVelocity: 15, scalar: 0.6, drift: 0.4 }), 180);
    win.setTimeout(() => confetti({ ...floaty, particleCount: 150, startVelocity: 40, scalar: 0.9 }), 450);
  } catch {
    // A celebration is never worth breaking the game over.
  }
}
