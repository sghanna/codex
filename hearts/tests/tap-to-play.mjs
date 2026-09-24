import {webkit,E,KEY,url,createFixtures,artifacts} from './support.mjs';
import assert from 'node:assert/strict';
const fixtures=createFixtures(),PREFS='codex-hearts-settings-v2';
const browser=await webkit.launch();
const read=page=>page.evaluate(KEY=>JSON.parse(localStorage.getItem(KEY)).game,KEY);
async function open(state=fixtures.play,language='en',tapToPlay){
 const context=await browser.newContext({viewport:{width:375,height:667},serviceWorkers:'block'});
 const page=await context.newPage();page.on('pageerror',error=>{throw error;});
 await page.addInitScript(({KEY,PREFS,state,language,tapToPlay})=>{
  if(!localStorage.getItem(KEY))localStorage.setItem(KEY,JSON.stringify({version:2,game:state,selected:[]}));
  if(!localStorage.getItem(PREFS))localStorage.setItem(PREFS,JSON.stringify({language,pace:'slow',sound:false,...(tapToPlay===undefined?{}:{tapToPlay})}));
 },{KEY,PREFS,state,language,tapToPlay});
 const now=new Date('2026-09-24T12:00:00Z');await page.clock.install({time:now});await page.clock.pauseAt(now);
 await page.goto(url);return {context,page};
}
async function settings(page){await page.locator('#menu-button').click();await page.locator('#settings-button').click();}
async function close(page){await page.locator('#settings-dialog .dialog-action').click();}
try{
 for(const language of ['en','es','vi']){
  const s=fixtures.play,legal=E.legalCards(s,0);assert(legal.length>1);
  const {context,page}=await open(s,language);
  await settings(page);assert.equal(await page.locator('#tap-to-play').inputValue(),'off','Existing preferences default to confirmation');
  await page.locator('#tap-to-play').scrollIntoViewIfNeeded();await page.screenshot({path:`${artifacts}/one-tap-settings-${language}.png`});await close(page);
  for(const card of legal.slice(0,2))await page.locator(`[data-card="${card}"]`).click({position:{x:20,y:20}});
  assert.deepEqual(await read(page),s,'Choosing another card must stay reversible by default');
  assert.equal(await page.locator('#hand [aria-pressed="true"]').getAttribute('data-card'),legal[1]);
  await page.clock.runFor(5000);assert.deepEqual(await read(page),s);
  await settings(page);await page.locator('#tap-to-play').selectOption('on');await close(page);await page.reload();
  await settings(page);assert.equal(await page.locator('#tap-to-play').inputValue(),'on','Preference survives reload');await close(page);
  const off=s.hands[0].find(card=>!legal.includes(card));assert(off);
  await page.locator(`[data-card="${off}"]`).evaluate(el=>el.click());assert.deepEqual(await read(page),s,'One-tap mode still rejects illegal cards');
  await page.locator(`[data-card="${legal[0]}"]`).click({position:{x:20,y:20}});
  assert.deepEqual(await read(page),E.play(s,0,legal[0]),'One tap plays exactly one legal card');await context.close();
 }
 {
  const s=fixtures.allPlayable,{context,page}=await open(s,'en',true),card=E.legalCards(s,0)[0];
  await settings(page);await page.locator('#tap-to-play').selectOption('off');await close(page);
  await page.locator(`[data-card="${card}"]`).click({position:{x:20,y:20}});assert.deepEqual(await read(page),s);
  await page.locator('#primary-action').click();assert.deepEqual(await read(page),E.play(s,0,card));await context.close();
 }
 {
  const s=fixtures.pass,{context,page}=await open(s,'en',true),choices=E.choosePass(E.viewFor(s,0));
  for(const card of choices)await page.locator(`[data-card="${card}"]`).click({position:{x:20,y:20}});
  assert.equal(await page.locator('#hand [aria-pressed="true"]').count(),3);assert.deepEqual(await read(page),s,'Passing still requires confirmation');
  await page.locator('#primary-action').click();assert.equal((await read(page)).phase,'received');await context.close();
 }
 console.log('PASS: confirmation remains default and reversible; optional one-tap plays legal cards, persists, switches off, and preserves pass confirmation in three languages.');
}finally{await browser.close();}
