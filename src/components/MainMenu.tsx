import React from 'react';
import { Play, RotateCcw, Settings, Users } from 'lucide-react';
import { SaveGameData } from '../types/game';
import { formatKwanzas } from '../data/luandaWorld';

interface MainMenuProps {
  savedGame: SaveGameData | null;
  onNewGame: () => void;
  onContinueGame: () => void;
  onOpenSettings: () => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  savedGame,
  onNewGame,
  onContinueGame,
  onOpenSettings,
}) => {
  return (
    <div className="fixed inset-0 z-20 flex items-center justify-start p-6 md:p-16 pointer-events-none">
      <div className="w-full max-w-md bg-zinc-950/92 border border-zinc-800 rounded-2xl p-8 shadow-2xl pointer-events-auto">
        <div className="mb-8">
          <p className="text-xs font-medium tracking-widest uppercase text-amber-400 mb-2">
            Simulador de Vida em Mundo Aberto 3D
          </p>
          <h1 className="text-5xl font-extrabold tracking-tight text-white font-display">
            LUANDA
          </h1>
          <p className="mt-3 text-sm text-zinc-400 leading-relaxed">
            Explore a Marginal, a Ilha, Ingombota, Maianga, Talatona e Kilamba. Estude, escolha a sua profissão, conduza veículos e construa a sua vida em Kwanzas.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          {savedGame && (
            <button
              onClick={onContinueGame}
              className="w-full flex items-center justify-between px-5 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2.5">
                <Play className="w-4 h-4 fill-current" />
                Continuar Jogo
              </span>
              <span className="text-xs font-mono-num opacity-80">
                {savedGame.player.appearance.name} · Dia {savedGame.time.day} · {formatKwanzas(savedGame.player.money)}
              </span>
            </button>
          )}

          <button
            onClick={onNewGame}
            className={`w-full flex items-center justify-center gap-2.5 px-5 py-3.5 rounded-xl font-semibold transition-colors cursor-pointer ${
              savedGame
                ? 'bg-zinc-900 hover:bg-zinc-800 text-white border border-zinc-700'
                : 'bg-amber-500 hover:bg-amber-400 text-zinc-950'
            }`}
          >
            <RotateCcw className="w-4 h-4" />
            Novo Jogo
          </button>

          <button
            onClick={onOpenSettings}
            className="w-full flex items-center justify-center gap-2.5 px-5 py-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 text-sm font-medium transition-colors cursor-pointer"
          >
            <Settings className="w-4 h-4" />
            Configurações
          </button>
        </div>

        <div className="mt-7 pt-5 border-t border-zinc-800/80 flex items-start gap-3 text-xs text-zinc-400">
          <Users className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-zinc-300 font-medium">Multijogador Online (Próxima Etapa)</p>
            <p className="mt-0.5 leading-relaxed">
              Arquitetura preparada para salas partilhadas, chat e empresas conjuntas. Versão atual: modo 1 jogador completo com salvamento local.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
