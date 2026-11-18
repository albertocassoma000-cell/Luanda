import * as THREE from 'three';

export const HOUSE_INTERIOR_ORIGIN = new THREE.Vector3(1000, 0, 1000);
export const HOUSE_INTERIOR_SPAWN = new THREE.Vector3(1000, 0, 1003.6);
export const HOUSE_INTERIOR_BOUNDS = {
  minX: 994.7,
  maxX: 1005.3,
  minZ: 995.7,
  maxZ: 1004.3,
};

/**
 * Builds a furnished 3D Angolan home interior at HOUSE_INTERIOR_ORIGIN
 * so the player can enter any house and walk around inside.
 */
export function buildHouseInterior(): THREE.Group {
  const group = new THREE.Group();
  group.position.copy(HOUSE_INTERIOR_ORIGIN);

  const wallMat = new THREE.MeshStandardMaterial({ color: 0xf5efe6, roughness: 0.85 });
  const accentWallMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.8 });
  const floorMat = new THREE.MeshStandardMaterial({ color: 0xc2a382, roughness: 0.65 });
  const ceilingMat = new THREE.MeshStandardMaterial({ color: 0xfafaf9, roughness: 0.9 });
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x5c3a21, roughness: 0.7 });
  const darkWoodMat = new THREE.MeshStandardMaterial({ color: 0x3b2314, roughness: 0.65 });
  const sofaMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.85 });
  const bedMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.8 });
  const pillowMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.9 });
  const rugMat = new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.95 });
  const screenMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    emissive: new THREE.Color(0x1e3a8a),
    emissiveIntensity: 0.35,
    roughness: 0.15,
  });
  const counterMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.4 });
  const doorMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.6 });
  const exitMat = new THREE.MeshStandardMaterial({
    color: 0x10b981,
    emissive: new THREE.Color(0x059669),
    emissiveIntensity: 0.4,
  });

  // Floor & Ceiling (12m x 10m)
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(12, 10), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  group.add(floor);

  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(12, 10), ceilingMat);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = 3.8;
  group.add(ceiling);

  // 4 Walls
  const backWall = new THREE.Mesh(new THREE.BoxGeometry(12, 3.8, 0.25), accentWallMat);
  backWall.position.set(0, 1.9, -5);
  group.add(backWall);

  const frontWall = new THREE.Mesh(new THREE.BoxGeometry(12, 3.8, 0.25), wallMat);
  frontWall.position.set(0, 1.9, 5);
  group.add(frontWall);

  const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.25, 3.8, 10), wallMat);
  leftWall.position.set(-6, 1.9, 0);
  group.add(leftWall);

  const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.25, 3.8, 10), wallMat);
  rightWall.position.set(6, 1.9, 0);
  group.add(rightWall);

  // Exit Door (Front wall center)
  const exitDoor = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.5, 0.14), doorMat);
  exitDoor.position.set(0, 1.25, 4.86);
  group.add(exitDoor);

  const doormat = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.04, 0.8), exitMat);
  doormat.position.set(0, 0.02, 4.35);
  group.add(doormat);

  // --- LIVING ROOM (Left side) ---
  const rug = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.03, 2.4), rugMat);
  rug.position.set(-3.2, 0.015, 0.5);
  group.add(rug);

  const sofaBase = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.45, 0.95), sofaMat);
  sofaBase.position.set(-3.2, 0.225, 1.8);
  group.add(sofaBase);
  const sofaBack = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.55, 0.22), sofaMat);
  sofaBack.position.set(-3.2, 0.68, 2.18);
  group.add(sofaBack);

  const coffeeTable = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.36, 0.75), woodMat);
  coffeeTable.position.set(-3.2, 0.18, 0.45);
  group.add(coffeeTable);

  const tvStand = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.5, 0.45), darkWoodMat);
  tvStand.position.set(-3.2, 0.25, -1.1);
  group.add(tvStand);
  const tvScreen = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.85, 0.08), screenMat);
  tvScreen.position.set(-3.2, 1.0, -1.1);
  group.add(tvScreen);

  // --- BEDROOM (Back-right) ---
  const bedFrame = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.35, 2.2), darkWoodMat);
  bedFrame.position.set(3.8, 0.175, -3.2);
  group.add(bedFrame);
  const mattress = new THREE.Mesh(new THREE.BoxGeometry(1.95, 0.24, 2.05), bedMat);
  mattress.position.set(3.8, 0.46, -3.2);
  group.add(mattress);
  for (const px of [3.35, 4.25]) {
    const pillow = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.14, 0.42), pillowMat);
    pillow.position.set(px, 0.62, -3.95);
    group.add(pillow);
  }

  const wardrobe = new THREE.Mesh(new THREE.BoxGeometry(0.65, 2.2, 1.6), woodMat);
  wardrobe.position.set(5.45, 1.1, -0.8);
  group.add(wardrobe);

  // --- KITCHENETTE (Back-left) ---
  const counter = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.9, 0.75), counterMat);
  counter.position.set(-3.8, 0.45, -4.4);
  group.add(counter);

  const fridge = new THREE.Mesh(new THREE.BoxGeometry(0.85, 2.0, 0.8), counterMat);
  fridge.position.set(-1.8, 1.0, -4.4);
  group.add(fridge);

  // Dining table
  const diningTable = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.76, 0.9), woodMat);
  diningTable.position.set(3.2, 0.38, 2.2);
  group.add(diningTable);

  // Warm interior lighting
  const roomLight = new THREE.PointLight(0xffedd5, 1.8, 18);
  roomLight.position.set(0, 3.3, 0);
  group.add(roomLight);

  group.traverse((obj) => {
    obj.frustumCulled = false;
  });

  return group;
}
