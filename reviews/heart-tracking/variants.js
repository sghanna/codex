'use strict';
window.HeartPreview=(()=>{
 const params=new URLSearchParams(location.search);
 const option=['A','B','C'].includes(params.get('option'))?params.get('option'):'A';
 const scene=Object.hasOwn(HeartScenarios,params.get('scene'))?params.get('scene'):'capture';
 const playing=params.get('play')==='1';
 document.documentElement.dataset.heartOption=option;
 const key=`codex-hearts-tracking-${option}-${scene}-${playing?'play':'compare'}`;
 localStorage.removeItem(key+'-backup');
 localStorage.setItem(key,JSON.stringify({version:2,game:HeartScenarios[scene],selected:[]}));
 localStorage.setItem(key+'-settings',JSON.stringify({language:'en',pace:'slow',sound:false}));
 const names=['You','Michael','Jerry','Barbara'];
 let latest;
 window.addEventListener('resize',()=>{if(latest)render(latest);});
 function element(id,parent) {
  let node=document.getElementById(id);
  if(!node){node=document.createElement('aside');node.id=id;node.setAttribute('aria-live','polite');node.setAttribute('aria-atomic','true');parent.append(node);}
  return node;
 }
 function update(node,html){if(node.innerHTML!==html)node.innerHTML=html;}
 function render(state) {
  latest=state;
  const summary=HeartsInsights.summarize(state),candidate=summary.candidate;
  const table=document.querySelector('.trick-field');
  if(option==='A') {
   const node=element('ownership-row',table);
   document.getElementById('table-status').before(node);
   update(node,[1,2,3,0].map(p=>`<div class="ownership ${summary.points[p]?'has-points':''}"><span class="owner-name">${names[p]}</span><strong><span class="heart-symbol" aria-hidden="true">♥</span> ${summary.hearts[p]}<span class="sr-only"> hearts</span></strong><span class="queen-token">${summary.queenOwner===p?'Q♠ taken':'&nbsp;'}</span></div>`).join(''));
  }
  if(option==='B') {
   const node=element('capture-panel',table);
   document.getElementById('table-status').before(node);
   const tricks=[...state.history];
   if(state.phase==='trick-end')tricks.push({cards:state.trick,...HeartsEngine.trickResult(state.trick)});
   const last=tricks.findLast(trick=>trick.points>0);
   if(last){
    const hearts=last.cards.filter(play=>HeartsEngine.suit(play.card)==='H').length;
    const queen=last.cards.some(play=>play.card==='QS');
    const items=[hearts?`${hearts} ${hearts===1?'heart':'hearts'}`:'',queen?'Q♠':''].filter(Boolean).join(' + ');
    const now=state.phase==='trick-end' && last===tricks.at(-1);
    update(node,`<span class="panel-eyebrow">${now?'This trick':'Last points taken'}</span><strong>${names[last.winner]} took <span class="heart-symbol">${items}</span></strong><span>${names[last.winner]} now: ${summary.hearts[last.winner]} hearts${summary.queenOwner===last.winner?' + Q♠':''}</span>`);
   }else update(node,'<strong>No hearts taken yet</strong><span>Q♠ is still out.</span>');
  }
  if(option==='C') {
   const node=element('moon-panel',document.querySelector('.hand-area'));
   if(matchMedia('(min-width:650px) and (max-height:500px)').matches)document.querySelector('.table').append(node);
   else document.getElementById('hand-cue').before(node);
   const blocked=summary.moon==='blocked';node.classList.toggle('moon-blocked',blocked);
   if(blocked){
    const owners=summary.points.map((n,p)=>n?p:-1).filter(p=>p!==-1);
    const details=owners.map(p=>`${names[p]}: ${summary.hearts[p]?summary.hearts[p]+'♥':''}${summary.hearts[p] && summary.queenOwner===p?' + ':''}${summary.queenOwner===p?'Q♠':''}`).join(' · ');
    update(node,`<strong>No one can shoot the moon</strong><span>Points are split. ${details}</span>`);
   }else if(candidate!==-1){
    const complete=summary.remaining===0;
    const title=complete?`${names[candidate]} shot the moon`:candidate===0?'You could shoot the moon':`${names[candidate]} could shoot the moon`;
    const advice=complete?candidate===0?'Each opponent gets 26 points.':'You and the others get 26 points.':candidate===0?'Take every heart and Q♠.':'A heart won by anyone else stops it.';
    update(node,`<strong>${title}</strong><span class="moon-count">${summary.hearts[candidate]} of 13 hearts · ${summary.queenOwner===candidate?'Q♠ taken':'Q♠ still out'}</span><div class="heart-strip" aria-hidden="true">${Array.from({length:13},(_,i)=>`<span class="${i<summary.hearts[candidate]?'taken':''}">${i<summary.hearts[candidate]?'♥':'♡'}</span>`).join('')}</div><span>${advice}</span>`);
   }else update(node,'<strong>No hearts taken yet</strong><span>All 13 hearts and Q♠ are still out.</span>');
  }
 }
 return {key,playing,render};
})();
