export function installMobileControls(game) {
  const world = game.world;
  const touch = matchMedia('(any-pointer: coarse)');
  const controls = document.createElement('div');
  controls.id = 'mobile-controls';
  controls.hidden = true;
  controls.innerHTML = `
    <div class="move-pad" role="group" aria-label="移動圓盤">
      <button type="button" class="pad-up" aria-label="向上移動">▲</button>
      <button type="button" class="pad-left" aria-label="向左移動">◀</button>
      <button type="button" class="pad-right" aria-label="向右移動">▶</button>
      <button type="button" class="pad-down" aria-label="向下移動">▼</button>
      <span class="pad-thumb" aria-hidden="true"></span>
    </div>
    <div class="mobile-actions">
      <button type="button" class="mobile-run" aria-label="按住快走">快走</button>
      <button type="button" class="mobile-interact">調查</button>
    </div>`;
  document.getElementById('hud').append(controls);
  const pad = controls.querySelector('.move-pad');
  const thumb = controls.querySelector('.pad-thumb');
  const run = controls.querySelector('.mobile-run');
  let movePointer = null, runPointer = null;

  function release(element, pointer) {
    if (pointer !== null && element.hasPointerCapture(pointer)) element.releasePointerCapture(pointer);
  }
  function stopMove() {
    const pointer = movePointer;
    movePointer = null;
    world.setTouchMove(0, 0);
    thumb.style.transform = '';
    pad.classList.remove('active');
    release(pad, pointer);
  }
  function stopRun() {
    const pointer = runPointer;
    runPointer = null;
    world.touchRunning = false;
    run.classList.remove('active');
    release(run, pointer);
  }
  function reset() { stopMove(); stopRun(); }
  function available() {
    return touch.matches && game.playing && world.inputEnabled && !world.paused && !game.inSunset && !document.hidden;
  }
  function sync() {
    document.documentElement.classList.toggle('touch-layout', touch.matches);
    controls.hidden = !available();
    if (controls.hidden) reset();
    const title = document.querySelector('.title-card');
    if (touch.matches && title && !title.querySelector('.mobile-guide')) {
      const guide = document.createElement('p');
      guide.className = 'mobile-guide';
      guide.textContent = '建議橫向遊玩：左下圓盤移動、右下調查；拖動畫面轉鏡頭。';
      title.append(guide);
    }
  }
  function move(event) {
    const rect = pad.getBoundingClientRect();
    const dx = event.clientX - rect.left - rect.width / 2;
    const dy = event.clientY - rect.top - rect.height / 2;
    const length = Math.hypot(dx, dy);
    const range = rect.width * .28;
    const scale = length > range ? range / length : 1;
    thumb.style.transform = `translate(${dx * scale}px, ${dy * scale}px)`;
    const active = length > rect.width * .12;
    const x = active && Math.abs(dx) / length > .38 ? Math.sign(dx) : 0;
    const y = active && Math.abs(dy) / length > .38 ? -Math.sign(dy) : 0;
    world.setTouchMove(x, y);
  }
  pad.addEventListener('pointerdown', event => {
    if (!available() || movePointer !== null || event.button !== 0) return;
    event.preventDefault();
    movePointer = event.pointerId;
    pad.setPointerCapture(movePointer);
    pad.classList.add('active');
    move(event);
  });
  pad.addEventListener('pointermove', event => {
    if (event.pointerId !== movePointer) return;
    event.preventDefault();
    if (!available()) { reset(); return; }
    move(event);
  });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    pad.addEventListener(type, event => { if (event.pointerId === movePointer) stopMove(); });
    run.addEventListener(type, event => { if (event.pointerId === runPointer) stopRun(); });
  }
  run.addEventListener('pointerdown', event => {
    if (!available() || runPointer !== null || event.button !== 0) return;
    event.preventDefault();
    runPointer = event.pointerId;
    run.setPointerCapture(runPointer);
    world.touchRunning = true;
    run.classList.add('active');
  });
  controls.querySelector('.mobile-interact').addEventListener('click', () => {
    if (!available()) return;
    reset();
    world.tryInteract();
    sync();
  });
  controls.addEventListener('contextmenu', event => event.preventDefault());
  touch.addEventListener('change', sync);
  window.addEventListener('blur', reset);
  window.addEventListener('resize', reset);
  document.addEventListener('visibilitychange', sync);
  new MutationObserver(sync).observe(document.body, {childList: true, subtree: true});
  sync();
}
