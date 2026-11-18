import React, { useState } from 'react';
import { ArrowLeft, Check } from 'lucide-react';
import { CharacterAppearance, Gender, HairStyle } from '../types/game';

interface CharacterCreatorProps {
  initialAppearance: CharacterAppearance;
  onChangePreview: (appearance: CharacterAppearance) => void;
  onConfirm: (appearance: CharacterAppearance) => void;
  onCancel: () => void;
}

const SKIN_TONES = ['#4a2c18', '#5c3a21', '#7c4d2b', '#9c6644', '#c68642', '#e0ac69'];
const HAIR_COLORS = ['#18181b', '#3f2305', '#78350f', '#b45309', '#52525b'];
const SHIRT_COLORS = ['#f59e0b', '#0284c7', '#16a34a', '#dc2626', '#f4f4f5', '#7c3aed', '#18181b'];
const PANTS_COLORS = ['#1e293b', '#18181b', '#334155', '#78350f', '#3f3f46'];
const SHOES_COLORS = ['#18181b', '#f4f4f5', '#7c2d12', '#1d4ed8'];

const HAIR_STYLES: { id: HairStyle; label: string }[] = [
  { id: 'curto', label: 'Curto' },
  { id: 'afro', label: 'Afro' },
  { id: 'trancas', label: 'Tranças' },
  { id: 'medio', label: 'Médio' },
];

export const CharacterCreator: React.FC<CharacterCreatorProps> = ({
  initialAppearance,
  onChangePreview,
  onConfirm,
  onCancel,
}) => {
  const [appearance, setAppearance] = useState<CharacterAppearance>(initialAppearance);
  const [error, setError] = useState('');

  const update = (patch: Partial<CharacterAppearance>) => {
    const next = { ...appearance, ...patch };
    setAppearance(next);
    onChangePreview(next);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = appearance.name.trim();
    if (trimmed.length < 2) {
      setError('Escolha um nome com pelo menos 2 letras.');
      return;
    }
    onConfirm({ ...appearance, name: trimmed });
  };

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-4 md:p-8 bg-zinc-950/75">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-zinc-950 border border-zinc-800 rounded-2xl p-6 md:p-8 shadow-2xl"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white font-display">Criar Personagem</h2>
            <p className="text-sm text-zinc-400">
              Defina a sua identidade antes de iniciar a sua vida na Maianga, Luanda.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-sm cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left column: Identity & Hair */}
          <div className="space-y-5">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                Nome do Personagem
              </label>
              <input
                type="text"
                maxLength={24}
                value={appearance.name}
                onChange={(e) => {
                  setError('');
                  update({ name: e.target.value });
                }}
                placeholder="Ex: Kelson, Esperança, Mauro..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-white text-sm focus:outline-none focus:border-amber-500"
              />
              {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Género</label>
              <div className="grid grid-cols-2 gap-2">
                {(['homem', 'mulher'] as Gender[]).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => update({ gender: g })}
                    className={`py-2.5 rounded-xl text-sm font-medium capitalize transition-colors cursor-pointer ${
                      appearance.gender === g
                        ? 'bg-amber-500 text-zinc-950 font-semibold'
                        : 'bg-zinc-900 text-zinc-300 border border-zinc-800 hover:bg-zinc-800'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Tom de Pele</label>
              <div className="flex flex-wrap gap-2">
                {SKIN_TONES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => update({ skinTone: c })}
                    style={{ backgroundColor: c }}
                    className={`w-8 h-8 rounded-full border-2 cursor-pointer ${
                      appearance.skinTone === c ? 'border-amber-400 scale-110' : 'border-zinc-700'
                    }`}
                    aria-label={`Tom de pele ${c}`}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Estilo de Cabelo</label>
              <div className="grid grid-cols-2 gap-2">
                {HAIR_STYLES.map((h) => (
                  <button
                    key={h.id}
                    type="button"
                    onClick={() => update({ hairStyle: h.id })}
                    className={`py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                      appearance.hairStyle === h.id
                        ? 'bg-zinc-100 text-zinc-950 font-semibold'
                        : 'bg-zinc-900 text-zinc-300 border border-zinc-800 hover:bg-zinc-800'
                    }`}
                  >
                    {h.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right column: Outfit colors */}
          <div className="space-y-5">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Cor do Cabelo</label>
              <div className="flex flex-wrap gap-2">
                {HAIR_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => update({ hairColor: c })}
                    style={{ backgroundColor: c }}
                    className={`w-8 h-8 rounded-full border-2 cursor-pointer ${
                      appearance.hairColor === c ? 'border-amber-400 scale-110' : 'border-zinc-700'
                    }`}
                    aria-label={`Cor do cabelo ${c}`}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Camisa / Top Inicial</label>
              <div className="flex flex-wrap gap-2">
                {SHIRT_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => update({ shirtColor: c })}
                    style={{ backgroundColor: c }}
                    className={`w-8 h-8 rounded-full border-2 cursor-pointer ${
                      appearance.shirtColor === c ? 'border-amber-400 scale-110' : 'border-zinc-700'
                    }`}
                    aria-label={`Cor da camisa ${c}`}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Calças</label>
              <div className="flex flex-wrap gap-2">
                {PANTS_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => update({ pantsColor: c })}
                    style={{ backgroundColor: c }}
                    className={`w-8 h-8 rounded-full border-2 cursor-pointer ${
                      appearance.pantsColor === c ? 'border-amber-400 scale-110' : 'border-zinc-700'
                    }`}
                    aria-label={`Cor das calças ${c}`}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Calçado</label>
              <div className="flex flex-wrap gap-2">
                {SHOES_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => update({ shoesColor: c })}
                    style={{ backgroundColor: c }}
                    className={`w-8 h-8 rounded-full border-2 cursor-pointer ${
                      appearance.shoesColor === c ? 'border-amber-400 scale-110' : 'border-zinc-700'
                    }`}
                    aria-label={`Cor do calçado ${c}`}
                  />
                ))}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-400 space-y-1">
              <p className="text-zinc-200 font-medium">Início da Jornada</p>
              <p>Saldo inicial: <span className="text-amber-400 font-mono-num">25.000 Kz</span></p>
              <p>Residência: <span className="text-zinc-200">Casa Arrendada na Maianga</span></p>
            </div>
          </div>
        </div>

        <div className="mt-7 flex justify-end">
          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold text-sm transition-colors cursor-pointer"
          >
            <Check className="w-4 h-4" />
            Começar Vida em Luanda
          </button>
        </div>
      </form>
    </div>
  );
};
