import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  CharacterAppearance,
  DistrictName,
  VehicleCatalogItem,
  WeatherType,
  WorldBuilding,
} from '../types/game';
import {
  getDistrictAtPosition,
  VEHICLE_CATALOG,
  WEAPON_CATALOG,
  WORLD_BUILDINGS,
} from '../data/luandaWorld';
import { generateTalatonaAndVianaDistricts } from './ProceduralDistrictGenerator';
import { buildRealisticHuman } from './HumanModelBuilder';
import { TrafficLightSystem } from './TrafficLightSystem';
import { buildRealisticVehicle } from './VehicleModelBuilder';
import {
  buildHouseInterior,
  HOUSE_INTERIOR_BOUNDS,
  HOUSE_INTERIOR_SPAWN,
} from './HouseInteriorBuilder';
import { NpcScheduleActor, updateNpcRoutines } from './NpcRoutineSystem';
import {
  buildShopInterior,
  createSpeechBubbleTexture,
  SHOP_COUNTER_POS,
  SHOP_INTERIOR_BOUNDS,
  SHOP_INTERIOR_SPAWN,
  SHOP_MANAGER_WORLD_POS,
} from './ShopInteriorBuilder';
import { buildForestsBoatsAndHouses, FloatingBoat } from './LuandaEnvironmentBuilder';
import {
  buildTaxiInterior,
  TAXI_PASSENGER_CAM_POS,
  TAXI_PASSENGER_LOOK_AT,
} from './TaxiInteriorBuilder';

export interface EngineCallbacks {
  onNearbyBuildingChange: (building: WorldBuilding | null) => void;
  onNearbyVehicleChange: (canEnter: boolean) => void;
  onDrivingStateChange: (isDriving: boolean, speedKmh: number, fuel: number, health: number) => void;
  onPositionUpdate: (x: number, z: number, district: DistrictName, heading: number) => void;
  onInteractPressed: () => void;
  onToggleVehiclePressed: () => void;
  onWeaponFired: () => void;
  onPoliceArrest: () => void;
  onIllegalBehavior: (reason: string) => void;
  onPlayerDeath: (reason: string) => void;
  onInteriorStateChange: (inside: boolean, houseName: string | null) => void;
  onShopStateChange: (shop: WorldBuilding | null, nearCounter: boolean) => void;
  onTaxiRideComplete: (destName: string) => void;
}

interface CollisionBox {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

interface TrafficCar {
  group: THREE.Group;
  spec: VehicleCatalogItem;
  axis: 'x' | 'z';
  dir: 1 | -1;
  speed: number;
  minLimit: number;
  maxLimit: number;
}

const _vec3A = new THREE.Vector3();
const _vec3B = new THREE.Vector3();
const _colorA = new THREE.Color();
const _colorB = new THREE.Color();

function detectSoftwareWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return false;
  }
}

export class LuandaEngine {
  private container: HTMLElement;
  private callbacks: EngineCallbacks;
  private isSoftwareGl: boolean;

  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private clock: THREE.Clock;

  private sunLight: THREE.DirectionalLight;
  private hemiLight: THREE.HemisphereLight;
  private nightWindowMaterials: THREE.MeshStandardMaterial[] = [];
  private streetLampMeshes: THREE.MeshStandardMaterial[] = [];
  private sharedRoadMatH!: THREE.MeshStandardMaterial;
  private sharedRoadMatV!: THREE.MeshStandardMaterial;
  private sharedWindowTex!: THREE.CanvasTexture;

  private playerGroup: THREE.Group;
  private playerParts: {
    leftLeg?: THREE.Object3D;
    rightLeg?: THREE.Object3D;
    leftKnee?: THREE.Object3D;
    rightKnee?: THREE.Object3D;
    leftArm?: THREE.Object3D;
    rightArm?: THREE.Object3D;
    leftElbow?: THREE.Object3D;
    rightElbow?: THREE.Object3D;
    torsoGroup?: THREE.Object3D;
    headGroup?: THREE.Object3D;
  } = {};
  private playerPos = new THREE.Vector3(-18, 0, 8);
  private playerYaw = 0;
  private walkCycle = 0;

  private vehicleGroup: THREE.Group | null = null;
  private vehiclePos = new THREE.Vector3(-32, 0, -10);
  private vehicleYaw = 0;
  private vehicleSpeed = 0;
  private vehicleSteerAngle = 0;
  private activeVehicleSpec: VehicleCatalogItem | null = null;
  private isDriving = false;
  private vehicleFuel = 100;
  private vehicleHealth = 100;
  private vehicleCollisionCooldown = 0;
  private vehicleSmoke: THREE.Points | null = null;
  private vehicleSmokePositions: Float32Array | null = null;

  private cameraYaw = 0;
  private cameraPitch = 0.34;
  private cameraDistance = 8.5;
  private isDraggingCamera = false;
  private lastPointerX = 0;
  private lastPointerY = 0;
  private mouseSensitivity = 1;

  private mode: 'menu' | 'playing' = 'menu';
  private paused = false;
  private timeOfDay = 9.5; // 0..24 hours

  private keys = new Set<string>();
  private touchMove = { x: 0, y: 0, sprint: false };

  private colliders: CollisionBox[] = [];
  private npcs: NpcScheduleActor[] = [];
  private trafficCars: TrafficCar[] = [];
  private policeCars: {
    group: THREE.Group;
    redLight: THREE.MeshStandardMaterial;
    blueLight: THREE.MeshStandardMaterial;
    waypoints: THREE.Vector3[];
    currentWaypoint: number;
    districtLabel: string;
  }[] = [];
  private illegalDetectCooldown = 0;
  private bullets: {
    mesh: THREE.Mesh;
    vel: THREE.Vector3;
    life: number;
  }[] = [];
  private weaponMesh: THREE.Group | null = null;
  private equippedWeaponId: string | null = null;
  private playerAmmo = 0;
  private wantedLevel = 0;
  private lastShotTime = 0;
  private arrestCooldown = 0;
  private oceanMesh: THREE.Mesh | null = null;
  private waypointBeam: THREE.Group | null = null;
  private entranceMarkers: THREE.Mesh[] = [];
  private trafficLights: TrafficLightSystem;
  private weather: WeatherType = 'limpo';
  private rainPoints: THREE.Points | null = null;
  private rainPositions: Float32Array | null = null;

  private lastNearbyBuildingId: string | null = null;
  private lastCanEnterVehicle = false;
  private lastPosEmitTime = 0;
  private lastDriveEmitTime = 0;

  // Vehicle fire & explosion state
  private vehicleFire: THREE.Points | null = null;
  private vehicleFirePositions: Float32Array | null = null;
  private vehicleFireLight: THREE.PointLight | null = null;
  private vehicleExplosionMesh: THREE.Mesh | null = null;
  private explosionTimer = 0;
  private vehicleExploded = false;

  // 3D House & Shop Interior state
  private isInsideHouse = false;
  private currentShopBuilding: WorldBuilding | null = null;
  private lastNearShopCounter = false;
  private savedOutdoorPos = new THREE.Vector3(-18, 0, 8);
  private enterableHouses: WorldBuilding[] = [];
  private playerSpeechSprite: THREE.Sprite | null = null;
  private managerSpeechSprite: THREE.Sprite | null = null;
  private floatingBoats: FloatingBoat[] = [];
  private taxiInterior: { group: THREE.Group; candongueiroPassengers: THREE.Group } | null = null;
  private activeTaxiRide: {
    type: 'yango' | 'candongueiro';
    destX: number;
    destZ: number;
    destName: string;
    timer: number;
  } | null = null;

  private frameId = 0;
  private disposed = false;

