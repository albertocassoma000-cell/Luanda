import * as THREE from 'three';
import { CharacterAppearance } from '../types/game';

export interface HumanRig {
  group: THREE.Group;
  leftLeg: THREE.Object3D;
  rightLeg: THREE.Object3D;
  leftKnee: THREE.Object3D;
  rightKnee: THREE.Object3D;
  leftArm: THREE.Object3D;
  rightArm: THREE.Object3D;
  leftElbow: THREE.Object3D;
  rightElbow: THREE.Object3D;
  headGroup: THREE.Object3D;
  torsoGroup: THREE.Object3D;
}

/**
 * Builds an anatomically proportioned, organic 3D human character using smooth
 * capsules, sculpted oval head, facial features (eyes, eyebrows, nose, mouth, ears),
 * neck, shoulders, waist, belt, detailed sneakers, and realistic hair styles.
 */
export function buildRealisticHuman(
  appearance: CharacterAppearance,
  castShadow: boolean
): HumanRig {
  const group = new THREE.Group();
  const isFemale = appearance.gender === 'mulher';

  const skinMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(appearance.skinTone),
    roughness: 0.52,
    metalness: 0.04,
  });
  const shirtMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(appearance.shirtColor),
    roughness: 0.78,
    metalness: 0.02,
  });
  const pantsMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(appearance.pantsColor),
    roughness: 0.85,
    metalness: 0.02,
  });
  const shoesMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(appearance.shoesColor),
    roughness: 0.42,
    metalness: 0.1,
  });
  const soleMat = new THREE.MeshStandardMaterial({
    color: 0xf4f4f5,
    roughness: 0.65,
  });
  const hairMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(appearance.hairColor),
    roughness: 0.88,
  });
  const beltMat = new THREE.MeshStandardMaterial({
    color: 0x18181b,
    roughness: 0.4,
    metalness: 0.35,
  });
  const scleraMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.2 });
  const irisMat = new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.15 });
  const lipMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(appearance.skinTone).multiplyScalar(0.72),
    roughness: 0.45,
  });

  // --- LEGS (Hip pivot at y = 0.88) ---
  const hipSpacing = isFemale ? 0.115 : 0.125;
  const createLeg = (xOffset: number) => {
    const pivot = new THREE.Group();
    pivot.position.set(xOffset, 0.88, 0);

    // Thigh
    const thigh = new THREE.Mesh(
      new THREE.CapsuleGeometry(isFemale ? 0.088 : 0.095, 0.26, 6, 12),
      pantsMat
    );
    thigh.position.y = -0.21;
    thigh.castShadow = castShadow;
    pivot.add(thigh);

    // Knee joint pivot (at y = -0.42 from hip)
    const kneePivot = new THREE.Group();
    kneePivot.position.y = -0.42;
    pivot.add(kneePivot);

    // Calf
    const calf = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.072, 0.28, 6, 12),
      pantsMat
    );
    calf.position.y = -0.16;
    calf.castShadow = castShadow;
    kneePivot.add(calf);

    // Sneaker upper
    const shoe = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.068, 0.12, 6, 10),
      shoesMat
    );
    shoe.rotation.x = Math.PI / 2;
    shoe.position.set(0, -0.39, 0.045);
    shoe.castShadow = castShadow;
    kneePivot.add(shoe);

    // Sneaker white sole
    const sole = new THREE.Mesh(
      new THREE.BoxGeometry(0.13, 0.032, 0.24),
      soleMat
    );
    sole.position.set(0, -0.445, 0.045);
    kneePivot.add(sole);

    return { hip: pivot, knee: kneePivot };
  };

  const leftLegRig = createLeg(-hipSpacing);
  const rightLegRig = createLeg(hipSpacing);
  const leftLeg = leftLegRig.hip;
  const rightLeg = rightLegRig.hip;
  const leftKnee = leftLegRig.knee;
  const rightKnee = rightLegRig.knee;
  group.add(leftLeg, rightLeg);

  // --- TORSO GROUP (Pelvis + Waist + Chest + Shoulders) ---
  const torsoGroup = new THREE.Group();
  torsoGroup.position.y = 0.88;
  group.add(torsoGroup);

  // Pelvis / Hips
  const pelvis = new THREE.Mesh(
    new THREE.SphereGeometry(isFemale ? 0.195 : 0.185, 14, 12),
    pantsMat
  );
  pelvis.scale.set(1.08, 0.65, 0.72);
  pelvis.position.y = 0.03;
  pelvis.castShadow = castShadow;
  torsoGroup.add(pelvis);

  // Belt
  const belt = new THREE.Mesh(
    new THREE.CylinderGeometry(isFemale ? 0.165 : 0.175, isFemale ? 0.18 : 0.18, 0.045, 16),
    beltMat
  );
  belt.scale.set(1.06, 1, 0.72);
  belt.position.y = 0.11;
  torsoGroup.add(belt);

  // Tapered Upper Torso / Shirt
  const chestTopR = isFemale ? 0.18 : 0.215;
  const waistR = isFemale ? 0.15 : 0.172;
  const torsoMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(chestTopR, waistR, 0.44, 16),
    shirtMat
  );
  torsoMesh.scale.set(1.05, 1, 0.66);
  torsoMesh.position.y = 0.34;
  torsoMesh.castShadow = castShadow;
  torsoGroup.add(torsoMesh);

  // Rounded Shoulder Cap / Collar
  const shoulders = new THREE.Mesh(
    new THREE.CapsuleGeometry(isFemale ? 0.115 : 0.128, isFemale ? 0.22 : 0.28, 8, 14),
    shirtMat
  );
  shoulders.rotation.z = Math.PI / 2;
  shoulders.scale.set(1, 1, 0.82);
  shoulders.position.y = 0.54;
  shoulders.castShadow = castShadow;
  torsoGroup.add(shoulders);

  // Neck
  const neck = new THREE.Mesh(
    new THREE.CylinderGeometry(0.056, 0.064, 0.12, 12),
    skinMat
  );
  neck.position.y = 0.64;
  torsoGroup.add(neck);

  // --- ARMS (Shoulder pivot at y = 1.42) ---
  const shoulderX = isFemale ? 0.225 : 0.255;
  const createArm = (xOffset: number) => {
    const pivot = new THREE.Group();
    pivot.position.set(xOffset, 1.42, 0);

    // Sleeve / Upper Arm
    const sleeve = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.062, 0.16, 6, 10),
      shirtMat
    );
    sleeve.position.y = -0.11;
    sleeve.castShadow = castShadow;
    pivot.add(sleeve);

    // Elbow joint pivot (at y = -0.24 from shoulder)
    const elbowPivot = new THREE.Group();
    elbowPivot.position.y = -0.24;
    pivot.add(elbowPivot);

    // Forearm (Skin)
    const forearm = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.05, 0.22, 6, 10),
      skinMat
    );
    forearm.position.y = -0.10;
    forearm.castShadow = castShadow;
    elbowPivot.add(forearm);

    // Hand
    const hand = new THREE.Mesh(
      new THREE.SphereGeometry(0.052, 10, 10),
      skinMat
    );
    hand.scale.set(0.85, 1.15, 0.72);
    hand.position.y = -0.27;
    elbowPivot.add(hand);

    return { shoulder: pivot, elbow: elbowPivot };
  };

  const leftArmRig = createArm(-shoulderX);
  const rightArmRig = createArm(shoulderX);
  const leftArm = leftArmRig.shoulder;
  const rightArm = rightArmRig.shoulder;
  const leftElbow = leftArmRig.elbow;
  const rightElbow = rightArmRig.elbow;
  group.add(leftArm, rightArm);

  // --- HEAD & FACIAL FEATURES ---
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.66, 0);
  group.add(headGroup);

  // Sculpted Oval Cranium + Jaw
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.145, 18, 16), skinMat);
  head.scale.set(0.92, 1.12, 0.98);
  head.castShadow = castShadow;
  headGroup.add(head);

  // Ears
  for (const ex of [-0.132, 0.132]) {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.032, 8, 8), skinMat);
    ear.scale.set(0.55, 1.2, 0.75);
    ear.position.set(ex, -0.01, -0.01);
    headGroup.add(ear);
  }

  // Eyes (Sclera + Iris) & Eyebrows
  for (const ex of [-0.048, 0.048]) {
    const sclera = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 8), scleraMat);
    sclera.scale.set(1.1, 0.85, 0.5);
    sclera.position.set(ex, 0.022, 0.128);
    headGroup.add(sclera);

    const iris = new THREE.Mesh(new THREE.SphereGeometry(0.011, 8, 8), irisMat);
    iris.position.set(ex, 0.022, 0.139);
    headGroup.add(iris);

    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.044, 0.01, 0.012), hairMat);
    brow.position.set(ex, 0.052, 0.132);
    headGroup.add(brow);
  }

  // Nose
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 8), skinMat);
  nose.scale.set(0.85, 1.2, 1.1);
  nose.position.set(0, -0.012, 0.142);
  headGroup.add(nose);

  // Lips / Mouth
  const mouth = new THREE.Mesh(new THREE.CapsuleGeometry(0.01, 0.036, 4, 8), lipMat);
  mouth.rotation.z = Math.PI / 2;
  mouth.position.set(0, -0.062, 0.128);
  headGroup.add(mouth);

  // --- HAIR STYLES ---
  if (appearance.hairStyle === 'afro') {
    const afroMain = new THREE.Mesh(new THREE.SphereGeometry(0.185, 16, 14), hairMat);
    afroMain.position.set(0, 0.06, -0.025);
    headGroup.add(afroMain);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const puff = new THREE.Mesh(new THREE.SphereGeometry(0.085, 8, 8), hairMat);
      puff.position.set(Math.cos(a) * 0.12, 0.09 + (i % 2) * 0.04, Math.sin(a) * 0.11 - 0.02);
      headGroup.add(puff);
    }
  } else if (appearance.hairStyle === 'trancas') {
    const crown = new THREE.Mesh(new THREE.SphereGeometry(0.148, 14, 12), hairMat);
    crown.scale.set(0.96, 0.85, 0.98);
    crown.position.set(0, 0.055, -0.01);
    headGroup.add(crown);
    // Flowing braids down the back and sides
    for (let i = -3; i <= 3; i++) {
      const braid = new THREE.Mesh(new THREE.CapsuleGeometry(0.022, 0.28, 4, 8), hairMat);
      braid.position.set(i * 0.036, -0.1, -0.11 + Math.abs(i) * 0.012);
      headGroup.add(braid);
    }
  } else if (appearance.hairStyle === 'medio') {
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.158, 16, 14), hairMat);
    cap.scale.set(0.98, 0.95, 1.02);
    cap.position.set(0, 0.05, -0.018);
    headGroup.add(cap);
  } else {
    // Clean fade / short hair
    const shortCap = new THREE.Mesh(new THREE.SphereGeometry(0.144, 14, 12), hairMat);
    shortCap.scale.set(0.94, 0.72, 0.98);
    shortCap.position.set(0, 0.072, -0.01);
    headGroup.add(shortCap);
  }

  return {
    group,
    leftLeg,
    rightLeg,
    leftKnee,
    rightKnee,
    leftArm,
    rightArm,
    leftElbow,
    rightElbow,
    headGroup,
    torsoGroup,
  };
}
