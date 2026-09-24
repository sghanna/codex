'use strict';
(() => {
  const params = new URLSearchParams(location.search);
  const option = /^[A-F]$/.test(params.get('option')) ? params.get('option') : 'A';
  document.documentElement.dataset.option = option;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let animations = [];
  function leave() { animations.forEach(animation => animation.cancel()); animations = []; }
  function enter() {
    leave();
    if (motion.matches || params.get('motion') === 'reduce' || option === 'C' || !Element.prototype.animate) return;
    const cue = document.getElementById('hand-cue');
    const hand = document.querySelector('.hand-area');
    let target = cue, frames, duration = 1100;
    if (option === 'A' || option === 'B') {
      const color = option === 'A' ? '#ffe2a0' : '#bce8ff';
      frames = [{boxShadow:`0 0 0 1px ${color}`}, {boxShadow:`0 0 0 5px ${color}66, 0 0 22px 5px ${color}66`,offset:.4}, {boxShadow:`0 0 0 1px ${color}`}];
    } else if (option === 'D') {
      target = hand;
      frames = [{boxShadow:'0 0 0 3px #ffe2a0'}, {boxShadow:'0 0 0 5px #ffe2a0, 0 0 18px #ffe2a066',offset:.4}, {boxShadow:'0 0 0 3px #ffe2a0'}];
    } else if (option === 'E') {
      target = document.querySelector('.you-score');
      frames = [{boxShadow:'0 0 0 1px #ffe2a0'}, {boxShadow:'0 0 0 4px #ffe2a0, 0 0 20px #ffe2a088',offset:.4}, {boxShadow:'0 0 0 1px #ffe2a0'}];
    } else {
      target = hand; duration = 800;
      frames = [{backgroundColor:'#173a2a',boxShadow:'0 0 0 0px #91d3ff'}, {backgroundColor:'#12476a',boxShadow:'0 0 0 3px #91d3ff'}];
    }
    animations.push(target.animate(frames,{duration,easing:'ease-out'}));
  }
  motion.addEventListener('change',()=>{if(motion.matches)leave()});
  window.TurnCuePreview = {enter,leave};
})();
