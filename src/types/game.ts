export type Gender = 'homem' | 'mulher';

export type WeatherType = 'limpo' | 'nublado' | 'chuva';

export type HairStyle = 'curto' | 'trancas' | 'afro' | 'medio';

export interface CharacterAppearance {
  name: string;
  gender: Gender;
  skinTone: string;
  hairStyle: HairStyle;
  hairColor: string;
  shirtColor: string;
  pantsColor: string;
  shoesColor: string;
}

export interface PlayerNeeds {
  hunger: number;   // 0 - 100 (100 = full)
  thirst: number;   // 0 - 100 (100 = hydrated)
  energy: number;   // 0 - 100 (100 = rested)
  hygiene: number;  // 0 - 100 (100 = clean)
}

export interface GameTime {
  day: number;
  month: number;
  year: number;
  hour: number;     // 0 - 23
  minute: number;   // 0 - 59
}

export type DistrictName =
  | 'Marginal de Luanda'
  | 'Ilha de Luanda'
  | 'Ingombota'
  | 'Maianga'
  | 'Talatona'
  | 'Kilamba'
  | 'Viana'
  | 'Cazenga'
  | 'Camama'
  | 'Benfica';

export type BuildingType =
  | 'home'
  | 'school'
  | 'job_center'
  | 'supermarket'
  | 'restaurant'
  | 'dealership'
  | 'gas_station'
  | 'real_estate'
  | 'hospital'
  | 'gun_shop'
  | 'police_station'
  | 'decor';

export interface WeaponCatalogItem {
  id: string;
  name: string;
  price: number; // Kz
  damage: number;
  fireRateMs: number;
  color: string;
  length: number;
  description: string;
}

export interface WorldBuilding {
  id: string;
  name: string;
  district: DistrictName;
  type: BuildingType;
  x: number;
  z: number;
  width: number;
  depth: number;
  height: number;
  color: string;
  accentColor?: string;
  entranceX?: number;
  entranceZ?: number;
  description?: string;
}

export interface Profession {
  id: string;
  title: string;
  category: string;
  salaryPerShift: number; // Kz
  requiredEducation: number; // 0 = Básico, 1 = Ensino Médio, 2 = Licenciatura, 3 = Especialização
  shiftHours: number;
  energyCost: number;
  description: string;
  tasks: string[];
}

export interface InventoryItem {
  id: string;
  name: string;
  category: 'comida' | 'bebida' | 'higiene' | 'educacao';
  price: number; // Kz
  hungerRestore?: number;
  thirstRestore?: number;
  energyRestore?: number;
  hygieneRestore?: number;
  quantity: number;
}

export interface VehicleCatalogItem {
  id: string;
  name: string;
  type: 'mota' | 'carro' | 'candongueiro' | 'suv';
  price: number; // Kz
  maxSpeed: number;
  color: string;
  fuelCapacity: number;
  description: string;
}

export interface PropertyCatalogItem {
  id: string;
  name: string;
  district: DistrictName;
  price: number; // Kz
  rentPerWeek: number; // Kz
  energyBonus: number;
  description: string;
}

export interface Mission {
  id: string;
  title: string;
  description: string;
  rewardKz: number;
  completed: boolean;
  progress: number;
  target: number;
  type: 'explore' | 'study' | 'work' | 'buy_food' | 'buy_vehicle' | 'buy_house' | 'pay_rent';
}

export interface GameSettings {
  mouseSensitivity: number;
  showTouchControls: boolean;
  timeScale: number; // 1 = normal, 2 = fast
  soundEnabled: boolean;
}

export interface PlayerState {
  appearance: CharacterAppearance;
  money: number; // Kwanzas (Kz)
  needs: PlayerNeeds;
  educationLevel: number; // 0 to 3
  enrolledInSchool: boolean;
  classesAttended: number;
  certificates: string[];
  jobId: string | null;
  shiftsWorked: number;
  inventory: InventoryItem[];
  ownedVehicles: string[];
  activeVehicleId: string | null;
  vehicleFuel: number; // 0 - 100
  ownedWeapons: string[];
  equippedWeaponId: string | null;
  ammo: number;
  wantedLevel: number; // 0 to 3 stars
  ownedProperties: string[];
  currentHomeId: string;
  rentDue: number;
  lastRentDay: number;
  position: { x: number; z: number };
  missions: Mission[];
  visitedDistricts: DistrictName[];
}

export interface SaveGameData {
  version: number;
  savedAt: string;
  player: PlayerState;
  time: GameTime;
}

export type ActiveModal =
  | null
  | 'map'
  | 'phone'
  | 'inventory'
  | 'missions'
  | 'profile'
  | 'settings'
  | 'building';
