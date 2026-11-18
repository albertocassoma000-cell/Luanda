/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { LuandaEngine } from './engine/LuandaEngine';
import { MarioMusicPlayer } from './engine/MarioMusicPlayer';
import {
  ActiveModal,
  CharacterAppearance,
  DistrictName,
  GameSettings,
  GameTime,
  PlayerState,
  Profession,
  PropertyCatalogItem,
  SaveGameData,
  VehicleCatalogItem,
  WeaponCatalogItem,
  WeatherType,
  WorldBuilding,
} from './types/game';
import {
  EDUCATION_LEVELS,
  formatKwanzas,
  INITIAL_MISSIONS,
  SHOP_ITEMS,
} from './data/luandaWorld';
import { MainMenu } from './components/MainMenu';
import { CharacterCreator } from './components/CharacterCreator';
import { GameHUD } from './components/GameHUD';
import { BuildingModal } from './components/BuildingModal';
import { CityModals } from './components/CityModals';

const SAVE_KEY = 'luanda_life_sim_save_v1';

const DEFAULT_APPEARANCE: CharacterAppearance = {
  name: 'Kelson',
  gender: 'homem',
  skinTone: '#5c3a21',
  hairStyle: 'curto',
  hairColor: '#18181b',
  shirtColor: '#f59e0b',
  pantsColor: '#1e293b',
  shoesColor: '#18181b',
};

function createNewPlayer(appearance: CharacterAppearance): PlayerState {
  return {
    appearance,
    money: 25000,
    needs: {
      hunger: 88,
      thirst: 86,
      energy: 95,
      hygiene: 92,
    },
    educationLevel: 0,
    enrolledInSchool: false,
    classesAttended: 0,
    certificates: [],
    jobId: null,
    shiftsWorked: 0,
    inventory: [
      { ...SHOP_ITEMS[0], quantity: 2 },
      { ...SHOP_ITEMS[3], quantity: 1 },
    ],
    ownedVehicles: [],
    activeVehicleId: null,
    vehicleFuel: 100,
    ownedWeapons: [],
    equippedWeaponId: null,
    ammo: 0,
    wantedLevel: 0,
    ownedProperties: ['casa_maianga'],
    currentHomeId: 'casa_maianga',
    rentDue: 0,
    lastRentDay: 1,
    position: { x: -18, z: 8 },
    missions: INITIAL_MISSIONS.map((m) => ({ ...m })),
    visitedDistricts: ['Maianga'],
  };
}

function loadSavedGame(): SaveGameData | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SaveGameData;
    if (parsed && parsed.player && parsed.time) return parsed;
    return null;
  } catch {
    return null;
  }
}

