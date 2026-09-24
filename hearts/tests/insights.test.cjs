const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../engine.js');
const I = require('../insights.js');

const publicState = () => ({phase:'play',history:[],trick:[]});
const captured = (winner,cards) => ({winner,cards:cards.map((card,player)=>({player,card}))});
test('moon watch counts public hearts and the queen, and stops when points split',()=>{
  const s=publicState();
  s.history.push(captured(2,['QS','2S','3S','4S']));
  assert.equal(I.summarize(s).moon,'open'); // Queen alone is not evidence of a moon run.
  s.history.push(captured(2,['2H','3H','4H','5H']));
  assert.equal(I.summarize(s).moon,'watch');
  s.history.push(captured(2,['6H','7H','8H','9H']));
  assert.equal(I.summarize(s).moon,'danger');
  assert.deepEqual(I.summarize(s).points,[0,0,21,0]);
  s.history.push(captured(1,['10H','2D','3D','4D']));
  assert.equal(I.summarize(s).moon,'blocked');
  assert.equal(I.summarize(s).candidate,-1);
});
test('all hearts need the same owner as the queen to complete a moon',()=>{
  const s=publicState();
  s.history.push(captured(0,E.deck().filter(c=>E.suit(c)==='H')));
  assert.equal(I.summarize(s).moon,'danger');
  assert.equal(I.summarize(s).remaining,13);
  s.history.push(captured(1,['QS']));
  assert.equal(I.summarize(s).moon,'blocked');
  s.history[1].winner=0;
  assert.equal(I.summarize(s).moon,'complete');
  assert.equal(I.summarize(s).remaining,0);
});
test('pending complete tricks count exactly once; incomplete points belong to nobody',()=>{
  const s=publicState();
  s.trick=[{player:0,card:'2S'},{player:1,card:'QS'},{player:2,card:'2H'}];
  assert.equal(I.summarize(s).onTable,14);
  assert.deepEqual(I.summarize(s).points,[0,0,0,0]);
  s.trick.push({player:3,card:'AS'});s.phase='trick-end';
  const before=I.summarize(s);
  assert.deepEqual(before.points,[0,0,0,14]);
  s.history.push({cards:s.trick,...E.trickResult(s.trick)});s.trick=[];s.phase='play';
  assert.deepEqual(I.summarize(s),before);
});
test('guidance reflects follow suit, first-trick and unbroken-hearts exceptions',()=>{
  const s={phase:'play',turn:0,hands:[['2C','3H','QS','4D'],[],[],[]],trick:[],history:[],heartsBroken:false};
  assert.equal(I.guidance(s).reason,'opening');
  assert.deepEqual(I.guidance(s).legal,['2C']);
  s.trick=[{player:3,card:'3C'}];
  assert.equal(I.guidance(s).reason,'follow');
  s.hands[0]=['3H','QS','4D'];
  assert.equal(I.guidance(s).reason,'firstDiscard');
  assert.deepEqual(I.guidance(s).legal,['4D']);
  s.hands[0]=['3H','QS'];
  assert.equal(I.guidance(s).reason,'free'); // Forced penalties are allowed.
  s.history=[{}];s.trick=[];
  assert.equal(I.guidance(s).reason,'heartsLocked');
  s.hands[0]=['3H'];
  assert.equal(I.guidance(s).reason,'free'); // Only hearts may lead unbroken hearts.
  s.turn=1;
  assert.equal(I.guidance(s).reason,'waiting');
});
