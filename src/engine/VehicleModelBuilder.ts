import * as THREE from 'three';
import { VehicleCatalogItem } from '../types/game';

/**
 * Builds a realistic multi-part 3D vehicle mesh (sedan, suv, candongueiro, mota)
 * with sculpted hood, cabin, windshield, pillars, grille, headlights, taillights,
 * mirrors, bumpers, license plates, and alloy wheels.
 */
export function buildRealisticVehicle(
  spec: VehicleCatalogItem,
  castShadow: boolean
): THREE.Group {
  const group = new THREE.Group();

  const paintMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(spec.color),
    roughness: 0.22,
    metalness: 0.68,
  });
  const trimMat = new THREE.MeshStandardMaterial({
    color: 0x18181b,
    roughness: 0.65,
    metalness: 0.25,
  });
  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0xd4d4d8,
    roughness: 0.18,
    metalness: 0.92,
  });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.08,
    metalness: 0.88,
  });
  const tireMat = new THREE.MeshStandardMaterial({
    color: 0x141416,
    roughness: 0.9,
    metalness: 0.05,
  });
  const rimMat = new THREE.MeshStandardMaterial({
    color: 0xcbd5e1,
    roughness: 0.25,
    metalness: 0.85,
  });
  const lightMat = new THREE.MeshStandardMaterial({
    color: 0xfef9c3,
    emissive: new THREE.Color(0xfef08a),
    emissiveIntensity: 0.75,
    roughness: 0.15,
  });
  const tailMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: new THREE.Color(0xdc2626),
    emissiveIntensity: 0.55,
    roughness: 0.2,
  });
  const plateMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.5,
  });

  const addWheel = (x: number, y: number, z: number, radius: number, width: number) => {
    const wheelGroup = new THREE.Group();
    const tire = new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius, width, 16),
      tireMat
    );
    tire.rotation.z = Math.PI / 2;
    tire.castShadow = castShadow;
    wheelGroup.add(tire);

    const rim = new THREE.Mesh(
      new THREE.CylinderGeometry(radius * 0.62, radius * 0.62, width + 0.02, 12),
      rimMat
    );
    rim.rotation.z = Math.PI / 2;
    wheelGroup.add(rim);

    const hub = new THREE.Mesh(
      new THREE.CylinderGeometry(radius * 0.2, radius * 0.2, width + 0.04, 10),
      trimMat
    );
    hub.rotation.z = Math.PI / 2;
    wheelGroup.add(hub);

    wheelGroup.position.set(x, y, z);
    group.add(wheelGroup);
  };

  if (spec.type === 'mota') {
    // Detailed Sport/Street Motorcycle
    const engineBlock = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.38, 0.72), trimMat);
    engineBlock.position.set(0, 0.52, 0.05);
    engineBlock.castShadow = castShadow;
    group.add(engineBlock);

    const chassisBar = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.22, 1.55), trimMat);
    chassisBar.position.set(0, 0.74, -0.05);
    group.add(chassisBar);

    // Sculpted fuel tank & front fairing
    const tank = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.34, 0.74), paintMat);
    tank.position.set(0, 0.96, 0.28);
    tank.rotation.x = 0.08;
    tank.castShadow = castShadow;
    group.add(tank);

    const fairing = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.42, 0.46), paintMat);
    fairing.position.set(0, 0.95, 0.74);
    fairing.rotation.x = -0.22;
    group.add(fairing);

    const windscreen = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.28, 0.06), glassMat);
    windscreen.position.set(0, 1.24, 0.72);
    windscreen.rotation.x = -0.45;
    group.add(windscreen);

    // Contoured seat & rear tail
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.14, 0.78), trimMat);
    seat.position.set(0, 0.87, -0.34);
    group.add(seat);

    const tailCowling = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.18, 0.5), paintMat);
    tailCowling.position.set(0, 0.9, -0.78);
    tailCowling.rotation.x = 0.18;
    group.add(tailCowling);

    // Dual front forks
    for (const fx of [-0.14, 0.14]) {
      const fork = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.86, 8), chromeMat);
      fork.position.set(fx, 0.76, 0.74);
      fork.rotation.x = -0.32;
      group.add(fork);
    }

    // Wide handlebars + rubber grips + mirrors
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.86, 8), chromeMat);
    handle.rotation.z = Math.PI / 2;
    handle.position.set(0, 1.12, 0.56);
    group.add(handle);

    for (const gx of [-0.36, 0.36]) {
      const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.16, 8), trimMat);
      grip.rotation.z = Math.PI / 2;
      grip.position.set(gx, 1.12, 0.56);
      group.add(grip);

      const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.07, 0.05), trimMat);
      mirror.position.set(gx * 0.95, 1.24, 0.58);
      group.add(mirror);
    }

    // Chrome exhaust pipe
    const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.068, 0.98, 10), chromeMat);
    exhaust.rotation.x = Math.PI / 2 - 0.12;
    exhaust.position.set(0.28, 0.46, -0.42);
    group.add(exhaust);

    // Wheels
    addWheel(0, 0.36, 0.84, 0.36, 0.18);
    addWheel(0, 0.36, -0.78, 0.36, 0.22);

    // Headlight & Taillight
    const head = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.12, 12), lightMat);
    head.rotation.x = Math.PI / 2;
    head.position.set(0, 0.98, 0.95);
    group.add(head);

    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.09, 0.08), tailMat);
    tail.position.set(0, 0.92, -1.0);
    group.add(tail);
  } else {
    const isVan = spec.type === 'candongueiro';
    const isSuv = spec.type === 'suv';
    const bodyW = isVan ? 2.04 : isSuv ? 1.98 : 1.88;
    const bodyH = isVan ? 0.92 : isSuv ? 0.74 : 0.58;
    const bodyLen = isVan ? 4.85 : isSuv ? 4.45 : 4.35;

    // Main lower body chassis
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(bodyW, bodyH, bodyLen), paintMat);
    chassis.position.y = 0.38 + bodyH / 2;
    chassis.castShadow = castShadow;
    chassis.receiveShadow = true;
    group.add(chassis);

    // Sculpted hood (front)
    if (!isVan) {
      const hood = new THREE.Mesh(
        new THREE.BoxGeometry(bodyW - 0.12, 0.14, 1.35),
        paintMat
      );
      hood.position.set(0, 0.38 + bodyH + 0.04, bodyLen / 2 - 0.72);
      hood.rotation.x = 0.07;
      group.add(hood);
    }

    // Front & rear bumpers
    const frontBumper = new THREE.Mesh(
      new THREE.BoxGeometry(bodyW + 0.06, 0.28, 0.24),
      trimMat
    );
    frontBumper.position.set(0, 0.42, bodyLen / 2 + 0.06);
    group.add(frontBumper);

    const rearBumper = new THREE.Mesh(
      new THREE.BoxGeometry(bodyW + 0.06, 0.28, 0.24),
      trimMat
    );
    rearBumper.position.set(0, 0.42, -bodyLen / 2 - 0.06);
    group.add(rearBumper);

    // Front radiator grille
    const grille = new THREE.Mesh(
      new THREE.BoxGeometry(bodyW * 0.48, 0.26, 0.08),
      trimMat
    );
    grille.position.set(0, 0.68, bodyLen / 2 + 0.03);
    group.add(grille);

    const grilleTrim = new THREE.Mesh(
      new THREE.BoxGeometry(bodyW * 0.5, 0.04, 0.09),
      chromeMat
    );
    grilleTrim.position.set(0, 0.81, bodyLen / 2 + 0.03);
    group.add(grilleTrim);

    // Cabin / Greenhouse
    const cabinMat = isVan
      ? new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.28, metalness: 0.2 })
      : paintMat;
    const cabinLen = isVan ? 4.45 : isSuv ? 2.65 : 2.15;
    const cabinH = isVan ? 0.92 : isSuv ? 0.68 : 0.58;
    const cabinZ = isVan ? 0 : isSuv ? -0.35 : -0.25;
    const cabinY = 0.38 + bodyH + cabinH / 2 - 0.04;

    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(bodyW - 0.16, cabinH, cabinLen),
      cabinMat
    );
    cabin.position.set(0, cabinY, cabinZ);
    cabin.castShadow = castShadow;
    group.add(cabin);

    // Tinted glass wrap (windshield + side windows + rear glass)
    const sideGlass = new THREE.Mesh(
      new THREE.BoxGeometry(bodyW - 0.12, cabinH - 0.16, cabinLen - 0.28),
      glassMat
    );
    sideGlass.position.set(0, cabinY + 0.02, cabinZ);
    group.add(sideGlass);

    const frontRearGlass = new THREE.Mesh(
      new THREE.BoxGeometry(bodyW - 0.3, cabinH - 0.16, cabinLen + 0.04),
      glassMat
    );
    frontRearGlass.position.set(0, cabinY + 0.02, cabinZ);
    group.add(frontRearGlass);

    // Side mirrors
    for (const side of [-1, 1]) {
      const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.11, 0.14), paintMat);
      mirror.position.set(side * (bodyW / 2 + 0.08), 0.38 + bodyH + 0.08, cabinZ + cabinLen / 2 - 0.18);
      group.add(mirror);
    }

    // SUV roof rails
    if (isSuv) {
      for (const rx of [-bodyW * 0.36, bodyW * 0.36]) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, cabinLen * 0.85), chromeMat);
        rail.position.set(rx, cabinY + cabinH / 2 + 0.04, cabinZ);
        group.add(rail);
      }
    }

    // 4 realistic wheels with rims
    const wheelR = isSuv ? 0.42 : 0.37;
    for (const wx of [-bodyW / 2 - 0.02, bodyW / 2 + 0.02]) {
      for (const wz of [-bodyLen * 0.31, bodyLen * 0.31]) {
        addWheel(wx, wheelR, wz, wheelR, 0.26);
      }
    }

    // Headlights & Taillights
    for (const lx of [-bodyW * 0.34, bodyW * 0.34]) {
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.18, 0.08), lightMat);
      hl.position.set(lx, 0.72, bodyLen / 2 + 0.03);
      group.add(hl);

      const tl = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.18, 0.08), tailMat);
      tl.position.set(lx, 0.74, -bodyLen / 2 - 0.03);
      group.add(tl);
    }

    // License plates (front & rear)
    const frontPlate = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.12, 0.04), plateMat);
    frontPlate.position.set(0, 0.43, bodyLen / 2 + 0.18);
    group.add(frontPlate);

    const rearPlate = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.12, 0.04), plateMat);
    rearPlate.position.set(0, 0.43, -bodyLen / 2 - 0.18);
    group.add(rearPlate);
  }

  group.traverse((obj) => {
    obj.frustumCulled = false;
  });

  return group;
}
