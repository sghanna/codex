'use strict';
// Release-based touch input for slow taps. Mouse, keyboard, and assistive clicks
// retain the buttons' ordinary click handlers.
const HeartsTouch = (() => {
  function install(root, context, options = {}) {
    let press = null, suppressClick = false;
    const pointers = new Set();
    const unavailable = () => document.hidden || (options.unavailable ? options.unavailable() : document.querySelector('dialog[open]'));
    const targetButton = target => target instanceof Element ? target.closest(options.selector || '#hand .card, #primary-action') : null;
    function cancel() {
      if (!press) return;
      press.cancelled = true;
      // A resize can detach a held card before pointerup reaches the document.
      // Still consume its later compatibility click if it lands on a new card.
      suppressClick = true;
      press.button.classList.remove('touch-pressed');
    }
    function track(event) {
      if (!press || event.pointerId !== press.id) return;
      const {x,y,box,drift,slop} = press;
      if (Math.hypot(event.clientX-x,event.clientY-y) > drift ||
          event.clientX < box.left-slop || event.clientX > box.right+slop ||
          event.clientY < box.top-slop || event.clientY > box.bottom+slop) cancel();
    }
    document.addEventListener('pointerdown',event => {
      // A new physical press is independent of the preceding touch's click.
      suppressClick = false;
      if (!['touch','pen'].includes(event.pointerType)) {
        cancel(); press = null;
        // A deliberate mouse press starts a new action, even if the previous
        // touch lost pointerup when its card was replaced during resize.
        suppressClick = false;
        return;
      }
      pointers.add(event.pointerId);
      if (pointers.size > 1 || !event.isPrimary) { cancel(); return; }
      const button = targetButton(event.target);
      if (!button || !root.contains(button)) return;
      const primary = !button.matches('#hand .card');
      press = {id:event.pointerId,button,x:event.clientX,y:event.clientY,
        box:button.getBoundingClientRect(),drift:primary ? 32 : 12,
        slop:primary ? 24 : 0,state:context(),cancelled:button.disabled || Boolean(unavailable())};
      if (!press.cancelled) button.classList.add('touch-pressed');
      try { button.setPointerCapture(event.pointerId); } catch {}
    },true);
    document.addEventListener('pointermove',track,true);
    document.addEventListener('pointerup',event => {
      pointers.delete(event.pointerId);
      if (!press || event.pointerId !== press.id) return;
      track(event);
      const current = press;
      press = null;
      current.button.classList.remove('touch-pressed');
      // Touch browsers may send a click after pointerup, even when the gesture
      // moved. Consume it whether this press succeeded or was cancelled.
      suppressClick = true;
      const state = context();
      if (!current.cancelled && current.button.isConnected && !current.button.disabled &&
          !unavailable() && current.state.every((value,index) => value === state[index])) {
        current.button.click();
      }
    },true);
    document.addEventListener('pointercancel',event => {
      pointers.delete(event.pointerId);
      if (!press || event.pointerId !== press.id) return;
      cancel(); press = null; suppressClick = true;
    },true);
    document.addEventListener('lostpointercapture',event => {
      if (press?.id === event.pointerId) cancel();
    },true);
    document.addEventListener('click',event => {
      // Native keyboard/VoiceOver activation and our button.click() use detail 0.
      // A real mouse pointerdown clears this guard before its click arrives.
      if (suppressClick && event.detail > 0 && root.contains(event.target)) {
        event.preventDefault(); event.stopImmediatePropagation();
      }
    },true);
    for (const type of ['selectstart','contextmenu','dragstart']) {
      root.addEventListener(type,event => { if (!event.target.closest('input, textarea')) event.preventDefault(); });
    }
    document.addEventListener('visibilitychange',() => {
      if (document.hidden) { cancel(); pointers.clear(); }
    });
    for (const type of ['blur','pagehide','resize']) window.addEventListener(type,() => { cancel(); pointers.clear(); });
    return {cancel};
  }
  return {install};
})();
