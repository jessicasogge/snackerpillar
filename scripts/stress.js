// A slow check that the garden never gets too crowded, run by hand with
// `npm run stress` (not part of `npm test`). It plays through every level
// many times along random winding paths, growing her to each level's goal,
// on both the wide (4:3) and the square (upright phone) garden, and checks:
//
//   - every level gets all its obstacles, with the old ones left where they
//     were and the new one clear of her and of the dots;
//   - with her as long as the last level's goal and all its obstacles out,
//     every dot still finds a spot.
//
// Re-run it whenever the levels change. Exits with an error if anything
// didn't fit. `npm run stress -- 50` does 50 runs per garden instead of 200.
import { CELL_R, LEVELS, SNACKS } from '../public/game/config.js';
import { seeded } from '../public/game/draw.js';
import { newSnack } from '../public/game/field.js';
import { herPoints, newGame, step } from '../public/game/game.js';

const RUNS = Number(process.argv[2]) || 200;
const GARDENS = [['wide', 0.75], ['square', 1]];
const DIRS = ['left', 'up', 'right', 'down'];

// Crawl a winding path, turning every so often, until she's `goal` circles
// long. Bumps are ignored: this only lays her out the way a long game would.
function growTo(state, goal, halfH, rand) {
  const realGoal = state.goal;
  state.goal = Infinity;
  let k = Math.floor(rand() * 4);
  for (let i = 0; state.body.length + 1 < goal; i++) {
    if (i % 12 === 0) k = (k + (rand() < 0.5 ? 1 : 3)) % 4;
    state.over = null;
    step(state, { dt: 0.03, keys: new Set([DIRS[k]]), drag: { x: 0, y: 0 }, halfH, rand });
    if (i % 5 === 0) state.body.push({ hue: 0, born: state.time });
  }
  state.goal = realGoal;
  state.over = null;
  state.won = true;
}

const touching = (a, ar, b, br) => Math.hypot(a.x - b.x, a.y - b.y) < ar + br;

let problems = 0;
const started = Date.now();

for (const [garden, halfH] of GARDENS) {
  const tally = { levelChanges: 0, wrongCount: 0, moved: 0, onHer: 0, onDot: 0 };
  for (let seed = 1; seed <= RUNS; seed++) {
    const rand = seeded(seed);
    let state = newGame({ halfH, rand });
    for (let level = 1; level < LEVELS.length; level++) {
      growTo(state, state.goal, halfH, rand);
      const before = state.obstacles.map((o) => `${o.x},${o.y}`);
      state = newGame({ halfH, level: level + 1, from: state, rand });
      tally.levelChanges++;
      if (state.obstacles.length !== LEVELS[level].obstacles) tally.wrongCount++;
      if (!before.every((p, i) => p === `${state.obstacles[i].x},${state.obstacles[i].y}`)) tally.moved++;
      const added = state.obstacles.at(-1);
      if (herPoints(state).some((p) => touching(added, added.r, p, CELL_R))) tally.onHer++;
      if (state.snacks.some((d) => touching(added, added.r, d, d.r))) tally.onDot++;
    }
  }
  const bad = tally.wrongCount + tally.moved + tally.onHer + tally.onDot;
  problems += bad;
  console.log(
    `${garden} garden, ${tally.levelChanges} level changes: ` +
      `${tally.wrongCount} with the wrong number of obstacles, ${tally.moved} where old ones moved, ` +
      `${tally.onHer} with the new one on her, ${tally.onDot} with the new one on a dot ${bad ? '✗' : '✓'}`,
  );

  // Dots around her at her longest, with every obstacle of the last level.
  const last = LEVELS.at(-1);
  let placed = 0;
  let wanted = 0;
  for (let seed = 1; seed <= Math.ceil(RUNS / 2); seed++) {
    const rand = seeded(seed);
    const state = newGame({ halfH, level: LEVELS.length, rand });
    state.snacks = [];
    growTo(state, last.goal, halfH, rand);
    state.snacks = [];
    for (let i = 0; i < SNACKS; i++) {
      wanted++;
      const dot = newSnack({ halfH, head: state.head, body: herPoints(state), snacks: state.snacks, obstacles: state.obstacles, time: 0, rand });
      if (dot) {
        placed++;
        state.snacks.push(dot);
      }
    }
  }
  problems += wanted - placed;
  console.log(
    `${garden} garden, ${last.goal} circles and ${last.obstacles} obstacles: ` +
      `${placed} of ${wanted} dots found a spot ${placed === wanted ? '✓' : '✗'}`,
  );
}

console.log(`Done in ${((Date.now() - started) / 1000).toFixed(1)}s.`);
if (problems) {
  console.log(`${problems} problems: the garden is too crowded somewhere.`);
  process.exitCode = 1;
}
