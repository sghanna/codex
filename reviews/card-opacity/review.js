'use strict';
(() => {
  const levels = [20,30,40,50,60,70];
  const rgb = hex => hex.slice(1).match(/../g).map(channel => parseInt(channel,16));
  const redInk = rgb(RED), blackInk = rgb(BLACK);
  const hand = ['3C','7C','10C','QC','4D','JD','QD','4S','10S','QS','5H','10H','QH'];
  const suits = {C:'clubs',D:'diamonds',S:'spades',H:'hearts'};
  const ranks = {J:'jack',Q:'queen',K:'king',A:'ace'};
  const name = card => `${ranks[card.slice(0,-1)] || card.slice(0,-1)} of ${suits[card.slice(-1)]}`;
  const opinions = {
    20:['Lighter shading','More reading contrast'],
    30:['Current game setting','Selected: Crimson with 30% shading'],
    40:['More separation','Less reading margin than 30%'],
    50:['Heavy shading','Red is getting close to 3:1'],
    60:['Red suits lose clarity','Red falls below 3:1'],
    70:['Too much detail obscured','Both ink colors fall below 3:1']
  };
  const luminance = rgb => rgb.map(c=>c/255).map(c=>c<=.04045 ? c/12.92 : ((c+.055)/1.055)**2.4).reduce((sum,c,i)=>sum+c*[.2126,.7152,.0722][i],0);
  function contrast(ink,level) {
    const shade = rgb=>rgb.map(c=>c*(1-level/100));
    return (luminance(shade([235,235,229]))+.05)/(luminance(shade(ink))+.05);
  }
  const rows = [hand.slice(0,5),hand.slice(5,9),hand.slice(9)];
  document.getElementById('options').innerHTML = levels.map(level=>{
    const red=contrast(redInk,level),black=contrast(blackInk,level);
    return `<article class="option" data-level="${level}" style="--shade:${level/100}" aria-labelledby="option-${level}">
      <header class="option-heading"><h2 id="option-${level}">${level}% <span>black overlay</span></h2><p>${opinions[level][0]}</p></header>
      <div class="sample"><div class="sample-instruction"><strong>Follow clubs</strong><span>4 playable</span></div>
        <div class="sample-hand"><div class="hand" aria-label="Your cards, ${level}% overlay">${rows.map(row=>`<div class="hand-row">${row.map(card=>`<button type="button" class="card ${card.endsWith('C')?'playable':'unplayable'}" data-card="${card}" aria-label="${name(card)}${card.endsWith('C')?'':', cannot play this turn'}" aria-pressed="false"${card.endsWith('C')?'':' aria-disabled="true"'}>${cardSVG(card.slice(0,-1),card.slice(-1))}</button>`).join('')}</div>`).join('')}</div></div>
        <p class="sample-status">Choose a club. Keep the other cards in view.</p>
      </div><div class="option-metrics"><span>Red: <strong>${red.toFixed(2)}:1</strong></span><span>Black: <strong>${black.toFixed(2)}:1</strong></span></div>
    </article>`;
  }).join('');
  document.querySelectorAll('.card svg').forEach(svg=>svg.setAttribute('aria-hidden','true'));
  document.getElementById('contrast-rows').innerHTML=levels.map(level=>`<tr><th scope="row">${level}%</th><td>${contrast(redInk,level).toFixed(2)}:1</td><td>${contrast(blackInk,level).toFixed(2)}:1</td><td>${opinions[level][1]}</td></tr>`).join('');
  let selected='';
  function select(card) {
    selected=selected===card?'':card;
    document.querySelectorAll('[data-card]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.card===selected)));
    const message=selected ? `Selected: ${name(selected)}. Same choice in all six options.` : 'Choose a club. Keep the other cards in view.';
    document.querySelectorAll('.sample-status').forEach(node=>node.textContent=message);
    document.getElementById('review-status').textContent=message;
  }
  document.querySelectorAll('.card').forEach(button=>button.addEventListener('click',()=>{
    if(button.classList.contains('unplayable')) {
      const message=`${name(button.dataset.card)} must wait. Follow clubs this turn.`;
      button.closest('.option').querySelector('.sample-status').textContent=message;
      document.getElementById('review-status').textContent=message;
    } else select(button.dataset.card);
  }));
  document.getElementById('clear-selection').addEventListener('click',()=>{selected='';select('');});
  document.getElementById('spacing').addEventListener('change',event=>document.querySelector('.review').classList.toggle('spread',event.target.value==='spread'));
})();
