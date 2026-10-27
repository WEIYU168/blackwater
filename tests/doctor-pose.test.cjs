const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

(async () => {
  const T = await import('../assets/three-AKSjQ_ch.js');
  const { loadCharacterLibrary, createCharacter, installClinicCharacters } = await import('../assets/characters.js');
  const originalFetch = global.fetch;
  global.fetch = async url => new Response(fs.readFileSync(path.join(__dirname, '..', new URL(url).pathname)));
  try { await loadCharacterLibrary(new URL('https://fixture.test/assets/characters/characters.json')); }
  finally { global.fetch = originalFetch; }
  const doctor = createCharacter('wang');
  const body = doctor.getObjectByName('body');
  const joints = ['head', 'armL', 'armR'];
  const relative = name => {
    doctor.updateMatrixWorld(true);
    return body.worldToLocal(doctor.getObjectByName(name).getWorldPosition(new T.et()));
  };
  const rest = joints.map(relative);
  const hip = doctor.getObjectByName('legL').getWorldPosition(new T.et());
  const world = { npcs: new Map([['wang', doctor]]), clinic: { patientAnchor: new T.C() } };
  installClinicCharacters(world);
  for (const reduced of [false, true]) for (const time of [0, 1, 6, 20]) {
    world.clinic.onExamine(time, reduced);
    joints.forEach((name, index) => assert(relative(name).distanceTo(rest[index]) < 1e-5,
      `${name} separates from the torso during examination`));
    assert(doctor.getObjectByName('legL').getWorldPosition(new T.et()).distanceTo(hip) < 1e-5,
      'Leaning moves the planted legs');
  }
  console.log('PASS doctor head and shoulders stay attached during every examination pose; feet remain planted');
})().catch(error => { console.error(error); process.exitCode = 1; });