export default function App() {
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<LuandaEngine | null>(null);
  const musicRef = useRef<MarioMusicPlayer | null>(null);
  const [musicPlaying, setMusicPlaying] = useState(false);

  useEffect(() => {
    const playerAudio = new MarioMusicPlayer();
    musicRef.current = playerAudio;
    return () => {
      playerAudio.dispose();
      musicRef.current = null;
    };
  }, []);

  const handleToggleMusic = useCallback(() => {
    if (!musicRef.current) return;
    const playing = musicRef.current.toggle();
    setMusicPlaying(playing);
  }, []);

  const [screen, setScreen] = useState<'menu' | 'creator' | 'playing'>('menu');

  useEffect(() => {
    if (!musicRef.current) return;
    if (screen === 'playing') {
      musicRef.current.start();
      setMusicPlaying(true);
    } else {
      musicRef.current.stop();
      setMusicPlaying(false);
    }
  }, [screen]);
  const [savedGame, setSavedGame] = useState<SaveGameData | null>(() => loadSavedGame());

  const [player, setPlayer] = useState<PlayerState>(() =>
    createNewPlayer(DEFAULT_APPEARANCE)
  );
  const [time, setTime] = useState<GameTime>({
    day: 1,
    month: 1,
    year: 2026,
    hour: 9,
    minute: 0,
  });
  const [district, setDistrict] = useState<DistrictName>('Maianga');

  const [nearbyBuilding, setNearbyBuilding] = useState<WorldBuilding | null>(null);
  const [canEnterVehicle, setCanEnterVehicle] = useState(false);
  const [isDriving, setIsDriving] = useState(false);
  const [speedKmh, setSpeedKmh] = useState(0);
  const [vehicleHealth, setVehicleHealth] = useState(100);
  const [deathReason, setDeathReason] = useState<string | null>(null);
  const [insideHouseName, setInsideHouseName] = useState<string | null>(null);
  const insideHouseRef = useRef<string | null>(null);
  useEffect(() => {
    insideHouseRef.current = insideHouseName;
  }, [insideHouseName]);

  const [insideShop, setInsideShop] = useState<WorldBuilding | null>(null);
  const [nearShopCounter, setNearShopCounter] = useState(false);
  const [managerTalkedInShop, setManagerTalkedInShop] = useState(false);
  const [managerReplying, setManagerReplying] = useState(false);
  const insideShopRef = useRef<WorldBuilding | null>(null);
  useEffect(() => {
    insideShopRef.current = insideShop;
  }, [insideShop]);

  const isPhysicalStore = (b: WorldBuilding) =>
    b.type === 'supermarket' ||
    b.type === 'restaurant' ||
    b.type === 'dealership' ||
    b.type === 'gun_shop' ||
    b.type === 'real_estate' ||
    b.type === 'gas_station';

  const handleSpeakToManager = async (message: string) => {
    if (!insideShop || !message.trim() || managerReplying) return;
    const text = message.trim();
    engineRef.current?.setPlayerSpeechBubble(text);
    engineRef.current?.setManagerSpeechBubble('...');
    setManagerReplying(true);
    try {
      const res = await fetch('/api/manager-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeName: insideShop.name,
          storeType: insideShop.type,
          playerName: player.appearance.name,
          message: text,
          money: player.money,
        }),
      });
      const data = (await res.json()) as { reply?: string };
      engineRef.current?.setManagerSpeechBubble(
        data.reply || 'Com certeza! Pode escolher no balcão o que precisa.'
      );
      setManagerTalkedInShop(true);
    } catch {
      engineRef.current?.setManagerSpeechBubble('Pode escolher no balcão, estou aqui para ajudar!');
      setManagerTalkedInShop(true);
    } finally {
      setManagerReplying(false);
    }
  };
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [waypointId, setWaypointId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [weather, setWeather] = useState<WeatherType>('limpo');
  const [gmpQuotaExceeded, setGmpQuotaExceeded] = useState(false);

  useEffect(() => {
    const onQuota = () => setGmpQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', onQuota);
    return () => window.removeEventListener('gmp-quota-exceeded', onQuota);
  }, []);

  const [settings, setSettings] = useState<GameSettings>(() => ({
    mouseSensitivity: 1.0,
    showTouchControls: typeof window !== 'undefined' && 'ontouchstart' in window,
    timeScale: 1,
    soundEnabled: true,
  }));

  const nearbyBuildingRef = useRef<WorldBuilding | null>(null);
  nearbyBuildingRef.current = nearbyBuilding;

  const activeModalRef = useRef<ActiveModal>(null);
  activeModalRef.current = activeModal;

  const toastTimerRef = useRef<number | null>(null);
  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToastMessage(null), 3200);
  }, []);

  const progressMission = useCallback(
    (type: PlayerState['missions'][number]['type'], amount = 1) => {
      setPlayer((prev) => {
        let reward = 0;
        let completedTitle = '';
        const nextMissions = prev.missions.map((m) => {
          if (m.completed || m.type !== type) return m;
          const nextProg = m.progress + amount;
          if (nextProg >= m.target) {
            reward += m.rewardKz;
            completedTitle = m.title;
            return { ...m, progress: m.target, completed: true };
          }
          return { ...m, progress: nextProg };
        });
        if (reward > 0) {
          showToast(`Missão concluída: ${completedTitle} (+${formatKwanzas(reward)})`);
        }
        return {
          ...prev,
          money: prev.money + reward,
          missions: nextMissions,
        };
      });
    },
    [showToast]
  );

  // Mount Three.js Engine once
  useEffect(() => {
    if (!canvasRef.current) return;
    const engine = new LuandaEngine(canvasRef.current, DEFAULT_APPEARANCE, {
      onNearbyBuildingChange: (b) => setNearbyBuilding(b),
      onNearbyVehicleChange: (can) => setCanEnterVehicle(can),
      onDrivingStateChange: (driving, speed, fuel, health) => {
        setIsDriving(driving);
        setSpeedKmh(speed);
        setVehicleHealth(health);
        setPlayer((p) => ({ ...p, vehicleFuel: fuel }));
      },
      onPositionUpdate: (x, z, dist) => {
        setDistrict(dist);
        setPlayer((prev) => {
          const alreadyVisited = prev.visitedDistricts.includes(dist);
          const visitedDistricts = alreadyVisited
            ? prev.visitedDistricts
            : [...prev.visitedDistricts, dist];

          let reward = 0;
          let completedTitle = '';
          const missions = alreadyVisited
            ? prev.missions
            : prev.missions.map((m) => {
                if (m.completed || m.type !== 'explore') return m;
                const nextProg = visitedDistricts.length;
                if (nextProg >= m.target) {
                  reward += m.rewardKz;
                  completedTitle = m.title;
                  return { ...m, progress: m.target, completed: true };
                }
                return { ...m, progress: nextProg };
              });

          if (reward > 0) {
            showToast(`Missão concluída: ${completedTitle} (+${formatKwanzas(reward)})`);
          }

          return {
            ...prev,
            money: prev.money + reward,
            position: { x, z },
            visitedDistricts,
            missions,
          };
        });
      },
      onInteractPressed: () => {
        if (activeModalRef.current) return;
        if (insideShopRef.current) {
          engineRef.current?.exitShop();
          return;
        }
        if (insideHouseRef.current) {
          engineRef.current?.exitHouse();
          return;
        }
        if (nearbyBuildingRef.current) {
          if (nearbyBuildingRef.current.type === 'home') {
            engineRef.current?.enterHouse(nearbyBuildingRef.current.name);
          } else if (isPhysicalStore(nearbyBuildingRef.current)) {
            engineRef.current?.enterShop(nearbyBuildingRef.current);
          } else {
            setActiveModal('building');
          }
        }
      },
      onToggleVehiclePressed: () => {
        if (activeModalRef.current) return;
        engineRef.current?.toggleVehicle();
      },
      onWeaponFired: () => {
        setPlayer((p) => ({
          ...p,
          ammo: Math.max(0, p.ammo - 1),
          wantedLevel: Math.min(3, Math.max(1, p.wantedLevel + (Math.random() < 0.35 ? 1 : 0))),
        }));
      },
      onPoliceArrest: () => {
        setPlayer((p) => {
          const fine = Math.min(p.money, Math.max(5000, p.wantedLevel * 8000));
          return {
            ...p,
            money: p.money - fine,
            wantedLevel: 0,
          };
        });
        showToast('Intercetado pela Polícia Nacional! Multa aplicada e alerta limpo.');
      },
      onIllegalBehavior: (reason: string) => {
        setPlayer((p) => ({
          ...p,
          wantedLevel: Math.min(3, Math.max(1, p.wantedLevel + 1)),
        }));
        showToast(reason);
      },
      onPlayerDeath: (reason: string) => {
        setDeathReason(reason);
      },
      onInteriorStateChange: (inside: boolean, houseName: string | null) => {
        setInsideHouseName(inside ? houseName : null);
      },
      onShopStateChange: (shop: WorldBuilding | null, nearCounter: boolean) => {
        setInsideShop(shop);
        setNearShopCounter(nearCounter);
        if (!shop) {
          setManagerTalkedInShop(false);
        }
      },
      onTaxiRideComplete: (destName: string) => {
        showToast(`Chegaste a ${destName}! Obrigado por viajar.`);
      },
    });
    engineRef.current = engine;

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, [showToast]);

  // Sync engine mode & pause state
  useEffect(() => {
    const eng = engineRef.current;
    if (!eng) return;
    eng.setMode(screen === 'playing' ? 'playing' : 'menu');
    eng.setPaused(screen !== 'playing' || activeModal !== null);
  }, [screen, activeModal]);

  // Sync mouse sensitivity
  useEffect(() => {
    engineRef.current?.setMouseSensitivity(settings.mouseSensitivity);
  }, [settings.mouseSensitivity]);

  // Sync time of day lighting
  useEffect(() => {
    engineRef.current?.setTimeOfDay(time.hour + time.minute / 60);
  }, [time.hour, time.minute]);

  // Sync weapon & wanted level to 3D engine
  useEffect(() => {
    engineRef.current?.setWeaponState(
      player.equippedWeaponId,
      player.ammo,
      player.wantedLevel
    );
  }, [player.equippedWeaponId, player.ammo, player.wantedLevel]);

  // Sync weather to 3D engine & cycle weather dynamically every 45s while playing
  useEffect(() => {
    engineRef.current?.setWeather(weather);
  }, [weather]);

  useEffect(() => {
    if (screen !== 'playing' || activeModal !== null) return;
    const order: WeatherType[] = ['limpo', 'nublado', 'chuva'];
    const id = window.setInterval(() => {
      setWeather((prev) => {
        const next = order[(order.indexOf(prev) + 1) % order.length];
        showToast(
          next === 'chuva'
            ? 'Chuva em Luanda — estradas escorregadias, conduza com cuidado!'
            : next === 'nublado'
            ? 'Céu nublado sobre Luanda.'
            : 'Céu limpo e ensolarado em Luanda.'
        );
        return next;
      });
    }, 45000);
    return () => window.clearInterval(id);
  }, [screen, activeModal, showToast]);

  // Game Clock & Needs Loop
  useEffect(() => {
    if (screen !== 'playing' || activeModal !== null) return;
    const interval = window.setInterval(() => {
      setTime((prev) => {
        let minute = prev.minute + 1 * settings.timeScale;
        let hour = prev.hour;
        let day = prev.day;
        if (minute >= 60) {
          minute -= 60;
          hour += 1;
        }
        if (hour >= 24) {
          hour -= 24;
          day += 1;
        }
        return { ...prev, minute, hour, day };
      });

      setPlayer((prev) => {
        const needs = {
          hunger: Math.max(0, prev.needs.hunger - 0.08 * settings.timeScale),
          thirst: Math.max(0, prev.needs.thirst - 0.11 * settings.timeScale),
          energy: Math.max(0, prev.needs.energy - 0.06 * settings.timeScale),
          hygiene: Math.max(0, prev.needs.hygiene - 0.05 * settings.timeScale),
        };
        return { ...prev, needs };
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [screen, activeModal, settings.timeScale]);

  // Weekly rent check
  useEffect(() => {
    if (screen !== 'playing') return;
    const ownsHome = player.ownedProperties.some((id) => id !== 'casa_maianga');
    if (!ownsHome && time.day - player.lastRentDay >= 7) {
      setPlayer((prev) => ({
        ...prev,
        rentDue: prev.rentDue + 15000,
        lastRentDay: time.day,
      }));
      showToast('Renda semanal de 15.000 Kz disponível para pagamento em casa.');
    }
  }, [time.day, screen, player.ownedProperties, player.lastRentDay, showToast]);

  // Global HUD Keyboard Shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (screen !== 'playing') return;
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.code === 'Escape') {
        setActiveModal(null);
      } else if (e.code === 'KeyM') {
        setActiveModal((m) => (m === 'map' ? null : 'map'));
      } else if (e.code === 'KeyP') {
        setActiveModal((m) => (m === 'phone' ? null : 'phone'));
      } else if (e.code === 'KeyI') {
        setActiveModal((m) => (m === 'inventory' ? null : 'inventory'));
      } else if (e.code === 'KeyJ') {
        setActiveModal((m) => (m === 'missions' ? null : 'missions'));
      } else if (e.code === 'KeyC') {
        setActiveModal((m) => (m === 'profile' ? null : 'profile'));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [screen]);

  // Save Game
  const saveProgress = useCallback(
    (silent = false) => {
      const data: SaveGameData = {
        version: 1,
        savedAt: new Date().toISOString(),
        player,
        time,
      };
      try {
        localStorage.setItem(SAVE_KEY, JSON.stringify(data));
        setSavedGame(data);
        if (!silent) showToast('Progresso guardado com sucesso!');
      } catch {
        if (!silent) showToast('Não foi possível guardar o progresso.');
      }
    },
    [player, time, showToast]
  );

  const advanceHours = (hours: number) => {
    setTime((prev) => {
      let totalMin = prev.hour * 60 + prev.minute + Math.round(hours * 60);
      let day = prev.day;
      while (totalMin >= 24 * 60) {
        totalMin -= 24 * 60;
        day += 1;
      }
      return {
        ...prev,
        day,
        hour: Math.floor(totalMin / 60),
        minute: totalMin % 60,
      };
    });
  };

  // --- Menu / Creator Handlers ---

  const handleStartNewGame = (appearance: CharacterAppearance) => {
    const fresh = createNewPlayer(appearance);
    fresh.ownedVehicles = ['sedan_luanda'];
    fresh.activeVehicleId = 'sedan_luanda';
    setPlayer(fresh);
    setTime({ day: 1, month: 1, year: 2026, hour: 9, minute: 0 });
    engineRef.current?.updatePlayerAppearance(appearance);
    engineRef.current?.setPlayerPosition(fresh.position.x, fresh.position.z);
    engineRef.current?.spawnOwnedVehicle('sedan_luanda', 100, true);
    setScreen('playing');
    showToast(`Bem-vindo a Luanda, ${appearance.name}! O seu carro está estacionado à porta (prima [F] para conduzir).`);
  };

  const handleContinueGame = () => {
    if (!savedGame) return;
    setPlayer(savedGame.player);
    setTime(savedGame.time);
    engineRef.current?.updatePlayerAppearance(savedGame.player.appearance);
    engineRef.current?.setPlayerPosition(
      savedGame.player.position.x,
      savedGame.player.position.z
    );
    engineRef.current?.spawnOwnedVehicle(
      savedGame.player.activeVehicleId,
      savedGame.player.vehicleFuel
    );
    setScreen('playing');
    showToast(`Bem-vindo de volta, ${savedGame.player.appearance.name}!`);
  };

  // --- Building & Life Actions ---

  const handleSleep = () => {
    advanceHours(7);
    setPlayer((p) => ({
      ...p,
      needs: {
        ...p.needs,
        energy: 100,
        hunger: Math.max(10, p.needs.hunger - 14),
        thirst: Math.max(10, p.needs.thirst - 16),
      },
    }));
    showToast('Dormiu 7 horas. Energia restaurada!');
    setActiveModal(null);
  };

  const handleShower = () => {
    setPlayer((p) => ({
      ...p,
      needs: { ...p.needs, hygiene: 100 },
    }));
    showToast('Banho tomado. Higiene a 100%!');
  };

  const handlePayRent = () => {
    if (player.money < player.rentDue) {
      showToast('Kwanzas insuficientes para pagar a renda.');
      return;
    }
    setPlayer((p) => ({
      ...p,
      money: p.money - p.rentDue,
      rentDue: 0,
    }));
    showToast('Renda da casa paga com sucesso!');
  };

  const handleEnrollSchool = () => {
    if (player.money < 5000) {
      showToast('Precisa de 5.000 Kz para a matrícula.');
      return;
    }
    setPlayer((p) => ({
      ...p,
      money: p.money - 5000,
      enrolledInSchool: true,
    }));
    showToast('Matrícula concluída na Universidade!');
  };

  const handleAttendClass = () => {
    if (player.needs.energy < 18) {
      showToast('Está muito cansado. Descanse em casa primeiro.');
      return;
    }
    advanceHours(3);
    setPlayer((p) => ({
      ...p,
      classesAttended: p.classesAttended + 1,
      needs: {
        ...p.needs,
        energy: Math.max(0, p.needs.energy - 18),
        hunger: Math.max(0, p.needs.hunger - 10),
        thirst: Math.max(0, p.needs.thirst - 12),
      },
    }));
    progressMission('study', 1);
    showToast('Aula concluída! Competências aumentadas.');
  };

  const handlePassExam = () => {
    setPlayer((p) => {
      const nextLevel = Math.min(EDUCATION_LEVELS.length - 1, p.educationLevel + 1);
      const certTitle = EDUCATION_LEVELS[nextLevel].title;
      return {
        ...p,
        educationLevel: nextLevel,
        certificates: p.certificates.includes(certTitle)
          ? p.certificates
          : [...p.certificates, certTitle],
      };
    });
    showToast('Parabéns! Novo certificado académico obtido.');
  };

  const handleApplyJob = (prof: Profession) => {
    setPlayer((p) => ({ ...p, jobId: prof.id }));
    showToast(`Contratado como ${prof.title}!`);
  };

  const handleWorkShift = (prof: Profession) => {
    if (player.needs.energy < prof.energyCost) {
      showToast('Energia insuficiente para trabalhar este turno. Durma em casa.');
      return;
    }
    advanceHours(prof.shiftHours);
    setPlayer((p) => ({
      ...p,
      money: p.money + prof.salaryPerShift,
      shiftsWorked: p.shiftsWorked + 1,
      needs: {
        ...p.needs,
        energy: Math.max(0, p.needs.energy - prof.energyCost),
        hunger: Math.max(0, p.needs.hunger - 15),
        thirst: Math.max(0, p.needs.thirst - 18),
        hygiene: Math.max(0, p.needs.hygiene - 12),
      },
    }));
    progressMission('work', 1);
    showToast(`Turno concluído! Recebeu ${formatKwanzas(prof.salaryPerShift)}.`);
  };

  const handleBuyItem = (itemId: string) => {
    const item = SHOP_ITEMS.find((i) => i.id === itemId);
    if (!item) return;
    if (player.money < item.price) {
      showToast('Saldo insuficiente em Kwanzas.');
      return;
    }
    setPlayer((p) => {
      const existing = p.inventory.find((i) => i.id === item.id);
      const nextInv = existing
        ? p.inventory.map((i) =>
            i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
          )
        : [...p.inventory, { ...item, quantity: 1 }];
      return {
        ...p,
        money: p.money - item.price,
        inventory: nextInv,
      };
    });
    progressMission('buy_food', 1);
    showToast(`Comprou ${item.name}. Use na Mochila [I].`);
  };

  const handleUseItem = (itemId: string) => {
    const item = player.inventory.find((i) => i.id === itemId);
    if (!item) return;
    setPlayer((p) => ({
      ...p,
      needs: {
        hunger: Math.min(100, p.needs.hunger + (item.hungerRestore || 0)),
        thirst: Math.min(100, p.needs.thirst + (item.thirstRestore || 0)),
        energy: Math.min(100, p.needs.energy + (item.energyRestore || 0)),
        hygiene: Math.min(100, p.needs.hygiene + (item.hygieneRestore || 0)),
      },
      inventory: p.inventory
        .map((i) => (i.id === itemId ? { ...i, quantity: i.quantity - 1 } : i))
        .filter((i) => i.quantity > 0),
    }));
    showToast(`Utilizou ${item.name}.`);
  };

  const handleBuyVehicle = (v: VehicleCatalogItem) => {
    if (player.money < v.price) {
      showToast('Kwanzas insuficientes para comprar este veículo.');
      return;
    }
    setPlayer((p) => ({
      ...p,
      money: p.money - v.price,
      ownedVehicles: [...p.ownedVehicles, v.id],
      activeVehicleId: v.id,
      vehicleFuel: 100,
    }));
    engineRef.current?.spawnOwnedVehicle(v.id, 100, false);
    progressMission('buy_vehicle', 1);
    showToast(`${v.name} estacionado fora do Stand! Prima [F] para conduzir.`);
    setActiveModal(null);
  };

  const handleSelectVehicle = (vehicleId: string) => {
    setPlayer((p) => ({ ...p, activeVehicleId: vehicleId }));
    engineRef.current?.spawnOwnedVehicle(vehicleId, player.vehicleFuel, false);
    showToast('Veículo estacionado junto ao Stand da Marginal.');
  };

  const handleRefuel = () => {
    if (player.money < 3000) {
      showToast('Precisa de 3.000 Kz para abastecer.');
      return;
    }
    setPlayer((p) => ({ ...p, money: p.money - 3000, vehicleFuel: 100 }));
    engineRef.current?.setVehicleFuel(100);
    showToast('Depósito atestado a 100%!');
  };

  const handleRepairVehicle = () => {
    if (player.money < 4500) {
      showToast('Precisa de 4.500 Kz para reparar o veículo.');
      return;
    }
    setPlayer((p) => ({ ...p, money: p.money - 4500 }));
    setVehicleHealth(100);
    engineRef.current?.repairVehicle();
    showToast('Veículo reparado a 100% na oficina!');
  };

  const handleBuyProperty = (prop: PropertyCatalogItem) => {
    if (player.money < prop.price) {
      showToast('Kwanzas insuficientes para comprar este imóvel.');
      return;
    }
    setPlayer((p) => ({
      ...p,
      money: p.money - prop.price,
      ownedProperties: [...p.ownedProperties, prop.id],
      currentHomeId: prop.id,
      rentDue: 0,
    }));
    showToast(`Parabéns! Comprou ${prop.name}.`);
  };

  const handleHospitalCare = () => {
    if (player.money < 4000) {
      showToast('Precisa de 4.000 Kz para a consulta.');
      return;
    }
    setPlayer((p) => ({
      ...p,
      money: p.money - 4000,
      needs: {
        hunger: Math.max(p.needs.hunger, 80),
        thirst: 100,
        energy: 100,
        hygiene: 100,
      },
    }));
    showToast('Consulta concluída! Saúde e energia restauradas.');
  };

  const handleBuyWeapon = (w: WeaponCatalogItem) => {
    if (player.money < w.price) {
      showToast('Kwanzas insuficientes para comprar esta arma.');
      return;
    }
    setPlayer((p) => ({
      ...p,
      money: p.money - w.price,
      ownedWeapons: [...p.ownedWeapons, w.id],
      equippedWeaponId: w.id,
      ammo: p.ammo + 20,
    }));
    showToast(`Comprou e equipou ${w.name} (+20 munições). Prima [Espaço] para disparar.`);
  };

  const handleEquipWeapon = (weaponId: string | null) => {
    setPlayer((p) => ({ ...p, equippedWeaponId: weaponId }));
    showToast(weaponId ? 'Arma equipada!' : 'Arma guardada.');
  };

  const handleBuyAmmo = () => {
    if (player.money < 6000) {
      showToast('Precisa de 6.000 Kz para comprar munições.');
      return;
    }
    setPlayer((p) => ({
      ...p,
      money: p.money - 6000,
      ammo: p.ammo + 30,
    }));
    showToast('+30 munições adicionadas!');
  };

  const handlePayPoliceFine = () => {
    const fine = player.wantedLevel * 8000;
    if (player.money < fine) {
      showToast('Kwanzas insuficientes para pagar a multa.');
      return;
    }
    setPlayer((p) => ({
      ...p,
      money: p.money - fine,
      wantedLevel: 0,
    }));
    showToast('Multa paga na Esquadra. Registo policial limpo!');
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-zinc-950">
      {gmpQuotaExceeded && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm">
          <span>
            Google Maps Platform quota reached. If you are the app owner, visit{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold text-amber-950 hover:text-amber-800"
            >
              maps developer site
            </a>{' '}
            for instructions to update your account.
          </span>
        </div>
      )}
      {/* Dedicated isolated WebGL canvas mount */}
      <div ref={canvasRef} className="fixed inset-0 w-full h-full" />

      {screen === 'menu' && (
        <MainMenu
          savedGame={savedGame}
          onNewGame={() => setScreen('creator')}
          onContinueGame={handleContinueGame}
          onOpenSettings={() => setActiveModal('settings')}
        />
      )}

      {screen === 'creator' && (
        <CharacterCreator
          initialAppearance={DEFAULT_APPEARANCE}
          onChangePreview={(app) => engineRef.current?.updatePlayerAppearance(app)}
          onConfirm={handleStartNewGame}
          onCancel={() => setScreen('menu')}
        />
      )}

      {screen === 'playing' && (
        <GameHUD
          player={player}
          time={time}
          district={district}
          nearbyBuilding={nearbyBuilding}
          canEnterVehicle={canEnterVehicle}
          isDriving={isDriving}
          speedKmh={speedKmh}
          vehicleFuel={player.vehicleFuel}
          vehicleHealth={vehicleHealth}
          showTouchControls={settings.showTouchControls}
          toastMessage={toastMessage}
          onOpenModal={(m) => setActiveModal(m)}
          onInteractBuilding={() => {
            if (!nearbyBuilding) return;
            if (nearbyBuilding.type === 'home') {
              engineRef.current?.enterHouse(nearbyBuilding.name);
            } else if (isPhysicalStore(nearbyBuilding)) {
              engineRef.current?.enterShop(nearbyBuilding);
            } else {
              setActiveModal('building');
            }
          }}
          onToggleVehicle={() => engineRef.current?.toggleVehicle()}
          onQuickSave={() => saveProgress(false)}
          onReturnToMenu={() => {
            saveProgress(true);
            setActiveModal(null);
            setScreen('menu');
          }}
          onTouchMove={(x, y, sprint) => engineRef.current?.setTouchInput(x, y, sprint)}
          onFireWeapon={() => engineRef.current?.fireWeapon()}
          weather={weather}
          onCycleWeather={() => {
            const order: WeatherType[] = ['limpo', 'nublado', 'chuva'];
            setWeather((w) => order[(order.indexOf(w) + 1) % order.length]);
          }}
          musicPlaying={musicPlaying}
          onToggleMusic={handleToggleMusic}
          insideHouseName={insideHouseName}
          onExitHouse={() => engineRef.current?.exitHouse()}
          insideShop={insideShop}
          nearShopCounter={nearShopCounter}
          managerTalkedInShop={managerTalkedInShop}
          managerReplying={managerReplying}
          onExitShop={() => engineRef.current?.exitShop()}
          onSpeakToManager={handleSpeakToManager}
          onOpenShopCatalog={() => setActiveModal('building')}
        />
      )}

      {deathReason && (
        <div className="fixed inset-0 z-50 bg-red-950/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
          <h2 className="text-5xl font-black tracking-wider text-red-400 mb-3">MORRESTE</h2>
          <p className="text-zinc-200 max-w-md mb-6 text-sm">{deathReason}</p>
          <button
            onClick={() => {
              setDeathReason(null);
              setPlayer((p) => ({
                ...p,
                money: Math.max(0, p.money - Math.min(p.money, 2500)),
                wantedLevel: 0,
                needs: { hunger: 85, thirst: 85, energy: 100, hygiene: 90 },
              }));
              engineRef.current?.resetAfterDeath();
              showToast('Recuperado no Hospital Josina Machel (-2.500 Kz).');
            }}
            className="px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-sm shadow-xl cursor-pointer"
          >
            Reviver no Hospital Josina Machel
          </button>
        </div>
      )}

      {activeModal === 'building' && (insideShop || nearbyBuilding) && (
        <BuildingModal
          building={(insideShop || nearbyBuilding)!}
          player={player}
          onClose={() => setActiveModal(null)}
          onSleep={handleSleep}
          onShower={handleShower}
          onPayRent={handlePayRent}
          onEnrollSchool={handleEnrollSchool}
          onAttendClass={handleAttendClass}
          onPassExam={handlePassExam}
          onApplyJob={handleApplyJob}
          onWorkShift={handleWorkShift}
          onBuyItem={handleBuyItem}
          onBuyVehicle={handleBuyVehicle}
          onSelectVehicle={handleSelectVehicle}
          onRefuel={handleRefuel}
          onBuyProperty={handleBuyProperty}
          onHospitalCare={handleHospitalCare}
          onBuyWeapon={handleBuyWeapon}
          onEquipWeapon={handleEquipWeapon}
          onBuyAmmo={handleBuyAmmo}
          onPayPoliceFine={handlePayPoliceFine}
          vehicleHealth={vehicleHealth}
          onRepairVehicle={handleRepairVehicle}
        />
      )}

      <CityModals
        activeModal={activeModal}
        player={player}
        time={time}
        settings={settings}
        waypointId={waypointId}
        onClose={() => setActiveModal(null)}
        onSetWaypoint={(x, z, id) => {
          setWaypointId(id);
          engineRef.current?.setWaypoint(x, z);
        }}
        onUseItem={handleUseItem}
        onUpdateSettings={(patch) => setSettings((s) => ({ ...s, ...patch }))}
        onQuickSave={() => saveProgress(false)}
        onCallTaxi={(type, destX, destZ, destName, cost) => {
          if (player.money < cost) return;
          setPlayer((p) => ({ ...p, money: p.money - cost }));
          setActiveModal(null);
          showToast(
            type === 'yango'
              ? `Yango chegou! A caminho de ${destName}...`
              : `Entraste no Táxi Lotador com outros passageiros rumo a ${destName}...`
          );
          engineRef.current?.startTaxiRide(type, destX, destZ, destName);
        }}
      />
    </div>
  );
}
