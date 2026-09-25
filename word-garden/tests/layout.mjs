import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { webkit } from 'playwright';
import { PUZZLES } from '../puzzles.js';
const url=process.env.WORD_GARDEN_URL||'http://127.0.0.1:8768/word-garden/';
await fs.mkdir(new URL('../.artifacts/',import.meta.url),{recursive:true});
const browser=await webkit.launch(),report=[];
try{
  const context=await browser.newContext({isMobile:true,hasTouch:true,serviceWorkers:'block',deviceScaleFactor:2});
  const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
  for(const [width,height] of [[375,667],[390,740],[844,390]]){
    await page.setViewportSize({width,height});
    for(const puzzle of PUZZLES){
      await page.goto(url);
      await page.evaluate(puzzle=>{
        const progress=JSON.parse(localStorage.getItem('word-garden-progress-v1'));
        progress.currentId=puzzle.id;progress.settings.difficulty=puzzle.difficulty;
        localStorage.setItem('word-garden-progress-v1',JSON.stringify(progress));
      },puzzle);
      await page.reload();await page.waitForTimeout(45);
      const metrics=await page.evaluate(()=>{
        const box=selector=>{const r=document.querySelector(selector).getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom,right:r.right};};
        return {viewport:[innerWidth,innerHeight],scroll:[document.documentElement.scrollWidth,document.documentElement.scrollHeight],grid:box('#grid'),wrap:box('#board-wrap'),footer:box('.puzzle-footer'),heading:box('.puzzle-heading'),action:box('#submit-button'),letter:box('.letter'),cell:box('.cell')};
      });
      const label=`${puzzle.id} at ${width}×${height}`;
      assert.equal(metrics.scroll[0],width,`${label}: horizontal overflow`);
      assert.equal(metrics.scroll[1],height,`${label}: vertical overflow`);
      assert(metrics.action.bottom<=height,`${label}: action clipped`);
      assert(metrics.grid.y>=metrics.heading.bottom,`${label}: grid overlaps heading`);
      assert(metrics.grid.bottom<=metrics.footer.y,`${label}: grid overlaps footer`);
      assert(metrics.cell.width>=30,`${label}: cell too small`);
      assert(metrics.letter.width>=56,`${label}: letter target too small`);
      if(puzzle.id==='garden-001'||puzzle.id==='garden-013'||puzzle.id==='garden-036')await page.screenshot({path:new URL(`../.artifacts/layout-${puzzle.id}-${width}-${height}.png`,import.meta.url).pathname});
      report.push({id:puzzle.id,...metrics});
    }
  }
  assert.deepEqual(errors,[]);
  await fs.writeFile(new URL('../.artifacts/layout-report.json',import.meta.url),JSON.stringify(report,null,2));
  console.log(`PASS: ${report.length} WebKit puzzle layouts. All controls fit, letter targets are at least 56px, and cells are at least 30px.`);
  await context.close();
}finally{await browser.close();}
