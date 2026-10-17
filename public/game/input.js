// Which directions to show under the garden: 'touch' or 'keys'. Starts from
// what the device mainly uses (a finger is a "coarse" pointer), then follows
// what the player actually does, for devices that have both.
export function watchInputMode(root = document.documentElement, win = window) {
  const set = (mode) => {
    root.classList.toggle('input-touch', mode === 'touch');
    root.classList.toggle('input-keys', mode === 'keys');
  };
  set(win.matchMedia?.('(pointer: coarse)').matches ? 'touch' : 'keys');
  win.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'touch' || event.pointerType === 'pen') set('touch');
  });
  win.addEventListener('keydown', (event) => {
    if (event.key.startsWith('Arrow')) set('keys');
  });
}
