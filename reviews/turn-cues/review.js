'use strict';
const frames = [...document.querySelectorAll('iframe[data-option]')];
const reduce = document.getElementById('reduce-motion');
function replay(frame) {
  const next = new URL('game.html',location.href);
  next.searchParams.set('option',frame.dataset.option);
  if (reduce.checked) next.searchParams.set('motion','reduce');
  next.searchParams.set('replay',Date.now());
  frame.src = next.href;
}
// Start each comparison when it is visible, so lower rows get an entrance too.
const observer = new IntersectionObserver(entries=>entries.forEach(entry=>{
  if (!entry.isIntersecting) return;
  if (!entry.target.hasAttribute('src')) replay(entry.target);
  observer.unobserve(entry.target);
}),{threshold:.15});
frames.forEach(frame=>observer.observe(frame));
document.querySelectorAll('[data-replay]').forEach(button=>button.addEventListener('click',()=>replay(frames.find(frame=>frame.dataset.option===button.dataset.replay))));
document.getElementById('replay-all').addEventListener('click',()=>frames.forEach(replay));
reduce.addEventListener('change',()=>{
  frames.filter(frame=>frame.hasAttribute('src')).forEach(replay);
  document.querySelectorAll('.actions a').forEach(link=>{
    const next = new URL(link.href);
    if (reduce.checked) next.searchParams.set('motion','reduce'); else next.searchParams.delete('motion');
    link.href = next.href;
  });
});
