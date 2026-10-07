const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const entry = fs.readFileSync(path.join(root, 'index.html'), 'utf8').match(/src="\.\/assets\/([^"\s]+\.js)"/)[1];
const source = fs.readFileSync(path.join(root, 'assets', entry), 'utf8');

function methods(start, end, context = {}) {
  const a = source.indexOf(start), b = source.indexOf(end, a + start.length);
  assert(a >= 0 && b > a, `Missing method ${start}`);
  return vm.runInNewContext(`({${source.slice(a, b)}})`, context);
}

(async () => {
  const { et: Vector3 } = await import('../assets/three-AKSjQ_ch.js');
  const { setTouchMove } = methods('setTouchMove(e,t){', 'setInputEnabled(e){');
  const { setInputEnabled } = methods('setInputEnabled(e){', 'setPaused(e){');
  const windowListeners = new Map(), canvasListeners = new Map();
  const { bindInput } = methods('bindInput(){', 'clickAt(t,n){', {
    window: {addEventListener(type, listener){windowListeners.set(type, listener);}},
    rr: (v, min, max) => Math.max(min, Math.min(max, v))
  });
  const { updatePlayer } = methods('updatePlayer(e){', 'resolveCollisions(e){', {
    D: Vector3, rr: (v, min, max) => Math.max(min, Math.min(max, v)),
    ar: (from, to) => to, j: {minX:-100,maxX:100,minZ:-100,maxZ:100}
  });
  function world() {
    return {touchMove:{x:0,y:0},touchRunning:false,inputEnabled:true,keys:new Set(),
      camTheta:0,route:[],pendingInteract:null,playerVel:new Vector3(),walkPhase:0,
      player:{position:new Vector3(),rotation:{y:0},getObjectByName(){}},opts:{reducedMotion:true},
      cancelRoute(){this.route=[];this.pendingInteract=null;},resolveCollisions(){},
      setTouchMove};
  }
  for (const [name,x,y,axis,sign] of [['上',0,1,'z',-1],['下',0,-1,'z',1],['左',-1,0,'x',-1],['右',1,0,'x',1]]) {
    const w=world();setTouchMove.call(w,x,y);updatePlayer.call(w,.1);
    assert(w.player.position[axis]*sign>0, `${name}方向無法移動`);
    console.log('PASS',name+'方向圓盤移動');
  }
  const straight=world(),diagonal=world();
  setTouchMove.call(straight,0,1);setTouchMove.call(diagonal,1,1);
  updatePlayer.call(straight,.1);updatePlayer.call(diagonal,.1);
  assert(Math.abs(straight.playerVel.length()-diagonal.playerVel.length())<1e-9);
  console.log('PASS 斜向移動不會加速');
  const w=world();w.keys.add('KeyW');w.route=[{}];setTouchMove.call(w,1,0);
  assert.equal(w.route.length,0);setTouchMove.call(w,0,0);assert(w.keys.has('KeyW'));
  console.log('PASS 圓盤取消自動尋路且不清除鍵盤輸入');
  w.touchRunning=true;setTouchMove.call(w,1,0);setInputEnabled.call(w,false);
  assert.deepEqual(w.touchMove,{x:0,y:0});assert.equal(w.touchRunning,false);
  setTouchMove.call(w,1,1);assert.deepEqual(w.touchMove,{x:0,y:0});
  console.log('PASS 開啟視窗停用並清除觸控移動');
  const running=world();running.touchRunning=true;setTouchMove.call(running,0,1);updatePlayer.call(running,.1);
  assert(running.playerVel.length()>straight.playerVel.length());
  console.log('PASS 手機快走');
  const camera=world();
  camera.canvas={addEventListener(type, listener){canvasListeners.set(type, listener);},setPointerCapture(){},releasePointerCapture(){}};
  camera.dragging=false;camera.dragPointerId=null;camera.camPhi=.9;camera.opts.sensitivity=1;camera.clickAt=()=>{};
  bindInput.call(camera);
  canvasListeners.get('pointerdown')({pointerId:1,clientX:20,clientY:20});
  canvasListeners.get('pointermove')({pointerId:2,clientX:100,clientY:20});
  assert.equal(camera.camTheta,0);
  canvasListeners.get('pointermove')({pointerId:1,clientX:40,clientY:20});
  assert(camera.camTheta<0);
  canvasListeners.get('pointerup')({pointerId:2,clientX:40,clientY:20});assert(camera.dragging);
  canvasListeners.get('pointercancel')({pointerId:1});assert(!camera.dragging);
  console.log('PASS 鏡頭只接受自己的觸控並可取消');
})().catch(error => {console.error(error);process.exitCode=1;});
