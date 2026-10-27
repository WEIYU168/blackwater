import { C as Group, A as Mesh, N as MeshStandardMaterial, l as BufferGeometry, c as BufferAttribute } from './three-AKSjQ_ch.js';

const templates = new Map();
const material = new MeshStandardMaterial({ vertexColors: true, roughness: 0.88, metalness: 0 });

// Blender exports one mesh per articulated part, with clothing colors baked into vertices.
export async function loadCharacterLibrary(url = new URL('./characters/characters.json', import.meta.url)) {
  const response = await fetch(url);
  if (!response.ok) throw new Error('人物模型資料載入失敗，請重新整理。');
  const data = await response.json();
  const meshResponse = await fetch(new URL(data.buffer, url));
  if (!meshResponse.ok) throw new Error('人物模型載入失敗，請重新整理。');
  const buffer = await meshResponse.arrayBuffer();
  for (const [id, character] of Object.entries(data.characters)) {
    const root = new Group(), nodes = new Map();
    root.name = id;
    root.userData.characterId = id;
    root.userData.displayName = character.name;
    for (const def of character.nodes) {
      const node = new Group();
      node.name = def.name;
      node.position.fromArray(def.position);
      node.quaternion.fromArray(def.quaternion);
      node.scale.fromArray(def.scale);
      nodes.set(def.name, node);
      if (def.mesh) {
        const geometry = new BufferGeometry();
        for (const [attribute, key] of [['position', 'positions'], ['normal', 'normals'], ['color', 'colors']]) {
          const range = def.mesh[key];
          geometry.setAttribute(attribute, new BufferAttribute(new Float32Array(buffer, range.byteOffset, range.length), 3));
        }
        geometry.computeBoundingSphere();
        const mesh = new Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        node.add(mesh);
      }
    }
    for (const def of character.nodes) (def.parent ? nodes.get(def.parent) : root).add(nodes.get(def.name));
    templates.set(id, root);
  }
}

export function createCharacter(id) {
  const template = templates.get(id);
  if (!template) throw new Error(`缺少人物模型：${id}`);
  const root = template.clone(true);
  root.userData.rig = Object.fromEntries(['body', 'head', 'armL', 'armR', 'forearmL', 'forearmR'].map(name => [name, root.getObjectByName(name)]));
  root.userData.restPose = Object.fromEntries(Object.entries(root.userData.rig).filter(([, node]) => node).map(([name, node]) => [name, node.rotation.toArray()]));
  return root;
}

export function installClinicCharacters(world) {
  const clinic = world.clinic;
  if (!clinic) return;
  const patient = createCharacter('clinicPatient');
  clinic.patientAnchor.add(patient);
  clinic.patient = patient;
  clinic.onExamine = (elapsed, reducedMotion) => {
    const doctor = world.npcs.get('wang');
    if (!doctor) return;
    const rig = doctor.userData.rig;
    const sway = reducedMotion ? 0 : Math.sin(elapsed * 0.85) * 0.035;
    if (rig.body) rig.body.rotation.x = 0.16;
    if (rig.head) rig.head.rotation.x = 0.24 + sway;
    if (rig.armL) rig.armL.rotation.x = -0.56 + sway;
    if (rig.armR) rig.armR.rotation.x = -0.7 - sway;
    if (rig.forearmL) rig.forearmL.rotation.x = -0.55;
    if (rig.forearmR) rig.forearmR.rotation.x = -0.48;
    const head = patient.userData.rig.head;
    if (head) head.rotation.x = reducedMotion ? 0 : Math.sin(elapsed * 0.65) * 0.025;
  };
  clinic.onExamine(0, true);
}

export function animateCharacters(world, elapsed) {
  for (const [id, root] of world.npcs) {
    if (id === 'wang') continue;
    const subjects = id === 'girls' ? root.children.filter(child => child.userData.characterId) : [root];
    for (const character of subjects) {
      const head = character.userData.rig?.head;
      if (head) head.rotation.y = world.opts.reducedMotion ? 0 : Math.sin(elapsed * 0.55 + root.position.x) * 0.045;
    }
  }
}
