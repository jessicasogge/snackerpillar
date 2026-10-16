# Snackerpillar 🐛

A browser game about a very hungry caterpillar made of circles. Every dot he eats adds a new circle to his back, in that dot's color. Grow as long as you can, and don't bump into anything!

## How to play

- **Move** with the arrow keys. He only moves while you're steering him, and turns sharply enough to U-turn without running into himself. On a touch screen, drag anywhere on the grass like a trackpad: he moves the way your finger slides, so your finger never hides him.
- **Eat the colored dots** to grow. Each one adds a circle to the end of his body in its color, and a new dot appears somewhere else a moment later.
- **Don't bump into rocks, mushrooms or his own body.** Any of those ends the level. The edges of the garden are safe: he just stops there, and you can slide him along them.

### Levels

There are 10 levels. Level 1 has 3 obstacles and you play until he's 15 circles long. Each level after that adds one more obstacle and 5 more circles:

| Level | Obstacles | Grow to |
|---|---|---|
| 1 | 3 | 15 circles |
| 2 | 4 | 20 circles |
| 3 | 5 | 25 circles |
| 4 | 6 | 30 circles |
| 5 | 7 | 35 circles |
| 6 | 8 | 40 circles |
| 7 | 9 | 45 circles |
| 8 | 10 | 50 circles |
| 9 | 11 | 55 circles |
| 10 | 12 | 60 circles |

At the end of every level, a pop-up tells you how it went:

- **Level complete:** **Play level 2** (and so on) takes you to the next level. After level 10, **Play again** goes back to level 1.
- **Game over:** it says what he ran into, and **Try level 3 again** (or whichever level you're on) starts it over. Past level 1 there's also **Start over**, which goes back to level 1.

**Restart level**, under the garden, starts the level you're on over at any time. The levels are set in `LEVELS` in `public/game/config.js`.

## Running it locally

You need [Node.js](https://nodejs.org/) 22 or newer.

```sh
npm install
npm run dev
```

Then open <http://localhost:3007>. To use another port, set `PORT`, like `PORT=4000 npm run dev`.

| Command | What it does |
|---|---|
| `npm run dev` | Runs the server on port 3007 and restarts it when the server code changes |
| `npm test` | Runs the tests once |
| `npm run test:watch` | Re-runs the tests as you edit |
| `npm run typecheck` | Checks the server's TypeScript |
| `npm run build` then `npm start` | Builds the server and runs the built version |

## How it's put together

The server (`src/index.ts`) is a small Express app that serves the `public/` folder and a `/health` check. The game itself runs entirely in the browser, as plain JavaScript modules in `public/game/`:

| File | What's in it |
|---|---|
| `config.js` | Sizes, speeds and counts: how big a circle is, how many dots there are, and each level's obstacles and goal |
| `game.js` | A level's state, and moving it on one frame at a time: eating, growing, finishing the level, and game over |
| `steer.js` | How the arrow keys and dragging move him |
| `trail.js` | The path his head has taken, which his body follows |
| `field.js` | Keeping him on the field, and placing obstacles and dots |
| `collide.js` | Whether he's touching a dot, an obstacle or his own body |
| `draw.js` | Drawing the lawn, dots, rocks, mushrooms and him on the canvas |
| `main.js` | Connecting it all to the page: input, the animation loop, the level and length counter, and the end-of-level pop-up |

Tests live in `test/` and run with [Vitest](https://vitest.dev/). GitHub Actions runs them on every push and pull request.

The Fredoka and Nunito fonts are included under the SIL Open Font License (`public/fonts/*-OFL.txt`).