  constructor(
    container: HTMLElement,
    appearance: CharacterAppearance,
    callbacks: EngineCallbacks
  ) {
    this.container = container;
    this.callbacks = callbacks;
    this.isSoftwareGl = detectSoftwareWebGL();
    this.clock = new THREE.Clock();

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb);
    this.scene.fog = new THREE.FogExp2(0x87ceeb, 0.0018);

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(58, width / height, 0.25, 750);
    this.camera.position.set(-10, 26, 40);

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.setPixelRatio(
      this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2)
    );
    this.renderer.setSize(width, height);
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);

    // Studio environment reflection for realistic PBR metals & glass
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    // Warm/cool 3D lighting rig
    this.hemiLight = new THREE.HemisphereLight(0xbde0fe, 0x8d6e63, 0.75);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xfff3d6, 1.8);
    this.sunLight.position.set(60, 85, 45);
    if (!this.isSoftwareGl) {
      this.sunLight.castShadow = true;
      this.sunLight.shadow.mapSize.set(2048, 2048);
      this.sunLight.shadow.camera.near = 10;
      this.sunLight.shadow.camera.far = 260;
      const d = 110;
      this.sunLight.shadow.camera.left = -d;
      this.sunLight.shadow.camera.right = d;
      this.sunLight.shadow.camera.top = d;
      this.sunLight.shadow.camera.bottom = -d;
      this.sunLight.shadow.bias = -0.0005;
      this.sunLight.shadow.normalBias = 0.02;
    }
    this.scene.add(this.sunLight);

    // Build Luanda 3D World
    this.buildTerrainAndOcean();
    this.buildRoadNetwork();
    this.buildBuildings();
    this.buildProceduralDistricts();
    this.buildPalmTreesAndLamps();
    this.buildNPCs();
    this.buildTraffic();
    this.buildPolicePatrols();

    // Smart Traffic Lights at Talatona & Viana main intersections
    this.trafficLights = new TrafficLightSystem();
    this.scene.add(this.trafficLights.group);

    // 3D Rain Particle System (hidden until weather === 'chuva')
    this.buildRainSystem();
    // 3D Vehicle Damage Smoke, Fire & Explosion System
    this.buildVehicleSmoke();
    // 3D Furnished House Interior (for entering any house)
    this.scene.add(buildHouseInterior());
    // 3D Retail Store Interior (with customers, shelves, counter & manager)
    this.scene.add(buildShopInterior(!this.isSoftwareGl));
    // 3D Forests, Floating Boats on Baía de Luanda & Extra Houses
    const extraEnv = buildForestsBoatsAndHouses(!this.isSoftwareGl);
    this.scene.add(extraEnv.group);
    this.floatingBoats = extraEnv.boats;
    extraEnv.extraHouses.forEach((h, idx) => {
      this.colliders.push({
        minX: h.x - h.width / 2,
        maxX: h.x + h.width / 2,
        minZ: h.z - h.depth / 2,
        maxZ: h.z + h.depth / 2,
      });
      this.enterableHouses.push({
        id: `extra_house_${idx}`,
        name: h.name,
        type: 'home',
        district: getDistrictAtPosition(h.x, h.z),
        x: h.x,
        z: h.z,
        width: h.width,
        height: 4.6,
        depth: h.depth,
        color: '#fef3c7',
        entranceX: h.x,
        entranceZ: h.z + h.depth / 2 + 1.6,
        description: `${h.name}. Pode entrar para explorar o interior.`,
      });
    });
    // 3D Taxi Interior (Yango & Candongueiro passenger view)
    this.taxiInterior = buildTaxiInterior(!this.isSoftwareGl);
    this.scene.add(this.taxiInterior.group);

    // Build Player Character
    this.playerGroup = this.createHumanoid(appearance, true);
    this.playerGroup.position.copy(this.playerPos);
    this.scene.add(this.playerGroup);

    // Waypoint Beacon (hidden until GPS selected)
    this.waypointBeam = this.createWaypointBeam();
    this.waypointBeam.visible = false;
    this.scene.add(this.waypointBeam);

    this.bindEvents();
    this.updateLightingForTime(this.timeOfDay);

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    this.tick();
  }

  // --- Public API ---

  public setMode(mode: 'menu' | 'playing') {
    this.mode = mode;
    if (mode === 'playing') {
      this.cameraYaw = this.playerYaw;
    }
  }

  public setPaused(paused: boolean) {
    this.paused = paused;
    if (paused) {
      this.keys.clear();
      this.touchMove = { x: 0, y: 0, sprint: false };
    }
  }

  public setTimeOfDay(hourDecimal: number) {
    this.timeOfDay = ((hourDecimal % 24) + 24) % 24;
    this.updateLightingForTime(this.timeOfDay);
  }

  public setWeather(weather: WeatherType) {
    this.weather = weather;
    if (this.rainPoints) {
      this.rainPoints.visible = weather === 'chuva';
    }
    // Wet asphalt becomes glossy/reflective during rain
    const roadRoughness = weather === 'chuva' ? 0.3 : weather === 'nublado' ? 0.78 : 0.88;
    if (this.sharedRoadMatH) this.sharedRoadMatH.roughness = roadRoughness;
    if (this.sharedRoadMatV) this.sharedRoadMatV.roughness = roadRoughness;
    this.updateLightingForTime(this.timeOfDay);
  }

  public setMouseSensitivity(val: number) {
    this.mouseSensitivity = val;
  }

  public setTouchInput(x: number, y: number, sprint: boolean) {
    this.touchMove.x = x;
    this.touchMove.y = y;
    this.touchMove.sprint = sprint;
  }

  public setPlayerPosition(x: number, z: number) {
    this.playerPos.set(x, 0, z);
    this.playerGroup.position.copy(this.playerPos);
  }

  public updatePlayerAppearance(appearance: CharacterAppearance) {
    const pos = this.playerGroup.position.clone();
    const rot = this.playerGroup.rotation.y;
    const visible = this.playerGroup.visible;
    this.scene.remove(this.playerGroup);
    this.playerGroup = this.createHumanoid(appearance, true);
    this.playerGroup.position.copy(pos);
    this.playerGroup.rotation.y = rot;
    this.playerGroup.visible = visible;
    this.scene.add(this.playerGroup);
    this.attachWeaponToPlayer(this.equippedWeaponId);
  }

  public setWeaponState(weaponId: string | null, ammo: number, wantedLevel: number) {
    this.playerAmmo = ammo;
    this.wantedLevel = wantedLevel;
    if (weaponId !== this.equippedWeaponId) {
      this.equippedWeaponId = weaponId;
      this.attachWeaponToPlayer(weaponId);
    }
  }

  public fireWeapon() {
    if (this.mode !== 'playing' || this.paused || this.isDriving) return;
    if (!this.equippedWeaponId || this.playerAmmo <= 0) return;

    const spec = WEAPON_CATALOG.find((w) => w.id === this.equippedWeaponId);
    if (!spec) return;

    const now = performance.now();
    if (now - this.lastShotTime < spec.fireRateMs) return;
    this.lastShotTime = now;

    // Spawn 3D glowing tracer projectile
    const bulletMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 6, 6),
      new THREE.MeshBasicMaterial({ color: 0xfef08a })
    );
    const dirX = Math.sin(this.playerYaw);
    const dirZ = Math.cos(this.playerYaw);
    bulletMesh.position.set(
      this.playerPos.x + dirX * 0.9,
      1.32,
      this.playerPos.z + dirZ * 0.9
    );
    this.scene.add(bulletMesh);

    this.bullets.push({
      mesh: bulletMesh,
      vel: new THREE.Vector3(dirX * 52, 0, dirZ * 52),
      life: 0.9,
    });

    this.playGunshotSound(spec.id);
    this.callbacks.onWeaponFired();
  }

  private playGunshotSound(weaponId: string) {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(weaponId === 'espingarda_tatica' ? 120 : 210, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(35, ctx.currentTime + 0.11);
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.13);
    } catch {
      // Ignore audio autoplay restrictions
    }
  }

  private attachWeaponToPlayer(weaponId: string | null) {
    if (this.weaponMesh && this.weaponMesh.parent) {
      this.weaponMesh.parent.remove(this.weaponMesh);
    }
    this.weaponMesh = null;
    if (!weaponId || !this.playerParts.rightArm) return;

    const spec = WEAPON_CATALOG.find((w) => w.id === weaponId);
    if (!spec) return;

    const g = new THREE.Group();
    const metalMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(spec.color),
      metalness: 0.8,
      roughness: 0.3,
    });
    const barrel = new THREE.Mesh(
      new THREE.BoxGeometry(0.09, 0.11, spec.length),
      metalMat
    );
    barrel.position.set(0, -0.52, spec.length / 2 + 0.05);
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.18, 0.1), metalMat);
    grip.position.set(0, -0.6, 0.06);
    g.add(barrel, grip);

    this.playerParts.rightArm.add(g);
    this.weaponMesh = g;
  }

  public spawnOwnedVehicle(vehicleId: string | null, fuel: number, nearPlayer = false) {
    if (this.vehicleGroup) {
      this.scene.remove(this.vehicleGroup);
      this.vehicleGroup = null;
    }
    this.isDriving = false;
    this.playerGroup.visible = true;
    this.vehicleFuel = fuel;

    if (!vehicleId) {
      this.activeVehicleSpec = null;
      return;
    }

    const spec = VEHICLE_CATALOG.find((v) => v.id === vehicleId);
    if (!spec) return;
    this.activeVehicleSpec = spec;
    this.vehicleGroup = this.createVehicleMesh(spec);

    if (nearPlayer) {
      this.vehiclePos.set(this.playerPos.x + 4, 0, this.playerPos.z);
    } else {
      // Park neatly outside Marginal Dealership or Starter Home
      this.vehiclePos.set(-32, 0, -14);
    }
    this.vehicleGroup.position.copy(this.vehiclePos);
    this.vehicleYaw = 0;
    this.vehicleGroup.rotation.y = this.vehicleYaw;
    this.vehicleHealth = 100;
    this.applyVehicleVisualDamage();
    this.scene.add(this.vehicleGroup);
  }

  public setVehicleFuel(fuel: number) {
    this.vehicleFuel = Math.max(0, Math.min(100, fuel));
  }

  public repairVehicle() {
    this.vehicleHealth = 100;
    this.applyVehicleVisualDamage();
    this.callbacks.onDrivingStateChange(
      this.isDriving,
      Math.round(Math.abs(this.vehicleSpeed) * 3.6),
      this.vehicleFuel,
      this.vehicleHealth
    );
  }

  private buildVehicleSmoke() {
    const count = 28;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 0.6;
      positions[i * 3 + 1] = Math.random() * 2.2;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 0.6;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0x52525b,
      size: 0.45,
      transparent: true,
      opacity: 0.65,
      depthWrite: false,
    });
    this.vehicleSmokePositions = positions;
    this.vehicleSmoke = new THREE.Points(geo, mat);
    this.vehicleSmoke.frustumCulled = false;
    this.vehicleSmoke.visible = false;
    this.scene.add(this.vehicleSmoke);

    // 3D Engine Fire Particles
    const fireCount = 24;
    const firePos = new Float32Array(fireCount * 3);
    for (let i = 0; i < fireCount; i++) {
      firePos[i * 3] = (Math.random() - 0.5) * 0.7;
      firePos[i * 3 + 1] = Math.random() * 1.1;
      firePos[i * 3 + 2] = (Math.random() - 0.5) * 0.7;
    }
    const fireGeo = new THREE.BufferGeometry();
    fireGeo.setAttribute('position', new THREE.BufferAttribute(firePos, 3));
    const fireMat = new THREE.PointsMaterial({
      color: 0xf97316,
      size: 0.55,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    });
    this.vehicleFirePositions = firePos;
    this.vehicleFire = new THREE.Points(fireGeo, fireMat);
    this.vehicleFire.frustumCulled = false;
    this.vehicleFire.visible = false;
    this.scene.add(this.vehicleFire);

    this.vehicleFireLight = new THREE.PointLight(0xff5500, 0, 12);
    this.scene.add(this.vehicleFireLight);

    // 3D Explosion Fireball
    const expGeo = new THREE.SphereGeometry(1, 16, 16);
    const expMat = new THREE.MeshBasicMaterial({
      color: 0xff6b00,
      transparent: true,
      opacity: 0.9,
    });
    this.vehicleExplosionMesh = new THREE.Mesh(expGeo, expMat);
    this.vehicleExplosionMesh.visible = false;
    this.scene.add(this.vehicleExplosionMesh);
  }

  private applyVehicleVisualDamage() {
    if (!this.vehicleGroup) return;
    if (this.vehicleHealth >= 100) {
      this.vehicleExploded = false;
    }
    const dmg = (100 - this.vehicleHealth) / 100; // 0 = pristine, 1 = heavily damaged
    this.vehicleGroup.scale.set(1 + dmg * 0.05, 1 - dmg * 0.06, 1 - dmg * 0.14);
    this.vehicleGroup.rotation.z = dmg * 0.06;

    if (this.vehicleSmoke) {
      this.vehicleSmoke.visible = this.vehicleHealth < 60;
      const mat = this.vehicleSmoke.material as THREE.PointsMaterial;
      mat.color.setHex(this.vehicleHealth < 30 ? 0x18181b : 0x71717a);
    }

    const isOnFire = this.vehicleHealth < 30 && this.vehicleHealth > 0;
    if (this.vehicleFire) {
      this.vehicleFire.visible = isOnFire;
    }
    if (this.vehicleFireLight) {
      this.vehicleFireLight.intensity = isOnFire ? 3.5 : 0;
    }
  }

  private triggerVehicleExplosion() {
    if (this.vehicleExploded) return;
    this.vehicleExploded = true;
    this.vehicleSpeed = 0;

    if (this.vehicleExplosionMesh) {
      this.vehicleExplosionMesh.position.set(this.vehiclePos.x, 1.2, this.vehiclePos.z);
      this.vehicleExplosionMesh.scale.set(1, 1, 1);
      this.vehicleExplosionMesh.visible = true;
      (this.vehicleExplosionMesh.material as THREE.MeshBasicMaterial).opacity = 0.95;
      this.explosionTimer = 1.1;
    }

    if (this.vehicleFire) this.vehicleFire.visible = false;
    if (this.vehicleFireLight) this.vehicleFireLight.intensity = 6;

    // Char the vehicle dark
    if (this.vehicleGroup) {
      this.vehicleGroup.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const m = (obj as THREE.Mesh).material as THREE.MeshStandardMaterial;
          if (m && m.color) m.color.setHex(0x18181b);
        }
      });
    }

    // If player is inside when it explodes -> player dies!
    if (this.isDriving) {
      this.isDriving = false;
      this.playerGroup.visible = true;
      this.callbacks.onDrivingStateChange(false, 0, this.vehicleFuel, 0);
      this.callbacks.onPlayerDeath('O teu carro pegou fogo e explodiu contigo lá dentro!');
    }
  }

  public enterHouse(houseName: string) {
    if (this.isInsideHouse || this.isDriving) return;
    this.savedOutdoorPos.copy(this.playerPos);
    this.isInsideHouse = true;
    this.playerPos.copy(HOUSE_INTERIOR_SPAWN);
    this.playerGroup.position.copy(this.playerPos);
    this.playerYaw = Math.PI;
    this.cameraYaw = 0;
    this.callbacks.onInteriorStateChange(true, houseName);
  }

  public exitHouse() {
    if (!this.isInsideHouse) return;
    this.isInsideHouse = false;
    this.playerPos.copy(this.savedOutdoorPos);
    this.playerGroup.position.copy(this.playerPos);
    this.callbacks.onInteriorStateChange(false, null);
  }

  public enterShop(building: WorldBuilding) {
    if (this.currentShopBuilding || this.isInsideHouse || this.isDriving) return;
    this.savedOutdoorPos.copy(this.playerPos);
    this.currentShopBuilding = building;
    this.lastNearShopCounter = false;
    this.playerPos.copy(SHOP_INTERIOR_SPAWN);
    this.playerGroup.position.copy(this.playerPos);
    this.playerYaw = Math.PI;
    this.cameraYaw = 0;
    this.setManagerSpeechBubble(`Bem-vindo a ${building.name}! Venha ao balcão falar comigo.`);
    this.setPlayerSpeechBubble(null);
    this.callbacks.onShopStateChange(building, false);
  }

  public exitShop() {
    if (!this.currentShopBuilding) return;
    this.currentShopBuilding = null;
    this.lastNearShopCounter = false;
    this.setPlayerSpeechBubble(null);
    this.setManagerSpeechBubble(null);
    this.playerPos.copy(this.savedOutdoorPos);
    this.playerGroup.position.copy(this.playerPos);
    this.callbacks.onShopStateChange(null, false);
  }

  public setPlayerSpeechBubble(text: string | null) {
    if (this.playerSpeechSprite) {
      this.scene.remove(this.playerSpeechSprite);
      this.playerSpeechSprite.material.map?.dispose();
      this.playerSpeechSprite.material.dispose();
      this.playerSpeechSprite = null;
    }
    if (!text) return;
    const tex = createSpeechBubbleTexture(text, '#f59e0b', '#09090b');
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(2.8, 0.88, 1);
    sprite.position.set(this.playerPos.x, 2.45, this.playerPos.z);
    sprite.renderOrder = 20;
    this.playerSpeechSprite = sprite;
    this.scene.add(sprite);
  }

  public setManagerSpeechBubble(text: string | null) {
    if (this.managerSpeechSprite) {
      this.scene.remove(this.managerSpeechSprite);
      this.managerSpeechSprite.material.map?.dispose();
      this.managerSpeechSprite.material.dispose();
      this.managerSpeechSprite = null;
    }
    if (!text) return;
    const tex = createSpeechBubbleTexture(text, '#18181b', '#f8fafc');
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(3.2, 1.0, 1);
    sprite.position.set(SHOP_MANAGER_WORLD_POS.x, 2.5, SHOP_MANAGER_WORLD_POS.z);
    sprite.renderOrder = 20;
    this.managerSpeechSprite = sprite;
    this.scene.add(sprite);
  }

  public startTaxiRide(
    type: 'yango' | 'candongueiro',
    destX: number,
    destZ: number,
    destName: string
  ) {
    if (this.isDriving) this.toggleVehicle();
    if (this.isInsideHouse) this.exitHouse();
    if (this.currentShopBuilding) this.exitShop();
    if (this.taxiInterior) {
      this.taxiInterior.candongueiroPassengers.visible = type === 'candongueiro';
    }
    this.activeTaxiRide = { type, destX, destZ, destName, timer: 4.2 };
  }

  public resetAfterDeath() {
    this.isDriving = false;
    this.isInsideHouse = false;
    this.vehicleSpeed = 0;
    this.vehicleHealth = 100;
    this.vehicleExploded = false;
    this.applyVehicleVisualDamage();
    this.playerPos.set(14, 0, -14); // Hospital Josina Machel entrance
    this.playerGroup.position.copy(this.playerPos);
    this.playerGroup.visible = true;
    this.callbacks.onInteriorStateChange(false, null);
    this.callbacks.onDrivingStateChange(false, 0, this.vehicleFuel, 100);
  }

  private updateVehicleSmoke(dt: number) {
    // Animate active explosion fireball
    if (this.explosionTimer > 0 && this.vehicleExplosionMesh) {
      this.explosionTimer = Math.max(0, this.explosionTimer - dt);
      const progress = 1 - this.explosionTimer / 1.1;
      const scale = 1.2 + progress * 6.5;
      this.vehicleExplosionMesh.scale.set(scale, scale, scale);
      (this.vehicleExplosionMesh.material as THREE.MeshBasicMaterial).opacity = Math.max(
        0,
        0.95 * (1 - progress)
      );
      if (this.explosionTimer <= 0) {
        this.vehicleExplosionMesh.visible = false;
        if (this.vehicleFireLight) this.vehicleFireLight.intensity = 0;
      }
    }

    if (!this.vehicleGroup) return;
    const hoodX = this.vehiclePos.x + Math.sin(this.vehicleYaw) * 1.4;
    const hoodZ = this.vehiclePos.z + Math.cos(this.vehicleYaw) * 1.4;

    // Burn down health while engine is on fire
    if (this.vehicleHealth > 0 && this.vehicleHealth < 30 && !this.vehicleExploded) {
      this.vehicleHealth = Math.max(0, this.vehicleHealth - 4.5 * dt);
      if (this.vehicleHealth <= 0) {
        this.triggerVehicleExplosion();
      }
    }

    if (this.vehicleSmoke && this.vehicleSmokePositions && this.vehicleSmoke.visible) {
      this.vehicleSmoke.position.set(hoodX, 1.0, hoodZ);
      const pos = this.vehicleSmokePositions;
      for (let i = 0; i < pos.length; i += 3) {
        pos[i + 1] += (1.8 + Math.random() * 0.5) * dt;
        pos[i] += (Math.random() - 0.5) * 0.4 * dt;
        if (pos[i + 1] > 2.6) {
          pos[i + 1] = 0;
          pos[i] = (Math.random() - 0.5) * 0.5;
          pos[i + 2] = (Math.random() - 0.5) * 0.5;
        }
      }
      (this.vehicleSmoke.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    }

    if (this.vehicleFire && this.vehicleFirePositions && this.vehicleFire.visible) {
      this.vehicleFire.position.set(hoodX, 0.95, hoodZ);
      if (this.vehicleFireLight) {
        this.vehicleFireLight.position.set(hoodX, 1.8, hoodZ);
        this.vehicleFireLight.intensity = 3.0 + Math.random() * 2.0;
      }
      const fpos = this.vehicleFirePositions;
      for (let i = 0; i < fpos.length; i += 3) {
        fpos[i + 1] += (2.4 + Math.random() * 0.8) * dt;
        fpos[i] += (Math.random() - 0.5) * 0.6 * dt;
        if (fpos[i + 1] > 1.35) {
          fpos[i + 1] = 0;
          fpos[i] = (Math.random() - 0.5) * 0.65;
          fpos[i + 2] = (Math.random() - 0.5) * 0.65;
        }
      }
      (this.vehicleFire.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    }
  }

  public toggleVehicle() {
    if (this.isDriving) {
      this.isDriving = false;
      this.vehicleSpeed = 0;
      this.vehicleSteerAngle = 0;
      if (this.vehicleGroup) {
        this.vehicleGroup.rotation.z = 0;
      }
      this.playerPos.set(
        this.vehiclePos.x + Math.cos(this.vehicleYaw) * 2.6,
        0,
        this.vehiclePos.z - Math.sin(this.vehicleYaw) * 2.6
      );
      this.playerGroup.position.copy(this.playerPos);
      this.playerGroup.rotation.set(0, this.playerYaw, 0);
      this.playerGroup.visible = true;
      this.callbacks.onDrivingStateChange(false, 0, this.vehicleFuel, this.vehicleHealth);
      return;
    }

    // 1. Check owned/parked vehicle first
    if (this.vehicleGroup && this.activeVehicleSpec) {
      const dist = this.playerPos.distanceTo(this.vehiclePos);
      if (dist < 6.0) {
        this.isDriving = true;
        this.playerGroup.visible = this.activeVehicleSpec.type === 'mota';
        this.callbacks.onDrivingStateChange(true, 0, this.vehicleFuel, this.vehicleHealth);
        return;
      }
    }

    // 2. Otherwise allow entering any nearby traffic car/mota on the street!
    for (let i = 0; i < this.trafficCars.length; i++) {
      const tc = this.trafficCars[i];
      if (this.playerPos.distanceTo(tc.group.position) < 6.0) {
        if (this.vehicleGroup) {
          this.scene.remove(this.vehicleGroup);
        }
        // Remove NPC rider if boarding a traffic motorcycle
        const existingRider = tc.group.getObjectByName('traffic_rider');
        if (existingRider) {
          tc.group.remove(existingRider);
        }
        this.vehicleGroup = tc.group;
        this.vehiclePos.copy(tc.group.position);
        this.vehicleYaw = tc.group.rotation.y;
        this.activeVehicleSpec = tc.spec;
        this.vehicleFuel = 100;
        this.vehicleHealth = 100;
        this.applyVehicleVisualDamage();
        this.trafficCars.splice(i, 1);

        this.isDriving = true;
        this.playerGroup.visible = tc.spec.type === 'mota';
        this.callbacks.onDrivingStateChange(true, 0, this.vehicleFuel, this.vehicleHealth);
        return;
      }
    }
  }

  public setWaypoint(x: number | null, z: number | null) {
    if (!this.waypointBeam) return;
    if (x === null || z === null) {
      this.waypointBeam.visible = false;
    } else {
      this.waypointBeam.position.set(x, 0, z);
      this.waypointBeam.visible = true;
    }
  }

  public dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    this.unbindEvents();
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }

  // --- World Construction ---

  private createCanvasTexture(
    drawFn: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
    w = 256,
    h = 256,
    repeatX = 1,
    repeatY = 1
  ): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    drawFn(ctx, w, h);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeatX, repeatY);
    tex.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
    return tex;
  }

  private buildTerrainAndOcean() {
    // Mainland ground (Expanded Luanda Province: Viana, Cazenga, Camama, Benfica)
    const groundGeo = new THREE.PlaneGeometry(460, 440);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x5c7a4e,
      roughness: 0.92,
      metalness: 0.0,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(95, -0.05, 0);
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Urban concrete district base
    const urbanGeo = new THREE.PlaneGeometry(240, 260);
    const urbanMat = new THREE.MeshStandardMaterial({
      color: 0x9ca3af,
      roughness: 0.88,
      metalness: 0.02,
    });
    const urban = new THREE.Mesh(urbanGeo, urbanMat);
    urban.rotation.x = -Math.PI / 2;
    urban.position.set(52, -0.01, 0);
    urban.receiveShadow = true;
    this.scene.add(urban);

    // Atlantic Ocean & Baía de Luanda
    const oceanGeo = new THREE.PlaneGeometry(240, 360, 20, 20);
    const oceanMat = new THREE.MeshStandardMaterial({
      color: 0x0369a1,
      roughness: 0.22,
      metalness: 0.35,
    });
    this.oceanMesh = new THREE.Mesh(oceanGeo, oceanMat);
    this.oceanMesh.rotation.x = -Math.PI / 2;
    this.oceanMesh.position.set(-140, -0.35, 0);
    this.scene.add(this.oceanMesh);

    // Marginal Seawall promenade
    const seawall = new THREE.Mesh(
      new THREE.BoxGeometry(5, 1.2, 190),
      new THREE.MeshStandardMaterial({ color: 0xd6d3d1, roughness: 0.8 })
    );
    seawall.position.set(-61.5, -0.2, 0);
    seawall.receiveShadow = true;
    this.scene.add(seawall);

    // Ilha de Luanda sandy peninsula
    const sandGeo = new THREE.BoxGeometry(24, 0.8, 130);
    const sandMat = new THREE.MeshStandardMaterial({
      color: 0xe6c792,
      roughness: 0.92,
    });
    const ilha = new THREE.Mesh(sandGeo, sandMat);
    ilha.position.set(-96, -0.38, 0);
    ilha.receiveShadow = true;
    this.scene.add(ilha);

    // Bridge connecting Marginal (-61) to Ilha de Luanda (-84) at z = 8
    const bridgeDeck = new THREE.Mesh(
      new THREE.BoxGeometry(26, 0.5, 9),
      new THREE.MeshStandardMaterial({ color: 0x3f3f46, roughness: 0.85 })
    );
    bridgeDeck.position.set(-72.5, -0.1, 8);
    bridgeDeck.receiveShadow = true;
    this.scene.add(bridgeDeck);

    // Bridge railings
    const railMat = new THREE.MeshStandardMaterial({ color: 0xe4e4e7, roughness: 0.4, metalness: 0.5 });
    for (const rz of [3.7, 12.3]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(26, 0.9, 0.25), railMat);
      rail.position.set(-72.5, 0.45, rz);
      this.scene.add(rail);
    }
  }

  private buildRoadNetwork() {
    const roadTexH = this.createCanvasTexture((ctx, w, h) => {
      ctx.fillStyle = '#27272a';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#eab308';
      for (let x = 10; x < w; x += 48) {
        ctx.fillRect(x, h / 2 - 4, 26, 8);
      }
      ctx.fillStyle = '#e4e4e7';
      ctx.fillRect(0, 8, w, 4);
      ctx.fillRect(0, h - 12, w, 4);
    }, 256, 128, 12, 1);

    const roadTexV = this.createCanvasTexture((ctx, w, h) => {
      ctx.fillStyle = '#27272a';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#eab308';
      for (let y = 10; y < h; y += 48) {
        ctx.fillRect(w / 2 - 4, y, 8, 26);
      }
      ctx.fillStyle = '#e4e4e7';
      ctx.fillRect(8, 0, 4, h);
      ctx.fillRect(w - 12, 0, 4, h);
    }, 128, 256, 1, 14);

    const roadMatH = new THREE.MeshStandardMaterial({ map: roadTexH, roughness: 0.88 });
    const roadMatV = new THREE.MeshStandardMaterial({ map: roadTexV, roughness: 0.88 });
    this.sharedRoadMatH = roadMatH;
    this.sharedRoadMatV = roadMatV;

    // North-South Avenues (Marginal x=-56, Centro x=0, Kilamba x=38, Via Expressa Viana/Camama/Cazenga x=84)
    const vRoads = [
      { x: -56, z: 0, len: 240 },
      { x: 0, z: 0, len: 240 },
      { x: 38, z: 0, len: 240 },
      { x: 84, z: 0, len: 240 },
    ];
    for (const r of vRoads) {
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(9.5, r.len), roadMatV);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(r.x, 0.02, r.z);
      mesh.receiveShadow = true;
      this.scene.add(mesh);
    }

    // East-West Streets (Cazenga z=-72, Ingombota z=-38, Centro/Viana z=2, Talatona z=36, Benfica/Camama z=74)
    const hRoads = [
      { x: 42, z: -72, len: 210 },
      { x: 42, z: -38, len: 210 },
      { x: 42, z: 2, len: 210 },
      { x: 42, z: 36, len: 210 },
      { x: 42, z: 74, len: 210 },
    ];
    for (const r of hRoads) {
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(r.len, 9.5), roadMatH);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(r.x, 0.03, r.z);
      mesh.receiveShadow = true;
      this.scene.add(mesh);
    }
  }

  private buildBuildings() {
    const windowTex = this.createCanvasTexture((ctx, w, h) => {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#1e293b';
      const cols = 4;
      const rows = 6;
      const padX = 14;
      const padY = 12;
      const cellW = w / cols;
      const cellH = h / rows;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          ctx.fillRect(
            c * cellW + padX / 2,
            r * cellH + padY / 2,
            cellW - padX,
            cellH - padY
          );
        }
      }
    }, 256, 256, 1, 1);
    this.sharedWindowTex = windowTex;

    for (const b of WORLD_BUILDINGS) {
      const group = new THREE.Group();
      group.position.set(b.x, 0, b.z);

      // Primary building volume
      const bodyMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(b.color),
        map: windowTex,
        roughness: 0.72,
        metalness: b.height > 18 ? 0.3 : 0.05,
        emissive: new THREE.Color(0xffe4a0),
        emissiveIntensity: 0.0,
      });
      this.nightWindowMaterials.push(bodyMat);

      const body = new THREE.Mesh(
        new THREE.BoxGeometry(b.width, b.height, b.depth),
        bodyMat
      );
      body.position.y = b.height / 2;
      body.castShadow = !this.isSoftwareGl;
      body.receiveShadow = true;
      group.add(body);

      // Secondary roof parapet / trim
      const roofMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(b.accentColor || '#334155'),
        roughness: 0.45,
        metalness: 0.25,
      });
      const roof = new THREE.Mesh(
        new THREE.BoxGeometry(b.width + 0.5, 0.7, b.depth + 0.5),
        roofMat
      );
      roof.position.y = b.height + 0.35;
      group.add(roof);

      // Accent entrance canopy for interactive buildings
      if (b.type !== 'decor' && b.entranceX !== undefined && b.entranceZ !== undefined) {
        const localEx = b.entranceX - b.x;
        const localEz = b.entranceZ - b.z;

        const doorMat = new THREE.MeshStandardMaterial({
          color: 0x0f172a,
          roughness: 0.25,
          metalness: 0.6,
        });
        const door = new THREE.Mesh(new THREE.BoxGeometry(2.6, 3.2, 0.5), doorMat);
        door.position.set(
          Math.sign(localEx) * (b.width / 2 - 0.1),
          1.6,
          Math.sign(localEz) * (b.depth / 2 - 0.1)
        );
        if (Math.abs(localEx) > Math.abs(localEz)) {
          door.rotation.y = Math.PI / 2;
        }
        group.add(door);

        // Glowing ground interaction ring
        const ringGeo = new THREE.RingGeometry(1.1, 1.5, 24);
        const ringMat = new THREE.MeshBasicMaterial({
          color: new THREE.Color(b.accentColor || '#f59e0b'),
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.85,
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = -Math.PI / 2;
        ring.position.set(b.entranceX, 0.08, b.entranceZ);
        this.scene.add(ring);
        this.entranceMarkers.push(ring);
      }

      this.scene.add(group);

      // Register AABB collider
      this.colliders.push({
        minX: b.x - b.width / 2 - 0.6,
        maxX: b.x + b.width / 2 + 0.6,
        minZ: b.z - b.depth / 2 - 0.6,
        maxZ: b.z + b.depth / 2 + 0.6,
      });
    }
  }

  private buildProceduralDistricts() {
    const result = generateTalatonaAndVianaDistricts(
      this.isSoftwareGl,
      this.sharedWindowTex,
      this.sharedRoadMatH,
      this.sharedRoadMatV
    );
    this.scene.add(result.group);
    this.colliders.push(...result.colliders);
    this.nightWindowMaterials.push(...result.nightMaterials);
    this.streetLampMeshes.push(...result.lampMaterials);

    // Register all decor buildings and procedural buildings as enterable houses
    for (const b of WORLD_BUILDINGS) {
      if (b.type === 'decor') {
        this.enterableHouses.push({
          ...b,
          type: 'home',
          entranceX: b.x,
          entranceZ: b.z + b.depth / 2 + 1.8,
        });
      }
    }
    result.colliders.forEach((c, idx) => {
      const cx = (c.minX + c.maxX) / 2;
      const cz = (c.minZ + c.maxZ) / 2;
      const dist = getDistrictAtPosition(cx, cz);
      this.enterableHouses.push({
        id: `proc_house_${idx}`,
        name: `Casa em ${dist} #${idx + 1}`,
        type: 'home',
        district: dist,
        x: cx,
        z: cz,
        width: c.maxX - c.minX,
        height: 6,
        depth: c.maxZ - c.minZ,
        color: '#d97706',
        entranceX: cx,
        entranceZ: c.maxZ + 1.6,
        description: `Residência em ${dist}. Pode entrar para ver o interior.`,
      });
    });
  }

  private buildPalmTreesAndLamps() {
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x7c5c3e, roughness: 0.92 });
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x2e7d32, roughness: 0.78 });

    const palmCoords: [number, number][] = [];
    // Marginal de Luanda palm line
    for (let z = -66; z <= 66; z += 14) {
      palmCoords.push([-62, z]);
    }
    // Ilha de Luanda beach palms
    for (let z = -48; z <= 48; z += 16) {
      palmCoords.push([-102, z]);
      if (Math.abs(z - 8) > 10) palmCoords.push([-88, z]);
    }
    // City park palms
    palmCoords.push([-8, 12], [10, 12], [-8, -10], [10, -10], [44, 10], [44, -10]);

    for (const [px, pz] of palmCoords) {
      const palm = new THREE.Group();
      palm.position.set(px, 0, pz);

      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.34, 6.2, 7), trunkMat);
      trunk.position.y = 3.1;
      trunk.castShadow = !this.isSoftwareGl;
      palm.add(trunk);

      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        const frond = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.12, 2.8), leafMat);
        frond.position.set(Math.sin(angle) * 1.1, 6.1, Math.cos(angle) * 1.1);
        frond.rotation.y = angle;
        frond.rotation.x = 0.35;
        palm.add(frond);
      }
      this.scene.add(palm);
    }

    // Streetlamps along main avenues
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x3f3f46, metalness: 0.7, roughness: 0.35 });
    const bulbMat = new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: new THREE.Color(0xfbbf24),
      emissiveIntensity: 0,
      roughness: 0.2,
    });
    this.streetLampMeshes.push(bulbMat);

    const lampPositions: [number, number][] = [
      [-51, -30], [-51, 0], [-51, 30],
      [-6, -30], [-6, 12], [-6, 32],
      [6, -18], [6, 20],
      [33, -24], [33, 18],
    ];

    for (const [lx, lz] of lampPositions) {
      const lamp = new THREE.Group();
      lamp.position.set(lx, 0, lz);
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 6.5, 6), poleMat);
      pole.position.y = 3.25;
      lamp.add(pole);

      const arm = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.12, 0.12), poleMat);
      arm.position.set(0.6, 6.4, 0);
      lamp.add(arm);

      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 8), bulbMat);
      bulb.position.set(1.2, 6.25, 0);
      lamp.add(bulb);

      this.scene.add(lamp);
    }
  }

  private createHumanoid(appearance: CharacterAppearance, isPlayer: boolean): THREE.Group {
    const rig = buildRealisticHuman(appearance, !this.isSoftwareGl);
    // Prevent any limb or head part from disappearing during camera rotation
    rig.group.traverse((obj) => {
      obj.frustumCulled = false;
    });
    if (isPlayer) {
      this.playerParts = {
        leftLeg: rig.leftLeg,
        rightLeg: rig.rightLeg,
        leftKnee: rig.leftKnee,
        rightKnee: rig.rightKnee,
        leftArm: rig.leftArm,
        rightArm: rig.rightArm,
        leftElbow: rig.leftElbow,
        rightElbow: rig.rightElbow,
        torsoGroup: rig.torsoGroup,
        headGroup: rig.headGroup,
      };
    } else {
      rig.group.userData = {
        leftLeg: rig.leftLeg,
        rightLeg: rig.rightLeg,
        leftArm: rig.leftArm,
        rightArm: rig.rightArm,
        headGroup: rig.headGroup,
        torsoGroup: rig.torsoGroup,
      };
    }
    return rig.group;
  }

  private createVehicleMesh(spec: VehicleCatalogItem): THREE.Group {
    return buildRealisticVehicle(spec, !this.isSoftwareGl);
  }

  private buildNPCs() {
    const skins = ['#5c3a21', '#7c4d2b', '#8d5524', '#4a2c18'];
    const shirts = ['#f59e0b', '#0284c7', '#16a34a', '#dc2626', '#f4f4f5', '#7c3aed'];
    const pants = ['#1e293b', '#334155', '#18181b', '#475569'];

    const schedules: {
      name: string;
      role: string;
      home: [number, number];
      work: [number, number];
      social: [number, number];
    }[] = [
      { name: 'Mateus', role: 'Comerciante', home: [-24, 14], work: [-6, -24], social: [-50, 4] },
      { name: 'Esperança', role: 'Enfermeira', home: [-32, 22], work: [12, -16], social: [-48, -12] },
      { name: 'Edson', role: 'Engenheiro', home: [52, 74], work: [66, 86], social: [44, 62] },
      { name: 'Cátia', role: 'Professora', home: [-14, 24], work: [6, 18], social: [-46, 18] },
      { name: 'Osvaldo', role: 'Mecânico', home: [92, -12], work: [118, -6], social: [104, 14] },
      { name: 'Nádia', role: 'Gestora', home: [42, 82], work: [28, -18], social: [-50, 24] },
      { name: 'Helder', role: 'Motorista', home: [112, 24], work: [128, -14], social: [96, 8] },
      { name: 'Lúcia', role: 'Advogada', home: [-20, -28], work: [6, -28], social: [-52, -22] },
      { name: 'Tiago', role: 'Estudante', home: [-36, 10], work: [8, 22], social: [-86, 4] },
      { name: 'Joana', role: 'Vendedora', home: [86, 18], work: [108, -22], social: [100, 6] },
      { name: 'Bruno', role: 'Técnico TI', home: [64, 92], work: [56, 70], social: [34, 48] },
      { name: 'Sónia', role: 'Arquiteta', home: [-10, -34], work: [26, 14], social: [-48, -4] },
    ];

    for (let i = 0; i < schedules.length; i++) {
      const s = schedules[i];
      const npcAppearance: CharacterAppearance = {
        name: s.name,
        gender: i % 2 === 0 ? 'homem' : 'mulher',
        skinTone: skins[i % skins.length],
        hairStyle: i % 2 === 0 ? 'curto' : 'trancas',
        hairColor: '#18181b',
        shirtColor: shirts[i % shirts.length],
        pantsColor: pants[i % pants.length],
        shoesColor: '#18181b',
      };
      const group = this.createHumanoid(npcAppearance, false);
      const homePos = new THREE.Vector3(s.home[0], 0, s.home[1]);
      const workPos = new THREE.Vector3(s.work[0], 0, s.work[1]);
      const socialPos = new THREE.Vector3(s.social[0], 0, s.social[1]);

      // Start NPCs halfway between home and work for immediate city life
      const start = homePos.clone().lerp(workPos, 0.4 + (i % 3) * 0.2);
      group.position.copy(start);
      this.scene.add(group);

      const torsoGroup = group.userData.torsoGroup as THREE.Object3D;
      this.npcs.push({
        name: s.name,
        role: s.role,
        group,
        leftLeg: group.userData.leftLeg,
        rightLeg: group.userData.rightLeg,
        leftArm: group.userData.leftArm,
        rightArm: group.userData.rightArm,
        headGroup: group.userData.headGroup,
        torsoGroup,
        homePos,
        workPos,
        socialPos,
        speed: 1.9 + (i % 3) * 0.3,
        phase: i * 1.1,
        activity: 'walking',
        activityTimer: 3 + (i % 4),
        baseTorsoY: torsoGroup.position.y,
      });
    }
  }

  private buildTraffic() {
    const specs: VehicleCatalogItem[] = [
      VEHICLE_CATALOG[0], // Mota
      VEHICLE_CATALOG[1], // Sedan
      VEHICLE_CATALOG[2], // Candongueiro
      VEHICLE_CATALOG[3], // SUV
    ];
    const lanes: { x: number; z: number; axis: 'x' | 'z'; dir: 1 | -1; min: number; max: number }[] = [
      { x: -54, z: -40, axis: 'z', dir: 1, min: -70, max: 65 },
      { x: -58, z: 30, axis: 'z', dir: -1, min: -70, max: 65 },
      { x: 2, z: -20, axis: 'z', dir: 1, min: -70, max: 65 },
      { x: -2, z: 25, axis: 'z', dir: -1, min: -70, max: 65 },
      { x: -20, z: 4, axis: 'x', dir: 1, min: -52, max: 62 },
      { x: 20, z: -40, axis: 'x', dir: -1, min: -52, max: 62 },
      { x: -12, z: -10, axis: 'z', dir: 1, min: -60, max: 55 },
    ];

    lanes.forEach((lane, i) => {
      const spec = specs[i % specs.length];
      const mesh = this.createVehicleMesh(spec);
      if (spec.type === 'mota') {
        const rider = buildRealisticHuman(
          {
            name: 'Mototaxista',
            gender: 'homem',
            skinTone: '#5c3a21',
            hairStyle: 'curto',
            hairColor: '#18181b',
            shirtColor: i % 2 === 0 ? '#f59e0b' : '#0284c7',
            pantsColor: '#1e293b',
            shoesColor: '#18181b',
          },
          !this.isSoftwareGl
        );
        rider.group.name = 'traffic_rider';
        rider.group.position.set(0, 0.42, -0.22);
        rider.torsoGroup.rotation.x = 0.28;
        rider.leftArm.rotation.x = -1.05;
        rider.rightArm.rotation.x = -1.05;
        rider.leftElbow.rotation.x = -0.35;
        rider.rightElbow.rotation.x = -0.35;
        rider.leftLeg.rotation.x = -0.75;
        rider.rightLeg.rotation.x = -0.75;
        rider.leftKnee.rotation.x = 1.25;
        rider.rightKnee.rotation.x = 1.25;
        rider.group.traverse((o) => {
          o.frustumCulled = false;
        });
        mesh.add(rider.group);
      }
      mesh.position.set(lane.x, 0, lane.z);
      if (lane.axis === 'x') {
        mesh.rotation.y = lane.dir === 1 ? Math.PI / 2 : -Math.PI / 2;
      } else {
        mesh.rotation.y = lane.dir === 1 ? 0 : Math.PI;
      }
      this.scene.add(mesh);
      this.trafficCars.push({
        group: mesh,
        spec,
        axis: lane.axis,
        dir: lane.dir,
        speed: 8 + (i % 3) * 2.5,
        minLimit: lane.min,
        maxLimit: lane.max,
      });
    });

    // Park a ready-to-ride Mota right near the player's starting area in Maianga
    const motaSpec = VEHICLE_CATALOG[0];
    const parkedMota = this.createVehicleMesh(motaSpec);
    parkedMota.position.set(-14, 0, 10);
    parkedMota.rotation.y = Math.PI / 4;
    this.scene.add(parkedMota);
    this.trafficCars.push({
      group: parkedMota,
      spec: motaSpec,
      axis: 'z',
      dir: 1,
      speed: 0,
      minLimit: -100,
      maxLimit: 100,
    });
  }

  private buildPolicePatrols() {
    const patrolRoutes: { label: string; waypoints: THREE.Vector3[] }[] = [
      // Patrulha Talatona — Avenida Principal de Talatona & Ligação Expressa
      {
        label: 'Talatona',
        waypoints: [
          new THREE.Vector3(22, 0, 36),
          new THREE.Vector3(22, 0, 108),
          new THREE.Vector3(22, 0, 54),
          new THREE.Vector3(84, 0, 54),
        ],
      },
      // Patrulha Viana — Estrada Principal & Polo Industrial de Viana
      {
        label: 'Viana',
        waypoints: [
          new THREE.Vector3(84, 0, 2),
          new THREE.Vector3(148, 0, 2),
          new THREE.Vector3(148, 0, 54),
          new THREE.Vector3(84, 0, 54),
        ],
      },
      // Patrulha Viana Norte — Avenida Norte-Sul & Ligação Cazenga
      {
        label: 'Viana Norte',
        waypoints: [
          new THREE.Vector3(148, 0, -56),
          new THREE.Vector3(148, 0, 2),
          new THREE.Vector3(84, 0, 2),
          new THREE.Vector3(84, 0, -56),
        ],
      },
      // Patrulha Marginal & Ingombota
      {
        label: 'Marginal',
        waypoints: [
          new THREE.Vector3(-56, 0, -64),
          new THREE.Vector3(-56, 0, 40),
          new THREE.Vector3(0, 0, 40),
          new THREE.Vector3(0, 0, -38),
        ],
      },
    ];

    for (const route of patrolRoutes) {
      const policeSpec: VehicleCatalogItem = {
        id: 'police_cruiser',
        name: 'Viatura Polícia Nacional',
        type: 'suv',
        price: 0,
        maxSpeed: 28,
        color: '#1e3a8a',
        fuelCapacity: 100,
        description: '',
      };
      const car = this.createVehicleMesh(policeSpec);

      // Police flashing lightbar
      const redLight = new THREE.MeshStandardMaterial({
        color: 0xef4444,
        emissive: new THREE.Color(0xef4444),
        emissiveIntensity: 1.5,
      });
      const blueLight = new THREE.MeshStandardMaterial({
        color: 0x3b82f6,
        emissive: new THREE.Color(0x3b82f6),
        emissiveIntensity: 1.5,
      });
      const barL = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.16, 0.28), redLight);
      barL.position.set(-0.28, 1.98, -0.1);
      const barR = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.16, 0.28), blueLight);
      barR.position.set(0.28, 1.98, -0.1);
      car.add(barL, barR);

      car.position.copy(route.waypoints[0]);
      this.scene.add(car);

      this.policeCars.push({
        group: car,
        redLight,
        blueLight,
        waypoints: route.waypoints,
        currentWaypoint: 1,
        districtLabel: route.label,
      });
    }
  }

  private createWaypointBeam(): THREE.Group {
    const g = new THREE.Group();
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.45, 0.9, 42, 12, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0xf59e0b,
        transparent: true,
        opacity: 0.38,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );
    beam.position.y = 21;
    g.add(beam);
    return g;
  }

  private buildRainSystem() {
    const count = 1200;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 90;
      positions[i * 3 + 1] = Math.random() * 34;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 90;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xcbd5e1,
      size: 0.24,
      transparent: true,
      opacity: 0.65,
      depthWrite: false,
    });
    this.rainPositions = positions;
    this.rainPoints = new THREE.Points(geo, mat);
    this.rainPoints.frustumCulled = false;
    this.rainPoints.visible = false;
    this.scene.add(this.rainPoints);
  }

  private updateRain(dt: number) {
    if (!this.rainPoints || !this.rainPositions || this.weather !== 'chuva') return;
    this.rainPoints.position.set(this.playerPos.x, 0, this.playerPos.z);
    const pos = this.rainPositions;
    for (let i = 0; i < pos.length; i += 3) {
      pos[i + 1] -= 26 * dt;
      pos[i] -= 2.5 * dt;
      if (pos[i + 1] < 0) {
        pos[i + 1] = 32 + Math.random() * 4;
        pos[i] = (Math.random() - 0.5) * 90;
      }
    }
    (this.rainPoints.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  }

  // --- Day / Night Lighting ---

  private updateLightingForTime(hour: number) {
    // 6:00 sunrise, 12:00 zenith, 18:30 sunset, 21:00..5:00 night
    const sunAngle = ((hour - 6) / 12) * Math.PI;
    const sunHeight = Math.sin(sunAngle);
    const isDay = hour >= 5.5 && hour <= 19.0;

    if (isDay) {
      const x = Math.cos(sunAngle) * 95;
      const y = Math.max(8, sunHeight * 95);
      this.sunLight.position.set(x, y, 40);
      this.sunLight.intensity = 0.6 + Math.max(0, sunHeight) * 1.45;
    } else {
      this.sunLight.position.set(-40, 60, -30);
      this.sunLight.intensity = 0.32;
    }

    // Sky & Fog colors
    const daySky = _colorA.setHex(0x7cc4f5);
    const sunsetSky = _colorB.setHex(0xea7a42);
    const nightSky = new THREE.Color(0x0b1224);

    let skyColor = daySky.clone();
    let nightFactor = 0;

    if (hour >= 5 && hour < 7.5) {
      const t = (hour - 5) / 2.5;
      skyColor = nightSky.clone().lerp(sunsetSky, Math.min(1, t * 1.5)).lerp(daySky, Math.max(0, t - 0.3));
      nightFactor = 1 - t;
    } else if (hour >= 7.5 && hour < 17.0) {
      skyColor = daySky.clone();
      nightFactor = 0;
    } else if (hour >= 17.0 && hour < 19.5) {
      const t = (hour - 17.0) / 2.5;
      skyColor = daySky.clone().lerp(sunsetSky, Math.min(1, t * 1.4)).lerp(nightSky, Math.max(0, t - 0.35) / 0.65);
      nightFactor = t;
    } else {
      skyColor = nightSky.clone();
      nightFactor = 1;
    }

    // Modulate sky, fog & light intensity for weather (nublado / chuva)
    if (this.weather === 'nublado') {
      skyColor.lerp(new THREE.Color(0x64748b), 0.48);
      this.sunLight.intensity *= 0.62;
    } else if (this.weather === 'chuva') {
      skyColor.lerp(new THREE.Color(0x334155), 0.68);
      this.sunLight.intensity *= 0.42;
    }

    this.scene.background = skyColor;
    if (this.scene.fog instanceof THREE.FogExp2) {
      this.scene.fog.color.copy(skyColor);
      this.scene.fog.density =
        this.weather === 'chuva' ? 0.0042 : this.weather === 'nublado' ? 0.0026 : 0.0018;
    }

    this.hemiLight.intensity = 0.8 - nightFactor * 0.48;
    this.sunLight.color.setHex(nightFactor > 0.6 ? 0x93c5fd : hour > 16.8 || hour < 7.5 ? 0xffb36b : 0xfff5dc);

    // Light up Luanda city windows & streetlamps at night
    const windowGlow = nightFactor > 0.35 ? (nightFactor - 0.35) * 0.75 : 0;
    for (const mat of this.nightWindowMaterials) {
      mat.emissiveIntensity = windowGlow;
    }
    const lampGlow = nightFactor > 0.3 ? 1.8 : 0;
    for (const mat of this.streetLampMeshes) {
      mat.emissiveIntensity = lampGlow;
    }
  }

  // --- Collision ---

  private isBlocked(x: number, z: number, radius = 0.55): boolean {
    if (this.isInsideHouse) {
      return (
        x < HOUSE_INTERIOR_BOUNDS.minX ||
        x > HOUSE_INTERIOR_BOUNDS.maxX ||
        z < HOUSE_INTERIOR_BOUNDS.minZ ||
        z > HOUSE_INTERIOR_BOUNDS.maxZ
      );
    }
    if (this.currentShopBuilding) {
      return (
        x < SHOP_INTERIOR_BOUNDS.minX ||
        x > SHOP_INTERIOR_BOUNDS.maxX ||
        z < SHOP_INTERIOR_BOUNDS.minZ ||
        z > SHOP_INTERIOR_BOUNDS.maxZ
      );
    }
    // Expanded world bounds covering procedural Viana, Talatona, Cazenga, Camama, Benfica, and Ilha de Luanda
    if (x > 192 || z < -118 || z > 126 || x < -108) return true;

    // Ocean barrier between Marginal (-63) and Ilha (-84), except on the Bridge (z between 4.5 and 11.5)
    if (x < -62.5 && x > -84.5) {
      if (z < 4.5 || z > 11.5) return true;
    }

    for (const c of this.colliders) {
      if (
        x + radius > c.minX &&
        x - radius < c.maxX &&
        z + radius > c.minZ &&
        z - radius < c.maxZ
      ) {
        return true;
      }
    }

    // Solid collision with traffic cars & police cruisers so cars never pass through the player
    for (const car of this.trafficCars) {
      const dx = x - car.group.position.x;
      const dz = z - car.group.position.z;
      if (Math.hypot(dx, dz) < radius + 2.1) {
        return true;
      }
    }
    for (const pc of this.policeCars) {
      const dx = x - pc.group.position.x;
      const dz = z - pc.group.position.z;
      if (Math.hypot(dx, dz) < radius + 2.1) {
        return true;
      }
    }
    return false;
  }

  // --- Main Loop ---

  private tick = () => {
    if (this.disposed) return;

    const dt = Math.min(this.clock.getDelta(), 0.1);
    const elapsed = this.clock.getElapsedTime();

    this.trafficLights.update(elapsed);
    this.updateRain(dt);
    this.updateVehicleSmoke(dt);
    this.updateNPCs(dt);
    this.updateTraffic(dt);
    this.updatePolice(dt, elapsed);
    this.updateBullets(dt);

    // Subtle entrance ring rotation
    for (const m of this.entranceMarkers) {
      m.rotation.z = elapsed * 0.8;
    }

    if (this.mode === 'menu') {
      // Scenic orbital camera over Luanda Bay & Skyline
      const angle = elapsed * 0.08;
      this.camera.position.set(
        -15 + Math.cos(angle) * 68,
        28 + Math.sin(elapsed * 0.25) * 3,
        Math.sin(angle) * 68
      );
      this.camera.lookAt(-12, 6, -6);
    } else if (!this.paused) {
      if (this.isDriving && this.vehicleGroup && this.activeVehicleSpec) {
        this.updateDriving(dt);
      } else {
        this.updateWalking(dt);
      }
      this.updateThirdPersonCamera(dt);
      this.checkProximity(elapsed);
    }

    this.renderer.render(this.scene, this.camera);

    if (this.isSoftwareGl) {
      this.afterDraw(this.tick);
    } else {
      this.frameId = requestAnimationFrame(this.tick);
    }
  };

  private afterDraw(cb: () => void) {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.disposed) return;
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private updateWalking(dt: number) {
    let inputX = this.touchMove.x;
    let inputY = this.touchMove.y;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) inputY += 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) inputY -= 1;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) inputX -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) inputX += 1;

    const len = Math.hypot(inputX, inputY);
    const isMoving = len > 0.05;
    const isSprinting = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') || this.touchMove.sprint;
    // Responsive walking (5.0 m/s) and fast sprinting (9.5 m/s)
    const speed = isSprinting ? 9.5 : 5.0;

    if (isMoving) {
      const nx = inputX / len;
      const ny = inputY / len;

      // Move relative to camera yaw
      const sinY = Math.sin(this.cameraYaw);
      const cosY = Math.cos(this.cameraYaw);
      const moveX = -sinY * ny + cosY * nx;
      const moveZ = -cosY * ny - sinY * nx;

      const nextX = this.playerPos.x + moveX * speed * dt;
      const nextZ = this.playerPos.z + moveZ * speed * dt;

      if (!this.isBlocked(nextX, this.playerPos.z)) {
        this.playerPos.x = nextX;
      }
      if (!this.isBlocked(this.playerPos.x, nextZ)) {
        this.playerPos.z = nextZ;
      }

      const targetYaw = Math.atan2(moveX, moveZ);
      let diff = targetYaw - this.playerYaw;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.playerYaw += diff * Math.min(1, dt * 10);

      // Automatically follow behind character when turning (if user isn't dragging mouse)
      if (!this.isDraggingCamera && Math.abs(inputX) > 0.1) {
        const desiredCamYaw = this.playerYaw + Math.PI;
        let camDiff = desiredCamYaw - this.cameraYaw;
        while (camDiff > Math.PI) camDiff -= Math.PI * 2;
        while (camDiff < -Math.PI) camDiff += Math.PI * 2;
        this.cameraYaw += camDiff * Math.min(1, dt * 2.8);
      }

      this.walkCycle += dt * (isSprinting ? 11.2 : 7.0);
    }

    // Keep feet grounded on y = 0; apply subtle hip/torso bounce instead of floating the whole character
    this.playerGroup.position.set(this.playerPos.x, 0, this.playerPos.z);
    this.playerGroup.rotation.y = this.playerYaw;

    // Realistic human gait: thigh swing, natural backward knee bend, opposite arm swing, elbow bend, and torso twist
    const phase = this.walkCycle;
    const strideAmp = isSprinting ? 0.68 : 0.42;
    const armAmp = isSprinting ? 0.62 : 0.32;

    const leftThighTarget = isMoving ? Math.sin(phase) * strideAmp : 0;
    const rightThighTarget = isMoving ? -Math.sin(phase) * strideAmp : 0;

    // Knee bends backward (positive X) when the leg lifts/swings forward
    const leftKneeTarget = isMoving ? Math.max(0, Math.cos(phase)) * (isSprinting ? 1.05 : 0.62) : 0;
    const rightKneeTarget = isMoving ? Math.max(0, -Math.cos(phase)) * (isSprinting ? 1.05 : 0.62) : 0;

    const leftArmTarget = isMoving ? -Math.sin(phase) * armAmp : 0;
    const rightArmTarget = isMoving ? Math.sin(phase) * armAmp : 0;

    // Natural slight elbow bend (more pronounced when sprinting)
    const leftElbowTarget = isMoving ? (isSprinting ? -0.95 : -0.28 - Math.max(0, Math.sin(phase)) * 0.22) : -0.08;
    const rightElbowTarget = isMoving ? (isSprinting ? -0.95 : -0.28 - Math.max(0, -Math.sin(phase)) * 0.22) : -0.08;

    const dampSpeed = 14;
    if (this.playerParts.leftLeg) {
      this.playerParts.leftLeg.rotation.x = THREE.MathUtils.damp(this.playerParts.leftLeg.rotation.x, leftThighTarget, dampSpeed, dt);
    }
    if (this.playerParts.rightLeg) {
      this.playerParts.rightLeg.rotation.x = THREE.MathUtils.damp(this.playerParts.rightLeg.rotation.x, rightThighTarget, dampSpeed, dt);
    }
    if (this.playerParts.leftKnee) {
      this.playerParts.leftKnee.rotation.x = THREE.MathUtils.damp(this.playerParts.leftKnee.rotation.x, leftKneeTarget, dampSpeed, dt);
    }
    if (this.playerParts.rightKnee) {
      this.playerParts.rightKnee.rotation.x = THREE.MathUtils.damp(this.playerParts.rightKnee.rotation.x, rightKneeTarget, dampSpeed, dt);
    }
    if (this.playerParts.leftArm) {
      this.playerParts.leftArm.rotation.x = THREE.MathUtils.damp(this.playerParts.leftArm.rotation.x, leftArmTarget, dampSpeed, dt);
    }
    if (this.playerParts.rightArm) {
      this.playerParts.rightArm.rotation.x = THREE.MathUtils.damp(this.playerParts.rightArm.rotation.x, rightArmTarget, dampSpeed, dt);
    }
    if (this.playerParts.leftElbow) {
      this.playerParts.leftElbow.rotation.x = THREE.MathUtils.damp(this.playerParts.leftElbow.rotation.x, leftElbowTarget, dampSpeed, dt);
    }
    if (this.playerParts.rightElbow) {
      this.playerParts.rightElbow.rotation.x = THREE.MathUtils.damp(this.playerParts.rightElbow.rotation.x, rightElbowTarget, dampSpeed, dt);
    }
    if (this.playerParts.torsoGroup) {
      const targetLean = isMoving ? (isSprinting ? 0.16 : 0.05) : 0;
      const targetTwist = isMoving ? Math.sin(phase) * (isSprinting ? 0.12 : 0.06) : 0;
      const torsoBob = isMoving ? Math.abs(Math.sin(phase)) * (isSprinting ? 0.04 : 0.02) : 0;
      this.playerParts.torsoGroup.rotation.x = THREE.MathUtils.damp(this.playerParts.torsoGroup.rotation.x, targetLean, 10, dt);
      this.playerParts.torsoGroup.rotation.y = THREE.MathUtils.damp(this.playerParts.torsoGroup.rotation.y, targetTwist, 10, dt);
      this.playerParts.torsoGroup.position.y = THREE.MathUtils.damp(this.playerParts.torsoGroup.position.y, 0.88 + torsoBob, 14, dt);
    }
  }

  private updateDriving(dt: number) {
    if (!this.vehicleGroup || !this.activeVehicleSpec) return;

    let throttle = this.touchMove.y;
    let steer = -this.touchMove.x;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) throttle += 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) throttle -= 1;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) steer += 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) steer -= 1;

    if (this.vehicleCollisionCooldown > 0) {
      this.vehicleCollisionCooldown = Math.max(0, this.vehicleCollisionCooldown - dt);
    }

    const hasFuel = this.vehicleFuel > 0.2;
    const isRain = this.weather === 'chuva';
    // Vehicle damage progressively limits max speed & acceleration
    const healthFactor = 0.3 + 0.7 * (this.vehicleHealth / 100);
    const maxSpeed = hasFuel
      ? this.activeVehicleSpec.maxSpeed * (isRain ? 0.82 : 1.0) * healthFactor
      : 4;
    // Wet roads reduce braking & acceleration grip
    const accelDamp = (isRain ? 1.25 : 2.2) * healthFactor;
    const brakeDamp = isRain ? 1.45 : 2.8;

    if (throttle > 0.05) {
      this.vehicleSpeed = THREE.MathUtils.damp(this.vehicleSpeed, maxSpeed, accelDamp, dt);
    } else if (throttle < -0.05) {
      this.vehicleSpeed = THREE.MathUtils.damp(this.vehicleSpeed, -maxSpeed * 0.35, brakeDamp, dt);
    } else {
      this.vehicleSpeed = THREE.MathUtils.damp(this.vehicleSpeed, 0, brakeDamp, dt);
    }

    // Smooth progressive steering wheel / handlebar angle
    const clampedSteer = Math.max(-1, Math.min(1, steer));
    const isMota = this.activeVehicleSpec.type === 'mota';
    this.vehicleSteerAngle = THREE.MathUtils.damp(
      this.vehicleSteerAngle,
      clampedSteer,
      isMota ? 9.5 : 7.5,
      dt
    );

    const absSpeed = Math.abs(this.vehicleSpeed);
    if (absSpeed > 0.25) {
      const turnDir = this.vehicleSpeed >= 0 ? 1 : -1;
      // Realistic speed-proportional turning: smooth ramp at low speed, stable progressive curve at high speed
      const lowSpeedRamp = Math.min(1, absSpeed / 4.5);
      const highSpeedStability = 1 / (1 + absSpeed * 0.028);
      const baseTurnRate = (isMota ? 2.55 : 2.05) * (isRain ? 0.8 : 1.0);
      this.vehicleYaw +=
        this.vehicleSteerAngle * baseTurnRate * lowSpeedRamp * highSpeedStability * dt * turnDir;
      if (hasFuel) {
        this.vehicleFuel = Math.max(0, this.vehicleFuel - absSpeed * dt * 0.06);
      }
    }

    const vx = Math.sin(this.vehicleYaw) * this.vehicleSpeed * dt;
    const vz = Math.cos(this.vehicleYaw) * this.vehicleSpeed * dt;
    const impactSpeed = Math.abs(this.vehicleSpeed);
    let collided = false;

    if (!this.isBlocked(this.vehiclePos.x + vx, this.vehiclePos.z, 1.4)) {
      this.vehiclePos.x += vx;
    } else {
      collided = true;
      this.vehicleSpeed *= -0.25;
    }
    if (!this.isBlocked(this.vehiclePos.x, this.vehiclePos.z + vz, 1.4)) {
      this.vehiclePos.z += vz;
    } else {
      collided = true;
      this.vehicleSpeed *= -0.25;
    }

    if (collided && impactSpeed > 4.5 && this.vehicleCollisionCooldown <= 0) {
      this.vehicleCollisionCooldown = 0.6;
      const dmg = Math.min(34, Math.round(impactSpeed * 1.6));
      this.vehicleHealth = Math.max(0, this.vehicleHealth - dmg);
      this.applyVehicleVisualDamage();
      if (this.vehicleHealth <= 0) {
        this.triggerVehicleExplosion();
        return;
      }
    }

    // Check if the player's car runs over any pedestrian NPC
    if (Math.abs(this.vehicleSpeed) > 3.5) {
      for (const npc of this.npcs) {
        if (npc.isDead) continue;
        const dNpc = Math.hypot(
          this.vehiclePos.x - npc.group.position.x,
          this.vehiclePos.z - npc.group.position.z
        );
        if (dNpc < 2.2) {
          npc.isDead = true;
          npc.respawnTimer = 25;
          npc.group.rotation.x = Math.PI / 2;
          npc.group.position.y = 0.22;
          this.callbacks.onIllegalBehavior('Atropelamento fatal! A pessoa morreu.');
        }
      }
    }

    // Realistic motorcycle lean into turns & subtle car suspension body roll
    const speedRatio = Math.min(1, absSpeed / 14);
    const leanAngle = isMota
      ? -this.vehicleSteerAngle * speedRatio * 0.42
      : this.vehicleSteerAngle * speedRatio * 0.07;

    this.vehicleGroup.position.copy(this.vehiclePos);
    this.vehicleGroup.rotation.y = this.vehicleYaw;
    this.vehicleGroup.rotation.z = THREE.MathUtils.damp(this.vehicleGroup.rotation.z, leanAngle, 9, dt);
    this.playerPos.copy(this.vehiclePos);

    // Seat the player visibly on the motorcycle when riding a mota
    if (isMota) {
      this.playerGroup.visible = true;
      const seatOffsetBack = -0.22;
      this.playerGroup.position.set(
        this.vehiclePos.x + Math.sin(this.vehicleYaw) * seatOffsetBack,
        0.42,
        this.vehiclePos.z + Math.cos(this.vehicleYaw) * seatOffsetBack
      );
      this.playerGroup.rotation.set(0, this.vehicleYaw, this.vehicleGroup.rotation.z);
      if (this.playerParts.torsoGroup) this.playerParts.torsoGroup.rotation.x = 0.28;
      if (this.playerParts.leftArm) this.playerParts.leftArm.rotation.x = -1.05;
      if (this.playerParts.rightArm) this.playerParts.rightArm.rotation.x = -1.05;
      if (this.playerParts.leftElbow) this.playerParts.leftElbow.rotation.x = -0.35;
      if (this.playerParts.rightElbow) this.playerParts.rightElbow.rotation.x = -0.35;
      if (this.playerParts.leftLeg) this.playerParts.leftLeg.rotation.x = -0.75;
      if (this.playerParts.rightLeg) this.playerParts.rightLeg.rotation.x = -0.75;
      if (this.playerParts.leftKnee) this.playerParts.leftKnee.rotation.x = 1.25;
      if (this.playerParts.rightKnee) this.playerParts.rightKnee.rotation.x = 1.25;
    }

    // Smoothly align camera behind vehicle when not dragging
    if (!this.isDraggingCamera && absSpeed > 0.8) {
      const desiredYaw = this.vehicleYaw + Math.PI;
      let diff = desiredYaw - this.cameraYaw;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.cameraYaw += diff * Math.min(1, dt * 5.5);
    }

    const now = performance.now();
    if (now - this.lastDriveEmitTime > 120) {
      this.lastDriveEmitTime = now;
      this.callbacks.onDrivingStateChange(
        true,
        Math.round(Math.abs(this.vehicleSpeed) * 3.6),
        this.vehicleFuel,
        this.vehicleHealth
      );
    }
  }

  private updateThirdPersonCamera(dt: number) {
    // Gently bob 3D boats on Baía de Luanda water
    const nowSec = performance.now() * 0.001;
    for (const b of this.floatingBoats) {
      b.group.position.y = b.baseY + Math.sin(nowSec * 1.4 + b.phase) * 0.14;
      b.group.rotation.z = Math.sin(nowSec * 1.1 + b.phase) * 0.04;
      b.group.position.z = b.baseZ + Math.sin(nowSec * 0.25 + b.phase) * 2.5;
    }

    // First-person seated passenger camera inside Yango / Candongueiro Taxi
    if (this.activeTaxiRide) {
      this.activeTaxiRide.timer -= dt;
      const roadVib = Math.sin(nowSec * 18) * 0.015;
      this.camera.position.set(
        TAXI_PASSENGER_CAM_POS.x,
        TAXI_PASSENGER_CAM_POS.y + roadVib,
        TAXI_PASSENGER_CAM_POS.z
      );
      this.camera.lookAt(TAXI_PASSENGER_LOOK_AT);
      if (this.activeTaxiRide.timer <= 0) {
        const dest = this.activeTaxiRide;
        this.activeTaxiRide = null;
        this.playerPos.set(dest.destX, 0, dest.destZ);
        this.playerGroup.position.copy(this.playerPos);
        this.callbacks.onTaxiRideComplete(dest.destName);
      }
      return;
    }

    const target = this.isDriving ? this.vehiclePos : this.playerPos;
    const dist = this.isDriving ? this.cameraDistance + 2.8 : this.cameraDistance;
    const heightOffset = this.isDriving ? 2.1 : 1.7;

    const camX = target.x + Math.sin(this.cameraYaw) * Math.cos(this.cameraPitch) * dist;
    const camY = Math.max(1.2, target.y + heightOffset + Math.sin(this.cameraPitch) * dist);
    const camZ = target.z + Math.cos(this.cameraYaw) * Math.cos(this.cameraPitch) * dist;

    _vec3A.set(camX, camY, camZ);
    this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, _vec3A.x, 10, dt);
    this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, _vec3A.y, 10, dt);
    this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, _vec3A.z, 10, dt);

    _vec3B.set(target.x, target.y + heightOffset, target.z);
    this.camera.lookAt(_vec3B);
  }

  private updateNPCs(dt: number) {
    updateNpcRoutines(this.npcs, dt, this.timeOfDay, this.playerPos);
  }

  private updateTraffic(dt: number) {
    for (const car of this.trafficCars) {
      // Physical separation: never let a car overlap the player's body
      const dxToPlayer = this.playerPos.x - car.group.position.x;
      const dzToPlayer = this.playerPos.z - car.group.position.z;
      const distToPlayer = Math.hypot(dxToPlayer, dzToPlayer);

      if (!this.isDriving && distToPlayer < 3.0 && distToPlayer > 0.001) {
        const push = (3.0 - distToPlayer);
        const px = this.playerPos.x + (dxToPlayer / distToPlayer) * push;
        const pz = this.playerPos.z + (dzToPlayer / distToPlayer) * push;
        if (!this.isBlocked(px, pz, 0.45)) {
          this.playerPos.x = px;
          this.playerPos.z = pz;
        }
        continue; // Car stops immediately
      }

      // Brake and stop if the player is ahead of the car
      let blockedByPlayer = false;
      if (distToPlayer < 9.5) {
        if (car.axis === 'z' && Math.abs(dxToPlayer) < 3.2 && Math.sign(dzToPlayer) === car.dir) {
          blockedByPlayer = true;
        } else if (car.axis === 'x' && Math.abs(dzToPlayer) < 3.2 && Math.sign(dxToPlayer) === car.dir) {
          blockedByPlayer = true;
        }
      }
      if (blockedByPlayer) continue;

      // Obey smart traffic lights at Talatona & Viana intersections
      if (this.trafficLights.shouldStop(car.group.position.x, car.group.position.z, car.axis, car.dir)) {
        continue;
      }

      if (car.axis === 'z') {
        car.group.position.z += car.dir * car.speed * dt;
        if (car.dir === 1 && car.group.position.z > car.maxLimit) car.group.position.z = car.minLimit;
        if (car.dir === -1 && car.group.position.z < car.minLimit) car.group.position.z = car.maxLimit;
      } else {
        car.group.position.x += car.dir * car.speed * dt;
        if (car.dir === 1 && car.group.position.x > car.maxLimit) car.group.position.x = car.minLimit;
        if (car.dir === -1 && car.group.position.x < car.minLimit) car.group.position.x = car.maxLimit;
      }
    }
  }

  private updatePolice(dt: number, elapsed: number) {
    if (this.arrestCooldown > 0) {
      this.arrestCooldown = Math.max(0, this.arrestCooldown - dt);
    }
    if (this.illegalDetectCooldown > 0) {
      this.illegalDetectCooldown = Math.max(0, this.illegalDetectCooldown - dt);
    }

    const isChasing = this.wantedLevel > 0 && this.mode === 'playing' && !this.paused;
    const flashFreq = isChasing ? 18 : 6;
    const flash = Math.sin(elapsed * flashFreq) > 0;
    const playerSpeedKmh = this.isDriving ? Math.abs(this.vehicleSpeed) * 3.6 : 0;

    for (const pc of this.policeCars) {
      pc.redLight.emissiveIntensity = isChasing ? (flash ? 2.8 : 0.2) : (flash ? 1.1 : 0.15);
      pc.blueLight.emissiveIntensity = isChasing ? (flash ? 0.2 : 2.8) : (flash ? 0.15 : 1.1);

      const dxPlayer = this.playerPos.x - pc.group.position.x;
      const dzPlayer = this.playerPos.z - pc.group.position.z;
      const distPlayer = Math.hypot(dxPlayer, dzPlayer);

      // Dynamic illegal behavior detection when patrolling near the player
      if (!isChasing && this.mode === 'playing' && !this.paused && this.illegalDetectCooldown <= 0) {
        if (this.isDriving && playerSpeedKmh > 85 && distPlayer < 24) {
          this.illegalDetectCooldown = 6.0;
          this.callbacks.onIllegalBehavior(
            `Excesso de velocidade (${Math.round(playerSpeedKmh)} km/h) detetado pela patrulha de ${pc.districtLabel}!`
          );
        } else if (!this.isDriving && this.equippedWeaponId && distPlayer < 15) {
          this.illegalDetectCooldown = 6.0;
          this.callbacks.onIllegalBehavior(
            `Porte ostensivo de arma detetado pela patrulha de ${pc.districtLabel}!`
          );
        }
      }

      if (isChasing) {
        if (distPlayer < 4.2 && this.arrestCooldown <= 0) {
          this.arrestCooldown = 4.0;
          this.callbacks.onPoliceArrest();
        } else if (distPlayer > 0.5) {
          const chaseSpeed = 11.5 + this.wantedLevel * 2.5;
          const nx = pc.group.position.x + (dxPlayer / distPlayer) * chaseSpeed * dt;
          const nz = pc.group.position.z + (dzPlayer / distPlayer) * chaseSpeed * dt;
          if (!this.isBlocked(nx, nz, 1.4)) {
            pc.group.position.x = nx;
            pc.group.position.z = nz;
          }
          pc.group.rotation.y = Math.atan2(dxPlayer, dzPlayer);
        }
      } else {
        // Avenue patrol along waypoints
        const target = pc.waypoints[pc.currentWaypoint];
        const dx = target.x - pc.group.position.x;
        const dz = target.z - pc.group.position.z;
        const dist = Math.hypot(dx, dz);
        if (dist < 2.2) {
          pc.currentWaypoint = (pc.currentWaypoint + 1) % pc.waypoints.length;
        } else {
          const axis: 'x' | 'z' = Math.abs(dx) > Math.abs(dz) ? 'x' : 'z';
          const dir: 1 | -1 = axis === 'x' ? (dx >= 0 ? 1 : -1) : (dz >= 0 ? 1 : -1);
          if (!this.trafficLights.shouldStop(pc.group.position.x, pc.group.position.z, axis, dir)) {
            const patrolSpeed = 9.0;
            pc.group.position.x += (dx / dist) * patrolSpeed * dt;
            pc.group.position.z += (dz / dist) * patrolSpeed * dt;
            pc.group.rotation.y = Math.atan2(dx, dz);
          }
        }
      }
    }
  }

  private updateBullets(dt: number) {
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.mesh.position.addScaledVector(b.vel, dt);
      b.life -= dt;
      if (b.life <= 0 || this.isBlocked(b.mesh.position.x, b.mesh.position.z, 0.2)) {
        this.scene.remove(b.mesh);
        b.mesh.geometry.dispose();
        (b.mesh.material as THREE.Material).dispose();
        this.bullets.splice(i, 1);
      }
    }
  }

  private checkProximity(elapsed: number) {
    // Keep floating speech bubble anchored right above player's head
    if (this.playerSpeechSprite) {
      this.playerSpeechSprite.position.set(this.playerPos.x, 2.45, this.playerPos.z);
    }

    // Check counter proximity when inside a 3D store
    if (this.currentShopBuilding) {
      const distCounter = Math.hypot(
        this.playerPos.x - SHOP_COUNTER_POS.x,
        this.playerPos.z - SHOP_COUNTER_POS.z
      );
      const nearCounter = distCounter < 3.8;
      if (nearCounter !== this.lastNearShopCounter) {
        this.lastNearShopCounter = nearCounter;
        this.callbacks.onShopStateChange(this.currentShopBuilding, nearCounter);
      }
      return;
    }

    // Check building entrances
    let found: WorldBuilding | null = null;
    if (!this.isDriving && !this.isInsideHouse) {
      for (const b of WORLD_BUILDINGS) {
        if (b.type === 'decor' || b.entranceX === undefined || b.entranceZ === undefined) continue;
        const d = Math.hypot(this.playerPos.x - b.entranceX, this.playerPos.z - b.entranceZ);
        if (d < 4.5) {
          found = b;
          break;
        }
      }
      if (!found) {
        for (const h of this.enterableHouses) {
          if (h.entranceX === undefined || h.entranceZ === undefined) continue;
          const d = Math.hypot(this.playerPos.x - h.entranceX, this.playerPos.z - h.entranceZ);
          if (d < 5.2) {
            found = h;
            break;
          }
        }
      }
    }

    const foundId = found ? found.id : null;
    if (foundId !== this.lastNearbyBuildingId) {
      this.lastNearbyBuildingId = foundId;
      this.callbacks.onNearbyBuildingChange(found);
    }

    // Check nearby owned vehicle OR any nearby traffic car on the street
    let canEnter = false;
    if (!this.isDriving) {
      if (this.vehicleGroup && this.playerPos.distanceTo(this.vehiclePos) < 6.0) {
        canEnter = true;
      } else {
        for (const tc of this.trafficCars) {
          if (this.playerPos.distanceTo(tc.group.position) < 6.0) {
            canEnter = true;
            break;
          }
        }
      }
    }
    if (canEnter !== this.lastCanEnterVehicle) {
      this.lastCanEnterVehicle = canEnter;
      this.callbacks.onNearbyVehicleChange(canEnter);
    }

    // Emit player position for minimap & district updates (every ~200ms)
    if (elapsed - this.lastPosEmitTime > 0.2) {
      this.lastPosEmitTime = elapsed;
      const district = getDistrictAtPosition(this.playerPos.x, this.playerPos.z);
      this.callbacks.onPositionUpdate(
        this.playerPos.x,
        this.playerPos.z,
        district,
        this.isDriving ? this.vehicleYaw : this.playerYaw
      );
    }
  }

  // --- Input & Window Listeners ---

  private onKeyDown = (e: KeyboardEvent) => {
    if (this.mode !== 'playing' || this.paused) return;
    if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

    this.keys.add(e.code);
    if (e.code === 'KeyE') {
      this.callbacks.onInteractPressed();
    } else if (e.code === 'KeyF') {
      this.callbacks.onToggleVehiclePressed();
    } else if (e.code === 'Space') {
      e.preventDefault();
      this.fireWeapon();
    }
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.code);
  };

  private onPointerDown = (e: PointerEvent) => {
    if (this.mode !== 'playing' || this.paused) return;
    if (e.target !== this.renderer.domElement) return;
    this.isDraggingCamera = true;
    this.lastPointerX = e.clientX;
    this.lastPointerY = e.clientY;
  };

  private onPointerMove = (e: PointerEvent) => {
    if (!this.isDraggingCamera) return;
    const dx = e.clientX - this.lastPointerX;
    const dy = e.clientY - this.lastPointerY;
    this.lastPointerX = e.clientX;
    this.lastPointerY = e.clientY;

    this.cameraYaw -= dx * 0.005 * this.mouseSensitivity;
    this.cameraPitch = THREE.MathUtils.clamp(
      this.cameraPitch + dy * 0.004 * this.mouseSensitivity,
      0.1,
      1.15
    );
  };

  private onPointerUp = () => {
    this.isDraggingCamera = false;
  };

  private onWheel = (e: WheelEvent) => {
    if (this.mode !== 'playing' || this.paused) return;
    if (e.target !== this.renderer.domElement) return;
    this.cameraDistance = THREE.MathUtils.clamp(this.cameraDistance + e.deltaY * 0.005, 5, 16);
  };

  private onResize = () => {
    if (this.disposed) return;
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  private bindEvents() {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('pointerdown', this.onPointerDown);
    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
    window.addEventListener('wheel', this.onWheel, { passive: true });
    window.addEventListener('resize', this.onResize);
  }

  private unbindEvents() {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('pointerdown', this.onPointerDown);
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    window.removeEventListener('wheel', this.onWheel);
    window.removeEventListener('resize', this.onResize);
  }
}
