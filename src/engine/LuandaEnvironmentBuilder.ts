import * as THREE from 'three';

export interface FloatingBoat {
  group: THREE.Group;
  baseY: number;
  baseX: number;
  baseZ: number;
  phase: number;
  driftSpeed: number;
}

export interface ExtraEnvironmentResult {
  group: THREE.Group;
  boats: FloatingBoat[];
  extraHouses: { x: number; z: number; width: number; depth: number; name: string }[];
}

/**
 * Builds lush tropical forests around Luanda outskirts, 3D boats floating on
 * Baía de Luanda / Atlantic Ocean, and additional detailed residential houses.
 */
export function buildForestsBoatsAndHouses(castShadow: boolean): ExtraEnvironmentResult {
  const group = new THREE.Group();
  const boats: FloatingBoat[] = [];
  const extraHouses: { x: number; z: number; width: number; depth: number; name: string }[] = [];

  // --- 1. LUSH TROPICAL FORESTS (Outskirts of Talatona, Viana, and South) ---
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c3d28, roughness: 0.92 });
  const leafDarkMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.8 });
  const leafMidMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.78 });
  const bushMat = new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.85 });

  const forestZones = [
    { cx: -35, cz: 78, count: 22, spread: 24 },
    { cx: 145, cz: 55, count: 24, spread: 26 },
    { cx: 148, cz: -55, count: 20, spread: 24 },
    { cx: 12, cz: -82, count: 18, spread: 22 },
  ];

  let seed = 42;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  for (const zone of forestZones) {
    for (let i = 0; i < zone.count; i++) {
      const tx = zone.cx + (rand() - 0.5) * zone.spread * 2;
      const tz = zone.cz + (rand() - 0.5) * zone.spread * 2;
      const h = 4.2 + rand() * 3.4;

      const tree = new THREE.Group();
      tree.position.set(tx, 0, tz);

      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.34, h, 7),
        trunkMat
      );
      trunk.position.y = h / 2;
      trunk.castShadow = castShadow;
      tree.add(trunk);

      // Layered organic canopy
      const c1 = new THREE.Mesh(
        new THREE.DodecahedronGeometry(1.7 + rand() * 0.6, 1),
        i % 2 === 0 ? leafDarkMat : leafMidMat
      );
      c1.position.set(0, h + 0.4, 0);
      c1.scale.set(1.25, 0.85, 1.25);
      c1.castShadow = castShadow;
      tree.add(c1);

      const c2 = new THREE.Mesh(
        new THREE.DodecahedronGeometry(1.25, 1),
        leafMidMat
      );
      c2.position.set(0.6, h + 1.1, 0.4);
      tree.add(c2);

      // Ground bush
      if (i % 3 === 0) {
        const bush = new THREE.Mesh(new THREE.SphereGeometry(0.85, 8, 6), bushMat);
        bush.scale.set(1.3, 0.7, 1.3);
        bush.position.set(0.9, 0.4, -0.7);
        tree.add(bush);
      }

      group.add(tree);
    }
  }

  // --- 2. 3D BOATS ON THE ATLANTIC OCEAN / BAÍA DE LUANDA ---
  const hullColors = [0xf8fafc, 0x0284c7, 0xdc2626, 0xf59e0b, 0x0f766e];
  const deckMat = new THREE.MeshStandardMaterial({ color: 0xd6b588, roughness: 0.75 });
  const cabinMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.35 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.1, metalness: 0.85 });

  const boatCoords: [number, number][] = [
    [-72, -32],
    [-74, -8],
    [-71, 26],
    [-76, 46],
    [-98, -14],
    [-96, 22],
  ];

  boatCoords.forEach(([bx, bz], idx) => {
    const boat = new THREE.Group();
    const hullMat = new THREE.MeshStandardMaterial({
      color: hullColors[idx % hullColors.length],
      roughness: 0.35,
      metalness: 0.25,
    });

    // Sculpted hull
    const hull = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.9, 6.2), hullMat);
    hull.position.y = 0.25;
    boat.add(hull);

    // Pointed bow
    const bow = new THREE.Mesh(new THREE.ConeGeometry(1.4, 2.1, 4), hullMat);
    bow.rotation.x = Math.PI / 2;
    bow.rotation.y = Math.PI / 4;
    bow.scale.set(1.2, 1, 0.55);
    bow.position.set(0, 0.35, 3.8);
    boat.add(bow);

    // Wooden deck
    const deck = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.12, 5.5), deckMat);
    deck.position.y = 0.72;
    boat.add(deck);

    // Cabin + windshield
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.15, 2.2), cabinMat);
    cabin.position.set(0, 1.3, -0.4);
    boat.add(cabin);

    const glass = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.55, 2.28), glassMat);
    glass.position.set(0, 1.45, -0.4);
    boat.add(glass);

    boat.position.set(bx, -0.15, bz);
    boat.rotation.y = idx % 2 === 0 ? 0.15 : Math.PI - 0.15;
    group.add(boat);

    boats.push({
      group: boat,
      baseY: -0.15,
      baseX: bx,
      baseZ: bz,
      phase: idx * 1.4,
      driftSpeed: 0.45 + (idx % 3) * 0.2,
    });
  });

  // --- 3. ADDITIONAL RESIDENTIAL HOUSES ---
  const housePalette = [0xfef3c7, 0xfed7aa, 0xe0f2fe, 0xfce7f3, 0xdcfce7];
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x9a3412, roughness: 0.8 });
  const doorMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.7 });
  const winMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.15, metalness: 0.7 });

  const houseSpots: { x: number; z: number; name: string }[] = [
    { x: -38, z: 36, name: 'Vivenda da Maianga' },
    { x: -24, z: 42, name: 'Casa Familiar Sul' },
    { x: 18, z: 42, name: 'Residência do Kilamba' },
    { x: 46, z: 36, name: 'Vivenda de Talatona' },
    { x: 74, z: -38, name: 'Casa de Viana Norte' },
    { x: 88, z: 36, name: 'Residência de Viana Sul' },
  ];

  houseSpots.forEach((spot, idx) => {
    const w = 9;
    const h = 4.6;
    const d = 8;
    const house = new THREE.Group();
    house.position.set(spot.x, 0, spot.z);

    const wallMat = new THREE.MeshStandardMaterial({
      color: housePalette[idx % housePalette.length],
      roughness: 0.82,
    });
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
    body.position.y = h / 2;
    body.castShadow = castShadow;
    body.receiveShadow = true;
    house.add(body);

    // Sloped terracotta roof
    const roof = new THREE.Mesh(new THREE.ConeGeometry(7.2, 2.2, 4), roofMat);
    roof.rotation.y = Math.PI / 4;
    roof.position.y = h + 1.1;
    house.add(roof);

    // Front door & windows
    const door = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.5, 0.15), doorMat);
    door.position.set(0, 1.25, d / 2 + 0.04);
    house.add(door);

    for (const wx of [-2.6, 2.6]) {
      const win = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.3, 0.15), winMat);
      win.position.set(wx, 2.6, d / 2 + 0.04);
      house.add(win);
    }

    group.add(house);
    extraHouses.push({ x: spot.x, z: spot.z, width: w, depth: d, name: spot.name });
  });

  group.traverse((obj) => {
    obj.frustumCulled = false;
  });

  return { group, boats, extraHouses };
}
