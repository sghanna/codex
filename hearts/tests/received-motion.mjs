import {webkit,E,KEY,url,artifacts,createFixtures} from './support.mjs';
import assert from 'node:assert/strict';
const fixtures=createFixtures(),browser=await webkit.launch();
const read=page=>page.evaluate(KEY=>JSON.parse(localStorage.getItem(KEY)).game,KEY);
async function load(state,viewport={width:375,height:667},reducedMotion='no-preference',language='en'){
 const page=await browser.newPage({viewport,serviceWorkers:'block',reducedMotion});
 page.on('pageerror',error=>{throw error});
 await page.clock.install();
 await page.addInitScript(({state,KEY,language})=>{
  localStorage.setItem(KEY,JSON.stringify({version:2,game:state,selected:[]}));
  localStorage.setItem('codex-hearts-settings-v2',JSON.stringify({language,pace:'slow',sound:false}));
 },{state,KEY,language});
 await page.goto(url);return page;
}
async function finish(page){
 await page.evaluate(()=>document.querySelector('.receipt-flight')?.getAnimations({subtree:true}).forEach(animation=>animation.finish()));
 await page.waitForFunction(()=>document.querySelector('.table').dataset.receipt==='done');
}
async function checkEmphasis(page){
 assert.equal(await page.locator('#hand .prior-card').count(),10);
 assert.equal(await page.locator('#hand .received').count(),3);
 assert(await page.locator('#hand .prior-card').evaluateAll(cards=>cards.every(card=>getComputedStyle(card,'::after').opacity==='0.3'&&getComputedStyle(card.querySelector('svg')).opacity==='1')));
 assert(await page.locator('#hand .received').evaluateAll(cards=>cards.every(card=>getComputedStyle(card).outlineStyle==='none'&&getComputedStyle(card,'::after').display==='none')));
}
try{
 for(const fixture of ['received','receivedTop'])for(const [width,height] of [[375,667],[390,740],[844,390]]){
  const state=fixtures[fixture],page=await load(state,{width,height});
  await checkEmphasis(page);
  assert.equal(await page.locator('#hand .receipt-pending').count(),3);
  await page.clock.runFor(650);
  assert.equal(await page.locator('.receipt-flight-card').count(),3);
  const first=await page.locator('.receipt-flight-card').first().boundingBox();
  const card=await page.locator('#hand .card').first().boundingBox();
  assert(Math.abs(first.width-card.width)<.01);assert(Math.abs(first.height-card.height)<.01);
  await page.evaluate(()=>document.querySelector('.receipt-flight').getAnimations({subtree:true}).forEach(animation=>{animation.pause();animation.currentTime=500}));
  await page.screenshot({path:`${artifacts}/received-flight-${fixture}-${width}.png`});
  await page.evaluate(()=>document.querySelector('.receipt-flight').getAnimations({subtree:true})[0].finish());
  await page.waitForFunction(code=>!document.querySelector(`#hand [data-card="${code}"]`).classList.contains('receipt-pending'),state.received[0]);
  assert.equal(await page.locator('#hand .receipt-pending').count(),2,'Each arrival reveals its matching card');
  await finish(page);
  assert.equal(await page.locator('.receipt-flight').count(),0);
  assert.equal(await page.locator('.receipt-pending').count(),0);
  assert.equal(await page.locator('.receipt-summary').count(),1);
  await checkEmphasis(page);
  assert.deepEqual(await read(page),state,'The animation must not change cards or scores');
  await page.clock.runFor(4000);
  assert.deepEqual(await read(page),state,'Play waits for the player to continue');
  const action=await page.locator('#primary-action').boundingBox();assert(action.y+action.height<=height);
  await page.screenshot({path:`${artifacts}/received-combined-${fixture}-${width}.png`});
  await page.locator('#primary-action').click();
  assert.deepEqual(await read(page),E.begin(state));
  assert.equal(await page.locator('.prior-card, .received, .receipt-pending, .receipt-flight').count(),0);
  await page.close();
 }
 const paused=await load(fixtures.receivedTop);
 await paused.locator('#menu-button').click();await paused.clock.runFor(5000);
 assert.equal(await paused.locator('.receipt-flight').count(),0);
 await paused.locator('#menu-dialog .dialog-action').click();await paused.clock.runFor(650);
 await paused.locator('#menu-button').click();
 assert(await paused.evaluate(()=>document.querySelector('.receipt-flight').getAnimations({subtree:true}).every(animation=>animation.playState==='paused')));
 await paused.locator('#menu-dialog .dialog-action').click();
 await paused.setViewportSize({width:844,height:390});
 await paused.waitForFunction(()=>document.querySelector('.table').dataset.receipt==='done');
 assert.equal(await paused.locator('.receipt-flight, .receipt-pending').count(),0);
 await paused.locator('#menu-button').click();await paused.locator('#settings-button').click();
 await paused.locator('#language').selectOption('es');
 assert.equal(await paused.locator('.receipt-summary').count(),1,'Changing settings must not replay a completed arrival');
 await paused.close();
 for(const delay of [0,650]){
  const page=await load(fixtures.receivedTop);if(delay)await page.clock.runFor(delay);
  await page.locator('#primary-action').click();
  assert.deepEqual(await read(page),E.begin(fixtures.receivedTop));
  assert.equal(await page.locator('.receipt-flight, .receipt-pending').count(),0,'Starting early cleans up pending cards');
  await page.close();
 }
 const reloaded=await load(fixtures.receivedTop);
 await reloaded.clock.runFor(650);await reloaded.reload();
 assert.deepEqual(await read(reloaded),fixtures.receivedTop);
 await reloaded.clock.runFor(650);await finish(reloaded);await reloaded.close();
 for(const language of ['en','es','vi']){
  const page=await load(fixtures.receivedTop,{width:375,height:667},'reduce',language);
  await checkEmphasis(page);
  assert.equal(await page.locator('.receipt-pending, .receipt-flight').count(),0);
  assert.equal(await page.locator('#center-cards .pass-slot').count(),3,'Reduced Motion keeps a static review of all new cards');
  assert.equal(await page.locator('.table').getAttribute('data-receipt'),'done');
  await page.screenshot({path:`${artifacts}/received-combined-${language}-reduced.png`});
  await page.close();
 }
 const reduced=await load(fixtures.receivedTop);
 await reduced.clock.runFor(650);await reduced.emulateMedia({reducedMotion:'reduce'});
 await reduced.waitForFunction(()=>document.querySelector('.table').dataset.receipt==='done');
 assert.equal(await reduced.locator('.receipt-flight, .receipt-pending').count(),0);await reduced.close();
 const hold=await load(fixtures.hold);
 assert.equal(await hold.locator('.prior-card, .received, .receipt-pending, .receipt-flight').count(),0);await hold.close();
 const real=await browser.newPage({viewport:{width:375,height:667},serviceWorkers:'block'});
 await real.addInitScript(({state,KEY})=>localStorage.setItem(KEY,JSON.stringify({version:2,game:state,selected:[]})),{state:fixtures.receivedTop,KEY});
 await real.goto(url);await real.waitForFunction(()=>document.querySelector('.table').dataset.receipt==='done',{},{timeout:6000});
 assert.equal(await real.locator('.receipt-flight, .receipt-pending').count(),0);await real.close();
 console.log('PASS: received-card travel and 30% shading, no received outlines/badges, three viewport sizes, pause, resize, language, early start, reload, Reduced Motion, hold hand, unchanged saves, and real-time completion.');
}finally{await browser.close()}
