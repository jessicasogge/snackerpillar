// Game settings. Distances are in field units: the field is 2 wide (x from
// -1 to 1) and 2 * halfH tall, centered on (0, 0).
export const CELL_R = 0.045; // one body circle's radius
export const SPACING = CELL_R * 1.7; // neighbors overlap a little so she reads as one body
export const SNACKS = 12; // dots on the grass at a time
export const RESPAWN_SECONDS = 2.5; // how long an eaten dot takes to come back
export const HEAD_HUE = 34; // sunny orange
export const START_HUE = 275; // purple: the home page caterpillar's first circle
// How far (in hue, 0 to 360) the random first circle behind her head keeps
// from her orange head's color, so the two don't blur together.
export const START_AWAY_FROM_HEAD = 40;
// The daisies' colors on the lawn, one per level (then round again): always
// very pale, so they never look like the bright dots she eats. Each has its
// petals and its center. Level 1 is white with a soft gold center.
export const FLOWER_COLORS = [
  { petals: '#ffffff', center: '#f7e3a3' }, // white
  { petals: '#fde4ee', center: '#f4c6d8' }, // blush pink
  { petals: '#ece4fb', center: '#d5c7f2' }, // lavender
  { petals: '#fdf6d6', center: '#f1e0a6' }, // butter
  { petals: '#e3f1fc', center: '#c3dcf2' }, // sky
  { petals: '#fde9dc', center: '#f2cdb4' }, // peach
  { petals: '#f5e3f7', center: '#e3c6e9' }, // lilac
  { petals: '#fffaf0', center: '#ecdcb6' }, // cream
  { petals: '#fbe3e3', center: '#efc5c5' }, // rose
  { petals: '#e6e9fb', center: '#cbd0f1' }, // periwinkle
];

// The mushrooms' colors, one per level (level 1 first, then round again if
// there are more levels): shades of red, brown, tan and green. Each has its
// cap, the darker outline around it, and its spots.
export const MUSHROOM_COLORS = [
  { cap: '#e0483e', edge: '#8f231d', spots: '#fff6ee' }, // toadstool red
  { cap: '#8b5a3c', edge: '#4e2f1d', spots: '#f6e7d2' }, // chestnut brown
  { cap: '#6f9a42', edge: '#3c5a22', spots: '#f2f6dc' }, // moss green
  { cap: '#d4a86a', edge: '#8a6634', spots: '#fffaf0' }, // tan
  { cap: '#a8322d', edge: '#5e1714', spots: '#fbe9e2' }, // deep red
  { cap: '#8c8a3a', edge: '#525022', spots: '#f6f3d8' }, // olive green
  { cap: '#6b4430', edge: '#38231a', spots: '#f2e2cf' }, // chocolate brown
  { cap: '#c0562f', edge: '#6e2c15', spots: '#fdeee2' }, // rusty red
  { cap: '#3f6e3a', edge: '#21401f', spots: '#eef6e4' }, // forest green
  { cap: '#c8a27a', edge: '#7d5d3c', spots: '#fffaf2' }, // sandy tan
];
// Each level: how many rocks and mushrooms are on the grass, and how many
// circles long she has to grow to finish it. She keeps her circles from one
// level to the next, so each level means growing 20 more: level 1 has 3
// obstacles and is played to 20, up to 12 obstacles and 200 circles on level 10.
export const LEVELS = Array.from({ length: 10 }, (_, i) => ({ obstacles: 3 + i, goal: 20 * (i + 1) }));

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
