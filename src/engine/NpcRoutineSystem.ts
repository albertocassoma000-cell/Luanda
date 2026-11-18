import * as THREE from 'three';

export type NpcActivity = 'walking' | 'talking' | 'interacting' | 'resting';

export interface NpcScheduleActor {
  name: string;
  role: string;
  group: THREE.Group;
  leftLeg: THREE.Object3D;
  rightLeg: THREE.Object3D;
  leftArm: THREE.Object3D;
  rightArm: THREE.Object3D;
  headGroup: THREE.Object3D;
  torsoGroup: THREE.Object3D;
  homePos: THREE.Vector3;
  workPos: THREE.Vector3;
  socialPos: THREE.Vector3;
  speed: number;
  phase: number;
  activity: NpcActivity;
  activityTimer: number;
  baseTorsoY: number;
  isDead?: boolean;
  respawnTimer?: number;
}

/**
 * Updates all NPC daily routines (morning commute, work/interaction,
 * evening socializing/talking, night resting) and applies procedural 3D
 * skeletal animations (walking, talking, interacting, resting).
 */
export function updateNpcRoutines(
  npcs: NpcScheduleActor[],
  dt: number,
  timeOfDay: number,
  playerPos: THREE.Vector3
): void {
  for (let i = 0; i < npcs.length; i++) {
    const npc = npcs[i];

    // Handle dead NPC respawn timer
    if (npc.isDead) {
      npc.respawnTimer = (npc.respawnTimer ?? 25) - dt;
      if (npc.respawnTimer <= 0) {
        npc.isDead = false;
        npc.group.rotation.x = 0;
        npc.group.position.copy(npc.homePos);
        npc.activity = 'resting';
      }
      continue;
    }

    // Determine daily target location based on Luanda time of day
    let targetPos: THREE.Vector3;
    let arrivalActivity: NpcActivity;

    if (timeOfDay >= 6.5 && timeOfDay < 17.0) {
      // Work hours: commute to work and interact/work
      targetPos = npc.workPos;
      arrivalActivity = 'interacting';
    } else if (timeOfDay >= 17.0 && timeOfDay < 21.0) {
      // Evening: stroll & socialize
      targetPos = npc.socialPos;
      arrivalActivity = 'talking';
    } else {
      // Night & early morning: return home and rest
      targetPos = npc.homePos;
      arrivalActivity = 'resting';
    }

    // Check if player is very close -> pause and talk/greet player
    const distToPlayer = Math.hypot(
      playerPos.x - npc.group.position.x,
      playerPos.z - npc.group.position.z
    );

    const dx = targetPos.x - npc.group.position.x;
    const dz = targetPos.z - npc.group.position.z;
    const distToTarget = Math.hypot(dx, dz);

    if (distToPlayer < 3.2 && npc.activity !== 'resting') {
      npc.activity = 'talking';
      const targetYaw = Math.atan2(
        playerPos.x - npc.group.position.x,
        playerPos.z - npc.group.position.z
      );
      npc.group.rotation.y = lerpAngle(npc.group.rotation.y, targetYaw, dt * 6);
    } else if (distToTarget > 1.2) {
      // Walk toward routine destination
      npc.activity = 'walking';
      const vx = (dx / distToTarget) * npc.speed * dt;
      const vz = (dz / distToTarget) * npc.speed * dt;
      npc.group.position.x += vx;
      npc.group.position.z += vz;
      const moveYaw = Math.atan2(dx, dz);
      npc.group.rotation.y = lerpAngle(npc.group.rotation.y, moveYaw, dt * 7);
    } else {
      // Arrived at routine destination: alternate between arrival activity & talking
      npc.activityTimer -= dt;
      if (npc.activityTimer <= 0) {
        npc.activityTimer = 4 + Math.random() * 5;
        if (arrivalActivity === 'interacting') {
          npc.activity = Math.random() < 0.65 ? 'interacting' : 'talking';
        } else {
          npc.activity = arrivalActivity;
        }
      }
    }

    applyNpcAnimation(npc, dt);
  }
}

