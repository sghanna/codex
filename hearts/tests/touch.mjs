import {webkit,chromium,E,KEY,url,createFixtures} from './support.mjs';
import assert from 'node:assert/strict';
const fixtures=createFixtures();
const read=page=>page.evaluate(KEY=>JSON.parse(localStorage.getItem(KEY)).game,KEY);
const selected=page=>page.locator('#hand [aria-pressed="true"]').evaluateAll(cards=>cards.map(card=>card.dataset.card));
async function open(browser,state=fixtures.play,tapToPlay=false){
 const context=await browser.newContext({viewport:{width:375,height:667},hasTouch:true,isMobile:true,serviceWorkers:'block'});
 const page=await context.newPage();page.on('pageerror',error=>{throw error;});
 await page.addInitScript(({KEY,state,tapToPlay})=>{
  localStorage.setItem(KEY,JSON.stringify({version:2,game:state,selected:[]}));
  localStorage.setItem('codex-hearts-settings-v2',JSON.stringify({language:'en',pace:'slow',sound:false,tapToPlay}));
 },{KEY,state,tapToPlay});
 const now=new Date('2026-09-24T12:00:00Z');await page.clock.install({time:now});await page.clock.pauseAt(now);
 await page.goto(url);return {context,page};
}
// Synthetic pointer events exercise release/cancellation cases in WebKit.
async function pointer(page,selector,type,point,id=1){
 await page.locator(selector).evaluate((button,{type,point,id})=>button.dispatchEvent(new PointerEvent(type,{
  bubbles:true,cancelable:true,pointerType:'touch',pointerId:id,isPrimary:id===1,
  clientX:point.x,clientY:point.y,buttons:type==='pointerup'?0:1
 })),{type,point,id});
}
async function start(page,selector){
 const box=await page.locator(selector).boundingBox(),point={x:box.x+20,y:box.y+8};
 await pointer(page,selector,'pointerdown',point);return point;
}
async function nativeClick(page,selector){
 await page.locator(selector).evaluate(el=>el.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,detail:1})));
}
const browser=await webkit.launch();
try{
 {
  const {context,page}=await open(browser),s=fixtures.play,legal=E.legalCards(s,0);
  for(const card of legal.slice(0,2)){
   const selector=`[data-card="${card}"]`,point=await start(page,selector),before=await selected(page);
   await page.clock.runFor(4000);assert.deepEqual(await selected(page),before,'A held card waits for release');
   await pointer(page,selector,'pointerup',point);await nativeClick(page,selector);
   assert.deepEqual(await selected(page),[card],'Slow touch selects once and allows changing your mind');
   assert.deepEqual(await read(page),s);
  }
  const point=await start(page,'#primary-action');await page.clock.runFor(4000);assert.deepEqual(await read(page),s);
  const release={x:point.x,y:point.y-24};await pointer(page,'#primary-action','pointermove',release);
  await pointer(page,'#primary-action','pointerup',release);await nativeClick(page,'#primary-action');
  assert.deepEqual(await read(page),E.play(s,0,legal[1]),'A long press and small upward slide plays once on release');
  await context.close();
 }
 for(const interruption of ['large-drag','cancel','lost-capture','second-finger','resize','dialog','background']){
  const {context,page}=await open(browser),s=fixtures.play,card=E.legalCards(s,0)[0];
  await page.locator(`[data-card="${card}"]`).click({position:{x:20,y:20}});
  const point=await start(page,'#primary-action');
  if(interruption==='large-drag')await pointer(page,'#primary-action','pointermove',{x:point.x,y:point.y-50});
  if(interruption==='cancel')await pointer(page,'#primary-action','pointercancel',point);
  if(interruption==='lost-capture')await pointer(page,'#primary-action','lostpointercapture',point);
  if(interruption==='second-finger'){
   await pointer(page,'#primary-action','pointerdown',point,2);await pointer(page,'#primary-action','pointerup',point,2);
  }
  if(interruption==='resize')await page.evaluate(()=>window.dispatchEvent(new Event('resize')));
  if(interruption==='dialog'){
   await page.locator('#menu-button').evaluate(el=>el.click());await page.locator('#menu-dialog [data-close]').first().evaluate(el=>el.click());
  }
  if(interruption==='background')await page.evaluate(()=>{
   Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));
   Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));
  });
  await pointer(page,'#primary-action','pointerup',point);await nativeClick(page,'#primary-action');
  assert.deepEqual(await read(page),s,`${interruption} cancels even if the finger returns to the button`);
  // A fresh mouse action is still accepted after a cancelled touch.
  await page.locator('#primary-action').click();assert.deepEqual(await read(page),E.play(s,0,card));await context.close();
 }
 {
  const {context,page}=await open(browser),s=fixtures.play,cards=E.legalCards(s,0);
  // A disabled action becoming enabled during a hold must not activate on release.
  const point=await start(page,'#primary-action');
  await page.locator(`[data-card="${cards[0]}"]`).evaluate(el=>el.click());
  await pointer(page,'#primary-action','pointerup',point);await nativeClick(page,'#primary-action');
  assert.deepEqual(await read(page),s);
  const next=await start(page,'#primary-action');
  await page.locator(`[data-card="${cards[1]}"]`).evaluate(el=>el.click());
  await pointer(page,'#primary-action','pointerup',next);await nativeClick(page,'#primary-action');
  assert.deepEqual(await read(page),s,'Changing selection during a hold cancels the old press');
  await context.close();
 }
 {
  let s=fixtures.allPlayable;
  while(!(s.phase==='play' && s.turn===0 && E.legalCards(s,0).length===1)){
   s=s.phase==='play'?E.play(s,s.turn,E.choosePlay(E.viewFor(s,s.turn))):E.collect(s);
  }
  const {context,page}=await open(browser,s),point=await start(page,'#primary-action');
  await page.clock.runFor(3000);const after=await read(page);
  assert.deepEqual(after,E.play(s,0,E.legalCards(s,0)[0]));
  await pointer(page,'#primary-action','pointerup',point);await nativeClick(page,'#primary-action');
  assert.deepEqual(await read(page),after,'A held button cannot repeat a move after the sole-card timer fires');
  await context.close();
 }
 {
  const s=fixtures.pass,{context,page}=await open(browser,s),cards=E.choosePass(E.viewFor(s,0));
  for(const card of cards)await page.locator(`[data-card="${card}"]`).click({position:{x:20,y:20}});
  const point=await start(page,'#primary-action');await pointer(page,'#primary-action','pointerup',point);
  await nativeClick(page,'#primary-action');assert.equal((await read(page)).phase,'received','A touch cannot also activate Start playing');
  await page.locator('#primary-action').focus();await page.keyboard.press('Enter');assert.equal((await read(page)).phase,'play','Keyboard activation still works');
  await context.close();
 }
 {
  const {context,page}=await open(browser,fixtures.play,true),s=fixtures.play,card=E.legalCards(s,0)[0],selector=`[data-card="${card}"]`;
  let point=await start(page,selector);await pointer(page,selector,'pointermove',{x:point.x+20,y:point.y});await pointer(page,selector,'pointerup',point);await nativeClick(page,selector);
  assert.deepEqual(await read(page),s,'Sliding across cards cancels selection');
  point=await start(page,selector);await page.clock.runFor(4000);assert.deepEqual(await read(page),s);
  await pointer(page,selector,'pointerup',point);assert.deepEqual(await read(page),E.play(s,0,card),'Optional one-tap mode also waits for release');await context.close();
 }
 {
  const {context,page}=await open(browser),s=fixtures.play,card=E.legalCards(s,0)[0];
  const point=await start(page,'#primary-action');await pointer(page,'#primary-action','pointerup',point);
  assert.deepEqual(await read(page),s,'A disabled button does nothing');
  const css=await page.locator(`[data-card="${card}"]`).evaluate(el=>({select:getComputedStyle(el).webkitUserSelect,touch:getComputedStyle(el).touchAction}));
  assert.deepEqual(css,{select:'none',touch:'pinch-zoom'});
  // The callout property is iOS-only; desktop WebKit cannot verify it.
  for(const type of ['selectstart','contextmenu','dragstart'])assert.equal(await page.locator('.game').evaluate((el,type)=>el.dispatchEvent(new Event(type,{bubbles:true,cancelable:true})),type),false);
  assert.equal(await page.locator('#help-dialog p').first().evaluate(el=>el.dispatchEvent(new Event('selectstart',{bubbles:true,cancelable:true}))),true,'Help text remains selectable');
  await context.close();
 }
 console.log('PASS: WebKit slow release, upward drift, reversible selection, one-tap mode, duplicate clicks, cancellation, mouse/keyboard, selection prevention, and pinch-zoom CSS.');
}finally{await browser.close();}

// Chrome's actual touch input includes native gesture detection and compatibility
// clicks. This supplements synthetic WebKit events; it is not an iPhone test.
const chrome=await chromium.launch(process.env.CHROME_PATH ? {executablePath:process.env.CHROME_PATH} : {});
try{
 const s=fixtures.pass,{context,page}=await open(chrome,s),cdp=await context.newCDPSession(page);
 async function touch(selector,slide=0){
  const box=await page.locator(selector).boundingBox(),x=box.x+20,y=box.y+8;
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
  await page.waitForTimeout(1200);
  if(slide)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y-slide}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 }
 const cards=E.choosePass(E.viewFor(s,0));
 for(const card of cards)await touch(`[data-card="${card}"]`);
 assert.deepEqual((await selected(page)).sort(),cards.sort(),'Real long touches select each card exactly once');
 assert.equal(await page.evaluate(()=>window.getSelection().toString()),'');
 await touch('#primary-action',24);assert.equal((await read(page)).phase,'received','Real upward slide passes once without starting play');
 await touch('#primary-action');assert.equal((await read(page)).phase,'play');
 await context.close();console.log('PASS: Chrome native long touches, upward slide outside the button, no selected text, and no duplicate action.');
}finally{await chrome.close();}
