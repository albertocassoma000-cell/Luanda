import React, { useState } from 'react';
import {
  Bed,
  Briefcase,
  Building2,
  Car,
  CheckCircle2,
  Droplets,
  Fuel,
  GraduationCap,
  HeartPulse,
  MessageCircle,
  Send,
  ShieldAlert,
  ShoppingBag,
  Crosshair,
  Wrench,
  X,
} from 'lucide-react';
import {
  PlayerState,
  Profession,
  PropertyCatalogItem,
  VehicleCatalogItem,
  WeaponCatalogItem,
  WorldBuilding,
} from '../types/game';
import {
  EDUCATION_LEVELS,
  EXAM_QUESTIONS,
  formatKwanzas,
  PROFESSIONS,
  PROPERTY_CATALOG,
  SHOP_ITEMS,
  VEHICLE_CATALOG,
  WEAPON_CATALOG,
} from '../data/luandaWorld';

interface BuildingModalProps {
  building: WorldBuilding;
  player: PlayerState;
  onClose: () => void;
  onSleep: () => void;
  onShower: () => void;
  onPayRent: () => void;
  onEnrollSchool: () => void;
  onAttendClass: () => void;
  onPassExam: () => void;
  onApplyJob: (prof: Profession) => void;
  onWorkShift: (prof: Profession) => void;
  onBuyItem: (itemId: string) => void;
  onBuyVehicle: (vehicle: VehicleCatalogItem) => void;
  onSelectVehicle: (vehicleId: string) => void;
  onRefuel: () => void;
  onBuyProperty: (prop: PropertyCatalogItem) => void;
  onHospitalCare: () => void;
  onBuyWeapon: (weapon: WeaponCatalogItem) => void;
  onEquipWeapon: (weaponId: string | null) => void;
  onBuyAmmo: () => void;
  onPayPoliceFine: () => void;
  vehicleHealth: number;
  onRepairVehicle: () => void;
}

