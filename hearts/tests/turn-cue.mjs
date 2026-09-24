import {webkit,E,KEY,url,artifacts,createFixtures} from './support.mjs';
import assert from 'node:assert/strict';
const fixtures=createFixtures(),browser=await webkit.launch();
async function load(state,reducedMotion='no-preference'){
 const page=await browser.newPage({viewport:{width:375,height:667},serviceWorkers:'block',reducedMotion});
 await page.clock.install();
 await page.addInitScript(({state,KEY})=>{
  localStorage.setItem(KEY,JSON.stringify({version:2,game:state,selected:[]}));
  localStorage.setItem('codex-hearts-settings-v2',JSON.stringify({language:'en',pace:'slow',sound:false}));
  window.turnCues=0;
  const animate=Element.prototype.animate;
  Element.prototype.animate=function(...args){if(this.classList.contains('hand-area'))window.turnCues++;return animate.apply(this,args)};
 },{state,KEY});
 await page.goto(url);return page;
}
try{
 const page=await load(fixtures.beforeAllPlayable);
 assert.equal(await page.locator('.is-your-turn').count(),0);
 await page.screenshot({path:artifacts+'/turn-waiting.png'});
 await page.clock.runFor(1500);
 assert.equal(await page.locator('#instruction').textContent(),'Your turn');
 assert.equal(await page.locator('#hand-note').textContent(),'Choose any card.');
 assert.equal(await page.locator('#hand .unplayable').count(),0);
 assert.equal(await page.locator('#hand .playable').count(),fixtures.allPlayable.hands[0].length);
 assert.equal(await page.evaluate(()=>window.turnCues),1);
 assert.equal(await page.locator('#hand-cue').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(18, 71, 106)');
 await page.locator('#hand .playable').nth(0).click({position:{x:20,y:20}});
 await page.locator('#hand .playable').nth(1).click({position:{x:20,y:20}});
 assert.equal(await page.evaluate(()=>window.turnCues),1,'Selection must not repeat the attention cue');
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.waitForFunction(()=>document.querySelector('.hand-area').getAnimations().length===0);
 assert.equal(await page.locator('.is-your-turn').count(),1,'Reduced Motion retains the static cue');
 assert.equal(await page.locator('.hand-area').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(18, 71, 106)');
 await page.locator('#primary-action').click();
 assert.equal(await page.locator('.is-your-turn').count(),0,'The cue ends immediately after playing');
 assert.equal(await page.locator('.hand-area').evaluate(e=>getComputedStyle(e).backgroundColor),'rgba(0, 0, 0, 0)');
 const saved=await page.evaluate(KEY=>JSON.parse(localStorage.getItem(KEY)).game,KEY);
 assert(E.validate(saved));
 assert.equal(saved.hands[0].length,fixtures.allPlayable.hands[0].length-1);
 await page.close();
 const reduced=await load(fixtures.beforeAllPlayable,'reduce');
 await reduced.clock.runFor(1500);
 assert.equal(await reduced.evaluate(()=>window.turnCues),0);
 assert.equal(await reduced.locator('.is-your-turn').count(),1);
 assert.equal(await reduced.locator('.hand-area').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(18, 71, 106)');
 await reduced.screenshot({path:artifacts+'/turn-all-playable.png'});
 await reduced.close();
 const restored=await load(fixtures.allPlayable,'reduce');
 assert.equal(await restored.locator('#instruction').textContent(),'Your turn');
 assert.equal(await restored.locator('.is-your-turn').count(),1);
 await restored.close();
 const restricted=await load(fixtures.play,'reduce');
 assert.equal(await restricted.locator('.hand-area').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(18, 71, 106)');
 assert((await restricted.locator('#hand .unplayable').count())>0);
 assert.equal(await restricted.locator('#hand .unplayable').first().evaluate(e=>getComputedStyle(e,'::after').opacity),'0.3');
 await restricted.close();
 console.log('PASS: all-playable turn transition, persistent blue hand, no repeated animation on selection, Reduced Motion, restore, restricted-card shading, and cue removal after play.');
}finally{await browser.close()}
