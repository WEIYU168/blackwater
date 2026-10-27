const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const entry = fs.readFileSync(path.join(root, 'index.html'), 'utf8').match(/src="\.\/assets\/([^"\s]+\.js)"/)[1];
const source = fs.readFileSync(path.join(root, 'assets', entry), 'utf8');
function methods(start, end, context = {}) {
  const a = source.indexOf(start), b = source.indexOf(end, a + start.length);
  assert(a >= 0 && b > a, `Missing game method: ${start}`);
  const prototype = vm.runInNewContext(`(class {${source.slice(a, b)}}).prototype`, context);
  return Object.fromEntries(Object.getOwnPropertyNames(prototype).filter(name=>name!=='constructor').map(name=>[name,prototype[name]]));
}
function hotspot(id) {
  const match = source.match(new RegExp('\\{id:`' + id + '`,label:[^}]+\\}'));
  assert(match, `Missing original interaction ${id}`);
  return vm.runInNewContext(`(${match[0]})`);
}

(async () => {
  const T = await import('../assets/three-AKSjQ_ch.js');
  const { buildClinic } = await import('../assets/clinic-interior.js');
  const world = { scene: new T.U(), colliders: [], player: { position: new T.et() },
    collide(x,z,hw,hd) { this.colliders.push({x,z,hw,hd}); },
    opts: {reducedMotion: false}, renderer: {shadowMap:{}}, camTheta: .3, camPhi: .95, camDist: 17,
    route: [], blockedCb(message) { throw new Error(message); }, nearCb() {} };
  const group = () => new T.C();
  const manuscriptTexture = new T.u();
  const clinic = buildClinic(world, { house: () => ({group:group()}),
    sign: () => new T.A(new T.I(1,.4), new T.N()),
    table: group, cabinet: group, bed: group, bench: group, lamp: group, manuscriptTexture, merge() {} });
  const floor = clinic.cutaway.getObjectByName('clinic-floor');
  const floorTop = floor.position.y + floor.geometry.parameters.height / 2;
  assert(floorTop > .25, 'Clinic floor must cover the existing 0.25 m raised path');
  assert.equal(clinic.patientAnchor.position.y, floorTop, 'Patient must stand on the clinic floor');
  assert.equal(clinic.doctorPosition.y, floorTop, 'Doctor must stand on the clinic floor');
  world.scene.updateMatrixWorld(true);
  const manuscript = world.scene.getObjectByName('wang-manuscript');
  const records = world.scene.getObjectByName('case-records');
  assert.equal(manuscript.material.map, manuscriptTexture, 'Desk must show the original manuscript image');
  assert(Math.abs(manuscript.position.x - records.position.x) < .001 && Math.abs(manuscript.position.z - records.position.z) < .001);
  assert(manuscript.position.y > records.position.y + records.geometry.parameters.height / 2, 'Manuscript sinks into its paper backing');
  const normal = new T.et(0,0,1).applyQuaternion(manuscript.quaternion);
  assert(normal.y > .99, 'Manuscript must face up from the desk');
  console.log('PASS original manuscript is face-up and visible on the writing desk');
  const tray = world.scene.getObjectByName('instrument-tray');
  const trayTop = tray.getWorldPosition(new T.et()).y + tray.geometry.parameters.height / 2;
  for (const name of ['surgical-scissors', 'surgical-forceps', 'surgical-scalpel']) {
    const tool = world.scene.getObjectByName(name);
    assert(tool, `Missing clinic instrument: ${name}`);
    let vertices = 0;
    tool.traverse(mesh => {
      if (!mesh.isMesh) return;
      assert(mesh.material.metalness > .5, `${name} must have a metal finish`);
      const positions = mesh.geometry.attributes.position;
      for (let i = 0; i < positions.count; i++) {
        const p = new T.et().fromBufferAttribute(positions, i).applyMatrix4(mesh.matrixWorld);
        assert(p.y > trayTop, `${name} intersects the tray`);
        assert(Math.abs(p.x - tray.position.x) < .39 && Math.abs(p.z - tray.position.z) < .28,
          `${name} hangs off the tray`);
        vertices++;
      }
    });
    assert(vertices > 0, `${name} has no visible geometry`);
  }
  console.log('PASS three metal surgical instruments sit above and within the tray');
  world.clinic = clinic;
  world.collide(clinic.doctorPosition.x, clinic.doctorPosition.z, .35, .35);
  Object.assign(world, methods('cancelRoute(){', 'tryInteract(){', {
    D:T.et, n:{NAV_STEP:.5,NAV_R:.45}, j:{minX:-19,maxX:-8,minZ:8,maxZ:19},
    rr:(value,min,max)=>Math.max(min,Math.min(max,value))
  }));
  Object.assign(world, methods('resolveCollisions(e){', 'camGoal(){'));
  world.buildNav();

  world.player.position.set(-9.5,0,13.5);
  for (const direction of [-1,1]) {
    for (let i=0;i<45;i++) { world.player.position.x+=direction*.1; world.resolveCollisions(world.player.position); }
    assert(Math.abs(world.player.position.x-(direction<0?-14:-9.5))<1e-6, 'Doorway blocks walking');
  }
  console.log('PASS clinic doorway allows walking both in and out');
  world.player.position.set(-14,0,13.5);
  for(let i=0;i<40;i++){world.player.position.x-=.1;world.resolveCollisions(world.player.position);}
  assert(world.player.position.x>-16.5, 'Player can walk through the back wall');
  assert(!world.freeAt(-11.12,12) && !world.freeAt(-11.12,15), 'Front wall segments must remain solid');
  console.log('PASS clinic walls and furniture remain solid');

  const defs = ['clinic','memorial','manuscript'].map(hotspot);
  const targets = [...defs.map(def=>[def.id,def.x,def.z]),
    ['wang',clinic.doctorPosition.x,clinic.doctorPosition.z+1.2]];
  for(const [id,x,z] of targets) {
    assert(clinic.contains(x,z), `${id} must be inside the clinic`);
    world.player.position.set(-9.5,0,13.5);world.planRoute(x,z,id);
    assert(world.route.length>0, `${id} cannot be reached from outside`);
    let prev=world.player.position;
    for(const point of world.route){assert(world.lineFree(prev.x,prev.z,point.x,point.z), `${id} route crosses a wall`);prev=point;}
    assert(Math.hypot(prev.x-x,prev.z-z)<.8, `${id} route stops too far from interaction`);
  }
  assert.equal(defs[0].kind,'puzzle');assert.equal(defs[1].kind,'puzzle');assert.equal(defs[2].kind,'observe');
  console.log('PASS original desk, memorial, manuscript and doctor remain reachable');

  world.hotspots = new Map(defs.map(def=>[def.id,{def,active:true}]));
  world.npcs = new Map([['wang',{position:new T.et(clinic.doctorPosition.x,0,clinic.doctorPosition.z)}]]);
  const {updateNear}=methods('updateNear(){','animateMarkers(e){',{tr:{wang:'王金河醫師'}});
  world.player.position.set(clinic.doctorPosition.x,0,clinic.doctorPosition.z+1.2);
  clinic.update(world,.016,1);updateNear.call(world);assert.equal(world.near.id,'wang');
  for(const def of defs){world.player.position.set(def.x,0,def.z);clinic.update(world,.016,1);updateNear.call(world);assert.equal(world.near.id,def.id);}
  world.player.position.set(-10.5,0,13.5);clinic.update(world,.016,1);updateNear.call(world);assert.equal(world.near,null);
  console.log('PASS doctor and puzzle interactions do not steal one another or trigger through walls');

  let reduced;
  clinic.onExamine=(time,value)=>{reduced=value;};
  world.player.position.set(-14,0,13.5);world.opts.reducedMotion=true;clinic.update(world,.016,2);
  assert.equal(world.player.position.y, floorTop, 'Player must stand on the clinic floor');
  assert(clinic.inside && !clinic.shell.visible && clinic.cutaway.visible);
  assert.equal(reduced,true);
  for(const theta of [0,Math.PI/2,Math.PI,Math.PI*1.5]){
    world.camTheta=theta;
    const {pos,target}=clinic.cameraGoal(world);
    assert([...pos.toArray(),...target.toArray()].every(Number.isFinite));
    assert(pos.y>4 && pos.y<12);assert(pos.distanceTo(target)<world.camDist);
  }
  world.player.position.set(-9.5,0,13.5);clinic.update(world,.016,3);
  assert(!clinic.inside && clinic.shell.visible && !clinic.cutaway.visible);
  console.log('PASS indoor camera, cutaway, reduced-motion hook and outdoor restoration');
})().catch(error=>{console.error(error);process.exitCode=1;});
