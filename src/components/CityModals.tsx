import React, { useState } from 'react';
import {
  CheckCircle2,
  MapPin,
  Navigation,
  Smartphone,
  Users,
  X,
} from 'lucide-react';
import {
  ActiveModal,
  GameSettings,
  GameTime,
  PlayerState,
} from '../types/game';
import {
  EDUCATION_LEVELS,
  formatKwanzas,
  PROFESSIONS,
  PROPERTY_CATALOG,
  VEHICLE_CATALOG,
  WORLD_BUILDINGS,
} from '../data/luandaWorld';
import { LuandaGoogleMap } from './LuandaGoogleMap';

interface CityModalsProps {
  activeModal: ActiveModal;
  player: PlayerState;
  time: GameTime;
  settings: GameSettings;
  waypointId: string | null;
  onClose: () => void;
  onSetWaypoint: (x: number | null, z: number | null, id: string | null) => void;
  onUseItem: (itemId: string) => void;
  onUpdateSettings: (patch: Partial<GameSettings>) => void;
  onQuickSave: () => void;
  onCallTaxi: (type: 'yango' | 'candongueiro', destX: number, destZ: number, destName: string, cost: number) => void;
}

export const CityModals: React.FC<CityModalsProps> = ({
  activeModal,
  player,
  time,
  settings,
  waypointId,
  onClose,
  onSetWaypoint,
  onUseItem,
  onUpdateSettings,
  onQuickSave,
  onCallTaxi,
}) => {
  const [phoneTab, setPhoneTab] = useState<'banco' | 'taxi' | 'carreira' | 'bens' | 'online'>('banco');
  const [mapMode, setMapMode] = useState<'google' | 'tatico'>('google');

  if (!activeModal || activeModal === 'building') return null;

  const currentJob = PROFESSIONS.find((p) => p.id === player.jobId);
  const interactiveBuildings = WORLD_BUILDINGS.filter((b) => b.type !== 'decor');

  // Convert 3D world coords (-115..195, -120..130) into 2D map %
  const toMapX = (x: number) => ((x + 115) / 310) * 100;
  const toMapY = (z: number) => ((z + 120) / 250) * 100;

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-zinc-950/75">
      <div className="w-full max-w-2xl max-h-[88vh] flex flex-col bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <h2 className="text-lg font-bold text-white font-display">
            {activeModal === 'map' && 'Mapa de Luanda'}
            {activeModal === 'phone' && 'Telemóvel Virtual'}
            {activeModal === 'inventory' && 'Mochila & Inventário'}
            {activeModal === 'missions' && 'Missões e Objetivos'}
            {activeModal === 'profile' && 'Perfil do Cidadão'}
            {activeModal === 'settings' && 'Configurações'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 cursor-pointer"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-5">
          {/* MAP MODAL */}
          {activeModal === 'map' && (
            <div className="space-y-4">
              <div className="flex items-center gap-1 p-1 bg-zinc-900 rounded-xl">
                <button
                  onClick={() => setMapMode('google')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    mapMode === 'google'
                      ? 'bg-amber-500 text-zinc-950'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Google Maps (Luanda)
                </button>
                <button
                  onClick={() => setMapMode('tatico')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    mapMode === 'tatico'
                      ? 'bg-amber-500 text-zinc-950'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Mapa Tático 2D
                </button>
              </div>

              {mapMode === 'google' ? (
                <LuandaGoogleMap
                  buildings={interactiveBuildings}
                  playerPos={player.position}
                  waypointId={waypointId}
                  onSelectBuilding={(b) =>
                    onSetWaypoint(b.entranceX ?? b.x, b.entranceZ ?? b.z, b.id)
                  }
                />
              ) : (
                <div className="relative w-full h-72 rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900">
                {/* Ocean */}
                <div className="absolute inset-y-0 left-0 w-[19%] bg-sky-900/70" />
                {/* Ilha strip */}
                <div className="absolute top-[20%] bottom-[20%] left-[4%] w-[6%] rounded bg-amber-200/35" />
                {/* District Labels */}
                <span className="absolute top-3 left-[3%] text-[10px] font-semibold text-amber-200/80">Ilha</span>
                <span className="absolute top-3 left-[21%] text-[10px] font-semibold text-zinc-400">Marginal</span>
                <span className="absolute top-8 left-[36%] text-[10px] font-semibold text-zinc-400">Ingombota</span>
                <span className="absolute top-5 right-[18%] text-[10px] font-semibold text-zinc-400">Cazenga</span>
                <span className="absolute top-[46%] left-[34%] text-[10px] font-semibold text-zinc-400">Maianga</span>
                <span className="absolute top-[46%] left-[52%] text-[10px] font-semibold text-zinc-400">Talatona</span>
                <span className="absolute top-[34%] left-[63%] text-[10px] font-semibold text-zinc-400">Kilamba</span>
                <span className="absolute top-[46%] right-3 text-[10px] font-semibold text-amber-300/80">Viana</span>
                <span className="absolute bottom-3 left-[34%] text-[10px] font-semibold text-zinc-400">Benfica</span>
                <span className="absolute bottom-3 right-[16%] text-[10px] font-semibold text-zinc-400">Camama</span>

                {/* Interactive Buildings */}
                {interactiveBuildings.map((b) => (
                  <button
                    key={b.id}
                    onClick={() =>
                      onSetWaypoint(b.entranceX ?? b.x, b.entranceZ ?? b.z, b.id)
                    }
                    title={`Definir GPS: ${b.name}`}
                    style={{
                      left: `${toMapX(b.x)}%`,
                      top: `${toMapY(b.z)}%`,
                    }}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border-2 cursor-pointer transition-transform hover:scale-125 ${
                      waypointId === b.id
                        ? 'bg-amber-400 border-white scale-125'
                        : 'bg-zinc-100 border-zinc-950'
                    }`}
                  />
                ))}

                  {/* Player Position */}
                  <div
                    style={{
                      left: `${toMapX(player.position.x)}%`,
                      top: `${toMapY(player.position.z)}%`,
                    }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-emerald-400 border-2 border-zinc-950 shadow-lg"
                    title="Sua Posição"
                  />
                </div>
              )}

              <div className="flex items-center justify-between">
                <p className="text-xs text-zinc-400">
                  Clique num local para ativar o feixe GPS dourado na cidade 3D.
                </p>
                {waypointId && (
                  <button
                    onClick={() => onSetWaypoint(null, null, null)}
                    className="text-xs text-amber-400 hover:underline cursor-pointer"
                  >
                    Limpar GPS
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {interactiveBuildings.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => {
                      onSetWaypoint(b.entranceX ?? b.x, b.entranceZ ?? b.z, b.id);
                      onClose();
                    }}
                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-left text-xs cursor-pointer ${
                      waypointId === b.id
                        ? 'bg-amber-500/15 border-amber-500/50 text-amber-200'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-200 hover:bg-zinc-800'
                    }`}
                  >
                    <span className="flex items-center gap-2 truncate">
                      <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span className="truncate font-medium">{b.name}</span>
                    </span>
                    <Navigation className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* VIRTUAL PHONE */}
          {activeModal === 'phone' && (
            <div className="space-y-4">
              <div className="flex items-center gap-1 p-1 bg-zinc-900 rounded-xl">
                {(
                  [
                    ['banco', 'Banco Kz'],
                    ['taxi', 'Yango / Táxi'],
                    ['carreira', 'Carreira'],
                    ['bens', 'Bens'],
                    ['online', 'Online'],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    onClick={() => setPhoneTab(id)}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      phoneTab === id
                        ? 'bg-amber-500 text-zinc-950'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {phoneTab === 'banco' && (
                <div className="space-y-3">
                  <div className="p-5 rounded-xl bg-zinc-900 border border-zinc-800">
                    <p className="text-xs text-zinc-400">Saldo Disponível (BAI / Multicaixa)</p>
                    <p className="text-3xl font-bold font-mono-num text-emerald-400 mt-1">
                      {formatKwanzas(player.money)}
                    </p>
                    <div className="mt-4 pt-3 border-t border-zinc-800 flex justify-between text-xs text-zinc-400">
                      <span>Renda pendente</span>
                      <span className="font-mono-num text-amber-400">
                        {formatKwanzas(player.rentDue)}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={onQuickSave}
                    className="w-full py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-semibold text-white cursor-pointer"
                  >
                    Guardar Progresso no Telemóvel (Dia {time.day})
                  </button>
                </div>
              )}

              {phoneTab === 'taxi' && (
                <div className="space-y-3">
                  <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
                    <p className="text-sm font-bold text-white">Yango & Táxis de Luanda</p>
                    <p className="text-xs text-zinc-400 mt-1">
                      Escolha o destino: viaje de <span className="text-amber-400">Yango (privado)</span> ou de{' '}
                      <span className="text-sky-400">Táxi Lotador / Candongueiro</span> sentado com outros passageiros.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto pr-1">
                    {[
                      { name: 'Maianga (Centro)', x: -18, z: 8 },
                      { name: 'Baixa de Luanda', x: -6, z: -24 },
                      { name: 'Marginal de Luanda', x: -50, z: 4 },
                      { name: 'Ilha de Luanda', x: -88, z: 6 },
                      { name: 'Talatona', x: 56, z: 74 },
                      { name: 'Viana', x: 112, z: -6 },
                      { name: 'Hospital Josina Machel', x: 14, z: -14 },
                    ].map((dest) => (
                      <div
                        key={dest.name}
                        className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 flex flex-wrap items-center justify-between gap-2"
                      >
                        <span className="text-xs font-semibold text-white">{dest.name}</span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => onCallTaxi('candongueiro', dest.x, dest.z, dest.name, 300)}
                            disabled={player.money < 300}
                            className="px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 disabled:opacity-40 text-zinc-950 font-bold text-[11px] cursor-pointer"
                          >
                            Lotador · 300 Kz
                          </button>
                          <button
                            onClick={() => onCallTaxi('yango', dest.x, dest.z, dest.name, 1500)}
                            disabled={player.money < 1500}
                            className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-zinc-950 font-bold text-[11px] cursor-pointer"
                          >
                            Yango · 1.500 Kz
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {phoneTab === 'carreira' && (
                <div className="p-5 rounded-xl bg-zinc-900 border border-zinc-800 space-y-2 text-sm">
                  <p className="text-xs text-zinc-400">Profissão Atual</p>
                  <p className="font-bold text-white">
                    {currentJob ? currentJob.title : 'Desempregado — Visite o Centro de Emprego na Ingombota'}
                  </p>
                  <p className="text-xs text-zinc-400 pt-2">Formação Académica</p>
                  <p className="font-semibold text-amber-400">
                    {EDUCATION_LEVELS[player.educationLevel]?.title}
                  </p>
                  <p className="text-xs text-zinc-400">
                    Turnos trabalhados: <span className="font-mono-num text-zinc-200">{player.shiftsWorked}</span>
                  </p>
                </div>
              )}

              {phoneTab === 'bens' && (
                <div className="space-y-3 text-sm">
                  <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
                    <p className="text-xs text-zinc-400 mb-2">Veículos ({player.ownedVehicles.length})</p>
                    {player.ownedVehicles.length === 0 ? (
                      <p className="text-xs text-zinc-500">Nenhum veículo. Visite o Stand na Marginal.</p>
                    ) : (
                      <ul className="space-y-1 text-xs text-zinc-200">
                        {player.ownedVehicles.map((id) => (
                          <li key={id}>• {VEHICLE_CATALOG.find((v) => v.id === id)?.name}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
                    <p className="text-xs text-zinc-400 mb-2">Imóveis ({player.ownedProperties.length})</p>
                    <ul className="space-y-1 text-xs text-zinc-200">
                      {player.ownedProperties.map((id) => (
                        <li key={id}>• {PROPERTY_CATALOG.find((p) => p.id === id)?.name}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {phoneTab === 'online' && (
                <div className="p-5 rounded-xl bg-zinc-900 border border-zinc-800 space-y-2">
                  <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm">
                    <Users className="w-4 h-4" />
                    <span>Luanda Online — Em Desenvolvimento</span>
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    As funcionalidades multijogador (salas partilhadas, chat em tempo real, amizades e empresas conjuntas) serão ativadas na próxima etapa do projeto.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* INVENTORY */}
          {activeModal === 'inventory' && (
            <div className="space-y-3">
              {player.inventory.length === 0 ? (
                <p className="text-sm text-zinc-400 py-6 text-center">
                  A sua mochila está vazia. Visite o Supermercado Kero em Talatona ou o Restaurante da Ilha.
                </p>
              ) : (
                player.inventory.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between"
                  >
                    <div>
                      <p className="font-semibold text-sm text-white">
                        {item.name} <span className="font-mono-num text-amber-400">x{item.quantity}</span>
                      </p>
                      <p className="text-xs text-zinc-400">
                        {item.hungerRestore ? `+${item.hungerRestore} Fome ` : ''}
                        {item.thirstRestore ? `+${item.thirstRestore} Sede ` : ''}
                        {item.energyRestore ? `+${item.energyRestore} Energia ` : ''}
                        {item.hygieneRestore ? `+${item.hygieneRestore} Higiene` : ''}
                      </p>
                    </div>
                    <button
                      onClick={() => onUseItem(item.id)}
                      className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold text-xs cursor-pointer"
                    >
                      Usar
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {/* MISSIONS */}
          {activeModal === 'missions' && (
            <div className="space-y-3">
              {player.missions.map((m) => (
                <div
                  key={m.id}
                  className={`p-4 rounded-xl border ${
                    m.completed
                      ? 'bg-emerald-500/10 border-emerald-500/30'
                      : 'bg-zinc-900 border-zinc-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-sm text-white flex items-center gap-2">
                      {m.completed && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                      {m.title}
                    </p>
                    <span className="font-mono-num text-xs font-bold text-amber-400">
                      +{formatKwanzas(m.rewardKz)}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-1">{m.description}</p>
                  <div className="mt-2.5 flex items-center justify-between text-[11px] text-zinc-400">
                    <span>Progresso</span>
                    <span className="font-mono-num">
                      {Math.min(m.progress, m.target)} / {m.target}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* PROFILE */}
          {activeModal === 'profile' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-2">
                <p className="text-xs text-zinc-400">Identidade</p>
                <p className="text-lg font-bold text-white">{player.appearance.name}</p>
                <p className="text-xs text-zinc-400 capitalize">Género: {player.appearance.gender}</p>
                <p className="text-xs text-zinc-400">
                  Bairros explorados: {player.visitedDistricts.length} / 10
                </p>
              </div>
              <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-2">
                <p className="text-xs text-zinc-400">Educação & Certificados</p>
                <p className="font-semibold text-amber-400">
                  {EDUCATION_LEVELS[player.educationLevel]?.title}
                </p>
                {player.certificates.length === 0 ? (
                  <p className="text-xs text-zinc-500">Sem certificados adicionais ainda.</p>
                ) : (
                  <ul className="text-xs text-zinc-300 space-y-1">
                    {player.certificates.map((c) => (
                      <li key={c}>• {c}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {/* SETTINGS */}
          {activeModal === 'settings' && (
            <div className="space-y-5 text-sm">
              <div>
                <div className="flex justify-between text-xs text-zinc-300 mb-2">
                  <span>Sensibilidade da Câmara (Rato)</span>
                  <span className="font-mono-num">{settings.mouseSensitivity.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min="0.4"
                  max="2.2"
                  step="0.1"
                  value={settings.mouseSensitivity}
                  onChange={(e) =>
                    onUpdateSettings({ mouseSensitivity: parseFloat(e.target.value) })
                  }
                  className="w-full accent-amber-500"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs text-zinc-300 mb-2">
                  <span>Velocidade do Ciclo Dia/Noite</span>
                  <span className="font-mono-num">{settings.timeScale}x</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 4].map((scale) => (
                    <button
                      key={scale}
                      onClick={() => onUpdateSettings({ timeScale: scale })}
                      className={`py-2 rounded-lg text-xs font-semibold cursor-pointer ${
                        settings.timeScale === scale
                          ? 'bg-amber-500 text-zinc-950'
                          : 'bg-zinc-900 text-zinc-300 border border-zinc-800'
                      }`}
                    >
                      {scale}x
                    </button>
                  ))}
                </div>
              </div>

              <label className="flex items-center justify-between p-4 rounded-xl bg-zinc-900 border border-zinc-800 cursor-pointer">
                <div className="flex items-center gap-2.5">
                  <Smartphone className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-medium text-zinc-200">
                    Mostrar Controles Táteis no Ecrã (Telemóvel)
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.showTouchControls}
                  onChange={(e) => onUpdateSettings({ showTouchControls: e.target.checked })}
                  className="w-4 h-4 accent-amber-500"
                />
              </label>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
