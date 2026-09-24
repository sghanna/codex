import {webkit,E,I,KEY,url,createFixtures} from './support.mjs';
import assert from 'node:assert/strict';
const fixtures=createFixtures();
const browser=await webkit.launch();
async function load(state,selected=[]){
 const page=await browser.newPage({viewport:{width:375,height:667},serviceWorkers:'block',reducedMotion:'reduce'});
 await page.clock.install();
 await page.addInitScript(({state,selected,KEY})=>{
  localStorage.setItem(KEY,JSON.stringify({version:2,game:state,selected}));
  localStorage.setItem('codex-hearts-settings-v2',JSON.stringify({language:'en',pace:'slow',sound:false}));
 },{state,selected,KEY});
 await page.goto(url);return page;
}
try{
 for(const [fixture,moon] of [['liveMoonwatch','watch'],['liveMoondanger','danger'],['liveMooncomplete','complete'],['trick',I.summarize(fixtures.trick).moon]]){
  const s=fixtures[fixture],summary=I.summarize(s),page=await load(s);
  assert.equal(await page.locator('#hand-watch').getAttribute('data-moon'),moon);
  for(let p=0;p<4;p++)assert.equal(await page.locator(`[data-hand-for="${p}"]`).textContent(),String(summary.points[p]));
  if(moon!=='open')assert((await page.locator('#hand-watch').textContent()).includes(`${summary.hearts[summary.candidate]}/13`));
  const hand=await page.locator('#hand .card').first().boundingBox();
  const played=await page.locator('.trick-card').first().boundingBox();
  if(hand && played){assert.equal(hand.width,played.width);assert.equal(hand.height,played.height);}
  await page.clock.runFor(1300);
  assert.equal(await page.locator('.trick-flight').count(),0);
  const points=summary.points;
  if(s.history.length<12){
   for(let p=0;p<4;p++)assert.equal(await page.locator(`[data-hand-for="${p}"]`).textContent(),String(points[p]));
  }
  await page.close();
 }
 const moonTurn=await load(fixtures.moonYourTurn);
 await moonTurn.evaluate(()=>{window.watchMutations=0;new MutationObserver(records=>window.watchMutations+=records.length).observe(document.getElementById('hand-watch'),{childList:true,subtree:true,characterData:true});});
 await moonTurn.locator('#hand .playable').first().click({position:{x:20,y:20}});
 assert.equal(await moonTurn.evaluate(()=>window.watchMutations),0,'Selecting a card must not reannounce the SVG moon banner');
 await moonTurn.close();
 const s=fixtures.play,page=await load(s),legal=E.legalCards(s,0);
 assert.deepEqual(await page.locator('#hand .playable').evaluateAll(cards=>cards.map(c=>c.dataset.card)),legal);
 assert.equal(await page.locator('#hand .unplayable').count(),s.hands[0].length-legal.length);
 assert.equal(await page.locator('#instruction').textContent(),'Your turn');
 assert((await page.locator('#hand-note').textContent()).startsWith('Follow'));
 const off=s.hands[0].find(c=>!legal.includes(c));
 if(off){
  // Disabled cards remain tappable to explain the rule, but never change the move.
  await page.locator(`[data-card="${off}"]`).evaluate(el=>el.click());
  assert((await page.locator('#hand-note').textContent()).startsWith('You must follow'));
  assert(await page.locator('#primary-action').isDisabled());
 }
 await page.evaluate(()=>{
  window.watchMutations=0;
  new MutationObserver(records=>window.watchMutations+=records.length).observe(document.getElementById('hand-watch'),{childList:true,subtree:true,characterData:true});
 });
 await page.locator(`[data-card="${legal[0]}"]`).click({position:{x:20,y:20}});
 assert.equal(await page.evaluate(()=>window.watchMutations),0,'Selecting a card must not reannounce the moon banner');
 await page.close();
 // A human who holds 2C gets an immediate selection and a three-second countdown.
 let opening;
 for(let seed=1;seed<100 && !opening;seed++){
  let value=seed;const random=()=>{value=(Math.imul(value,1664525)+1013904223)>>>0;return value/4294967296};
  const deal=E.newGame(random),received=E.pass(deal,deal.hands.map((_,p)=>E.choosePass(E.viewFor(deal,p))));
  if(E.begin(received).turn===0)opening=received;
 }
 assert(opening);const sole=await load(opening);
 await sole.locator('#primary-action').click();
 assert.equal(await sole.locator('#hand [aria-pressed="true"]').getAttribute('data-card'),'2C');
 assert(!(await sole.locator('#primary-action').isDisabled()));
 await sole.clock.runFor(2500);
 assert.equal(await sole.evaluate(KEY=>JSON.parse(localStorage.getItem(KEY)).game.trick.length,KEY),0);
 await sole.clock.runFor(500);
 assert.equal(await sole.evaluate(KEY=>JSON.parse(localStorage.getItem(KEY)).game.trick[0].card,KEY),'2C');
 await sole.close();
 console.log('PASS: live hand scores, moon progression, full-size played cards, reduced motion, legal-card guidance, stable announcements, and sole-card auto play.');
}finally{await browser.close()}
