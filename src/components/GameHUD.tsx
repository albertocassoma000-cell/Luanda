import React, { useRef, useState } from 'react';
import {
  Backpack,
  Car,
  ChevronDown,
  ChevronUp,
  Cloud,
  CloudRain,
  Compass,
  Crosshair,
  Droplets,
  Fuel,
  Map,
  Menu,
  Save,
  ShieldAlert,
  Smartphone,
  Sparkles,
  Sun,
  Target,
  User,
  Utensils,
  Volume2,
  VolumeX,
  Wrench,
  Zap,
} from 'lucide-react';
import {
  ActiveModal,
  DistrictName,
  GameTime,
  PlayerState,
  WeatherType,
  WorldBuilding,
} from '../types/game';
import { formatKwanzas, WEAPON_CATALOG } from '../data/luandaWorld';

interface GameHUDProps {
  player: PlayerState;
  time: GameTime;
  district: DistrictName;
  nearbyBuilding: WorldBuilding | null;
  canEnterVehicle: boolean;
  isDriving: boolean;
  speedKmh: number;
  vehicleFuel: number;
  vehicleHealth: number;
  showTouchControls: boolean;
  toastMessage: string | null;
  onOpenModal: (modal: ActiveModal) => void;
  onInteractBuilding: () => void;
  onToggleVehicle: () => void;
  onQuickSave: () => void;
  onReturnToMenu: () => void;
  onTouchMove: (x: number, y: number, sprint: boolean) => void;
  onFireWeapon: () => void;
  weather: WeatherType;
  onCycleWeather: () => void;
  musicPlaying: boolean;
  onToggleMusic: () => void;
  insideHouseName: string | null;
  onExitHouse: () => void;
  insideShop: WorldBuilding | null;
  nearShopCounter: boolean;
  managerTalkedInShop: boolean;
  managerReplying: boolean;
  onExitShop: () => void;
  onSpeakToManager: (message: string) => void;
  onOpenShopCatalog: () => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  player,
  time,
  district,
  nearbyBuilding,
  canEnterVehicle,
  isDriving,
  speedKmh,
  vehicleFuel,
  vehicleHealth,
  showTouchControls,
  toastMessage,
  onOpenModal,
  onInteractBuilding,
  onToggleVehicle,
  onQuickSave,
  onReturnToMenu,
  onTouchMove,
  onFireWeapon,
  weather,
  onCycleWeather,
  musicPlaying,
  onToggleMusic,
  insideHouseName,
  onExitHouse,
  insideShop,
  nearShopCounter,
  managerTalkedInShop,
  managerReplying,
  onExitShop,
  onSpeakToManager,
  onOpenShopCatalog,
}) => {
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [speechText, setSpeechText] = useState('');

  const formattedTime = `${String(time.hour).padStart(2, '0')}:${String(time.minute).padStart(2, '0')}`;
  const equippedWeapon = WEAPON_CATALOG.find((w) => w.id === player.equippedWeaponId);

  const NeedBar = ({
    label,
    value,
    icon: Icon,
    colorClass,
  }: {
    label: string;
    value: number;
    icon: React.ElementType;
    colorClass: string;
  }) => (
    <div className="flex items-center gap-2">
      <Icon className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
      <div className="w-20">
        <div className="flex justify-between text-[10px] text-zinc-400 leading-none mb-1">
          <span>{label}</span>
          <span className="font-mono-num">{Math.round(value)}%</span>
        </div>
        <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${colorClass}`}
            style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-10 pointer-events-none select-none">
      {/* Top-Left: Identity, District, Clock, Kwanzas */}
      <div className="absolute top-4 left-4 pointer-events-auto bg-zinc-950/90 border border-zinc-800 rounded-xl px-4 py-3 shadow-lg">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <span className="font-semibold text-white">{player.appearance.name}</span>
              <span aria-hidden="true">·</span>
              <span className="text-amber-400">{district}</span>
            </div>
            <div className="mt-1 flex items-center gap-3 text-sm">
              <span className="font-mono-num font-bold text-emerald-400">
                {formatKwanzas(player.money)}
              </span>
              <span className="text-zinc-600">|</span>
              <span className="font-mono-num text-zinc-200">
                {formattedTime}
              </span>
              <span className="text-xs text-zinc-400">
                Dia {time.day}
              </span>
              <span className="text-zinc-600">|</span>
              <button
                onClick={onCycleWeather}
                title="Alterar clima"
                className="flex items-center gap-1 text-xs text-zinc-300 hover:text-amber-300 cursor-pointer"
              >
                {weather === 'limpo' && <Sun className="w-3.5 h-3.5 text-amber-400" />}
                {weather === 'nublado' && <Cloud className="w-3.5 h-3.5 text-zinc-400" />}
                {weather === 'chuva' && <CloudRain className="w-3.5 h-3.5 text-sky-400" />}
                <span className="capitalize">{weather}</span>
              </button>
              <span className="text-zinc-600">|</span>
              <button
                onClick={onToggleMusic}
                title={musicPlaying ? 'Desligar música Super Mario' : 'Ligar música Super Mario'}
                className={`flex items-center gap-1 text-xs cursor-pointer ${
                  musicPlaying ? 'text-amber-400 hover:text-amber-300' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {musicPlaying ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                <span>Mario</span>
              </button>
            </div>
            {(player.wantedLevel > 0 || equippedWeapon) && (
              <div className="mt-2 pt-2 border-t border-zinc-800 flex items-center gap-3 text-xs">
                {player.wantedLevel > 0 && (
                  <span className="flex items-center gap-1 text-red-400 font-semibold">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    Procurado {'★'.repeat(player.wantedLevel)}
                  </span>
                )}
                {equippedWeapon && (
                  <button
                    onClick={onFireWeapon}
                    className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-amber-300 font-mono-num cursor-pointer"
                  >
                    <Crosshair className="w-3 h-3" />
                    {equippedWeapon.name} ({player.ammo})
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Top-Right: Needs */}
      <div className="absolute top-4 right-4 pointer-events-auto bg-zinc-950/90 border border-zinc-800 rounded-xl px-4 py-3 shadow-lg grid grid-cols-2 gap-x-4 gap-y-2">
        <NeedBar label="Fome" value={player.needs.hunger} icon={Utensils} colorClass="bg-amber-500" />
        <NeedBar label="Sede" value={player.needs.thirst} icon={Droplets} colorClass="bg-sky-500" />
        <NeedBar label="Energia" value={player.needs.energy} icon={Zap} colorClass="bg-emerald-500" />
        <NeedBar label="Higiene" value={player.needs.hygiene} icon={Sparkles} colorClass="bg-violet-400" />
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-zinc-950/95 border border-amber-500/50 text-amber-300 px-4 py-2 rounded-lg text-xs font-medium shadow-xl">
          {toastMessage}
        </div>
      )}

      {/* Contextual Interaction Prompts */}
      <div className="absolute bottom-24 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 pointer-events-auto">
        {insideShop && (
          <div className="flex flex-col items-center gap-2 w-[92vw] max-w-md">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!speechText.trim()) return;
                onSpeakToManager(speechText);
                setSpeechText('');
              }}
              className="flex items-center gap-2 w-full bg-zinc-950/95 border border-zinc-700 rounded-xl p-2 shadow-2xl"
            >
              <input
                type="text"
                value={speechText}
                onChange={(e) => setSpeechText(e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
                placeholder={
                  nearShopCounter
                    ? 'Escreve para falar com o gerente...'
                    : 'Aproxima-te do balcão ou fala com o gerente...'
                }
                className="flex-1 bg-transparent px-2 py-1 text-xs text-white placeholder:text-zinc-400 focus:outline-none"
              />
              <button
                type="submit"
                disabled={managerReplying}
                className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-zinc-950 font-bold text-xs cursor-pointer"
              >
                {managerReplying ? '...' : 'Falar'}
              </button>
            </form>
            <div className="flex items-center gap-2">
              {nearShopCounter && managerTalkedInShop && (
                <button
                  onClick={onOpenShopCatalog}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold text-xs shadow-xl cursor-pointer"
                >
                  Comprar no Balcão
                </button>
              )}
              <button
                onClick={onExitShop}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-xs shadow-xl cursor-pointer"
              >
                <span className="px-1.5 py-0.5 rounded bg-zinc-950/20 font-mono-num text-[11px]">E</span>
                <span>Sair de {insideShop.name}</span>
              </button>
            </div>
          </div>
        )}

        {insideHouseName && !insideShop && (
          <button
            onClick={onExitHouse}
            className="flex items-center gap-2.5 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-sm shadow-xl cursor-pointer"
          >
            <span className="px-1.5 py-0.5 rounded bg-zinc-950/20 font-mono-num text-xs">E</span>
            <span>Sair de {insideHouseName}</span>
          </button>
        )}

        {nearbyBuilding && !isDriving && !insideHouseName && !insideShop && (
          <button
            onClick={onInteractBuilding}
            className="flex items-center gap-2.5 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold text-sm shadow-xl cursor-pointer"
          >
            <span className="px-1.5 py-0.5 rounded bg-zinc-950/20 font-mono-num text-xs">E</span>
            <span>Entrar em {nearbyBuilding.name}</span>
          </button>
        )}

        {canEnterVehicle && !isDriving && (
          <button
            onClick={onToggleVehicle}
            className="flex items-center gap-2.5 px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-zinc-950 font-semibold text-sm shadow-xl cursor-pointer"
          >
            <Car className="w-4 h-4" />
            <span>[F] Conduzir Veículo</span>
          </button>
        )}

        {isDriving && (
          <div className="flex items-center gap-4 px-5 py-2.5 rounded-xl bg-zinc-950/90 border border-zinc-800 text-sm shadow-xl">
            <div className="flex items-center gap-1.5 font-mono-num text-white font-bold">
              <Compass className="w-4 h-4 text-amber-400" />
              <span>{speedKmh} km/h</span>
            </div>
            <div className="flex items-center gap-1.5 font-mono-num text-xs text-zinc-300">
              <Fuel className="w-3.5 h-3.5 text-sky-400" />
              <span>{Math.round(vehicleFuel)}%</span>
            </div>
            <div className="flex items-center gap-1.5 font-mono-num text-xs">
              <Wrench className={`w-3.5 h-3.5 ${vehicleHealth < 45 ? 'text-red-400' : 'text-emerald-400'}`} />
              <span className={vehicleHealth < 45 ? 'text-red-300 font-semibold' : 'text-zinc-300'}>
                {Math.round(vehicleHealth)}%
              </span>
            </div>
            <button
              onClick={onToggleVehicle}
              className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-200 cursor-pointer"
            >
              [F] Sair
            </button>
          </div>
        )}
      </div>

      {/* Circular Analog Joystick for Mobile / Tablet */}
      {showTouchControls && (
        <div className="absolute bottom-24 left-5 right-5 flex justify-between items-end pointer-events-none">
          <VirtualJoystick onMove={onTouchMove} />
        </div>
      )}

      {/* Unified Collapsible Bottom Dock */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-auto">
        <button
          onClick={() => setDockCollapsed((c) => !c)}
          className="mb-1 px-3 py-0.5 rounded-t-lg bg-zinc-950/90 border border-b-0 border-zinc-800 text-[11px] text-zinc-400 hover:text-white flex items-center gap-1 cursor-pointer"
        >
          {dockCollapsed ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          {dockCollapsed ? 'Mostrar Menu' : 'Ocultar'}
        </button>

        {!dockCollapsed && (
          <div className="flex items-center gap-1.5 bg-zinc-950/92 border border-zinc-800 rounded-2xl px-2.5 py-2 shadow-2xl">
            <DockBtn icon={Map} label="Mapa" shortcut="M" onClick={() => onOpenModal('map')} />
            <DockBtn icon={Smartphone} label="Telemóvel" shortcut="P" onClick={() => onOpenModal('phone')} />
            <DockBtn icon={Backpack} label="Mochila" shortcut="I" onClick={() => onOpenModal('inventory')} />
            <DockBtn icon={Target} label="Missões" shortcut="J" onClick={() => onOpenModal('missions')} />
            <DockBtn icon={User} label="Perfil" shortcut="C" onClick={() => onOpenModal('profile')} />
            <div className="w-px h-6 bg-zinc-800 mx-1" />
            <DockBtn icon={Save} label="Guardar" onClick={onQuickSave} />
            <DockBtn icon={Menu} label="Menu" onClick={onReturnToMenu} />
          </div>
        )}
      </div>

      {/* Subtle Controls Helper (Bottom Left, desktop only) */}
      <div className="hidden lg:block absolute bottom-4 left-4 text-[11px] text-zinc-400 bg-zinc-950/80 border border-zinc-800/80 rounded-lg px-3 py-1.5">
        WASD Mover · Shift Correr · Arrastar Rato Câmara · E Entrar · F Veículo · Espaço Disparar
      </div>
    </div>
  );
};

function DockBtn({
  icon: Icon,
  label,
  shortcut,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  shortcut?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-2 rounded-xl hover:bg-zinc-800 text-zinc-200 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer"
    >
      <Icon className="w-4 h-4 text-amber-400" />
      <span className="hidden sm:inline">{label}</span>
      {shortcut && <span className="hidden md:inline text-[10px] text-zinc-500 font-mono-num">{shortcut}</span>}
    </button>
  );
}

function VirtualJoystick({
  onMove,
}: {
  onMove: (x: number, y: number, sprint: boolean) => void;
}) {
  const baseRef = useRef<HTMLDivElement | null>(null);
  const activePointerId = useRef<number | null>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const maxRadius = 38;

  const updateFromClient = (clientX: number, clientY: number) => {
    const el = baseRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let dx = clientX - cx;
    let dy = clientY - cy;
    const dist = Math.hypot(dx, dy);
    if (dist > maxRadius) {
      dx = (dx / dist) * maxRadius;
      dy = (dy / dist) * maxRadius;
    }
    setKnob({ x: dx, y: dy });
    const nx = dx / maxRadius;
    const ny = -dy / maxRadius;
    const isSprint = dist >= maxRadius * 0.88;
    onMove(nx, ny, isSprint);
  };

  const reset = () => {
    activePointerId.current = null;
    setKnob({ x: 0, y: 0 });
    onMove(0, 0, false);
  };

  return (
    <div
      ref={baseRef}
      onPointerDown={(e) => {
        e.stopPropagation();
        activePointerId.current = e.pointerId;
        e.currentTarget.setPointerCapture(e.pointerId);
        updateFromClient(e.clientX, e.clientY);
      }}
      onPointerMove={(e) => {
        if (activePointerId.current !== e.pointerId) return;
        e.stopPropagation();
        updateFromClient(e.clientX, e.clientY);
      }}
      onPointerUp={(e) => {
        if (activePointerId.current !== e.pointerId) return;
        e.stopPropagation();
        reset();
      }}
      onPointerCancel={() => reset()}
      className="relative w-28 h-28 rounded-full bg-zinc-950/65 border-2 border-zinc-600/75 backdrop-blur-sm flex items-center justify-center touch-none pointer-events-auto shadow-xl"
    >
      <div
        className="w-11 h-11 rounded-full bg-amber-500/90 border-2 border-amber-200 shadow-lg pointer-events-none"
        style={{
          transform: `translate(${knob.x}px, ${knob.y}px)`,
        }}
      />
    </div>
  );
}
