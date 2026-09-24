'use strict';
for (const setting of ['wallpaper', 'size']) {
  const buttons = [...document.querySelectorAll(`button[data-${setting}]`)];
  for (const button of buttons) button.addEventListener('click', () => {
    document.documentElement.dataset[setting] = button.dataset[setting];
    buttons.forEach(other => other.setAttribute('aria-pressed', String(other === button)));
    const {wallpaper, size} = document.documentElement.dataset;
    document.getElementById('preview-status').textContent = `${wallpaper === 'dark' ? 'Dark' : 'Light'} wallpaper, ${size} icons. All six previews updated.`;
  });
}
