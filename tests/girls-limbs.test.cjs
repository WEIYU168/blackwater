const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

(async () => {
  const T = await import('../assets/three-AKSjQ_ch.js');
  const { loadCharacterLibrary, createCharacter } = await import('../assets/characters.js');
  const originalFetch = global.fetch;
  global.fetch = async url => new Response(fs.readFileSync(path.join(__dirname, '..', new URL(url).pathname)));
  try { await loadCharacterLibrary(new URL('https://fixture.test/assets/characters/characters.json')); }
  finally { global.fetch = originalFetch; }

  function legs(id) {
    const character = createCharacter(id);
    character.updateMatrixWorld(true);
    return ['shinL', 'shinR'].map(name => {
      const joint = character.getObjectByName(name);
      const mesh = joint.children.find(child => child.isMesh);
      mesh.geometry.computeBoundingBox();
      return { mesh, bounds: mesh.geometry.boundingBox, x: joint.getWorldPosition(new T.et()).x };
    });
  }
  function bandagedEnd(leg) {
    const positions = leg.mesh.geometry.attributes.position;
    const colors = leg.mesh.geometry.attributes.color;
    let checked = 0;
    for (let i = 0; i < positions.count; i++) {
      if (positions.getY(i) > leg.bounds.min.y + .025) continue;
      assert(Math.min(colors.getX(i), colors.getY(i), colors.getZ(i)) > .5,
        'The closed end must be covered by light bandage, without skin or footwear showing');
      checked++;
    }
    assert(checked > 20, 'The bandage needs a complete rounded end');
    assert(leg.bounds.max.z < .075, 'An amputated limb still has a projecting foot or sandal');
  }

  // Models face +Z: anatomical left is +X, regardless of legacy joint suffixes.
  const baoyu = legs('baoyu');
  const left = baoyu.find(leg => leg.x > 0), right = baoyu.find(leg => leg.x < 0);
  assert(left.bounds.min.y > -.23 && left.bounds.min.y < -.13,
    'Baoyu needs a short lower leg below her left knee');
  assert(right.bounds.min.y < -.38 && right.bounds.max.z > .1,
    'Baoyu must retain her full right leg and foot');
  bandagedEnd(left);
  console.log('PASS Baoyu: anatomical left below-knee amputation with a covered end; right foot retained');

  const quance = legs('quance');
  for (const leg of quance) {
    assert(leg.bounds.min.y > -.37 && leg.bounds.min.y < -.30,
      'Quance must retain both lower legs with feet removed at the ankles');
    bandagedEnd(leg);
  }
  assert(Math.abs(quance[0].bounds.min.y - quance[1].bounds.min.y) < .001);
  console.log('PASS Quance: both lower legs retained, both feet removed and fully bandaged');
})().catch(error => { console.error(error); process.exitCode = 1; });
