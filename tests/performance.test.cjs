const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const entry = index.match(/src="\.\/assets\/([^"\s]+\.js)"/)[1];
const source = fs.readFileSync(path.join(root, 'assets', entry), 'utf8');
function method(start, end, context) {
  const a = source.indexOf(start), b = source.indexOf(end, a + start.length);
  assert(a >= 0 && b > a, `Missing method ${start}`);
  return vm.runInNewContext(`({${source.slice(a, b)}})`, context);
}
const failures = [];
function test(name, body) { try { body(); console.log('PASS',name); } catch (error) { failures.push(name); console.log('FAIL',name,error.message); } }
function loop(paused, hidden, needRender=false) {
  let now = 0, updates = 0, renders = 0, shadows = 0;
  const queue = [], document = {hidden};
  const {start} = method('start(){if(this.running)', 'build(){', {document, performance:{now:()=>now},requestAnimationFrame:cb=>queue.push(cb)});
  const shadowMap={enabled:true,needsUpdate:false};
  const world = {paused,needRender,destroyed:false,running:false,lastT:0,lastShadowT:-1,elapsed:0,
    update(){updates++;},renderer:{render(){renders++;if(shadowMap.needsUpdate)shadows++;shadowMap.needsUpdate=false;},shadowMap},scene:{},camera:{}};
  start.call(world);
  for(let i=0;i<30;i++){now+=16.67;queue.shift()(now);}
  return {updates,renders,shadows};
}
test('解謎暫停時停止場景模擬',()=>assert.equal(loop(true,false).updates,0));
test('隱藏分頁不模擬與繪圖',()=>assert.deepEqual(loop(false,true),{updates:0,renders:0,shadows:0}));
test('正常遊玩持續模擬與繪圖',()=>{const r=loop(false,false);assert(r.updates>0 && r.renders>0);});
test('暫停後需要更新畫面時只繪製一次',()=>{const r=loop(true,false,true);assert.equal(r.updates,0);assert.equal(r.renders,1);});
test('動態陰影降低更新頻率而場景維持60FPS',()=>{const r=loop(false,false);assert(r.shadows>0 && r.shadows<=15);assert(r.renders>25);});
test('調整音量與滑鼠不重新配置畫質',()=>{
  let calls=0;const {setOptions}=method('setOptions(e){','getPlayerPos(){',{});
  const world={opts:{quality:'high',sensitivity:1},applyQuality(){calls++;}};
  setOptions.call(world,{sensitivity:2});assert.equal(world.opts.sensitivity,2);assert.equal(calls,0);
  setOptions.call(world,{quality:'low'});assert.equal(calls,1);
});
function qualityProbe(paused, hidden, interval) {
  let now=0,saves=0,applied=0;const queue=[],document={hidden};
  const {autoQuality}=method('autoQuality(){','applySettings(){',{document,performance:{now:()=>now},requestAnimationFrame:cb=>queue.push(cb),setTimeout:cb=>queue.push(cb),$r(){}});
  const game={world:{paused,setProbing(){throw Error('Paused world was forced to render');}},
    state:{data:{settings:{quality:'high'},flags:{autoQualityChecked:true}},save(){saves++;}},applySettings(){applied++;}};
  autoQuality.call(game);
  for(let i=0;i<600&&queue.length;i++){now+=interval;queue.shift()(now);}
  return {quality:game.state.data.settings.quality,saves,applied};
}
test('播放影片或解謎時不執行畫質測試',()=>assert.deepEqual(qualityProbe(true,false,50),{quality:'high',saves:0,applied:0}));
test('隱藏分頁不影響畫質判定',()=>assert.deepEqual(qualityProbe(false,true,50),{quality:'high',saves:0,applied:0}));
test('已有存檔仍能在20FPS時自動降低畫質',()=>assert.deepEqual(qualityProbe(false,false,50),{quality:'low',saves:1,applied:1}));
test('60FPS裝置保持高畫質',()=>assert.deepEqual(qualityProbe(false,false,16.67),{quality:'high',saves:1,applied:0}));
test('開場僅啟動當前播放清單的音樂',()=>{
  const files=[];const {prime}=method('prime(){','start(){this.started',{});
  const audio={list:['current.mp3'],missing:new Set(),el(name){files.push(name);return {paused:true,play(){return Promise.resolve();},pause(){}};}};
  prime.call(audio);assert.deepEqual(files,['current.mp3']);
});
process.exitCode = failures.length ? 1 : 0;