function applyNpcAnimation(npc: NpcScheduleActor, dt: number): void {
  const { leftLeg, rightLeg, leftArm, rightArm, headGroup, torsoGroup } = npc;

  if (npc.activity === 'walking') {
    npc.phase += dt * (npc.speed * 3.1);
    const stride = Math.sin(npc.phase);
    const bob = Math.abs(Math.cos(npc.phase)) * 0.045;

    leftLeg.rotation.x = stride * 0.58;
    rightLeg.rotation.x = -stride * 0.58;
    leftArm.rotation.x = -stride * 0.48;
    rightArm.rotation.x = stride * 0.48;
    leftArm.rotation.z = 0.06;
    rightArm.rotation.z = -0.06;

    torsoGroup.position.y = npc.baseTorsoY + bob;
    torsoGroup.rotation.y = stride * 0.08;
    torsoGroup.rotation.x = 0.04;
    headGroup.rotation.x = -0.02;
    headGroup.rotation.y = -stride * 0.05;
  } else if (npc.activity === 'talking') {
    npc.phase += dt * 4.2;
    const gesture = Math.sin(npc.phase);
    const nod = Math.sin(npc.phase * 1.4) * 0.12;

    leftLeg.rotation.x = THREE.MathUtils.damp(leftLeg.rotation.x, 0, 8, dt);
    rightLeg.rotation.x = THREE.MathUtils.damp(rightLeg.rotation.x, 0, 8, dt);

    // Expressive hand gestures while talking
    leftArm.rotation.x = -0.65 + gesture * 0.28;
    rightArm.rotation.x = -0.55 - gesture * 0.32;
    leftArm.rotation.z = 0.18 + Math.cos(npc.phase) * 0.1;
    rightArm.rotation.z = -0.18 - Math.cos(npc.phase) * 0.1;

    torsoGroup.position.y = npc.baseTorsoY;
    torsoGroup.rotation.x = 0.03;
    torsoGroup.rotation.y = Math.sin(npc.phase * 0.5) * 0.07;
    headGroup.rotation.x = nod;
    headGroup.rotation.y = Math.cos(npc.phase * 0.6) * 0.16;
  } else if (npc.activity === 'interacting') {
    npc.phase += dt * 3.4;
    const workWave = Math.sin(npc.phase);

    leftLeg.rotation.x = THREE.MathUtils.damp(leftLeg.rotation.x, 0, 8, dt);
    rightLeg.rotation.x = THREE.MathUtils.damp(rightLeg.rotation.x, 0, 8, dt);

    // Focused interaction / working arm movements
    leftArm.rotation.x = -0.85 + workWave * 0.18;
    rightArm.rotation.x = -0.85 - workWave * 0.18;
    leftArm.rotation.z = -0.12;
    rightArm.rotation.z = 0.12;

    torsoGroup.position.y = npc.baseTorsoY;
    torsoGroup.rotation.x = 0.1;
    torsoGroup.rotation.y = 0;
    headGroup.rotation.x = 0.15;
    headGroup.rotation.y = Math.sin(npc.phase * 0.4) * 0.12;
  } else {
    // Resting / calm idle breathing
    npc.phase += dt * 1.6;
    const breath = Math.sin(npc.phase) * 0.018;

    leftLeg.rotation.x = THREE.MathUtils.damp(leftLeg.rotation.x, 0, 6, dt);
    rightLeg.rotation.x = THREE.MathUtils.damp(rightLeg.rotation.x, 0, 6, dt);
    leftArm.rotation.x = THREE.MathUtils.damp(leftArm.rotation.x, 0.05, 6, dt);
    rightArm.rotation.x = THREE.MathUtils.damp(rightArm.rotation.x, 0.05, 6, dt);
    leftArm.rotation.z = 0.04;
    rightArm.rotation.z = -0.04;

    torsoGroup.position.y = npc.baseTorsoY + breath;
    torsoGroup.rotation.x = 0;
    torsoGroup.rotation.y = 0;
    headGroup.rotation.x = breath * 1.5;
    headGroup.rotation.y = Math.sin(npc.phase * 0.35) * 0.2;
  }
}

function lerpAngle(current: number, target: number, t: number): number {
  let diff = target - current;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return current + diff * Math.min(1, t);
}
