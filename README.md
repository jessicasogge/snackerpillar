# Snackerpillar 🐛

A browser game about a very hungry caterpillar made of circles. Every dot she eats adds a new circle to her back, in that dot's color. Grow as long as you can, and don't bump into anything!

**[▶ Play Snackerpillar](https://jessicasogge.github.io/snackerpillar/)**: works on computers, phones and tablets.

## How to play

- **Move** with the arrow keys. She only moves while you're steering her, and turns sharply enough to U-turn without running into herself. On a touch screen, drag anywhere on the grass like a trackpad: she moves the way your finger slides, so your finger never hides her.
- **Eat the colored dots** to grow. She starts with one purple circle behind her head. Each one adds a circle to the end of her body in its color, and a new dot appears somewhere else a moment later.
- **Don't bump into rocks, mushrooms or her own body.** Any of those ends the game, and you start over from level 1. The edges of the garden are safe: she just stops there, and you can slide her along them.

### Levels

There are 8 levels, and she keeps every circle she's grown from one level to the next. Each level adds one more obstacle and asks her to grow 20 more circles:

| Level | Obstacles | Grow to |
|---|---|---|
| 1 | 3 | 20 circles |
| 2 | 4 | 40 circles |
| 3 | 5 | 60 circles |
| 4 | 6 | 80 circles |
| 5 | 7 | 100 circles |
| 6 | 8 | 120 circles |
| 7 | 9 | 140 circles |
| 8 | 10 | 160 circles |

Each new level picks up exactly where the last one ended: she's in the same spot, facing the same way, with all her circles showing, and the rocks, mushrooms and dots stay where they were. One more obstacle is added, clear of her body, the way ahead of her face, and the dots.

At the end of every level, a pop-up tells you how it went:

- **Level complete:** **Play level 2** (and so on) takes you to the next level, with all her circles. After level 8, **Play again** goes back to level 1.
- **Game over:** it says what she ran into, and **Start over** goes back to level 1 with just 2 circles. There's no trying a level again.

The levels are set in `LEVELS` in `public/game/config.js`.

The directions under the garden match your device: the arrow keys on a computer, dragging on a phone or tablet. On a device with both, like a touchscreen laptop, they switch to whichever you use.

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

The server (`src/index.ts`) is a small Express app that serves the `public/` folder and a `/health` check. `public/index.html` is the home page, with a rainbow caterpillar, the **Press Start to Play** button, and a link to the [Tiny Game Arcade](https://jessicasogge.github.io/tiny-game-arcade/). `public/play.html` is the game. `public/social-preview.png` is the picture shown when the link is shared in messages or on social media.

The game itself runs entirely in the browser, as plain JavaScript modules in `public/game/`:

| File | What's in it |
|---|---|
| `config.js` | Sizes, speeds and counts: how big a circle is, how many dots there are, and each level's obstacles and goal |
| `game.js` | A level's state, and moving it on one frame at a time: eating, growing, finishing the level, and game over |
| `steer.js` | How the arrow keys and dragging move her |
| `trail.js` | The path her head has taken, which her body follows |
| `field.js` | Keeping her on the field, and placing obstacles and dots |
| `collide.js` | Whether she's touching a dot, an obstacle or her own body |
| `draw.js` | Drawing the lawn, dots, rocks, mushrooms and her on the canvas |
| `home.js` | Drawing the rainbow caterpillar on the home page and in the link-preview picture |
| `input.js` | Showing the directions for the device you're on: arrow keys on a computer, dragging on a phone or tablet |
| `main.js` | Connecting it all to the page: input, the animation loop, the level and length counter, and the end-of-level pop-up |

Tests live in `test/` and run with [Vitest](https://vitest.dev/). GitHub Actions runs them on every push and pull request.

## Visit counts

Both pages load [GoatCounter](https://www.goatcounter.com/) to count visits, sharing PetriPals' site at https://petripals.goatcounter.com. Snackerpillar's visits show up there under paths starting with `/snackerpillar/`. It uses no cookies and collects nothing personal.

## Publishing

Every push to `main` publishes the game to [GitHub Pages](https://jessicasogge.github.io/snackerpillar/) (`.github/workflows/pages.yml`). The tests and typecheck run first, and if they fail nothing is published. Pages serves the `public/` folder as is, with no server. You can also rerun it by hand from the Actions tab.

The first time, turn Pages on in the repo's **Settings → Pages** and set **Source** to **GitHub Actions**.

The Fredoka and Nunito fonts are included under the SIL Open Font License (`public/fonts/*-OFL.txt`).
