import * as THREE from 'three';
import { buildRealisticHuman } from './HumanModelBuilder';

export const SHOP_INTERIOR_ORIGIN = new THREE.Vector3(1050, 0, 1000);
export const SHOP_INTERIOR_SPAWN = new THREE.Vector3(1050, 0, 1004.5);
export const SHOP_COUNTER_POS = new THREE.Vector3(1050, 0, 996.4);
export const SHOP_MANAGER_WORLD_POS = new THREE.Vector3(1050, 0, 995.3);
export const SHOP_INTERIOR_BOUNDS = {
  minX: 1043.6,
  maxX: 1056.4,
  minZ: 996.9, // Player stops right in front of the checkout counter
  maxZ: 1005.3,
};

/**
 * Builds a realistic 3D retail store interior with stocked shelves,
 * customers browsing inside, a checkout counter (balcão), and a 3D manager.
 */
export function buildShopInterior(castShadow: boolean): THREE.Group {
  const group = new THREE.Group();
  group.position.copy(SHOP_INTERIOR_ORIGIN);

  const floorMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.45 });
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.85 });
  const accentMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.65 });
  const ceilingMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 });
  const shelfMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.6 });
  const counterMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.5 });
  const counterTopMat = new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.3 });
  const exitMat = new THREE.MeshStandardMaterial({
    color: 0x10b981,
    emissive: new THREE.Color(0x059669),
    emissiveIntensity: 0.4,
  });

  // Floor & Ceiling (14m x 12m)
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 12), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  group.add(floor);

  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(14, 12), ceilingMat);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = 4.0;
  group.add(ceiling);

  // Walls
  const backWall = new THREE.Mesh(new THREE.BoxGeometry(14, 4.0, 0.25), accentMat);
  backWall.position.set(0, 2.0, -6);
  group.add(backWall);

  const frontWall = new THREE.Mesh(new THREE.BoxGeometry(14, 4.0, 0.25), wallMat);
  frontWall.position.set(0, 2.0, 6);
  group.add(frontWall);

  const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.25, 4.0, 12), wallMat);
  leftWall.position.set(-7, 2.0, 0);
  group.add(leftWall);

  const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.25, 4.0, 12), wallMat);
  rightWall.position.set(7, 2.0, 0);
  group.add(rightWall);

  // Exit doormat
  const doormat = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.04, 0.9), exitMat);
  doormat.position.set(0, 0.02, 5.2);
  group.add(doormat);

  // Checkout Counter (Balcão) at the back
  const counterBody = new THREE.Mesh(new THREE.BoxGeometry(5.6, 1.05, 0.95), counterMat);
  counterBody.position.set(0, 0.525, -3.7);
  group.add(counterBody);

  const counterTop = new THREE.Mesh(new THREE.BoxGeometry(5.8, 0.08, 1.08), counterTopMat);
  counterTop.position.set(0, 1.08, -3.7);
  group.add(counterTop);

  // Cash register on counter
  const register = new THREE.Mesh(
    new THREE.BoxGeometry(0.55, 0.35, 0.45),
    new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.4 })
  );
  register.position.set(1.1, 1.28, -3.7);
  group.add(register);

  // Stocked product shelves on left and right sides
  const productColors = [0xef4444, 0x3b82f6, 0x10b981, 0xf59e0b, 0x8b5cf6];
  for (const sx of [-4.6, 4.6]) {
    for (const sz of [-1.2, 1.8]) {
      const shelf = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.9, 0.65), shelfMat);
      shelf.position.set(sx, 0.95, sz);
      group.add(shelf);
      for (let p = 0; p < 4; p++) {
        const box = new THREE.Mesh(
          new THREE.BoxGeometry(0.42, 0.36, 0.38),
          new THREE.MeshStandardMaterial({
            color: productColors[(p + Math.abs(Math.round(sx + sz))) % productColors.length],
            roughness: 0.5,
          })
        );
        box.position.set(sx - 0.8 + p * 0.54, 2.08, sz);
        group.add(box);
      }
    }
  }

  // 3D Store Manager behind the counter
  const managerRig = buildRealisticHuman(
    {
      name: 'Gerente',
      gender: 'homem',
      skinTone: '#5c3a21',
      hairStyle: 'curto',
      hairColor: '#18181b',
      shirtColor: '#f8fafc',
      pantsColor: '#1e293b',
      shoesColor: '#18181b',
    },
    castShadow
  );
  managerRig.group.position.set(0, 0, -4.7);
  managerRig.group.rotation.y = 0; // Facing +Z (toward customer)
  group.add(managerRig.group);

  // 2 Browsing 3D Customers inside the store
  const customer1 = buildRealisticHuman(
    {
      name: 'Cliente 1',
      gender: 'mulher',
      skinTone: '#7c4d2b',
      hairStyle: 'trancas',
      hairColor: '#18181b',
      shirtColor: '#dc2626',
      pantsColor: '#334155',
      shoesColor: '#18181b',
    },
    castShadow
  );
  customer1.group.position.set(-3.0, 0, 0.4);
  customer1.group.rotation.y = -Math.PI / 2;
  group.add(customer1.group);

  const customer2 = buildRealisticHuman(
    {
      name: 'Cliente 2',
      gender: 'homem',
      skinTone: '#4a2c18',
      hairStyle: 'afro',
      hairColor: '#18181b',
      shirtColor: '#0284c7',
      pantsColor: '#18181b',
      shoesColor: '#18181b',
    },
    castShadow
  );
  customer2.group.position.set(3.0, 0, 2.6);
  customer2.group.rotation.y = Math.PI / 2;
  group.add(customer2.group);

  // Bright retail interior lights
  const light1 = new THREE.PointLight(0xffffff, 2.0, 22);
  light1.position.set(0, 3.6, -2.0);
  group.add(light1);

  const light2 = new THREE.PointLight(0xfffbeb, 1.6, 20);
  light2.position.set(0, 3.6, 2.8);
  group.add(light2);

  group.traverse((obj) => {
    obj.frustumCulled = false;
  });

  return group;
}

/**
 * Creates a crisp 3D floating speech bubble sprite above a character's head.
 */
export function createSpeechBubbleTexture(
  text: string,
  bgColor: string,
  textColor: string
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 160;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Rounded speech bubble background
  const pad = 16;
  const w = canvas.width - pad * 2;
  const h = 114;
  const r = 28;
  ctx.fillStyle = bgColor;
  ctx.beginPath();
  ctx.moveTo(pad + r, pad);
  ctx.lineTo(pad + w - r, pad);
  ctx.quadraticCurveTo(pad + w, pad, pad + w, pad + r);
  ctx.lineTo(pad + w, pad + h - r);
  ctx.quadraticCurveTo(pad + w, pad + h, pad + w - r, pad + h);
  ctx.lineTo(canvas.width / 2 + 16, pad + h);
  ctx.lineTo(canvas.width / 2, pad + h + 22);
  ctx.lineTo(canvas.width / 2 - 16, pad + h);
  ctx.lineTo(pad + r, pad + h);
  ctx.quadraticCurveTo(pad, pad + h, pad, pad + h - r);
  ctx.lineTo(pad, pad + r);
  ctx.quadraticCurveTo(pad, pad, pad + r, pad);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 4;
  ctx.stroke();

  // Word-wrap text into up to 3 lines
  ctx.fillStyle = textColor;
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const words = text.split(' ');
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > w - 40 && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  const shown = lines.slice(0, 3);
  const startY = pad + h / 2 - ((shown.length - 1) * 28) / 2;
  shown.forEach((l, idx) => {
    ctx.fillText(l, canvas.width / 2, startY + idx * 28);
  });

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
