const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const base = path.resolve(__dirname,'../assets/characters');
const data = JSON.parse(fs.readFileSync(path.join(base,'characters.json'),'utf8'));
const binary = fs.readFileSync(path.join(base,data.buffer));
const ids = ['player','chen','templekeeper','saltfarmer','labassistant','wang','sun','mao','engineer','baoyu','quance','clinicPatient'];
assert.deepEqual(Object.keys(data.characters).sort(),ids.sort());
assert(binary.length>1000 && binary.length<16*1024*1024, 'Cast mesh download exceeds 16 MiB budget');
function floats(range){
  assert(Number.isInteger(range.byteOffset) && range.byteOffset>=0 && range.byteOffset%4===0);
  assert(Number.isInteger(range.length) && range.length>0 && range.length%3===0);
  assert(range.byteOffset+range.length*4<=binary.length,'Mesh reads past buffer');
  const result=[];
  for(let offset=0;offset<range.length;offset++)result.push(binary.readFloatLE(range.byteOffset+offset*4));
  assert(result.every(Number.isFinite),'Mesh has non-finite coordinates');
  return result;
}
function glb(id){
  const candidates=[path.join(base,id+'.glb'),path.join(base,'glb',id+'.glb')];
  const file=candidates.find(fs.existsSync);assert(file,`${id} GLB missing`);
  const bytes=fs.readFileSync(file);
  assert.equal(bytes.toString('ascii',0,4),'glTF');assert.equal(bytes.readUInt32LE(4),2);
  assert.equal(bytes.readUInt32LE(8),bytes.length);
  assert.equal(bytes.readUInt32LE(16),0x4E4F534A);
  return JSON.parse(bytes.toString('utf8',20,20+bytes.readUInt32LE(12)));
}
(async()=>{
  const T=await import('../assets/three-AKSjQ_ch.js');
  let totalTriangles=0;
  for(const id of ids){
    const character=data.characters[id], names=new Set(character.nodes.map(n=>n.name));
    assert.equal(names.size,character.nodes.length,`${id} duplicate joint name`);
    for(const joint of ['body','head','armL','armR','forearmL','forearmR','legL','legR','shinL','shinR'])assert(names.has(joint),`${id} lacks ${joint}`);
    const nodes=new Map(), root=new T.C();let triangles=0,meshes=0;
    for(const def of character.nodes){
      assert.equal(def.position.length,3);assert.equal(def.quaternion.length,4);assert.equal(def.scale.length,3);
      assert([...def.position,...def.quaternion,...def.scale].every(Number.isFinite));
      assert(Math.abs(Math.hypot(...def.quaternion)-1)<.001,`${id}/${def.name} quaternion not normalized`);
      assert(def.scale.every(value=>value>0 && value<3));
      const node=new T.C();node.position.fromArray(def.position);node.quaternion.fromArray(def.quaternion);node.scale.fromArray(def.scale);nodes.set(def.name,node);
      if(def.mesh){
        const p=floats(def.mesh.positions),n=floats(def.mesh.normals),c=floats(def.mesh.colors);
        assert.equal(p.length,n.length);assert.equal(p.length,c.length);assert.equal(p.length%9,0);
        for(let i=0;i<n.length;i+=3)assert(Math.abs(Math.hypot(n[i],n[i+1],n[i+2])-1)<.02,`${id} invalid normal`);
        assert(c.every(value=>value>=0 && value<=1),'Vertex color out of range');
        node.userData.positions=p;triangles+=p.length/9;meshes++;
      }
    }
    for(const def of character.nodes){assert(!def.parent||names.has(def.parent));(def.parent?nodes.get(def.parent):root).add(nodes.get(def.name));}
    root.updateMatrixWorld(true);
    const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity],point=new T.et();
    for(const node of nodes.values())for(let i=0;i<(node.userData.positions?.length??0);i+=3){point.fromArray(node.userData.positions,i).applyMatrix4(node.matrixWorld);point.toArray().forEach((v,a)=>{min[a]=Math.min(min[a],v);max[a]=Math.max(max[a],v);});}
    assert(min.every(Number.isFinite)&&max.every(Number.isFinite));
    const size=max.map((v,a)=>v-min[a]);
    assert(min[1]>-.15 && min[1]<.65,`${id} feet too far from ground: ${min[1]}`);
    assert(size[0]>.25 && size[0]<1.5 && size[2]>.15 && size[2]<1.5,`${id} deformed silhouette`);
    assert(size[1]>.65 && size[1]<2.2,`${id} impossible height: ${size[1]}`);
    if(!character.seated)assert(Math.abs(size[1]-character.height)<.35,`${id} scale differs from declared height`);
    assert(triangles>1000 && triangles<20000,`${id} triangle budget: ${triangles}`);
    assert(meshes<=12,`${id} too many per-character draw calls`);assert.equal(triangles,character.triangles);
    const exchange=glb(id), glbTriangles=exchange.meshes.flatMap(m=>m.primitives).reduce((sum,p)=>sum+exchange.accessors[p.indices??p.attributes.POSITION].count/3,0);
    assert.equal(glbTriangles,triangles,`${id} GLB and game mesh disagree`);
    totalTriangles+=triangles;console.log('PASS',id,`${triangles} triangles, ${meshes} mesh parts, ${size[1].toFixed(2)} m visible height`);
  }
  console.log(`PASS all 12 characters, valid binary data, joints, scale and GLB exports; ${totalTriangles} total triangles, ${(binary.length/1024/1024).toFixed(2)} MiB`);
})().catch(error=>{console.error(error);process.exitCode=1;});
