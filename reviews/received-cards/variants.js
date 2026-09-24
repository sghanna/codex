'use strict';
(() => {
  const params = new URLSearchParams(location.search);
  const option = /^[A-F]$/.test(params.get('option')) ? params.get('option') : 'A';
  document.documentElement.dataset.receiptVariant = option;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const words = {
    en:{from:'{name} passed you these',newCards:'3 new cards',A:'Your new cards are in the gold tray.',B:'First row: the three cards you received.',C:'Only the new cards are bright.',D:'Review these, then start playing.',E:'Watch your new cards join your hand.',F:'Tap each new card above to review it.',reviewed:'Reviewed {n} of 3 new cards.',seen:'Seen',added:'Added to your hand'},
    es:{from:'{name} te pasó estas cartas',newCards:'3 cartas nuevas',A:'Las nuevas están en la bandeja dorada.',B:'Primera fila: las tres cartas recibidas.',C:'Solo las nuevas están sin sombrear.',D:'Revísalas y empieza a jugar.',E:'Mira cómo las nuevas llegan a tu mano.',F:'Toca cada carta nueva de arriba.',reviewed:'Revisaste {n} de 3 cartas nuevas.',seen:'Vista',added:'Añadidas a tu mano'},
    vi:{from:'{name} chuyển cho bạn',newCards:'3 lá mới',A:'Bài mới nằm trong khay vàng.',B:'Hàng đầu: ba lá bạn vừa nhận.',C:'Lá sáng là mới. Lá tối là bài cũ.',D:'Xem các lá này rồi bắt đầu chơi.',E:'Xem bài mới về tay bạn.',F:'Chạm từng lá mới ở trên để xem.',reviewed:'Đã xem {n} trong 3 lá mới.',seen:'Đã xem',added:'Đã thêm vào bài của bạn'}
  };
  const text=(key,values={})=>(words[document.documentElement.lang]||words.en)[key].replace(/\{(\w+)\}/g,(_,name)=>values[name]??'');
  const seen = new Set();
  let animations=[],arrivalTimer=null,restoreArrival=()=>{};
  function cleanup(){clearTimeout(arrivalTimer);animations.forEach(a=>a.cancel());animations=[];restoreArrival();restoreArrival=()=>{}}
  function render(state){
    cleanup();
    const game=document.querySelector('.game'),center=document.getElementById('center-cards');
    if(state.phase!=='received'||!state.passOffset){delete game.dataset.receiptOption;return}
    game.dataset.receiptOption=option;
    const sender=['You','Michael','Jerry','Barbara'][(4-state.passOffset)%4];
    document.getElementById('table-status').textContent=text('from',{name:sender});
    document.getElementById('hand-note').textContent=text(option);
    document.getElementById('action-label').textContent=HeartsText.t('begin');
    center.setAttribute('role','group');
    center.setAttribute('aria-label',HeartsText.t('receivedFrom',{name:sender})+': '+center.getAttribute('aria-label'));
    if(option==='B'){
      const hand=document.getElementById('hand');
      const cards=[...hand.querySelectorAll('.card')];
      const incoming=cards.filter(c=>state.received.includes(c.dataset.card));
      const old=cards.filter(c=>!state.received.includes(c.dataset.card));
      hand.replaceChildren();
      [incoming,old.slice(0,5),old.slice(5)].forEach(cards=>{const row=document.createElement('div');row.className='hand-row';row.append(...cards);hand.append(row)});
      document.getElementById('instruction').textContent=text('newCards');
    }
    if(option==='E'&&(reduced.matches||params.get('motion')==='reduce'))document.getElementById('hand-note').textContent=HeartsText.t('receivedHint');
    if(option==='E'&&!reduced.matches&&params.get('motion')!=='reduce'){
      const slots=[...center.children],targets=state.received.map(code=>document.querySelector(`#hand [data-card="${code}"]`));
      targets.forEach(card=>card.style.visibility='hidden');
      restoreArrival=()=>{targets.forEach(card=>card.style.visibility='');slots.forEach(card=>card.style.visibility='')};
      arrivalTimer=setTimeout(()=>{
        const travels=slots.map((slot,index)=>{
          const from=slot.getBoundingClientRect(),to=targets[index].getBoundingClientRect();
          const animation=slot.animate([{transform:'translate(0,0)'},{transform:`translate(${to.x-from.x}px,${to.y-from.y}px)`}],{duration:900,delay:index*180,easing:'ease-in-out',fill:'forwards'});
          animations.push(animation);
          return animation.finished.then(()=>{targets[index].style.visibility='';slot.style.visibility='hidden'});
        });
        Promise.all(travels).then(()=>{
          animations.forEach(a=>a.cancel());animations=[];
          const summary=document.createElement('div');summary.className='receipt-arrival-summary';
          const title=document.createElement('span');title.textContent=text('added');
          const cards=document.createElement('strong');cards.textContent=HeartsEngine.sort(state.received).map(c=>c.replace(/C$/,'♣').replace(/D$/,'♦').replace(/H$/,'♥').replace(/S$/,'♠')).join(' ');
          summary.append(title,cards);center.replaceChildren(summary);
          document.getElementById('hand-note').textContent=HeartsText.t('receivedHint');
        }).catch(()=>{});
      },650);
    }
    if(option==='F'){
      const update=()=>{document.getElementById('primary-action').disabled=seen.size!==3;document.getElementById('hand-note').textContent=seen.size?text('reviewed',{n:seen.size}):text('F')};
      [...center.children].forEach((slot,index)=>{
        const code=state.received[index],button=document.createElement('button');
        button.type='button';button.className='pass-slot filled receipt-choice';button.dataset.receivedCard=code;
        const suits={C:'clubs',D:'diamonds',H:'hearts',S:'spades'},ranks={A:'ace',J:'jack',Q:'queen',K:'king'};
        const rank=code.slice(0,-1);button.setAttribute('aria-label',HeartsText.t('cardName',{rank:ranks[rank]?HeartsText.t(ranks[rank]):rank,suit:HeartsText.t(suits[code.at(-1)])}));
        button.innerHTML=slot.innerHTML;
        const refresh=()=>{button.setAttribute('aria-pressed',String(seen.has(code)));button.querySelector('.receipt-seen')?.remove();if(seen.has(code)){const badge=document.createElement('span');badge.className='receipt-seen';badge.innerHTML='<svg viewBox="0 0 20 20" aria-hidden="true"><path d="m3 10 4 4 10-10" fill="none" stroke="currentColor" stroke-width="3"/></svg>';badge.append(document.createTextNode(text('seen')));button.append(badge)}};
        button.addEventListener('click',()=>{seen.add(code);refresh();update()});refresh();slot.replaceWith(button);
      });update();
    }
  }
  reduced.addEventListener('change',()=>{if(reduced.matches){cleanup();if(document.querySelector('.game').dataset.receiptOption==='E')document.getElementById('hand-note').textContent=HeartsText.t('receivedHint')}});
  window.ReceivedPreview={render};
})();
