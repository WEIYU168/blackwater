import {
  C as Group, A as Mesh, s as BoxGeometry, g as CylinderGeometry,
  N as MeshStandardMaterial, et as Vector3, L as PointLight,
} from './three-AKSjQ_ch.js';

// This clinic shares the town's existing architectural materials and furniture.
// The shell is retained outdoors and exchanged for low walls while inside.
export function buildClinic(host, helpers) {
  const { house, sign, table, cabinet, bed, bench, lamp, merge } = helpers;
  const scene = host.scene;
  const floorHeight = .32;
  const fixtures = new Group();
  fixtures.name = 'clinic-fixtures';
  fixtures.position.y = floorHeight;
  const indoorSigns = new Group();
  indoorSigns.userData.keep = true;
  const outdoorSigns = new Group();
  outdoorSigns.userData.keep = true;
  scene.add(indoorSigns, outdoorSigns);
  const shell = house({
    w: 8, d: 6, h: 3.4, wall: 'plaster', roof: 'red', winAt: [],
    backWindows: 2, doorOpen: true, doorW: 2.1, interior: true,
    floor: 'flag', seed: 7,
  }).group;
  shell.name = 'clinic-exterior';
  // Merge this removable shell separately so its visibility survives the town merge.
  merge(shell, () => false);
  shell.userData.keep = true;
  shell.position.set(-14, 0, 13.5);
  shell.rotation.y = Math.PI / 2;
  scene.add(shell, fixtures);

  const cutaway = new Group();
  cutaway.name = 'clinic-cutaway';
  const colored = new Map();
  function material(color) {
    if (!colored.has(color)) colored.set(color, new MeshStandardMaterial({ color, roughness: .85 }));
    return colored.get(color);
  }
  function box(parent, name, size, position, mat) {
    const mesh = new Mesh(new BoxGeometry(...size), typeof mat === 'string' ? material(mat) : mat);
    mesh.name = name;
    mesh.position.set(...position);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
  function place(object, name, x, z, rotation = 0, y = 0) {
    object.name = name;
    object.position.set(x, y, z);
    object.rotation.y = rotation;
    object.traverse(child => {
      if (child.isMesh) child.castShadow = child.receiveShadow = true;
    });
    fixtures.add(object);
    return object;
  }
  function label(text, x, y, z, width = 1.6, rotation = 0, outside = false) {
    const mesh = sign(text, width, .3, { size: 40, bg: '#f2ebd7', fg: '#304b43', border: '#8b7960' });
    mesh.position.set(x, y, z);
    mesh.rotation.y = rotation;
    (outside ? outdoorSigns : indoorSigns).add(mesh);
    return mesh;
  }
  function bottle(x, y, z, color = '#785536') {
    const body = new Mesh(new CylinderGeometry(.055, .06, .17, 8), material(color));
    body.position.set(x, y + .085, z);
    fixtures.add(body);
    box(fixtures, 'medicine-label', [.085, .075, .01], [x, y + .09, z + .055], '#ece4ce');
    const lid = new Mesh(new CylinderGeometry(.033, .033, .035, 8), material('#d4d0bf'));
    lid.position.set(x, y + .187, z);
    fixtures.add(lid);
  }

  box(cutaway, 'clinic-floor', [5.8, .09, 7.8], [-14, floorHeight - .045, 13.5], '#c1bba8');
  // Low walls leave the room readable from every permitted orbit angle.
  for (const [name, size, position] of [
    ['back-wall', [.24, .65, 8], [-16.88, .325, 13.5]],
    ['north-wall', [6, .65, .24], [-14, .325, 9.62]],
    ['south-wall', [6, .65, .24], [-14, .325, 17.38]],
    ['front-north-wall', [.24, .65, 2.95], [-11.12, .325, 10.975]],
    ['front-south-wall', [.24, .65, 2.95], [-11.12, .325, 16.025]],
  ]) box(cutaway, name, size, position, '#d2cebb');
  const westBackdrop = new Group(), northBackdrop = new Group();
  for (const backdrop of [westBackdrop, northBackdrop]) {
    backdrop.userData.keep = true;
    cutaway.add(backdrop);
  }
  box(westBackdrop, 'west-interior-wall', [.18, 2.65, 7.76], [-16.88, 1.325, 13.5], '#dcd5bf');
  box(westBackdrop, 'west-wainscot', [.02, .85, 7.72], [-16.775, .425, 13.5], '#87968a');
  box(northBackdrop, 'north-interior-wall', [5.76, 2.65, .18], [-14, 1.325, 9.62], '#dcd5bf');
  box(northBackdrop, 'north-wainscot', [5.72, .85, .02], [-14, .425, 9.725], '#87968a');
  merge(cutaway, () => false);
  cutaway.userData.keep = true;
  cutaway.visible = false;
  scene.add(cutaway);

  // Wall segments leave a 2.1 m doorway, including sufficient navigation clearance.
  host.collide(-16.88, 13.5, .12, 4);
  host.collide(-14, 9.62, 3, .12);
  host.collide(-14, 17.38, 3, .12);
  host.collide(-11.12, 10.975, .12, 1.475);
  host.collide(-11.12, 16.025, .12, 1.475);

  place(cabinet(2.2, 1.85, .42), 'medicine-cabinet', -13.0, 10.06);
  host.collide(-13.0, 10.06, 1.1, .21);
  label('藥品櫃', -13.0, 2.15, 10.29, 1.1);
  place(bed(1.9, .9), 'examination-bed', -15.95, 15.68);
  host.collide(-15.95, 15.68, .45, .95);
  label('診療床', -16.84, 1.8, 15.7, 1.2, Math.PI / 2);

  place(bench(.72), 'patient-chair', -15.8, 11.0);
  host.collide(-15.8, 11.0, .38, .36);
  // A supported, covered lower leg conveys care without depicting an open wound.
  box(fixtures, 'foot-rest', [.55, .25, .55], [-15.8, .125, 11.65], '#7d6950');
  box(fixtures, 'foot-rest-cushion', [.59, .065, .59], [-15.8, .28, 11.65], '#d7ddcf');
  host.collide(-15.8, 11.65, .3, .3);
  place(table(.55, .5, .75), 'instrument-trolley', -16.1, 12.75);
  host.collide(-16.1, 12.75, .275, .25);
  box(fixtures, 'instrument-tray', [.44, .025, .32], [-16.1, .79, 12.75], '#c6c8c1');
  box(fixtures, 'folded-bandage', [.16, .07, .12], [-16.2, .84, 12.73], '#f6f2e5');
  bottle(-15.98, .81, 12.72, '#9b6c36');
  label('看診區', -16.84, 2.25, 11.5, 1.5, Math.PI / 2);

  place(bench(1.7), 'waiting-bench', -11.75, 15.45, -Math.PI / 2);
  host.collide(-11.75, 15.45, .2, .85);
  label('候診', -11.24, .76, 15.45, .8, -Math.PI / 2);
  place(table(1.75, .8, .78), 'clinic-writing-desk', -13.8, 16.35);
  host.collide(-13.8, 16.35, .875, .4);
  place(lamp(false), 'desk-lamp', -14.38, 16.32, 0, .82);
  box(fixtures, 'case-records', [.48, .035, .37], [-13.72, .83, 16.28], '#eee6d2');
  box(fixtures, 'clinic-pen', [.025, .025, .31], [-13.31, .86, 16.28], '#4a3a2e');
  label('病歷與人權筆記', -13.8, 1.05, 16.65, 1.55);

  // Keep the existing manuscript clue and later memorial puzzle in this room.
  label('王醫師的手寫稿', -16.84, 2.1, 13.8, 1.8, Math.PI / 2);
  const manuscript = sign('行醫手記', 1.6, .65, { size: 44, bg: '#f5f0df', fg: '#443b30' });
  manuscript.position.set(-16.85, 1.48, 13.8);
  manuscript.rotation.y = Math.PI / 2;
  fixtures.add(manuscript);
  place(table(.65, .55, .9), 'memorial-display', -12.1, 11.6);
  host.collide(-12.1, 11.6, .325, .275);
  box(fixtures, 'memory-card', [.44, .025, .32], [-12.1, .94, 11.6], '#eee4cf');

  const clinicTexture = sign('金河診所', 2.6, .7).material.map;
  const memorialTexture = sign('烏腳病醫療紀念館', 3.6, .7, { size: 48 }).material.map;
  const streetSign = sign('金河診所', 3.4, .7);
  streetSign.material.map = clinicTexture;
  streetSign.position.set(-10.86, 2.8, 13.5);
  streetSign.rotation.y = Math.PI / 2;
  streetSign.userData.keep = true;
  scene.add(streetSign);
  label('35號', -10.85, 2.1, 15.6, .65, Math.PI / 2, true);
  label('請進・慢慢走', -10.85, 2.15, 13.5, 1.8, Math.PI / 2, true);

  const patientAnchor = new Group();
  patientAnchor.name = 'clinic-patient';
  patientAnchor.userData.keep = true;
  patientAnchor.position.set(-15.8, floorHeight, 11.0);
  scene.add(patientAnchor);
  const interiorLight = new PointLight('#ffe9c5', 2.4, 9, 1.6);
  interiorLight.position.set(-14, 2.9, 13.0);
  interiorLight.castShadow = false;
  scene.add(interiorLight);

  const clinic = {
    shell, cutaway, patientAnchor, sign: streetSign, clinicTexture, memorialTexture,
    doctorPosition: { x: -14.45, y: floorHeight, z: 12.0 },
    patientPosition: { x: -15.8, y: floorHeight, z: 11.0 },
    doctorFacing: Math.atan2(-1.35, -.5), patientFacing: 0,
    inside: false, onExamine: null,
    contains(x, z) { return x < -10.9 && x > -17.05 && z > 9.45 && z < 17.55; },
    update(world, dt, elapsed) {
      const next = this.contains(world.player.position.x, world.player.position.z);
      if (next !== this.inside) {
        this.inside = next;
        shell.visible = !next;
        cutaway.visible = next;
        world.needRender = true;
        world.renderer.shadowMap.needsUpdate = true;
      }
      // The raised floor covers the town's road surface; actors stand on it.
      world.player.position.y = next ? floorHeight : 0;
      indoorSigns.visible = next;
      outdoorSigns.visible = !next;
      streetSign.visible = !next;
      westBackdrop.visible = Math.sin(world.camTheta) >= -.15;
      northBackdrop.visible = Math.cos(world.camTheta) >= -.15;
      for (const sign of indoorSigns.children) {
        sign.visible = sign.position.x < -16.5 ? westBackdrop.visible : sign.position.z < 10.5 ? northBackdrop.visible : true;
      }
      const playerLabel = world.player.children?.find(child => child.isSprite);
      if (playerLabel) playerLabel.visible = !next;
      this.onExamine?.(elapsed, world.opts.reducedMotion, dt);
    },
    cameraGoal(world) {
      const position = world.player.position;
      const target = new Vector3(position.x, 1.0, position.z);
      const phi = Math.max(.7, Math.min(1.14, world.camPhi));
      const distance = Math.max(7.2, Math.min(9.8, world.camDist * .57));
      const offset = new Vector3(
        Math.sin(world.camTheta) * Math.cos(phi), Math.sin(phi),
        Math.cos(world.camTheta) * Math.cos(phi),
      ).multiplyScalar(distance);
      return { pos: target.clone().add(offset), target };
    },
  };
  return clinic;
}
