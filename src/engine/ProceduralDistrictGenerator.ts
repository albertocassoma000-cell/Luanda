import * as THREE from 'three';

export interface ProceduralCollider {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface ProceduralDistrictResult {
  group: THREE.Group;
  colliders: ProceduralCollider[];
  nightMaterials: THREE.MeshStandardMaterial[];
  lampMaterials: THREE.MeshStandardMaterial[];
}

/** Deterministic PRNG (Mulberry32) so procedural blocks & collisions remain consistent */
function createSeededRandom(seed: number) {
  let a = seed >>> 0;
  return function next(): number {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Procedurally generates expanded urban blocks for Talatona (modern glass towers,
 * residential condominiums, landscaped plazas) and Viana (industrial warehouses,
 * commercial blocks, residential grid), plus connecting main avenues.
 */
export function generateTalatonaAndVianaDistricts(
  isSoftwareGl: boolean,
  windowTex: THREE.Texture,
  roadMatH: THREE.MeshStandardMaterial,
  roadMatV: THREE.MeshStandardMaterial
): ProceduralDistrictResult {
  const group = new THREE.Group();
  const colliders: ProceduralCollider[] = [];
  const nightMaterials: THREE.MeshStandardMaterial[] = [];
  const lampMaterials: THREE.MeshStandardMaterial[] = [];

  const rand = createSeededRandom(20261117);

  // Shared materials for procedural details
  const concreteMat = new THREE.MeshStandardMaterial({ color: 0xa1a1aa, roughness: 0.88 });
  const grassMat = new THREE.MeshStandardMaterial({ color: 0x3f6212, roughness: 0.92 });
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x3f3f46, metalness: 0.7, roughness: 0.35 });
  const bulbMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: new THREE.Color(0xfbbf24),
    emissiveIntensity: 0,
    roughness: 0.2,
  });
  lampMaterials.push(bulbMat);

  // --- 1. NEW MAIN CONNECTING ROADS (Talatona & Viana Arterials) ---
  // Avenida Principal de Talatona (South-Central expansion, x = 22, z = 36..126)
  const talatonaAve = new THREE.Mesh(new THREE.PlaneGeometry(9.5, 96), roadMatV);
  talatonaAve.rotation.x = -Math.PI / 2;
  talatonaAve.position.set(22, 0.025, 84);
  talatonaAve.receiveShadow = true;
  group.add(talatonaAve);

  // Estrada Principal do Polo Industrial de Viana (East expansion, z = 2, x = 84..190)
  const vianaHighway = new THREE.Mesh(new THREE.PlaneGeometry(110, 10.5), roadMatH);
  vianaHighway.rotation.x = -Math.PI / 2;
  vianaHighway.position.set(138, 0.032, 2);
  vianaHighway.receiveShadow = true;
  group.add(vianaHighway);

  // Ligação Expressa Talatona–Viana (South-East arterial, z = 54, x = 22..186)
  const talatonaVianaLink = new THREE.Mesh(new THREE.PlaneGeometry(168, 9.5), roadMatH);
  talatonaVianaLink.rotation.x = -Math.PI / 2;
  talatonaVianaLink.position.set(104, 0.032, 54);
  talatonaVianaLink.receiveShadow = true;
  group.add(talatonaVianaLink);

  // Avenida Norte-Sul do Polo de Viana (x = 148, z = -72..74)
  const vianaNorthSouth = new THREE.Mesh(new THREE.PlaneGeometry(9.5, 152), roadMatV);
  vianaNorthSouth.rotation.x = -Math.PI / 2;
  vianaNorthSouth.position.set(148, 0.025, 2);
  vianaNorthSouth.receiveShadow = true;
  group.add(vianaNorthSouth);

  // Helper to add a procedural streetlamp
  const addLamp = (x: number, z: number) => {
    const lamp = new THREE.Group();
    lamp.position.set(x, 0, z);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 6.5, 6), poleMat);
    pole.position.y = 3.25;
    const arm = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.12, 0.12), poleMat);
    arm.position.set(0.6, 6.4, 0);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 8), bulbMat);
    bulb.position.set(1.2, 6.25, 0);
    lamp.add(pole, arm, bulb);
    group.add(lamp);
  };

  // Place lamps along new arterials
  for (let x = 96; x <= 176; x += 26) {
    addLamp(x, -4.5);
    addLamp(x, 48.5);
  }
  for (let z = 44; z <= 112; z += 24) {
    addLamp(16, z);
  }

  // Helper to add a procedural composite building + collider
  const addProceduralBuilding = (
    x: number,
    z: number,
    w: number,
    d: number,
    h: number,
    baseColor: string,
    accentColor: string,
    style: 'talatona_tower' | 'talatona_villa' | 'viana_warehouse' | 'viana_block'
  ) => {
    const bGroup = new THREE.Group();
    bGroup.position.set(x, 0, z);

    const bodyMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(baseColor),
      map: style === 'viana_warehouse' ? undefined : windowTex,
      roughness: style === 'talatona_tower' ? 0.35 : 0.78,
      metalness: style === 'talatona_tower' ? 0.55 : 0.08,
      emissive: new THREE.Color(0xffe4a0),
      emissiveIntensity: 0,
    });
    nightMaterials.push(bodyMat);

    // Primary volume
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), bodyMat);
    body.position.y = h / 2;
    body.castShadow = !isSoftwareGl;
    body.receiveShadow = true;
    bGroup.add(body);

    const accentMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(accentColor),
      roughness: 0.45,
      metalness: 0.25,
    });

    if (style === 'talatona_tower') {
      // Stepped glass crown + rooftop helipad/accent
      const crown = new THREE.Mesh(
        new THREE.BoxGeometry(w * 0.72, 2.4, d * 0.72),
        accentMat
      );
      crown.position.y = h + 1.2;
      bGroup.add(crown);
    } else if (style === 'talatona_villa') {
      // Modern overhanging roof + perimeter garden plinth
      const plinth = new THREE.Mesh(new THREE.BoxGeometry(w + 2.4, 0.25, d + 2.4), grassMat);
      plinth.position.y = 0.12;
      const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 1.2, 0.55, d + 1.2), accentMat);
      roof.position.y = h + 0.28;
      bGroup.add(plinth, roof);
    } else if (style === 'viana_warehouse') {
      // Sloped industrial roof ridge + loading bay door
      const ridge = new THREE.Mesh(new THREE.BoxGeometry(w + 0.4, 1.2, d * 0.6), accentMat);
      ridge.position.y = h + 0.6;
      const bayDoor = new THREE.Mesh(
        new THREE.BoxGeometry(3.6, 3.2, 0.3),
        new THREE.MeshStandardMaterial({ color: 0x27272a, metalness: 0.6, roughness: 0.4 })
      );
      bayDoor.position.set(0, 1.6, d / 2 + 0.05);
      bGroup.add(ridge, bayDoor);
    } else {
      // Viana commercial/residential block with parapet
      const parapet = new THREE.Mesh(new THREE.BoxGeometry(w + 0.4, 0.6, d + 0.4), accentMat);
      parapet.position.y = h + 0.3;
      bGroup.add(parapet);
    }

    group.add(bGroup);
    colliders.push({
      minX: x - w / 2 - 0.6,
      maxX: x + w / 2 + 0.6,
      minZ: z - d / 2 - 0.6,
      maxZ: z + d / 2 + 0.6,
    });
  };

  // --- 2. PROCEDURAL TALATONA EXPANSION (Modern Business & Condominiums) ---
  const talatonaPalette = ['#e2e8f0', '#cbd5e1', '#f8fafc', '#94a3b8'];
  const talatonaAccents = ['#0284c7', '#0f172a', '#d97706', '#0d9488'];

  // Urban plaza pad in Talatona South-East
  const talatonaPad = new THREE.Mesh(new THREE.PlaneGeometry(54, 46), concreteMat);
  talatonaPad.rotation.x = -Math.PI / 2;
  talatonaPad.position.set(48, 0.005, 72);
  talatonaPad.receiveShadow = true;
  group.add(talatonaPad);

  const talatonaLots: [number, number][] = [
    [40, 68],
    [56, 68],
    [40, 110],
    [56, 110],
    [6, 64],
    [6, 110],
  ];

  for (const [lx, lz] of talatonaLots) {
    const isTower = rand() > 0.45;
    const w = 10 + Math.floor(rand() * 4);
    const d = 10 + Math.floor(rand() * 4);
    const h = isTower ? 18 + Math.floor(rand() * 14) : 6 + Math.floor(rand() * 4);
    const color = talatonaPalette[Math.floor(rand() * talatonaPalette.length)];
    const accent = talatonaAccents[Math.floor(rand() * talatonaAccents.length)];
    addProceduralBuilding(
      lx,
      lz,
      w,
      d,
      h,
      color,
      accent,
      isTower ? 'talatona_tower' : 'talatona_villa'
    );
  }

  // --- 3. PROCEDURAL VIANA EXPANSION (Industrial Polo & Commercial Grid) ---
  const vianaPalette = ['#e7e5e4', '#fde68a', '#fed7aa', '#d6d3d1', '#fca5a5'];
  const vianaAccents = ['#ea580c', '#b91c1c', '#334155', '#b45309'];

  // Industrial concrete pad for Viana East
  const vianaPad = new THREE.Mesh(new THREE.PlaneGeometry(82, 148), concreteMat);
  vianaPad.rotation.x = -Math.PI / 2;
  vianaPad.position.set(148, 0.005, 0);
  vianaPad.receiveShadow = true;
  group.add(vianaPad);

  const vianaLots: [number, number][] = [
    [126, -52],
    [168, -52],
    [168, -22],
    [126, 26],
    [168, 26],
    [126, 72],
    [168, 72],
  ];

  for (const [vx, vz] of vianaLots) {
    const isWarehouse = rand() > 0.4;
    const w = isWarehouse ? 16 + Math.floor(rand() * 6) : 11 + Math.floor(rand() * 4);
    const d = isWarehouse ? 12 + Math.floor(rand() * 5) : 10 + Math.floor(rand() * 4);
    const h = isWarehouse ? 6 + Math.floor(rand() * 3) : 9 + Math.floor(rand() * 7);
    const color = vianaPalette[Math.floor(rand() * vianaPalette.length)];
    const accent = vianaAccents[Math.floor(rand() * vianaAccents.length)];
    addProceduralBuilding(
      vx,
      vz,
      w,
      d,
      h,
      color,
      accent,
      isWarehouse ? 'viana_warehouse' : 'viana_block'
    );
  }

  return { group, colliders, nightMaterials, lampMaterials };
}
