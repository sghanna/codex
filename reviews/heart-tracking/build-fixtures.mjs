import {createFixtures,E,I} from '../../hearts/tests/support.mjs';
import fs from 'node:fs/promises';
const existing=createFixtures();
const scenarios={capture:existing.liveMoonwatch,risk:E.collect(existing.liveMoondanger)};
// Find a real hand where one player has the hearts and another has Q-spades.
// This demonstrates why hearts alone cannot establish a moon threat.
for(let seed=1;seed<1000 && !scenarios.blocked;seed++) {
 let n=seed;const random=()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};
 let s=E.newGame(random);
 while(!['hand-end','game-over'].includes(s.phase)) {
  if(s.phase==='pass')s=E.pass(s,s.hands.map((_,p)=>E.choosePass(E.viewFor(s,p))));
  else if(s.phase==='received')s=E.begin(s);
  else if(s.phase==='play')s=E.play(s,s.turn,E.choosePlay(E.viewFor(s,s.turn)));
  else s=E.collect(s);
  const summary=I.summarize(s),heartOwners=summary.hearts.map((n,p)=>n?p:-1).filter(p=>p!==-1);
  if(s.phase==='play' && s.turn===0 && s.history.length>=5 && s.history.length<=8 && heartOwners.length===1 && summary.queenOwner!==-1 && summary.queenOwner!==heartOwners[0]){scenarios.blocked=s;break;}
 }
}
if(Object.keys(scenarios).length!==3 || !Object.values(scenarios).every(E.validate))throw Error('Invalid scenarios');
await fs.writeFile(new URL('fixtures.js',import.meta.url),'/* Generated from valid, replayed practice hands. */\nwindow.HeartScenarios = '+JSON.stringify(scenarios,null,2)+';\n');
console.log(Object.fromEntries(Object.entries(scenarios).map(([name,state])=>[name,I.summarize(state)])));
