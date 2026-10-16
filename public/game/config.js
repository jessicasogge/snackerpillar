// Game settings. Distances are in field units: the field is 2 wide (x from
// -1 to 1) and 2 * halfH tall, centered on (0, 0).
export const CELL_R = 0.045; // one body circle's radius
export const SPACING = CELL_R * 1.7; // neighbors overlap a little so he reads as one body
export const SNACKS = 14; // dots on the grass at a time
export const RESPAWN_SECONDS = 2.5; // how long an eaten dot takes to come back
export const HEAD_HUE = 34; // sunny orange
export const OBSTACLES = 7;
export const SAFE_NECK = 3; // the first few circles behind the head can't be bumped into
export const SPEED = {
  steer: 0.55, // with an arrow key held
  wander: 0.12, // left alone
  drag: 1.6, // the fastest a finger can pull him
  turn: 7, // radians per second
};