export const BuildingModal: React.FC<BuildingModalProps> = ({
  building,
  player,
  onClose,
  onSleep,
  onShower,
  onPayRent,
  onEnrollSchool,
  onAttendClass,
  onPassExam,
  onApplyJob,
  onWorkShift,
  onBuyItem,
  onBuyVehicle,
  onSelectVehicle,
  onRefuel,
  onBuyProperty,
  onHospitalCare,
  onBuyWeapon,
  onEquipWeapon,
  onBuyAmmo,
  onPayPoliceFine,
  vehicleHealth,
  onRepairVehicle,
}) => {
  const [examActive, setExamActive] = useState(false);
  const [examIndex, setExamIndex] = useState(0);
  const [examFeedback, setExamFeedback] = useState<string | null>(null);

  const isStoreBuilding =
    building.type === 'supermarket' ||
    building.type === 'restaurant' ||
    building.type === 'dealership' ||
    building.type === 'gun_shop' ||
    building.type === 'real_estate' ||
    building.type === 'gas_station';

  const managerTitle =
    building.type === 'dealership'
      ? 'Gerente do Stand'
      : building.type === 'gun_shop'
      ? 'Gerente da Armaria'
      : building.type === 'restaurant'
      ? 'Gerente do Restaurante'
      : building.type === 'real_estate'
      ? 'Gerente da Imobiliária'
      : building.type === 'gas_station'
      ? 'Gerente do Posto'
      : 'Gerente da Loja';

  const [managerUnlocked, setManagerUnlocked] = useState(!isStoreBuilding);
  const [thoughtInput, setThoughtInput] = useState('');
  const [chatHistory, setChatHistory] = useState<{ sender: 'manager' | 'player'; text: string }[]>(() => [
    {
      sender: 'manager',
      text: `Olá ${player.appearance.name}! Bem-vindo a ${building.name}. Diga-me o que procura hoje antes de vermos os produtos.`,
    },
  ]);

  const sendThoughtToManager = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setChatHistory((prev) => [
      ...prev,
      { sender: 'player', text: trimmed },
      {
        sender: 'manager',
        text: 'Perfeito! Com todo o gosto. Já liberei o catálogo da loja — pode escolher e comprar o que desejar.',
      },
    ]);
    setThoughtInput('');
    setManagerUnlocked(true);
  };

  const currentJob = PROFESSIONS.find((p) => p.id === player.jobId) || null;
  const nextEdu = EDUCATION_LEVELS.find((e) => e.level === player.educationLevel + 1);

  const handleExamAnswer = (optionIdx: number) => {
    const q = EXAM_QUESTIONS[examIndex % EXAM_QUESTIONS.length];
    if (optionIdx === q.correctIndex) {
      setExamFeedback('Resposta correta! Certificado obtido.');
      onPassExam();
      setTimeout(() => {
        setExamActive(false);
        setExamFeedback(null);
        setExamIndex((i) => i + 1);
      }, 900);
    } else {
      setExamFeedback('Resposta incorreta. Tente novamente!');
    }
  };

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-zinc-950/75">
      <div className="w-full max-w-2xl max-h-[88vh] flex flex-col bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <div>
            <p className="text-xs text-amber-400 font-medium">{building.district}</p>
            <h2 className="text-xl font-bold text-white font-display">{building.name}</h2>
          </div>
          <div className="flex items-center gap-4">
            <span className="font-mono-num text-sm font-bold text-emerald-400">
              {formatKwanzas(player.money)}
            </span>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 cursor-pointer"
              aria-label="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5">
          {building.description && (
            <p className="text-sm text-zinc-400">{building.description}</p>
          )}

          {/* Manager Thought-Bubble Conversation for Stores */}
          {isStoreBuilding && (
            <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-400">
                <MessageCircle className="w-4 h-4" />
                <span>Conversa em pensamento com o {managerTitle}</span>
              </div>

              <div className="space-y-2.5 max-h-44 overflow-y-auto pr-1">
                {chatHistory.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex flex-col ${msg.sender === 'player' ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[85%] px-4 py-2.5 rounded-3xl text-xs italic leading-relaxed shadow-sm ${
                        msg.sender === 'player'
                          ? 'bg-amber-500/20 border border-amber-500/40 text-amber-100 rounded-br-md'
                          : 'bg-zinc-800 border border-zinc-700 text-zinc-200 rounded-bl-md'
                      }`}
                    >
                      “{msg.text}”
                    </div>
                    <span className="text-[10px] text-zinc-500 mt-0.5 px-2">
                      {msg.sender === 'player' ? '○ ◦ Tu (pensamento)' : `◦ ○ ${managerTitle}`}
                    </span>
                  </div>
                ))}
              </div>

              {!managerUnlocked && (
                <div className="pt-2 border-t border-zinc-800 space-y-2.5">
                  <p className="text-[11px] text-zinc-400">
                    Envie uma mensagem em pensamento ao gerente para ver os produtos e comprar:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      'Olá gerente, quero ver o que tem para vender hoje.',
                      'Boa tarde, gostaria de comprar alguns produtos da loja.',
                      'Pode mostrar-me o catálogo e os preços, por favor?',
                    ].map((quick, i) => (
                      <button
                        key={i}
                        onClick={() => sendThoughtToManager(quick)}
                        className="px-3 py-1.5 rounded-full bg-zinc-800 hover:bg-amber-500 hover:text-zinc-950 text-zinc-200 text-xs transition-colors cursor-pointer"
                      >
                        “{quick}”
                      </button>
                    ))}
                  </div>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      sendThoughtToManager(thoughtInput);
                    }}
                    className="flex items-center gap-2"
                  >
                    <input
                      type="text"
                      value={thoughtInput}
                      onChange={(e) => setThoughtInput(e.target.value)}
                      placeholder="Escreva o seu pensamento para o gerente..."
                      className="flex-1 px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-amber-500"
                    />
                    <button
                      type="submit"
                      className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Enviar</span>
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}

          {/* Only show store catalogs after talking to the manager */}
          {(!isStoreBuilding || managerUnlocked) && (
            <>
          {/* HOME */}
          {building.type === 'home' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={onSleep}
                className="flex items-center gap-3 p-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-left cursor-pointer"
              >
                <Bed className="w-6 h-6 text-amber-400 shrink-0" />
                <div>
                  <p className="font-semibold text-white text-sm">Dormir (7 horas)</p>
                  <p className="text-xs text-zinc-400">Restaura 100% de energia e avança o tempo.</p>
                </div>
              </button>

              <button
                onClick={onShower}
                className="flex items-center gap-3 p-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-left cursor-pointer"
              >
                <Droplets className="w-6 h-6 text-sky-400 shrink-0" />
                <div>
                  <p className="font-semibold text-white text-sm">Tomar Banho</p>
                  <p className="text-xs text-zinc-400">Restaura 100% da higiene pessoal.</p>
                </div>
              </button>

              {player.rentDue > 0 && (
                <button
                  onClick={onPayRent}
                  className="sm:col-span-2 flex items-center justify-between p-4 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-left cursor-pointer"
                >
                  <div>
                    <p className="font-semibold text-amber-300 text-sm">Pagar Renda da Casa</p>
                    <p className="text-xs text-zinc-300">Regularize a sua renda semanal na Maianga.</p>
                  </div>
                  <span className="font-mono-num font-bold text-amber-400">
                    {formatKwanzas(player.rentDue)}
                  </span>
                </button>
              )}
            </div>
          )}

          {/* SCHOOL / UNIVERSITY */}
          {building.type === 'school' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between">
                <div>
                  <p className="text-xs text-zinc-400">Nível Académico Atual</p>
                  <p className="text-base font-semibold text-white">
                    {EDUCATION_LEVELS[player.educationLevel]?.title}
                  </p>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Aulas frequentadas: <span className="font-mono-num text-zinc-200">{player.classesAttended}</span>
                  </p>
                </div>
                <GraduationCap className="w-8 h-8 text-amber-400" />
              </div>

              {!player.enrolledInSchool ? (
                <button
                  onClick={onEnrollSchool}
                  className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold text-sm cursor-pointer"
                >
                  Matricular-se na Universidade (5.000 Kz)
                </button>
              ) : (
                <div className="space-y-3">
                  <button
                    onClick={onAttendClass}
                    className="w-full py-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-white font-semibold text-sm cursor-pointer"
                  >
                    Assistir Aula (3h · -18 Energia · +1 Aula)
                  </button>

                  {nextEdu && !examActive && (
                    <button
                      disabled={player.classesAttended < nextEdu.classesNeeded}
                      onClick={() => {
                        setExamActive(true);
                        setExamFeedback(null);
                      }}
                      className={`w-full py-3 rounded-xl font-semibold text-sm cursor-pointer ${
                        player.classesAttended >= nextEdu.classesNeeded
                          ? 'bg-amber-500 hover:bg-amber-400 text-zinc-950'
                          : 'bg-zinc-900 text-zinc-500 border border-zinc-800 cursor-not-allowed'
                      }`}
                    >
                      {player.classesAttended >= nextEdu.classesNeeded
                        ? `Realizar Exame para ${nextEdu.title}`
                        : `Assista a ${nextEdu.classesNeeded - player.classesAttended} aula(s) para desbloquear o Exame`}
                    </button>
                  )}

                  {examActive && (
                    <div className="p-4 rounded-xl bg-zinc-900 border border-amber-500/40 space-y-3">
                      <p className="text-xs font-medium text-amber-400">Exame de Certificação</p>
                      <p className="text-sm font-semibold text-white">
                        {EXAM_QUESTIONS[examIndex % EXAM_QUESTIONS.length].question}
                      </p>
                      <div className="grid grid-cols-1 gap-2">
                        {EXAM_QUESTIONS[examIndex % EXAM_QUESTIONS.length].options.map((opt, idx) => (
                          <button
                            key={opt}
                            onClick={() => handleExamAnswer(idx)}
                            className="text-left px-3.5 py-2.5 rounded-lg bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-sm text-zinc-200 cursor-pointer"
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                      {examFeedback && (
                        <p className="text-xs font-medium text-amber-300">{examFeedback}</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* JOB CENTER */}
          {building.type === 'job_center' && (
            <div className="space-y-4">
              {currentJob && (
                <div className="p-4 rounded-xl bg-amber-500/12 border border-amber-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <p className="text-xs text-amber-400 font-medium">Emprego Atual</p>
                    <p className="text-base font-bold text-white">{currentJob.title}</p>
                    <p className="text-xs text-zinc-300 mt-0.5">
                      Salário: <span className="font-mono-num text-emerald-400">{formatKwanzas(currentJob.salaryPerShift)}</span> / turno ({currentJob.shiftHours}h)
                    </p>
                  </div>
                  <button
                    onClick={() => onWorkShift(currentJob)}
                    className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold text-sm shrink-0 cursor-pointer"
                  >
                    Trabalhar Turno
                  </button>
                </div>
              )}

              <div className="space-y-2">
                <p className="text-xs font-medium text-zinc-400">Profissões Disponíveis em Luanda</p>
                {PROFESSIONS.map((prof) => {
                  const unlocked = player.educationLevel >= prof.requiredEducation;
                  const isCurrent = player.jobId === prof.id;
                  return (
                    <div
                      key={prof.id}
                      className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <Briefcase className="w-4 h-4 text-zinc-400" />
                          <span className="font-semibold text-sm text-white">{prof.title}</span>
                          <span className="text-xs text-zinc-500">· {prof.category}</span>
                        </div>
                        <p className="text-xs text-zinc-400 mt-0.5">{prof.description}</p>
                        <p className="text-xs text-zinc-500 mt-1">
                          Requisito: {EDUCATION_LEVELS[prof.requiredEducation].title} ·{' '}
                          <span className="font-mono-num text-emerald-400">
                            {formatKwanzas(prof.salaryPerShift)}/turno
                          </span>
                        </p>
                      </div>
                      <button
                        disabled={!unlocked || isCurrent}
                        onClick={() => onApplyJob(prof)}
                        className={`px-3.5 py-2 rounded-lg text-xs font-semibold shrink-0 cursor-pointer ${
                          isCurrent
                            ? 'bg-emerald-500/20 text-emerald-300 cursor-default'
                            : unlocked
                            ? 'bg-zinc-100 hover:bg-white text-zinc-950'
                            : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                        }`}
                      >
                        {isCurrent ? 'Atual' : unlocked ? 'Candidatar' : 'Bloqueado'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* SUPERMARKET & RESTAURANT */}
          {(building.type === 'supermarket' || building.type === 'restaurant') && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {SHOP_ITEMS.filter((item) =>
                building.type === 'restaurant'
                  ? item.category === 'comida' || item.category === 'bebida'
                  : true
              ).map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 flex flex-col justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm text-white">{item.name}</span>
                      <ShoppingBag className="w-4 h-4 text-amber-400" />
                    </div>
                    <p className="text-xs text-zinc-400 mt-1">
                      {item.hungerRestore ? `+${item.hungerRestore} Fome ` : ''}
                      {item.thirstRestore ? `+${item.thirstRestore} Sede ` : ''}
                      {item.energyRestore ? `+${item.energyRestore} Energia ` : ''}
                      {item.hygieneRestore ? `+${item.hygieneRestore} Higiene` : ''}
                    </p>
                  </div>
                  <button
                    onClick={() => onBuyItem(item.id)}
                    className="w-full py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold text-xs font-mono-num cursor-pointer"
                  >
                    Comprar · {formatKwanzas(item.price)}
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* DEALERSHIP */}
          {building.type === 'dealership' && (
            <div className="space-y-3">
              {VEHICLE_CATALOG.map((v) => {
                const owned = player.ownedVehicles.includes(v.id);
                const active = player.activeVehicleId === v.id;
                return (
                  <div
                    key={v.id}
                    className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center border border-zinc-700 shrink-0"
                        style={{ backgroundColor: v.color }}
                      >
                        <Car className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-white">{v.name}</p>
                        <p className="text-xs text-zinc-400">{v.description}</p>
                      </div>
                    </div>
                    {owned ? (
                      <button
                        onClick={() => onSelectVehicle(v.id)}
                        className={`px-3.5 py-2 rounded-lg text-xs font-semibold shrink-0 cursor-pointer ${
                          active
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-zinc-100 hover:bg-white text-zinc-950'
                        }`}
                      >
                        {active ? 'Estacionado' : 'Usar Veículo'}
                      </button>
                    ) : (
                      <button
                        onClick={() => onBuyVehicle(v)}
                        className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold text-xs font-mono-num shrink-0 cursor-pointer"
                      >
                        {formatKwanzas(v.price)}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* GAS STATION & MECHANIC */}
          {building.type === 'gas_station' && (
            <div className="space-y-3">
              <div className="p-5 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Fuel className="w-7 h-7 text-amber-400" />
                  <div>
                    <p className="font-semibold text-white text-sm">Atestar Depósito (100%)</p>
                    <p className="text-xs text-zinc-400">
                      Combustível atual: <span className="font-mono-num text-zinc-200">{Math.round(player.vehicleFuel)}%</span>
                    </p>
                  </div>
                </div>
                <button
                  disabled={!player.activeVehicleId}
                  onClick={onRefuel}
                  className={`px-4 py-2.5 rounded-xl font-semibold text-xs font-mono-num cursor-pointer ${
                    player.activeVehicleId
                      ? 'bg-amber-500 hover:bg-amber-400 text-zinc-950'
                      : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                  }`}
                >
                  {player.activeVehicleId ? 'Abastecer · 3.000 Kz' : 'Sem Veículo'}
                </button>
              </div>

              <div className="p-5 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Wrench className="w-7 h-7 text-emerald-400" />
                  <div>
                    <p className="font-semibold text-white text-sm">Oficina — Reparar Carroçaria & Motor</p>
                    <p className="text-xs text-zinc-400">
                      Integridade atual: <span className="font-mono-num text-zinc-200">{Math.round(vehicleHealth)}%</span>
                    </p>
                  </div>
                </div>
                <button
                  disabled={!player.activeVehicleId || vehicleHealth >= 100}
                  onClick={onRepairVehicle}
                  className={`px-4 py-2.5 rounded-xl font-semibold text-xs font-mono-num cursor-pointer ${
                    player.activeVehicleId && vehicleHealth < 100
                      ? 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950'
                      : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                  }`}
                >
                  {vehicleHealth >= 100 ? 'Impecável' : 'Reparar · 4.500 Kz'}
                </button>
              </div>
            </div>
          )}

          {/* REAL ESTATE */}
          {building.type === 'real_estate' && (
            <div className="space-y-3">
              {PROPERTY_CATALOG.filter((p) => p.price > 0).map((prop) => {
                const owned = player.ownedProperties.includes(prop.id);
                return (
                  <div
                    key={prop.id}
                    className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3">
                      <Building2 className="w-6 h-6 text-amber-400 shrink-0" />
                      <div>
                        <p className="font-semibold text-sm text-white">{prop.name}</p>
                        <p className="text-xs text-zinc-400">{prop.description}</p>
                      </div>
                    </div>
                    {owned ? (
                      <span className="flex items-center gap-1 text-xs font-semibold text-emerald-400 shrink-0">
                        <CheckCircle2 className="w-4 h-4" />
                        Proprietário
                      </span>
                    ) : (
                      <button
                        onClick={() => onBuyProperty(prop)}
                        className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold text-xs font-mono-num shrink-0 cursor-pointer"
                      >
                        {formatKwanzas(prop.price)}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* HOSPITAL */}
          {building.type === 'hospital' && (
            <div className="p-5 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <HeartPulse className="w-7 h-7 text-red-400" />
                <div>
                  <p className="font-semibold text-white text-sm">Consulta & Recuperação</p>
                  <p className="text-xs text-zinc-400">Restaura energia, hidratação e bem-estar geral.</p>
                </div>
              </div>
              <button
                onClick={onHospitalCare}
                className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold text-xs font-mono-num cursor-pointer"
              >
                4.000 Kz
              </button>
            </div>
          )}

          {/* GUN SHOP */}
          {building.type === 'gun_shop' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-white text-sm">Caixa de Munições (+30 balas)</p>
                  <p className="text-xs text-zinc-400">
                    Munições atuais: <span className="font-mono-num text-amber-400">{player.ammo}</span> · Prima [Espaço] para disparar
                  </p>
                </div>
                <button
                  onClick={onBuyAmmo}
                  className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold text-xs font-mono-num cursor-pointer"
                >
                  6.000 Kz
                </button>
              </div>

              <div className="space-y-2.5">
                {WEAPON_CATALOG.map((w) => {
                  const owned = player.ownedWeapons.includes(w.id);
                  const equipped = player.equippedWeaponId === w.id;
                  return (
                    <div
                      key={w.id}
                      className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3">
                        <Crosshair className="w-5 h-5 text-red-400 shrink-0" />
                        <div>
                          <p className="font-semibold text-sm text-white">{w.name}</p>
                          <p className="text-xs text-zinc-400">{w.description}</p>
                        </div>
                      </div>
                      {owned ? (
                        <button
                          onClick={() => onEquipWeapon(equipped ? null : w.id)}
                          className={`px-3.5 py-2 rounded-lg text-xs font-semibold shrink-0 cursor-pointer ${
                            equipped
                              ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30'
                              : 'bg-zinc-100 hover:bg-white text-zinc-950'
                          }`}
                        >
                          {equipped ? 'Guardar' : 'Equipar'}
                        </button>
                      ) : (
                        <button
                          onClick={() => onBuyWeapon(w)}
                          className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold text-xs font-mono-num shrink-0 cursor-pointer"
                        >
                          {formatKwanzas(w.price)}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* POLICE STATION */}
          {building.type === 'police_station' && (
            <div className="p-5 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <ShieldAlert className="w-7 h-7 text-sky-400 shrink-0" />
                <div>
                  <p className="font-semibold text-white text-sm">
                    {player.wantedLevel > 0
                      ? `Nível de Procurado: ${player.wantedLevel} estrela(s)`
                      : 'Registo Limpo — Sem Ocorrências'}
                  </p>
                  <p className="text-xs text-zinc-400">
                    {player.wantedLevel > 0
                      ? 'Pague a multa policial para limpar o seu nível de alerta.'
                      : 'A Polícia Nacional patrulha todas as estradas de Luanda.'}
                  </p>
                </div>
              </div>
              {player.wantedLevel > 0 && (
                <button
                  onClick={onPayPoliceFine}
                  className="px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-zinc-950 font-semibold text-xs font-mono-num shrink-0 cursor-pointer"
                >
                  Pagar {formatKwanzas(player.wantedLevel * 8000)}
                </button>
              )}
            </div>
          )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
