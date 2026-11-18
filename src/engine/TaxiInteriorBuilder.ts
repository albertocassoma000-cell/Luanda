import * as THREE from 'three';
import { buildRealisticHuman } from './HumanModelBuilder';

export const TAXI_INTERIOR_ORIGIN = new THREE.Vector3(1100, 0, 1000);
// First-person seated passenger camera position inside the taxi
export const TAXI_PASSENGER_CAM_POS = new THREE.Vector3(1100.45, 1.48, 999.25);
export const TAXI_PASSENGER_LOOK_AT = new THREE.Vector3(1100.0, 1.28, 1004.5);

export interface TaxiInteriorRig {
  group: THREE.Group;
  candongueiroPassengers: THREE.Group;
}

/**
 * Builds a realistic 3D interior of a Luanda Taxi (Yango / Candongueiro)
 * with dashboard, steering wheel, seats, driver at the wheel, and fellow
 * seated passengers so the player experiences riding inside the taxi.
 */
export function buildTaxiInterior(castShadow: boolean): TaxiInteriorRig {
  const group = new THREE.Group();
  group.position.copy(TAXI_INTERIOR_ORIGIN);

  const cabinMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.78 });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.9 });
  const seatMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.85 });
  const dashMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.55 });
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.4 });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.18,
    roughness: 0.08,
  });

  // Floor & Roof
  const floor = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.12, 4.4), cabinMat);
  floor.position.y = 0.3;
  group.add(floor);

  const roof = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.12, 4.2), roofMat);
  roof.position.y = 2.15;
  group.add(roof);

  // Side lower doors & window pillars
  for (const sx of [-1.08, 1.08]) {
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.85, 4.2), cabinMat);
    door.position.set(sx, 0.78, 0);
    group.add(door);

    const glass = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.85, 3.8), glassMat);
    glass.position.set(sx, 1.65, 0);
    group.add(glass);

    for (const pz of [-1.8, 0.1, 1.8]) {
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.0, 0.14), cabinMat);
      pillar.position.set(sx, 1.65, pz);
      group.add(pillar);
    }
  }

  // Front Dashboard & Windshield
  const dash = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.55, 0.65), dashMat);
  dash.position.set(0, 0.95, 1.65);
  group.add(dash);

  const windshield = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.95, 0.06), glassMat);
  windshield.position.set(0, 1.65, 1.85);
  windshield.rotation.x = -0.22;
  group.add(windshield);

  // Steering Wheel (left side, facing driver)
  const steeringWheel = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.03, 10, 20), wheelMat);
  steeringWheel.position.set(-0.52, 1.25, 1.32);
  steeringWheel.rotation.x = 0.35;
  group.add(steeringWheel);

  // Front & Rear Seats
  const driverSeat = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.9, 0.55), seatMat);
  driverSeat.position.set(-0.52, 0.85, 0.65);
  group.add(driverSeat);

  const frontPassSeat = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.9, 0.55), seatMat);
  frontPassSeat.position.set(0.52, 0.85, 0.65);
  group.add(frontPassSeat);

  const backBench = new THREE.Mesh(new THREE.BoxGeometry(1.95, 0.9, 0.6), seatMat);
  backBench.position.set(0, 0.85, -0.85);
  group.add(backBench);

  // 3D Taxi Driver at the steering wheel
  const driver = buildRealisticHuman(
    {
      name: 'Motorista',
      gender: 'homem',
      skinTone: '#5c3a21',
      hairStyle: 'curto',
      hairColor: '#18181b',
      shirtColor: '#f59e0b',
      pantsColor: '#1e293b',
      shoesColor: '#18181b',
    },
    castShadow
  );
  driver.group.position.set(-0.52, 0.15, 0.82);
  driver.leftArm.rotation.x = -1.05;
  driver.rightArm.rotation.x = -1.05;
  driver.leftLeg.rotation.x = -1.2;
  driver.rightLeg.rotation.x = -1.2;
  driver.leftKnee.rotation.x = 1.25;
  driver.rightKnee.rotation.x = 1.25;
  group.add(driver.group);

  // Fellow Passengers (visible in Candongueiro / Lotador shared taxi)
  const candongueiroPassengers = new THREE.Group();
  const passengerSpecs = [
    { x: 0.52, z: 0.82, shirt: '#dc2626', gender: 'mulher' as const, hair: 'trancas' as const },
    { x: -0.52, z: -0.68, shirt: '#0284c7', gender: 'homem' as const, hair: 'afro' as const },
    { x: 0.0, z: -0.68, shirt: '#16a34a', gender: 'mulher' as const, hair: 'medio' as const },
  ];

  for (const ps of passengerSpecs) {
    const p = buildRealisticHuman(
      {
        name: 'Passageiro',
        gender: ps.gender,
        skinTone: '#7c4d2b',
        hairStyle: ps.hair,
        hairColor: '#18181b',
        shirtColor: ps.shirt,
        pantsColor: '#1e293b',
        shoesColor: '#18181b',
      },
      castShadow
    );
    p.group.position.set(ps.x, 0.15, ps.z);
    p.leftLeg.rotation.x = -1.2;
    p.rightLeg.rotation.x = -1.2;
    p.leftKnee.rotation.x = 1.25;
    p.rightKnee.rotation.x = 1.25;
    candongueiroPassengers.add(p.group);
  }
  group.add(candongueiroPassengers);

  // Warm cabin dome light
  const domeLight = new THREE.PointLight(0xfffbeb, 1.8, 10);
  domeLight.position.set(0, 1.95, 0.2);
  group.add(domeLight);

  group.traverse((obj) => {
    obj.frustumCulled = false;
  });

  return { group, candongueiroPassengers };
}
