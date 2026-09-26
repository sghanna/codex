import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createRequire} from 'node:module';

const {webkit,chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const E=createRequire(import.meta.url)('../engine.js');
const base=process.env.HEARTS_BASE_URL||'http://127.0.0.1:8790/';
const originalURL=new URL('hearts/',base).href,previewURL=new URL('hearts-ipad/',base).href;
const KEY='codex-ipad-hearts-game-v2',PREFS='codex-ipad-hearts-settings-v2';
const previewCache=(await fs.readFile(new URL('../service-worker.js',import.meta.url),'utf8')).match(/const CACHE = '([^']+)'/)[1];
const originalKeys=['codex-hearts-game-v2','codex-hearts-game-v2-backup','codex-hearts-settings-v2'];
const output=new URL('../.artifacts/',import.meta.url);
await fs.mkdir(output,{recursive:true});
const report={base,physicalDevice:false,cases:[]};
const read=page=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);
const originalStorage=page=>page.evaluate(keys=>Object.fromEntries(keys.map(key=>[key,localStorage.getItem(key)])),originalKeys);
const errors=[];
const browser=await webkit.launch();
try{
  for(const [width,height] of [[768,1024],[1024,640],[390,740],[375,667]]){
    const context=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true,serviceWorkers:'block',reducedMotion:'reduce'});
    const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
    await page.clock.install();
    await page.addInitScript(({keys,game})=>{
      if(localStorage.getItem(keys[0]))return;
      const save=JSON.stringify({version:2,game,selected:[]});
      localStorage.setItem(keys[0],save);localStorage.setItem(keys[1],save);
      localStorage.setItem(keys[2],JSON.stringify({language:'es',pace:'normal',sound:false}));
    },{keys:originalKeys,game:E.newGame(()=>.5)});
    await page.goto(previewURL);
    const before=await originalStorage(page),save=await read(page);
    assert(E.validate(save.game));
    assert.equal(save.game.phase,'pass');
    assert.equal(await page.locator('html').getAttribute('lang'),'en','Preview must not import original language preference');
    assert.match(await page.title(),/iPad test/);
    const cards=E.choosePass(E.viewFor(save.game,0));
    for(const card of cards)await page.locator(`[data-card="${card}"]`).tap({position:{x:18,y:18}});
    assert.equal(await page.locator('#hand [aria-pressed="true"]').count(),3);
    await page.reload();assert.deepEqual((await read(page)).selected,cards);
    const layout=await page.evaluate(()=>{
      const action=document.querySelector('#primary-action'),a=action.getBoundingClientRect();
      return {pageWidth:document.documentElement.scrollWidth,bottom:a.bottom,
        actionHit:document.elementFromPoint(a.x+a.width/2,a.y+a.height/2)?.closest('#primary-action')===action,
        cardWidth:document.querySelector('#hand .card').getBoundingClientRect().width,
        rows:[...document.querySelectorAll('#hand .hand-row')].map(row=>row.children.length)};
    });
    assert(layout.pageWidth<=width&&layout.bottom<=height+1&&layout.actionHit);
    if(width===768)assert.deepEqual(layout.rows,[7,6]);
    else assert.deepEqual(layout.rows,[5,4,4]);
    await page.screenshot({path:new URL(`release-${width}x${height}.png`,output).pathname});
    await page.locator('#primary-action').tap();
    assert.equal((await read(page)).game.phase,'received');
    assert.deepEqual(await originalStorage(page),before,'Preview changed the original save or preferences');
    report.cases.push({viewport:[width,height],...layout,result:'pass'});
    await context.close();
  }
}finally{await browser.close();}
assert.deepEqual(errors,[]);

const chrome=await chromium.launch(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{});
try{
  const context=await chrome.newContext({viewport:{width:768,height:1024},reducedMotion:'reduce'});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(originalURL);await page.evaluate(()=>navigator.serviceWorker.ready);await page.reload();
  assert((await page.evaluate(()=>navigator.serviceWorker.controller.scriptURL)).endsWith('/hearts/service-worker.js'));
  const oldStorage=await originalStorage(page);
  const oldCaches=await page.evaluate(()=>caches.keys());
  const mainCaches=oldCaches.filter(name=>name.startsWith('codex-hearts-'));
  assert(mainCaches.length>0);
  await page.goto(previewURL);await page.evaluate(()=>navigator.serviceWorker.ready);await page.reload();
  assert((await page.evaluate(()=>navigator.serviceWorker.controller.scriptURL)).endsWith('/hearts-ipad/service-worker.js'));
  assert.deepEqual(await originalStorage(page),oldStorage);
  const allCaches=await page.evaluate(()=>caches.keys());
  assert(allCaches.includes(previewCache));
  for(const cache of mainCaches)assert(allCaches.includes(cache),'Preview deleted an original Hearts cache');
  const previewBefore=await read(page);
  await context.setOffline(true);await page.reload();
  assert.deepEqual(await read(page),previewBefore);
  const pass=E.choosePass(E.viewFor(previewBefore.game,0));
  for(const card of pass)await page.locator(`[data-card="${card}"]`).click({position:{x:18,y:18}});
  await page.locator('#primary-action').click();assert.equal((await read(page)).game.phase,'received');
  await page.reload();assert.equal((await read(page)).game.phase,'received');
  const previewAfter=await read(page);
  await page.goto(originalURL);
  assert.equal(await page.locator('#hand .card').count(),13,'Original should still load offline');
  assert.deepEqual(await originalStorage(page),oldStorage,'Original progress changed during preview review');
  assert.deepEqual(await read(page),previewAfter,'Original changed preview progress');
  // Reinstall the original worker to exercise its cache cleanup against the
  // already-installed preview, then confirm both remain usable offline.
  await context.setOffline(false);
  await page.evaluate(async()=>{const r=await navigator.serviceWorker.getRegistration();await r.unregister();});
  await page.goto(originalURL);await page.evaluate(()=>navigator.serviceWorker.ready);await page.reload();
  assert((await page.evaluate(()=>caches.keys())).includes(previewCache),'Original cleanup deleted preview cache');
  await context.setOffline(true);await page.goto(previewURL);
  assert.deepEqual(await read(page),previewAfter);
  report.cases.push({kind:'offline-isolation',originalCaches:mainCaches,previewCache,result:'pass'});
  await context.close();
}finally{await chrome.close();}
assert.deepEqual(errors,[]);
report.result='pass';
await fs.writeFile(new URL('release-report.json',output),JSON.stringify(report,null,2));
console.log('PASS: iPad portrait/landscape, two iPhone sizes, isolated saves/settings, and offline caches surviving both workers.');
