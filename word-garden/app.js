import { PUZZLES, PACK_VERSION } from './puzzles.js';
import { createState, submitWord, revealHint, getCells, isComplete } from './engine.js';
import { loadProgress, saveProgress, exportProgress, importProgress } from './storage.js';
import { installTouches } from './touch.js';

const $ = selector => document.querySelector(selector);
const root = $('#game');
const levels = { gentle: 'Gentle', steady: 'Steady', challenge: 'Challenge' };
const loaded = loadProgress(PUZZLES);
let progress = loaded.progress;
let puzzle, state, selection = [], tileOrder = [], touch, epoch = 0, registration, audioContext, typing = false;
let warning = loaded.warning, announcedWarning = null;
let previousCells = new Set(), updateAvailable = false;

function shuffle(array) {
  const copy = [...array];
  for (let i=copy.length-1;i>0;i--) {const bytes=new Uint32Array(1);crypto.getRandomValues(bytes);const j=bytes[0]%(i+1);[copy[i],copy[j]]=[copy[j],copy[i]];}
  return copy;
}
function tierPuzzles() { return PUZZLES.filter(p=>p.difficulty===progress.settings.difficulty); }
function done() { return isComplete(puzzle,state); }
function currentWord() { return selection.map(index=>puzzle.letters[index]).join(''); }
function announce(message,kind='normal') { $('#feedback').textContent=message;$('#feedback').dataset.kind=kind; }
function neutralMessage() { return done()?'Puzzle complete. Nicely found.':progress.settings.inputMode==='tap'?'Tap letters to make a word.':'Trace letters, then press Submit.'; }
function invalidate() { touch?.cancel();epoch++; }
function save() {
  progress.states[puzzle.id]=state;
  if(done()&&!progress.completed.includes(puzzle.id))progress.completed.push(puzzle.id);
  const result=saveProgress(progress);
  if(!result.ok)warning=result.warning;
  else if(warning?.includes('not saved')||warning?.includes('unavailable'))warning=null;
  const notice=$('#save-warning');notice.hidden=!warning;
  if(warning!==announcedWarning){notice.textContent=warning||'';announcedWarning=warning;}
  return result;
}
function tone(complete=false) {
  if(!progress.settings.sound)return;
  try{
    audioContext??=new (window.AudioContext||window.webkitAudioContext)();
    audioContext.resume();
    const now=audioContext.currentTime;
    for(const [i,freq] of (complete?[392,494,587]:[440,554]).entries()){
      const osc=audioContext.createOscillator(),gain=audioContext.createGain();
      osc.type='sine';osc.frequency.value=freq;gain.gain.setValueAtTime(0,now+i*.08);gain.gain.linearRampToValueAtTime(.04,now+i*.08+.015);gain.gain.exponentialRampToValueAtTime(.001,now+i*.08+.3);osc.connect(gain);gain.connect(audioContext.destination);osc.start(now+i*.08);osc.stop(now+i*.08+.31);
    }
  }catch{}
}
function sizeGrid() {
  if(!puzzle||!$('#board-wrap'))return;
  const box=$('#board-wrap').getBoundingClientRect();
  const size=Math.floor(Math.min(42,(box.width-4*(puzzle.cols-1))/puzzle.cols,(box.height-4*(puzzle.rows-1))/puzzle.rows));
  // Keep cells readable even if a very short viewport needs vertical scrolling.
  $('#grid').style.setProperty('--cell-size',`${Math.max(30,size)}px`);
}
function renderGrid() {
  const grid=$('#grid'),cells=getCells(puzzle,state),now=new Set(cells.filter(c=>c.revealed).map(c=>c.key));
  grid.style.gridTemplateColumns=`repeat(${puzzle.cols},var(--cell-size,38px))`;
  grid.style.gridTemplateRows=`repeat(${puzzle.rows},var(--cell-size,38px))`;
  grid.replaceChildren(...cells.map(cell=>{
    const el=document.createElement('span');el.className='cell';el.dataset.cell=cell.key;
    el.style.gridRow=cell.row+1;el.style.gridColumn=cell.col+1;
    if(cell.revealed){el.classList.add('is-revealed');el.textContent=cell.letter;}
    if(state.revealed.includes(cell.key)&&!done())el.classList.add('is-hinted');
    if(cell.revealed&&!previousCells.has(cell.key))el.classList.add('just-revealed');
    el.setAttribute('role','img');el.setAttribute('aria-label',`Row ${cell.row+1}, column ${cell.col+1}: ${cell.revealed?cell.letter:'blank'}`);
    return el;
  }));
  grid.setAttribute('aria-label',`Crossword. ${state.found.length} of ${puzzle.words.length} words found.`);
  previousCells=now;sizeGrid();
}
function buildWheel() {
  $('#letters').replaceChildren(...tileOrder.map((tile,position)=>{
    const angle=-Math.PI/2+position*Math.PI*2/tileOrder.length;
    const x=50+34*Math.cos(angle),y=50+34*Math.sin(angle);
    const button=document.createElement('button');button.className='letter';button.type='button';button.dataset.tile=tile;button.dataset.letter=puzzle.letters[tile];
    button.style.setProperty('--x',`${x}%`);button.style.setProperty('--y',`${y}%`);button.dataset.x=x;button.dataset.y=y;
    button.textContent=puzzle.letters[tile];button.setAttribute('aria-label',`${puzzle.letters[tile]}, letter ${tile+1} of ${puzzle.letters.length}`);
    button.addEventListener('click',()=>chooseTile(tile));return button;
  }));
  renderSelection();
}
function renderSelection() {
  const word=currentWord();$('#word-preview').value=word;$('#word-preview').textContent=word;
  for(const b of $('#letters').children){const order=selection.indexOf(Number(b.dataset.tile));b.setAttribute('aria-pressed',String(order!==-1));b.dataset.order=order+1;b.disabled=done();}
  $('#word-path polyline').setAttribute('points',selection.map(tile=>{const b=$(`#letters [data-tile="${tile}"]`);return b?`${Number(b.dataset.x)*2.4},${Number(b.dataset.y)*2.4}`:'';}).join(' '));
  $('#undo-button').disabled=selection.length===0||done();$('#clear-button').disabled=selection.length===0||done();$('#submit-button').disabled=selection.length<3||done();
}
function renderProgress() {
  const tier=tierPuzzles(),n=tier.findIndex(p=>p.id===puzzle.id)+1;
  $('#puzzle-label').textContent=`${levels[puzzle.difficulty]} · Puzzle ${n} of ${tier.length}`;
  $('#puzzle-title').textContent=puzzle.title;
  $('#puzzle-progress').replaceChildren(document.createTextNode(`${state.found.length} of ${puzzle.words.length}`),Object.assign(document.createElement('span'),{textContent:'words'}));
  $('#bonus-count').textContent=`${state.bonus.length} bonus ${state.bonus.length===1?'word':'words'}`;
  $('#bonus-button').setAttribute('aria-label',`View ${state.bonus.length} bonus words`);
  $('#completion-mark').hidden=!done();root.classList.toggle('is-complete',done());
  $('#submit-button').hidden=done();$('#next-button').hidden=!done();$('#hint-button').disabled=done();$('#shuffle-button').disabled=done();
  const remaining=tier.some(p=>!progress.completed.includes(p.id)&&p.id!==puzzle.id);
  $('#next-button').firstChild.textContent=remaining?'Next puzzle':'Choose a garden';
  $('#level-caption').textContent=done()?'A little more discovered.':'Take your time.';
  $('#total-completed').textContent=progress.completed.filter(id=>PUZZLES.some(p=>p.id===id)).length;
  $('#update-button').hidden=!(updateAvailable&&done());
  renderSelection();
}
function enterPuzzle(id,{message=null}={}) {
  invalidate();
  puzzle=PUZZLES.find(p=>p.id===id)||PUZZLES[0];
  root.classList.toggle('dense-grid',puzzle.rows>=6);
  progress.currentId=puzzle.id;progress.settings.difficulty=puzzle.difficulty;progress.packVersion=PACK_VERSION;
  state=progress.states[puzzle.id]||createState(puzzle);selection=[];tileOrder=shuffle([...puzzle.letters].map((_,i)=>i));previousCells=new Set(getCells(puzzle,state).filter(c=>c.revealed).map(c=>c.key));
  const saved=save();buildWheel();renderGrid();renderProgress();syncSettings();announce(message||neutralMessage());return saved;
}
function chooseTile(tile) {
  if(done()||document.querySelector('dialog[open]'))return;
  epoch++;
  const old=selection.indexOf(tile);
  if(old===selection.length-1&&old!==-1)selection.pop();
  else if(old!==-1)selection=selection.slice(0,old+1);
  else selection.push(tile);
  renderSelection();
}
function clearWord(){if(done())return;invalidate();selection=[];renderSelection();announce(neutralMessage());}
function undo(){if(done())return;invalidate();selection.pop();renderSelection();}
function submit(){
  if(done()||selection.length<3)return;
  typing=false;
  invalidate();const result=submitWord(puzzle,state,currentWord());state=result.state;selection=[];
  if(result.kind==='found'){announce(`${result.word} — found.`, 'success');tone();}
  else if(result.kind==='bonus'){announce(`${result.word} — a bonus word.`, 'success');tone();}
  else if(result.kind==='duplicate')announce(`${result.word} is already found.`);
  else if(result.kind==='short')announce('Try a word with at least three letters.');
  else if(result.kind==='complete'){announce('Puzzle complete. Nicely found.', 'success');tone(true);}
  else announce('That word isn’t in this puzzle. Try another.', 'error');
  save();renderGrid();renderProgress();
}
function hint(){
  if(done())return;invalidate();const result=revealHint(puzzle,state);state=result.state;selection=[];
  announce(result.kind==='complete'?'Puzzle complete. Nicely found.':`A little help: ${result.cell.letter}.`,'success');
  save();renderGrid();renderProgress();if(done())tone(true);
}
function showDialog(dialog){invalidate();dialog.showModal();}
function closeDialog(dialog){invalidate();dialog.close();}
function syncSettings(){
  for(const input of document.querySelectorAll('[name="difficulty"]'))input.checked=input.value===progress.settings.difficulty;
  for(const input of document.querySelectorAll('[name="input-mode"]'))input.checked=input.value===progress.settings.inputMode;
  $('#sound-toggle').checked=progress.settings.sound;
}
$('#submit-button').addEventListener('click',submit);$('#undo-button').addEventListener('click',undo);$('#clear-button').addEventListener('click',clearWord);$('#hint-button').addEventListener('click',hint);
$('#shuffle-button').addEventListener('click',()=>{if(done())return;invalidate();selection=[];const old=tileOrder.join();tileOrder=shuffle(tileOrder);if(tileOrder.join()===old)tileOrder.push(tileOrder.shift());buildWheel();announce('A fresh view. Same letters.');});
$('#next-button').addEventListener('click',()=>{
  if(!done())return;invalidate();
  const tier=tierPuzzles(),start=tier.findIndex(p=>p.id===puzzle.id),ordered=[...tier.slice(start+1),...tier.slice(0,start+1)];
  const next=ordered.find(p=>!progress.completed.includes(p.id));
  if(next){enterPuzzle(next.id);$('#letters .letter').focus({preventScroll:true});}
  else{announce(`${levels[puzzle.difficulty]} garden complete. Choose another in settings.`,'success');showDialog($('#menu-dialog'));}
});
$('#menu-button').addEventListener('click',()=>{syncSettings();showDialog($('#menu-dialog'));});
$('#help-button').addEventListener('click',()=>showDialog($('#help-dialog')));
$('#bonus-button').addEventListener('click',()=>{
  $('#bonus-description').textContent=state.bonus.length?'A few words beyond the crossword. Each one counts once.':'Words you find beyond the crossword will appear here.';
  $('#bonus-list').replaceChildren(...state.bonus.map(word=>Object.assign(document.createElement('span'),{textContent:word})));showDialog($('#bonus-dialog'));
});
for(const button of document.querySelectorAll('[data-close]'))button.addEventListener('click',()=>closeDialog(button.closest('dialog')));
for(const dialog of document.querySelectorAll('dialog'))dialog.addEventListener('cancel',()=>invalidate());
for(const input of document.querySelectorAll('[name="difficulty"]'))input.addEventListener('change',()=>{
  if(!input.checked)return;invalidate();progress.settings.difficulty=input.value;const tier=tierPuzzles();
  const next=tier.find(p=>!progress.completed.includes(p.id))||tier[0];enterPuzzle(next.id);closeDialog($('#menu-dialog'));
});
for(const input of document.querySelectorAll('[name="input-mode"]'))input.addEventListener('change',()=>{
  if(!input.checked)return;invalidate();selection=[];progress.settings.inputMode=input.value;save();renderSelection();announce(neutralMessage());
});
$('#sound-toggle').addEventListener('change',()=>{progress.settings.sound=$('#sound-toggle').checked;save();if(progress.settings.sound)tone();});
$('#replay-button').addEventListener('click',()=>showDialog($('#confirm-dialog')));
$('#confirm-replay').addEventListener('click',()=>{
  invalidate();progress.states[puzzle.id]=createState(puzzle);progress.completed=progress.completed.filter(id=>id!==puzzle.id);closeDialog($('#confirm-dialog'));closeDialog($('#menu-dialog'));enterPuzzle(puzzle.id);
});
$('#export-button').addEventListener('click',()=>{
  const blob=new Blob([exportProgress(progress)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='word-garden-progress.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);$('#import-status').textContent='Your progress file is ready. Keep it somewhere safe.';
});
$('#import-file').addEventListener('change',async event=>{
  const file=event.target.files?.[0];if(!file)return;
  try{
    if(file.size>2_000_000)throw new Error('That file is too large for a progress file.');
    const candidate=importProgress(await file.text(),PUZZLES);
    // Loading is a deliberate settings action; the existing valid save remains as backup.
    invalidate();progress=candidate;warning=null;const saved=enterPuzzle(progress.currentId);$('#import-status').textContent=saved.ok?'Progress loaded. Your garden is ready.':'Progress loaded for this session. It could not be saved on this device; keep your progress file.';
  }catch(error){$('#import-status').textContent=error.message||'That progress file could not be read.';}
  event.target.value='';
});
document.addEventListener('pointerdown',()=>{typing=false;},true);
document.addEventListener('focusin',()=>{typing=false;});
document.addEventListener('keydown',event=>{
  if(document.querySelector('dialog[open]')||event.altKey||event.ctrlKey||event.metaKey||event.repeat||event.target.matches('input,textarea,select'))return;
  if(/^[a-z]$/i.test(event.key)&&!done()){
    const key=event.key.toUpperCase(),tile=[...puzzle.letters].findIndex((letter,i)=>letter===key&&!selection.includes(i));
    if(tile>=0){event.preventDefault();chooseTile(tile);typing=true;}else announce(`No unused ${key} tile.`);
  }else if(event.key==='Backspace'){event.preventDefault();undo();}
  else if(event.key==='Escape'){event.preventDefault();clearWord();}
  else if(event.key==='Enter'&&selection.length>=3&&(typing||!event.target.closest('button,a,summary'))){event.preventDefault();submit();}
  else if(event.key==='Tab'||event.key===' ')typing=false;
});

enterPuzzle(progress.currentId);
touch=installTouches({root,wheel:$('#wheel'),context:()=>[puzzle.id,epoch,[...document.querySelectorAll('dialog[open]')].map(d=>d.id)],mode:()=>progress.settings.inputMode,onTile:chooseTile,getSelection:()=>[...selection],onPath:path=>{if(done())return;selection=path.filter((tile,i)=>Number.isInteger(tile)&&tile>=0&&tile<puzzle.letters.length&&path.indexOf(tile)===i);renderSelection();}});
new ResizeObserver(sizeGrid).observe($('#board-wrap'));

async function checkOffline() {
  if(!registration)return;
  const worker=navigator.serviceWorker.controller||registration.active;
  if(!worker)return;
  const response=await new Promise(resolve=>{
    const channel=new MessageChannel(),timer=setTimeout(()=>resolve(null),5000);
    channel.port1.onmessage=event=>{clearTimeout(timer);channel.port1.close();resolve(event.data);};
    worker.postMessage({type:'CACHE_READY'},[channel.port2]);
  });
  $('#offline-status').textContent=response?.ready?'Ready for offline play. All puzzles are saved on this device.':navigator.onLine?'Preparing offline play. Keep the game open online for a moment.':'Reconnect once to finish preparing offline play.';
}
function showUpdate() {updateAvailable=true;$('#update-button').hidden=!done();}
$('#update-button').addEventListener('click',()=>{if(!done()||!registration?.waiting)return;save();registration.waiting.postMessage({type:'SKIP_WAITING'});});
if('serviceWorker'in navigator){
  let reloading=false;
  navigator.serviceWorker.addEventListener('controllerchange',()=>{if(updateAvailable&&!reloading){reloading=true;location.reload();}else checkOffline();});
  navigator.serviceWorker.register('./service-worker.js').then(async reg=>{
    registration=reg;if(reg.waiting)showUpdate();reg.addEventListener('updatefound',()=>{const worker=reg.installing;worker?.addEventListener('statechange',()=>{if(worker.state==='installed'){if(navigator.serviceWorker.controller)showUpdate();checkOffline();}});});
    await navigator.serviceWorker.ready;await checkOffline();
  }).catch(()=>{$('#offline-status').textContent='Offline setup is unavailable. Open the game online to try again.';});
}else $('#offline-status').textContent='Offline play isn’t available in this browser.';
window.addEventListener('online',checkOffline);
window.addEventListener('pageshow',()=>{if(registration)checkOffline();});
if(matchMedia('(display-mode: standalone)').matches&&navigator.storage?.persist)navigator.storage.persist().catch(()=>{});
