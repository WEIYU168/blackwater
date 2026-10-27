const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const entry = fs.readFileSync(path.join(root, 'index.html'), 'utf8').match(/src="\.\/assets\/([^"\s]+\.js)"/)[1];
const source = fs.readFileSync(path.join(root, 'assets', entry), 'utf8');

(async () => {
  const T = await import('../assets/three-AKSjQ_ch.js');
  const { loadCharacterLibrary, createCharacter, installClinicCharacters } = await import('../assets/characters.js');
  const originalFetch = global.fetch;
  global.fetch = async url => new Response(fs.readFileSync(path.join(root, new URL(url).pathname)));
  try { await loadCharacterLibrary(new URL('https://fixture.test/assets/characters/characters.json')); }
  finally { global.fetch = originalFetch; }
  const material = new T.N();
  const mesh = geometry => new T.A(geometry, material);
  const benchSource = source.slice(source.indexOf('function Tn('), source.indexOf('function ', source.indexOf('function Tn(') + 12));
  const bench = vm.runInNewContext(`(${benchSource})`, { H: () => ({ woodLight: material }), r:T.C, U:mesh, k:T.s });
  const scene = new T.C();
  const benchStart = source.indexOf('let ge=Tn(2.4);');
  const benchEnd = source.indexOf(';let A=', benchStart);
  assert(benchStart >= 0 && benchEnd > benchStart);
  vm.runInNewContext(source.slice(benchStart, benchEnd), { Tn:bench, s:scene, W:object=>object, n:{collide(){}} });
  const chair = scene.children[0];
  const placements = vm.runInNewContext(`(${source.match(/Re=(\{chen:[\s\S]+?\}),ze=/)[1]})`);
  const context = { Re:placements, r:T.C, createCharacter, installClinicCharacters(){},
    Ee:(w,h,d)=>mesh(new T.s(w,h,d)), tr:{}, je:()=>{const label=new T.C();label.isSprite=true;return label;} };
  const a = source.indexOf('buildNpcs(){'), b = source.indexOf('buildPlayer(){', a);
  const methods = vm.runInNewContext(`(class {${source.slice(a,b)}}).prototype`, context);
  const world = { scene, npcs:new Map(), clinic:{inside:false,doctorPosition:{y:.32}}, collide(){} };
  methods.buildNpcs.call(world);
  scene.updateMatrixWorld(true);
  const girls = world.npcs.get('girls').children.filter(child=>child.userData.characterId);
  const boundsOf = mesh => { mesh.geometry.computeBoundingBox(); return mesh.geometry.boundingBox.clone().applyMatrix4(mesh.matrixWorld); };
  for (const girl of girls) {
    const torso = girl.getObjectByName('body').children.find(child=>child.isMesh);
    const bounds = boundsOf(torso);
    const center = bounds.getCenter(new T.et());
    const ray = new T.z(new T.et(center.x, center.y, center.z + 3), new T.et(0,0,-1));
    const hits = ray.intersectObjects([girl, chair], true);
    assert(hits.length && hits[0].object !== chair.children[1], `${girl.name}: chair back obscures torso from the front`);
    assert(hits[0].object.parent && girl.getObjectById(hits[0].object.id), `${girl.name}: furniture blocks the torso`);
    const thigh = girl.getObjectByName('legL').children.find(child=>child.isMesh);
    const thighBottom = boundsOf(thigh).min.y;
    const seatTop = boundsOf(chair.children[0]).max.y;
    assert(Math.abs(thighBottom-seatTop)<.015, `${girl.name}: seated body floats above or sinks into the seat (${thighBottom-seatTop})`);
    console.log('PASS',girl.userData.characterId,'torso visible and supported by seat');
  }
  const nearStart = source.indexOf('updateNear(){'), nearEnd = source.indexOf('animateMarkers(e){',nearStart);
  const {updateNear} = vm.runInNewContext(`(class {${source.slice(nearStart,nearEnd)}}).prototype`,{tr:{}});
  const label = new T.C();label.isSprite=true;
  world.player=new T.C();world.player.add(label);world.hotspots=new Map();world.nearCb=()=>{};
  world.player.position.set(18,0,8.8);updateNear.call(world);
  assert.equal(world.near.kind,'npcTalk');assert.equal(label.visible,false,'Player name overlaps nearby NPC name');
  world.hotspots.set('desk',{active:true,def:{x:18,z:8.8,label:'Desk',kind:'puzzle'}});
  updateNear.call(world);assert.equal(world.near.kind,'puzzle');assert.equal(label.visible,false,'Nearby puzzle must not restore an overlapping player label');
  world.hotspots.clear();
  world.player.position.set(0,0,0);updateNear.call(world);assert.equal(label.visible,true);
  world.clinic.inside=true;updateNear.call(world);assert.equal(label.visible,false);
  console.log('PASS player label hides during nearby conversations and inside clinic, then restores outdoors');

  const vegetationStart=source.indexOf('function qn('),vegetationEnd=source.indexOf('function ',vegetationStart+12);
  const plantGroup=()=>new T.C();
  const populate=vm.runInNewContext(`(${source.slice(vegetationStart,vegetationEnd)})`,{
    Re:placements,Le:[],j:{minX:-100,maxX:100,minZ:-100,maxZ:100},Ft:{x0:80,x1:90,z0:80,z1:90},
    Ue:{},ze:{x:100,z:100},at:()=>100,Lt:()=>7,It:()=>4,M:()=>()=>.5,Ye:()=>.5,nt:()=>0,
    en:plantGroup,tn:plantGroup,rn:plantGroup,fn(count,area,density){
      for(const [id,position] of Object.entries(placements))for(const dx of [-1.75,0,1.75])
        assert.equal(density(position.x+dx,position.z),0,`${id}: vegetation can obscure the character`);
      return [];
    }
  });
  populate({scene:new T.C(),colliders:[]},[]);
  assert(placements.saltfarmer.z-8>1.4+.45,'Salt farmer must be in front of the shelter, clear of its footprint');
  console.log('PASS vegetation clears NPC bodies and salt farmer stands outside the shelter');

  const { buildClinic } = await import('../assets/clinic-interior.js');
  const group = () => new T.C();
  const clinicWorld = { scene:new T.C(), collide(){}, npcs:new Map([['wang',createCharacter('wang')]]) };
  clinicWorld.clinic = buildClinic(clinicWorld, { house:()=>({group:group()}),
    sign:()=>mesh(new T.s(1,.4,.01)), bench, table:group, cabinet:group, bed:group, lamp:group, merge(){} });
  installClinicCharacters(clinicWorld);
  clinicWorld.scene.updateMatrixWorld(true);
  const patient = clinicWorld.clinic.patient;
  const patientThigh = patient.getObjectByName('legL').children.find(child=>child.isMesh);
  const patientChair = clinicWorld.scene.getObjectByName('patient-chair');
  assert(Math.abs(boundsOf(patientThigh).min.y-boundsOf(patientChair.children[0]).max.y)<.015,
    'Clinic chair cuts through the patient');
  const shin = patient.getObjectByName('shinL').children.find(child=>child.isMesh);
  const vertices = shin.geometry.attributes.position;
  let footBottom = Infinity;
  for(let i=0;i<vertices.count;i++)footBottom=Math.min(footBottom,new T.et().fromBufferAttribute(vertices,i).applyMatrix4(shin.matrixWorld).y);
  const cushion = clinicWorld.scene.getObjectByName('foot-rest-cushion');
  assert(Math.abs(footBottom-boundsOf(cushion).max.y)<.015,'Patient foot floats above or sinks into the support');
  console.log('PASS clinic patient sits above the chair and rests the bandaged foot on its cushion');
})().catch(error=>{console.error(error);process.exitCode=1;});
