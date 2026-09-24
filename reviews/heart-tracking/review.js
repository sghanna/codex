'use strict';
const notes={capture:'Michael just took 2 hearts. He now has 4 hearts and Q♠; nobody else has points.',risk:'Michael has 10 of 13 hearts and Q♠. If he takes the last 3 hearts, each opponent gets 26 points.',blocked:'Barbara has a heart, and Michael has Q♠. No one can shoot the moon this hand, even though more hearts remain.'};
function show(scene) {
 document.getElementById('scene-note').textContent=notes[scene];
 document.querySelectorAll('[data-scene]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.scene===scene)));
 document.querySelectorAll('iframe[data-option]').forEach(frame=>frame.src=`game.html?option=${frame.dataset.option}&scene=${scene}`);
 document.querySelectorAll('[data-play]').forEach(link=>link.href=`game.html?option=${link.dataset.play}&scene=${scene}&play=1`);
}
document.querySelectorAll('[data-scene]').forEach(button=>button.addEventListener('click',()=>show(button.dataset.scene)));
show('capture');
