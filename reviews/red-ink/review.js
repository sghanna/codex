'use strict';
(() => {
  const choices = [
    {id:'A',name:'Scarlet',hex:'#ad221c',note:'Closest to the current red, with stronger contrast.'},
    {id:'B',name:'Crimson',hex:'#961c18',note:'My recommendation: clear red with more contrast.'},
    {id:'C',name:'Deep red',hex:'#7f1714',note:'The darkest option. Strongest contrast against the paper.'}
  ];
  const hand = ['3C','7C','10C','QC','4D','JD','QD','4S','10S','QS','5H','10H','QH'];
  const rows = [hand.slice(0,5),hand.slice(5,9),hand.slice(9)];
  const names = {C:'clubs',D:'diamonds',S:'spades',H:'hearts'};
  const ranks = {J:'jack',Q:'queen',K:'king',A:'ace'};
  const name = card=>`${ranks[card.slice(0,-1)] || card.slice(0,-1)} of ${names[card.slice(-1)]}`;
  // Recolor the existing red glyphs only; the geometry and black ink stay identical.
  const face = (card,ink)=>cardSVG(card.slice(0,-1),card.slice(-1)).replaceAll(`fill="${RED}"`,`fill="${ink}"`);
  const luminance = rgb=>rgb.map(c=>c/255).map(c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4).reduce((sum,c,i)=>sum+c*[.2126,.7152,.0722][i],0);
  const contrast = (hex,overlay)=>{
    const ink=hex.slice(1).match(/../g).map(c=>parseInt(c,16)*(1-overlay));
    return ((luminance([235,235,229].map(c=>c*(1-overlay)))+.05)/(luminance(ink)+.05)).toFixed(2);
  };
  const pair = (ink,shaded)=>['10D','QH','QS'].map(card=>`<div class="card ${shaded?'shaded':''}" role="img" aria-label="${name(card)}${shaded?', beneath a 20% black overlay':''}">${face(card,ink)}</div>`).join('');
  document.getElementById('options').innerHTML=choices.map(choice=>`<article class="option" data-choice="${choice.id}" style="--ink:${choice.hex};--shade:.2" aria-labelledby="choice-${choice.id}">
    <header class="option-heading"><h2 id="choice-${choice.id}">${choice.id} · ${choice.name}</h2><div class="ink-value"><span class="ink-swatch" aria-hidden="true"></span><code>${choice.hex.toUpperCase()}</code></div><p>${choice.note}</p></header>
    <div class="pair-samples"><p class="ink-state">Playable · full brightness</p><div class="ink-cards">${pair(choice.hex,false)}</div><p class="ink-state">Unplayable · 20% overlay</p><div class="ink-cards">${pair(choice.hex,true)}</div></div>
    <div class="sample sample-hand-view"><div class="sample-instruction"><strong>Follow clubs</strong><span>4 playable</span></div><div class="sample-hand"><div class="hand" aria-label="Same sample hand in ${choice.name}">${rows.map(row=>`<div class="hand-row">${row.map(card=>`<button type="button" class="card ${card.endsWith('C')?'playable':'unplayable'}" data-card="${card}" aria-label="${name(card)}${card.endsWith('C')?'':', cannot play this turn'}" aria-pressed="false"${card.endsWith('C')?'':' aria-disabled="true"'}>${face(card,choice.hex)}</button>`).join('')}</div>`).join('')}</div></div><p class="sample-status">Choose a club. Compare the shaded hearts and diamonds.</p></div>
    <div class="option-metrics ink-metrics"><div><span>Full brightness</span><strong>${contrast(choice.hex,0)}:1</strong></div><div><span>With 20% overlay</span><strong>${contrast(choice.hex,.2)}:1</strong></div></div>
  </article>`).join('');
  document.querySelectorAll('.card svg').forEach(svg=>svg.setAttribute('aria-hidden','true'));
  document.getElementById('view').addEventListener('change',event=>document.querySelector('.review').classList.toggle('show-hand',event.target.value==='hand'));
  let selected='';
  document.querySelectorAll('button.card').forEach(button=>button.addEventListener('click',()=>{
    const card=button.dataset.card;
    if(!card.endsWith('C')) {
      const message=`${name(card)} must wait. Follow clubs this turn.`;
      button.closest('.option').querySelector('.sample-status').textContent=message;
      document.getElementById('review-status').textContent=message;return;
    }
    selected=selected===card?'':card;
    document.querySelectorAll('button.card').forEach(node=>node.setAttribute('aria-pressed',String(node.dataset.card===selected)));
    const message=selected?`Selected: ${name(selected)}. Same choice in all three options.`:'Choose a club. Compare the shaded hearts and diamonds.';
    document.querySelectorAll('.sample-status').forEach(node=>node.textContent=message);
    document.getElementById('review-status').textContent=message;
  }));
})();
