import {webkit,E,KEY,url,createFixtures} from './support.mjs';
import assert from 'node:assert/strict';
const fixtures=createFixtures(),trick=fixtures.trick;
let finalTrick=fixtures.liveMooncomplete;
while(finalTrick.history.length<12 || finalTrick.phase!=='trick-end')finalTrick=finalTrick.phase==='trick-end'?E.collect(finalTrick):E.play(finalTrick,finalTrick.turn,E.choosePlay(E.viewFor(finalTrick,finalTrick.turn)));
const browser=await webkit.launch();
const read=page=>page.evaluate(KEY=>JSON.parse(localStorage.getItem(KEY)).game,KEY);
async function open(state=trick,reducedMotion='no-preference') {
 const context=await browser.newContext({viewport:{width:375,height:667},serviceWorkers:'block',reducedMotion});
 const page=await context.newPage();page.on('pageerror',error=>{throw error;});
 await page.addInitScript(({KEY,state})=>{if(!localStorage.getItem(KEY))localStorage.setItem(KEY,JSON.stringify({version:2,game:state,selected:[]}));},{KEY,state});
 const now=new Date('2026-09-24T12:00:00Z');await page.clock.install({time:now});await page.clock.pauseAt(now);
 await page.goto(url);return {context,page};
}
async function finish(page) {await page.evaluate(()=>document.getAnimations().forEach(a=>a.finish()));await page.waitForFunction(KEY=>JSON.parse(localStorage.getItem(KEY)).game.phase!=='trick-end',KEY);}
try {
 {
  const {context,page}=await open();await page.clock.runFor(1200);
  assert.equal(await page.locator('.trick-flight-card').count(),4);assert.deepEqual(await read(page),trick);
  await finish(page);assert.deepEqual(await read(page),E.collect(trick),'No additional delay after collection animation');
  await page.clock.runFor(1000);assert.deepEqual(await read(page),E.collect(trick),'No duplicate collection');await context.close();
 }
 {
  const {context,page}=await open();await page.clock.runFor(1200);await page.locator('#menu-button').click();
  await page.clock.runFor(10000);assert.deepEqual(await read(page),trick);
  // Rotation may safely complete a paused animation, but must not advance behind Menu.
  await page.setViewportSize({width:844,height:390});
  await page.waitForFunction(()=>document.querySelector('.table').dataset.collection==='done');
  assert.deepEqual(await read(page),trick);await page.locator('#menu-dialog .dialog-action').click();
  assert.deepEqual(await read(page),E.collect(trick));await context.close();
 }
 {
  const {context,page}=await open();await page.clock.runFor(1200);
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
  await page.clock.runFor(10000);assert.deepEqual(await read(page),trick);
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));});
  await finish(page);assert.deepEqual(await read(page),E.collect(trick));await context.close();
 }
 {
  const {context,page}=await open();await page.clock.runFor(1200);await page.reload();
  assert.deepEqual(await read(page),trick);await page.clock.runFor(1200);await finish(page);
  assert.deepEqual(await read(page),E.collect(trick));await context.close();
 }
 {
  const {context,page}=await open(finalTrick,'reduce');await page.clock.runFor(1199);assert.deepEqual(await read(page),finalTrick);
  await page.clock.runFor(1);assert.deepEqual(await read(page),E.collect(finalTrick));assert(await page.locator('#result-screen').isVisible());
  await page.clock.runFor(20000);assert.deepEqual(await read(page),E.collect(finalTrick));await context.close();
 }
 console.log('PASS: immediate next trick after animation, one-time collection, paused Menu/hidden page, rotation, reload, reduced motion, and final scores.');
} finally {await browser.close();}
