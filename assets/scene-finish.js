import { C as Group, A as Mesh, s as BoxGeometry, g as CylinderGeometry, N as MeshStandardMaterial, u as CanvasTexture, H as SRGBColorSpace } from './three-AKSjQ_ch.js';

export function loadManuscriptTexture() {
  const image = new Image();
  const placeholder = document.createElement('canvas');
  placeholder.width = 240;
  placeholder.height = 175;
  const context = placeholder.getContext('2d');
  context.fillStyle = '#f5f0df';
  context.fillRect(0, 0, 240, 175);
  const texture = new CanvasTexture(placeholder);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  image.onload = () => { context.drawImage(image, 0, 0, 240, 175); texture.needsUpdate = true; };
  image.src = new URL('./l10-manuscript-DIJ9bMSL.jpg', import.meta.url).href;
  return texture;
}

// A continuous, gently rounded coach body replaces the protruding roof strip.
export function buildBus() {
  const bus = new Group();
  bus.name = 'village-bus';
  const paint = new MeshStandardMaterial({color:'#dedac8', roughness:.42, metalness:.18});
  const blue = new MeshStandardMaterial({color:'#426e80', roughness:.4, metalness:.22});
  const glass = new MeshStandardMaterial({color:'#4b6870', roughness:.18, metalness:.38});
  const trim = new MeshStandardMaterial({color:'#a4a69d', roughness:.3, metalness:.72});
  const rubber = new MeshStandardMaterial({color:'#282b29', roughness:.94});
  function box(size, position, material, radius = 0) {
    const geometry = new BoxGeometry(...size, radius ? 4 : 1, radius ? 4 : 1, radius ? 4 : 1);
    if (radius) {
      const positions = geometry.attributes.position;
      for (let i = 0; i < positions.count; i++) {
        const p = [positions.getX(i), positions.getY(i), positions.getZ(i)];
        const center = p.map((v, axis) => Math.max(-size[axis]/2+radius, Math.min(size[axis]/2-radius, v)));
        const delta = p.map((v, axis) => v-center[axis]);
        const length = Math.hypot(...delta);
        positions.setXYZ(i, ...center.map((v, axis) => v + delta[axis]/length*radius));
      }
      geometry.computeVertexNormals();
    }
    const mesh = new Mesh(geometry, material);
    mesh.position.set(...position);
    bus.add(mesh);
    return mesh;
  }
  box([2.4,2.2,7], [0,1.55,0], paint, .12);
  box([2.42,.25,6.96], [0,1.1,0], blue, .045);
  for (const side of [-1,1]) {
    for (const z of [-2.5,-1.2,.1,1.4]) {
      box([.035,.82,1.10], [side*1.202,2,z], trim, .012);
      box([.04,.70,.98], [side*1.223,2,z], glass, .012);
    }
    box([.04,.045,6.45], [side*1.205,1.45,0], trim);
    box([.07,.33,.26], [side*1.35,2.12,2.85], trim, .025);
    box([.20,.04,.05], [side*1.25,1.98,2.85], trim);
  }
  for (const z of [-3.49,3.49]) {
    box([2.1,.91,.045], [0,2,z], trim, .035);
    box([1.98,.79,.05], [0,2,z+Math.sign(z)*.025], glass, .03);
    box([2.28,.15,.15], [0,.62,z], trim, .045);
  }
  box([.035,.79,.055], [0,2,3.545], trim);
  for (const x of [-.45,.45]) {
    const wiper = box([.39,.02,.02], [x,1.71,3.58], rubber);
    wiper.rotation.z = -.22;
  }
  for (const side of [-1,1]) for (const z of [-2.4,2.4]) {
    const wheel = new Mesh(new CylinderGeometry(.42,.42,.3,24), rubber);
    wheel.rotation.z = Math.PI/2;
    wheel.position.set(side*1.12,.42,z);
    bus.add(wheel);
    const hub = new Mesh(new CylinderGeometry(.19,.19,.025,20), trim);
    hub.rotation.z = Math.PI/2;
    hub.position.set(side*1.282,.42,z);
    bus.add(hub);
  }
  const headlight = new MeshStandardMaterial({color:'#f8edcd', roughness:.22, emissive:'#5a482b', emissiveIntensity:.25});
  for (const x of [-.77,.77]) {
    const light = new Mesh(new CylinderGeometry(.13,.13,.04,20), headlight);
    light.rotation.x = Math.PI/2;
    light.position.set(x,1.02,3.51);
    bus.add(light);
  }
  for (let y = .79; y < 1.01; y += .065) box([.86,.022,.035], [0,y,3.51], rubber);
  bus.traverse(mesh => { if (mesh.isMesh) mesh.castShadow = mesh.receiveShadow = true; });
  return bus;
}
