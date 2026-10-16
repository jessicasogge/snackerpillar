# Snackerpillar 🐛

A browser game about a very hungry caterpillar made of circles. Every dot he eats adds a new circle to his back, in that dot's color. Grow as long as you can, and don't bump into anything!

## How to play

- **Move** with the arrow keys. On a touch screen, drag anywhere on the grass like a trackpad: he moves the way your finger slides, so your finger never hides him.
- **Eat the colored dots** to grow. Each one adds a circle to the end of his body in its color, and a new dot appears somewhere else a moment later.
- **Don't bump into rocks, mushrooms or his own body.** Any of those ends the game. The edges of the garden are safe: he just turns around.
- Left alone, he keeps crawling slowly on his own, so keep an eye on him.

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
| `config.js` | Sizes, speeds and counts: how big a circle is, how many dots and obstacles, and so on |
| `game.js` | A game's state, and moving it on one frame at a time: eating, growing, and game over |
| `steer.js` | How the arrow keys and dragging move him |
| `trail.js` | The path his head has taken, which his body follows |
| `field.js` | Keeping him on the field, and placing obstacles and dots |
| `collide.js` | Whether he's touching a dot, an obstacle or his own body |
| `draw.js` | Drawing the lawn, dots, rocks, mushrooms and him on the canvas |
| `main.js` | Connecting it all to the page: input, the animation loop and the length counter |

Tests live in `test/` and run with [Vitest](https://vitest.dev/). GitHub Actions runs them on every push and pull request.

The Fredoka and Nunito fonts are included under the SIL Open Font License (`public/fonts/*-OFL.txt`).
