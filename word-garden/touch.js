// Forgiving release-based action buttons; the wheel has a separate path gesture.
export function installTouches({root, wheel, context, mode, onTile, onPath, getSelection, onCancel}) {
  let press = null, gesture = null, suppressClick = false;
  const pointers = new Set();
  const snapshot = () => JSON.stringify(context());
  const blocked = () => document.hidden;
  const reset = () => {
    const oldPress=press,oldGesture=gesture;
    press=null;gesture=null;suppressClick=true;
    if (oldPress) oldPress.button.classList.remove('touch-pressed');
    if (oldGesture && oldGesture.state===snapshot()) onPath(oldGesture.before);
    onCancel?.();
  };
  const positionTile = event => {
    const buttons = [...wheel.querySelectorAll('.letter')];
    let closest = null, distance = Infinity;
    for (const b of buttons) {
      const r=b.getBoundingClientRect(),d=Math.hypot(event.clientX-r.x-r.width/2,event.clientY-r.y-r.height/2);
      if (d <= r.width/2 + 4 && d < distance) { closest=b;distance=d; }
    }
    return closest ? Number(closest.dataset.tile) : null;
  };
  function extend(event) {
    if (!gesture || gesture.cancelled || gesture.id!==event.pointerId) return;
    if (gesture.state!==snapshot()) {reset(); return;}
    const tile=positionTile(event); if(tile===null) return;
    const path=gesture.path;
    if(path.at(-2)===tile) path.pop();
    else if(!path.includes(tile)) path.push(tile);
    onPath([...path]);
  }
  function track(event) {
    if (!press || press.id!==event.pointerId || press.cancelled) return;
    const {x,y,box,drift,slop}=press;
    if(Math.hypot(event.clientX-x,event.clientY-y)>drift || event.clientX<box.left-slop || event.clientX>box.right+slop || event.clientY<box.top-slop || event.clientY>box.bottom+slop) { press.cancelled=true;press.button.classList.remove('touch-pressed'); }
  }
  document.addEventListener('pointerdown',event=>{
    suppressClick=false;
    pointers.add(event.pointerId);
    if(pointers.size>1 || event.isPrimary===false) {reset();return;}
    const button=event.target.closest?.('button');
    if(!button || (!root.contains(button) && !button.closest('dialog[open]')))return;
    if(button.disabled || blocked())return;
    const tile=button.matches('.letter');
    if(tile && mode()==='swipe') {
      gesture={id:event.pointerId,path:[Number(button.dataset.tile)],before:getSelection(),state:snapshot(),cancelled:false};
      onPath([...gesture.path]);
      try{button.setPointerCapture(event.pointerId);}catch{}
      return;
    }
    if(!['touch','pen'].includes(event.pointerType))return;
    press={id:event.pointerId,button,x:event.clientX,y:event.clientY,box:button.getBoundingClientRect(),drift:tile?12:32,slop:tile?0:24,state:snapshot(),cancelled:false};
    button.classList.add('touch-pressed');
    try{button.setPointerCapture(event.pointerId);}catch{}
  },true);
  document.addEventListener('pointermove',event=>{track(event);extend(event);},true);
  document.addEventListener('pointerup',event=>{
    pointers.delete(event.pointerId);
    if(gesture?.id===event.pointerId){extend(event);if(!gesture)return;gesture=null;suppressClick=true;return;}
    if(!press || press.id!==event.pointerId)return;
    track(event);const p=press;press=null;p.button.classList.remove('touch-pressed');suppressClick=true;
    if(!p.cancelled && p.state===snapshot() && p.button.isConnected && !p.button.disabled && !blocked())p.button.click();
  },true);
  document.addEventListener('pointercancel',event=>{pointers.delete(event.pointerId);if(press?.id===event.pointerId || gesture?.id===event.pointerId){reset();press=null;gesture=null;suppressClick=true;}},true);
  document.addEventListener('lostpointercapture',event=>{if(press?.id===event.pointerId || gesture?.id===event.pointerId)reset();},true);
  document.addEventListener('click',event=>{
    if(suppressClick && event.detail>0 && (root.contains(event.target)||event.target.closest?.('dialog'))){event.preventDefault();event.stopImmediatePropagation();}
  },true);
  for(const type of ['contextmenu','selectstart','dragstart'])document.addEventListener(type,event=>{if(event.target.closest?.('button,.wheel,.crossword'))event.preventDefault();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){reset();pointers.clear();}});
  for(const type of ['blur','pagehide','resize'])window.addEventListener(type,()=>{reset();pointers.clear();});
  return {cancel:reset};
}
