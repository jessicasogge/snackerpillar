// Game settings. Distances are in field units: the field is 2 wide (x from
// -1 to 1) and 2 * halfH tall, centered on (0, 0).
export const CELL_R = 0.045; // one body circle's radius
export const SPACING = CELL_R * 1.7; // neighbors overlap a little so she reads as one body
export const SNACKS = 12; // dots on the grass at a time
export const RESPAWN_SECONDS = 2.5; // how long an eaten dot takes to come back
export const HEAD_HUE = 34; // sunny orange
export const START_HUE = 275; // the purple circle she starts with behind her head
// Each level: how many rocks and mushrooms are on the grass, and how many
// circles long she has to grow to finish it. Level 1 has 3 obstacles and is
// played to 15; each level after adds one more obstacle and 5 more circles,
// up to 12 obstacles and 60 circles on level 10.
export const LEVELS = Array.from({ length: 10 }, (_, i) => ({ obstacles: 3 + i, goal: 15 + 5 * i }));

// How long the pop-up waits after a bump, so you can see what happened.
export const GAME_OVER_DELAY_MS = 600;
// How long it waits after a win, for the last circle to finish popping in.
export const WIN_DELAY_MS = 450;
export const SAFE_NECK = 3; // the first few circles behind the head can't be bumped into
export const SPEED = {
  steer: 0.55, // with an arrow key held
  drag: 1.6, // the fastest a finger can pull her
  // Radians per second. At full speed that's a turn about one circle wide,
  // so she can U-turn without running into herself.
  turn: 12,
};
