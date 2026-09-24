import {webkit,E,I,KEY,url,createFixtures} from './support.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
const fixtureScope={window:{}};
vm.runInNewContext(await fs.readFile(new URL('../../reviews/heart-tracking/fixtures.js',import.meta.url),'utf8'),fixtureScope);
const practice=JSON.parse(JSON.stringify(fixtureScope.window.HeartScenarios));
const f=createFixtures();
function asYou(state) {
 const s=structuredClone(state),owner=I.summarize(s).candidate;
 const rotate=p=>(p-owner+4)%4;
 for(const key of ['hands','scores','handPoints'])s[key]=[0,1,2,3].map(p=>s[key][(p+owner)%4]);
 for(const trick of s.history){trick.winner=rotate(trick.winner);trick.cards.forEach(play=>play.player=rotate(play.player));}
 s.trick.forEach(play=>play.player=rotate(play.player));if(s.turn!==null)s.turn=rotate(s.turn);
 assert(E.validate(s));return s;
}
const states={none:f.trick,watch:f.liveMoonwatch,danger:f.liveMoondanger,blocked:practice.blocked,own:asYou(f.liveMoonwatch),complete:f.liveMooncomplete,ownComplete:asYou(f.liveMooncomplete),pending:f.moonYourTurn};
const browser=await webkit.launch();
try {
 for(const language of ['en','es','vi'])for(const [name,state] of Object.entries(states)){
  assert(E.validate(state));const summary=I.summarize(state);
  const ctx=await browser.newContext({viewport:{width:375,height:667},serviceWorkers:'block',reducedMotion:'reduce'});
  const page=await ctx.newPage();page.on('pageerror',error=>{throw error;});
  await page.clock.install();
  await page.addInitScript(({KEY,state,language})=>{
   localStorage.setItem(KEY,JSON.stringify({version:2,game:state,selected:[]}));
   localStorage.setItem('codex-hearts-settings-v2',JSON.stringify({language,pace:'slow',sound:false}));
  },{KEY,state,language});
  await page.goto(url);
  for(let p=0;p<4;p++){
   assert.equal(await page.locator(`[data-hearts-for="${p}"]`).textContent(),String(summary.hearts[p]));
   assert.equal(await page.locator(`[data-owner="${p}"] .queen-token`).count(),Number(summary.queenOwner===p));
  }
  const watch=page.locator('#hand-watch');
  assert.equal(await watch.locator('.heart-strip .taken').count(),summary.candidate===-1?0:summary.hearts[summary.candidate]);
  assert.equal(await watch.evaluate(el=>el.classList.contains('moon-blocked')),summary.moon==='blocked');
  if(language==='en'){
   if(name==='blocked')assert((await watch.innerText()).includes('No one can shoot the moon'));
   if(name==='own')assert((await watch.innerText()).includes('You could shoot the moon'));
   if(name==='ownComplete')assert((await watch.innerText()).includes('You shot the moon'));
   if(name==='none')assert((await watch.innerText()).includes('No hearts taken yet'));
  }
  const bounds=await page.locator('#primary-action').boundingBox();assert(bounds.y+bounds.height<=667);
  assert.deepEqual(await page.evaluate(KEY=>JSON.parse(localStorage.getItem(KEY)).game,KEY),state,'Rendering must not change game state');
  if(name==='pending'){
   const before=await page.locator('#ownership-row').innerHTML();
   await page.locator('#hand .playable').first().click({position:{x:20,y:20}});
   assert.equal(await page.locator('#ownership-row').innerHTML(),before,'Selection and pending hearts do not change ownership');
  }
  if(name==='watch'){
   await page.clock.runFor(1200);
   assert.deepEqual(await page.evaluate(KEY=>JSON.parse(localStorage.getItem(KEY)).game,KEY),E.collect(state));
   for(let p=0;p<4;p++)assert.equal(await page.locator(`[data-hearts-for="${p}"]`).textContent(),String(summary.hearts[p]),'Auto advance must not count hearts twice');
  }
  await ctx.close();
 }
 console.log('PASS: ownership, Q-spades split, pending cards, own/opponent moon, complete moon, unchanged saves, auto-advance totals, and three languages.');
}finally{await browser.close();}
