(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./engine.js'));
  else root.HeartsInsights = factory(root.HeartsEngine);
})(globalThis, function (E) {
  'use strict';
  function summarize(state) {
    // Only completed, publicly visible tricks establish ownership of points.
    const tricks = [...state.history];
    if (state.phase === 'trick-end') tricks.push({cards:state.trick,...E.trickResult(state.trick)});
    const hearts = [0,0,0,0];
    let queenOwner = -1;
    for (const trick of tricks) for (const play of trick.cards) {
      if (E.suit(play.card) === 'H') hearts[trick.winner]++;
      if (play.card === 'QS') queenOwner = trick.winner;
    }
    const points = hearts.map((n,p) => n + (queenOwner === p ? 13 : 0));
    const holders = points.map((n,p) => n ? p : -1).filter(p => p !== -1);
    const candidate = holders.length === 1 ? holders[0] : -1;
    let moon = holders.length > 1 ? 'blocked' : 'open';
    if (candidate !== -1 && hearts[candidate] >= 4) {
      moon = points[candidate] === 26 ? 'complete' : hearts[candidate] >= 8 || points[candidate] >= 20 ? 'danger' : 'watch';
    }
    return {hearts,queenOwner,points,candidate,moon,tricks:tricks.length,
      remaining:26 - points.reduce((sum,n) => sum+n,0),
      onTable:state.phase === 'play' ? state.trick.reduce((sum,play) => sum+E.points(play.card),0) : 0};
  }
  function guidance(state, player = 0) {
    const legal = E.legalCards(state,player);
    if (!legal.length) return {legal,reason:'waiting'};
    if (!state.history.length && !state.trick.length) return {legal,reason:'opening'};
    if (state.trick.length) {
      const suit = E.suit(state.trick[0].card);
      if (state.hands[player].some(card => E.suit(card) === suit)) return {legal,reason:'follow',suit};
      return {legal,reason:!state.history.length && legal.some(card => E.points(card) === 0) ? 'firstDiscard' : 'free'};
    }
    const heartsHeldBack = !state.heartsBroken && state.hands[player].some(card => E.suit(card) === 'H') && legal.some(card => E.suit(card) !== 'H');
    return {legal,reason:heartsHeldBack ? 'heartsLocked' : 'free'};
  }
  return {summarize,guidance};
});
