import {webkit,E,KEY,url,createFixtures} from './support.mjs';
import assert from 'node:assert/strict';
const fixtures=createFixtures();let opening;
for(let seed=1;seed<100 && !opening;seed++){
 let n=seed;const random=()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};
 const deal=E.newGame(random);const received=E.pass(deal,deal.hands.map((_,p)=>E.choosePass(E.viewFor(deal,p))));
 const state=E.begin(received);if(state.turn===0)opening=state;
}
assert(opening);const forced=E.legalCards(opening,0)[0],expected=E.play(opening,0,forced);
const browser=await webkit.launch();
const read=page=>page.evaluate(KEY=>JSON.parse(localStorage.getItem(KEY)).game,KEY);
async function open(state=opening,language='en',reducedMotion='no-preference'){
 const context=await browser.newContext({viewport:{width:375,height:667},serviceWorkers:'block',reducedMotion});
 const page=await context.newPage();page.on('pageerror',e=>{throw e;});
 await page.addInitScript(({KEY,state,language})=>{if(!localStorage.getItem(KEY))localStorage.setItem(KEY,JSON.stringify({version:2,game:state,selected:[]}));localStorage.setItem('codex-hearts-settings-v2',JSON.stringify({language,pace:'slow',sound:false}));},{KEY,state,language});
 const now=new Date('2026-09-24T12:00:00Z');await page.clock.install({time:now});await page.clock.pauseAt(now);
 await page.goto(url);return {context,page};
}
try{
 for(const language of ['en','es','vi']){
  const {context,page}=await open(opening,language,language==='vi'?'reduce':'no-preference');
  assert.equal(await page.locator('#hand [aria-pressed="true"]').getAttribute('data-card'),forced);
  assert.equal(await page.locator('#action-detail').innerText(),'3s');
  assert(await page.locator('#primary-action').evaluate(el=>el.scrollWidth<=el.clientWidth));
  const bounds=await page.locator('#primary-action').boundingBox();assert(bounds.y+bounds.height<=667);
  await page.clock.runFor(2999);assert.deepEqual(await read(page),opening);
  assert.equal(await page.locator('#action-detail').innerText(),'1s');
  await page.clock.runFor(1);assert.deepEqual(await read(page),expected);await context.close();
 }
 {
  const {context,page}=await open();await page.clock.runFor(1400);await page.locator('#menu-button').click();
  await page.clock.runFor(20000);assert.deepEqual(await read(page),opening);
  await page.locator('#settings-button').click();await page.locator('#language').selectOption('es');
  await page.clock.runFor(10000);assert.deepEqual(await read(page),opening);
  await page.locator('#settings-dialog .dialog-action').click();
  await page.clock.runFor(1599);assert.deepEqual(await read(page),opening);
  await page.clock.runFor(1);assert.deepEqual(await read(page),expected);await context.close();
 }
 {
  const {context,page}=await open();await page.clock.runFor(1000);
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
  await page.clock.runFor(10000);assert.deepEqual(await read(page),opening);
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));});
  await page.clock.runFor(1999);assert.deepEqual(await read(page),opening);await page.clock.runFor(1);assert.deepEqual(await read(page),expected);await context.close();
 }
 {
  const {context,page}=await open();await page.clock.runFor(2500);await page.locator('#primary-action').click();
  assert.deepEqual(await read(page),expected);await page.clock.runFor(600);assert.deepEqual(await read(page),expected,'No stale timer after manual play');await context.close();
 }
 {
  const {context,page}=await open();await page.clock.runFor(1500);
  await page.locator(`[data-card="${forced}"]`).click({position:{x:20,y:20}});
  assert.equal(await page.locator('#hand [aria-pressed="true"]').count(),1,'A sole card stays selected');
  await page.reload();await page.clock.runFor(2999);assert.deepEqual(await read(page),opening);
  await page.clock.runFor(1);assert.deepEqual(await read(page),expected,'Reload gives a fresh three-second review');await context.close();
 }
 {
  const state=fixtures.allPlayable;assert(E.legalCards(state,0).length>1);
  const {context,page}=await open(state);await page.locator('#hand .playable').first().click({position:{x:20,y:20}});
  await page.clock.runFor(15000);assert.deepEqual(await read(page),state,'A selected card must not auto-play when alternatives exist');await context.close();
 }
 // Restore a late forced turn that completes a trick, to exercise the transition into collection.
 {
  let s=fixtures.liveMooncomplete;
  while(!(s.phase==='play' && s.history.length===12 && s.trick.length===3)){
   if(s.phase==='trick-end')s=E.collect(s);
   else if(s.phase==='play')s=E.play(s,s.turn,E.choosePlay(E.viewFor(s,s.turn)));
   else throw Error('Missing forced final-card fixture');
  }
  const offset=s.turn,rotate=p=>(p-offset+4)%4;
  for(const key of ['hands','scores','handPoints'])s[key]=[0,1,2,3].map(p=>s[key][(p+offset)%4]);
  for(const trick of s.history){trick.winner=rotate(trick.winner);trick.cards.forEach(play=>play.player=rotate(play.player));}
  s.trick.forEach(play=>play.player=rotate(play.player));s.turn=0;assert(E.validate(s));
  const {context,page}=await open(s);const card=E.legalCards(s,0)[0];await page.clock.runFor(3000);
  assert.deepEqual(await read(page),E.play(s,0,card));await context.close();
 }
 console.log('PASS: instant sole-card selection, three-second play, manual skip, pause/resume, reload, multiple-choice guard, late trick, and three languages.');
}finally{await browser.close();}
