import fs from 'node:fs/promises';
import vm from 'node:vm';

// Reuse the card artwork already in this game. Every exported SVG is standalone.
const scope = vm.createContext({});
vm.runInContext(await fs.readFile(new URL('../../hearts/deck.js', import.meta.url), 'utf8'), scope);
const card = (rank, suit, x, y, width, rotation = 0) => {
  const height = width * 1.5;
  const svg = vm.runInContext(`cardSVG('${rank}','${suit}')`, scope)
    .replace('width="100%" height="100%"', `x="${x}" y="${y}" width="${width}" height="${height}"`);
  return `<g transform="rotate(${rotation} ${x + width / 2} ${y + height / 2})">${svg}</g>`;
};
const heartPath = 'M50 93C39 82 4 58 4 32C4 7 35 1 50 24C65 1 96 7 96 32C96 58 61 82 50 93Z';
const heart = (x, y, size, fill, extra = '') => `<path d="${heartPath}" transform="translate(${x} ${y}) scale(${size / 100})" fill="${fill}" ${extra}/>`;
const spade = (x, y, size, fill, extra = '') => `<path d="M50 4C40 21 5 39 5 61C5 82 33 88 46 68C44 83 40 91 33 97H67C60 91 56 83 54 68C67 88 95 82 95 61C95 39 60 21 50 4Z" transform="translate(${x} ${y}) scale(${size / 100})" fill="${fill}" ${extra}/>`;
const defs = `<defs>
  <radialGradient id="felt" cx=".35" cy=".15" r="1"><stop stop-color="#245d44"/><stop offset="1" stop-color="#0c2b21"/></radialGradient>
  <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fff0bd"/><stop offset=".5" stop-color="#e9c575"/><stop offset="1" stop-color="#c99743"/></linearGradient>
  <linearGradient id="night" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#23496b"/><stop offset="1" stop-color="#101f3b"/></linearGradient>
  <linearGradient id="paper" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#fff9ed"/><stop offset="1" stop-color="#eee3cc"/></linearGradient>
</defs>`;
const background = fill => `<path fill="${fill}" d="M0 0H512V512H0Z"/>`;
const icons = [
  ['a', 'Bold heart', background('#fff6e5') + heart(60, 40, 392, '#961c18')],
  ['b', 'Ace of hearts', background('url(#felt)') + card('A', 'H', 138, 75, 236, -9)],
  ['c', 'Card fan', background('url(#night)') + card('Q', 'S', 94, 104, 196, -22) + card('K', 'H', 226, 103, 196, 20) + card('A', 'H', 158, 111, 210)],
  ['d', 'Gold seal', background('url(#felt)') + '<circle cx="256" cy="256" r="194" fill="url(#gold)"/><circle cx="256" cy="256" r="170" fill="none" stroke="#775022" stroke-width="5"/>' + heart(116, 105, 280, '#961c18')],
  ['e', 'Moonlight', background('url(#night)') + '<path d="M285 64C198 104 175 203 224 284C254 334 316 363 379 347C339 421 251 451 175 411C83 363 52 250 100 160C138 89 211 53 285 64Z" fill="url(#gold)"/>' + heart(220, 167, 226, '#fff6e5') + '<path d="m375 72 8 22 22 8-22 8-8 22-8-22-22-8 22-8Z" fill="#fff0bd"/>'],
  ['f', 'Heart & spade', background('url(#paper)') + heart(46, 39, 294, '#961c18') + spade(198, 210, 250, '#152c24', 'stroke="#fff6e5" stroke-width="6" stroke-linejoin="round" paint-order="stroke fill"')],
];
await fs.mkdir(new URL('./icons/', import.meta.url), {recursive: true});
for (const [id, title, artwork] of icons) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512" role="img" aria-label="${title.replace('&', '&amp;')}">${defs}${artwork}</svg>\n`;
  await fs.writeFile(new URL(`./icons/${id}.svg`, import.meta.url), svg);
}
console.log('Created six standalone home-screen icon options.');
