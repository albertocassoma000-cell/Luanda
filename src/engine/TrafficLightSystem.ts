import * as THREE from 'three';

export interface TrafficIntersection {
  x: number;
  z: number;
  name: string;
  phaseOffset: number;
  nsRed: THREE.MeshStandardMaterial;
  nsYellow: THREE.MeshStandardMaterial;
  nsGreen: THREE.MeshStandardMaterial;
  ewRed: THREE.MeshStandardMaterial;
  ewYellow: THREE.MeshStandardMaterial;
  ewGreen: THREE.MeshStandardMaterial;
  nsState: 'green' | 'yellow' | 'red';
  ewState: 'green' | 'yellow' | 'red';
}

const CYCLE_DURATION = 20; // seconds

export class TrafficLightSystem {
  public group = new THREE.Group();
  private intersections: TrafficIntersection[] = [];

  constructor() {
    const configs: { x: number; z: number; name: string; offset: number }[] = [
      { x: 22, z: 36, name: 'Talatona Centro', offset: 0 },
      { x: 22, z: 54, name: 'Talatona Ligação Expressa', offset: 5 },
      { x: 84, z: 54, name: 'Via Expressa / Viana Sul', offset: 10 },
      { x: 84, z: 2, name: 'Via Expressa / Entrada Viana', offset: 2 },
      { x: 148, z: 2, name: 'Polo Industrial de Viana', offset: 12 },
    ];

    const poleMat = new THREE.MeshStandardMaterial({
      color: 0x27272a,
      metalness: 0.75,
      roughness: 0.35,
    });
    const boxMat = new THREE.MeshStandardMaterial({
      color: 0x18181b,
      roughness: 0.5,
    });

    for (const cfg of configs) {
      const nsRed = this.createLensMat(0xef4444);
      const nsYellow = this.createLensMat(0xf59e0b);
      const nsGreen = this.createLensMat(0x22c55e);

      const ewRed = this.createLensMat(0xef4444);
      const ewYellow = this.createLensMat(0xf59e0b);
      const ewGreen = this.createLensMat(0x22c55e);

      // Build 2 opposite corner signal poles per intersection
      const corners: { dx: number; dz: number; rotY: number; isNS: boolean }[] = [
        { dx: 6.2, dz: 6.2, rotY: 0, isNS: true },
        { dx: -6.2, dz: -6.2, rotY: Math.PI, isNS: true },
        { dx: -6.2, dz: 6.2, rotY: Math.PI / 2, isNS: false },
        { dx: 6.2, dz: -6.2, rotY: -Math.PI / 2, isNS: false },
      ];

      for (const c of corners) {
        const post = new THREE.Group();
        post.position.set(cfg.x + c.dx, 0, cfg.z + c.dz);
        post.rotation.y = c.rotY;

        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, 5.4, 8), poleMat);
        pole.position.y = 2.7;
        post.add(pole);

        const arm = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 2.2), poleMat);
        arm.position.set(0, 5.2, -1.0);
        post.add(arm);

        const housing = new THREE.Mesh(new THREE.BoxGeometry(0.42, 1.15, 0.36), boxMat);
        housing.position.set(0, 4.9, -1.9);
        post.add(housing);

        const rMat = c.isNS ? nsRed : ewRed;
        const yMat = c.isNS ? nsYellow : ewYellow;
        const gMat = c.isNS ? nsGreen : ewGreen;

        const lensGeo = new THREE.SphereGeometry(0.11, 8, 8);
        const rLens = new THREE.Mesh(lensGeo, rMat);
        rLens.position.set(0, 5.24, -1.72);
        const yLens = new THREE.Mesh(lensGeo, yMat);
        yLens.position.set(0, 4.9, -1.72);
        const gLens = new THREE.Mesh(lensGeo, gMat);
        gLens.position.set(0, 4.56, -1.72);

        post.add(rLens, yLens, gLens);
        this.group.add(post);
      }

      this.intersections.push({
        x: cfg.x,
        z: cfg.z,
        name: cfg.name,
        phaseOffset: cfg.offset,
        nsRed,
        nsYellow,
        nsGreen,
        ewRed,
        ewYellow,
        ewGreen,
        nsState: 'green',
        ewState: 'red',
      });
    }
  }

  private createLensMat(hex: number): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({
      color: hex,
      emissive: new THREE.Color(hex),
      emissiveIntensity: 0.08,
      roughness: 0.2,
    });
  }

  public update(elapsedSeconds: number) {
    for (const inter of this.intersections) {
      const t = (elapsedSeconds + inter.phaseOffset) % CYCLE_DURATION;

      if (t < 8) {
        inter.nsState = 'green';
        inter.ewState = 'red';
      } else if (t < 10) {
        inter.nsState = 'yellow';
        inter.ewState = 'red';
      } else if (t < 18) {
        inter.nsState = 'red';
        inter.ewState = 'green';
      } else {
        inter.nsState = 'red';
        inter.ewState = 'yellow';
      }

      inter.nsRed.emissiveIntensity = inter.nsState === 'red' ? 2.4 : 0.06;
      inter.nsYellow.emissiveIntensity = inter.nsState === 'yellow' ? 2.4 : 0.06;
      inter.nsGreen.emissiveIntensity = inter.nsState === 'green' ? 2.4 : 0.06;

      inter.ewRed.emissiveIntensity = inter.ewState === 'red' ? 2.4 : 0.06;
      inter.ewYellow.emissiveIntensity = inter.ewState === 'yellow' ? 2.4 : 0.06;
      inter.ewGreen.emissiveIntensity = inter.ewState === 'green' ? 2.4 : 0.06;
    }
  }

  /**
   * Returns true if a vehicle approaching an intersection along `axis` ('x' or 'z')
   * moving in direction `dir` (+1 or -1) should stop for a red or yellow light.
   */
  public shouldStop(x: number, z: number, axis: 'x' | 'z', dir: 1 | -1): boolean {
    for (const inter of this.intersections) {
      if (axis === 'z') {
        if (Math.abs(x - inter.x) < 5.5) {
          const distAhead = (inter.z - z) * dir;
          if (distAhead > 5.5 && distAhead < 11.5 && inter.nsState !== 'green') {
            return true;
          }
        }
      } else {
        if (Math.abs(z - inter.z) < 5.5) {
          const distAhead = (inter.x - x) * dir;
          if (distAhead > 5.5 && distAhead < 11.5 && inter.ewState !== 'green') {
            return true;
          }
        }
      }
    }
    return false;
  }
}
