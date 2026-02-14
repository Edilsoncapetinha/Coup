import { useNavigate } from 'react-router-dom';
import { type GameState } from '../../game/types';
import { getPlayerById } from '../../game/gameEngine';

interface GameOverScreenProps {
    gameState: GameState;
    onPlayAgain: () => void;
}

export default function GameOverScreen({ gameState, onPlayAgain }: GameOverScreenProps) {
    const navigate = useNavigate();
    const winner = gameState.winnerId ? getPlayerById(gameState, gameState.winnerId) : null;
    const isHumanWinner = winner?.isHuman ?? false;

    return (
        <div className="fixed inset-0 bg-gray-950/90 backdrop-blur-md flex items-center justify-center z-50 animate-fade">
            <div className="text-center space-y-6 p-8">
                {/* Celebration or Defeat */}
                <div className="text-6xl mb-4">
                    {isHumanWinner ? '🎉' : '💀'}
                </div>

                <h1
                    className={`text-4xl font-black ${isHumanWinner
                            ? 'text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-yellow-400'
                            : 'text-red-400'
                        }`}
                >
                    {isHumanWinner ? 'Vitória!' : 'Derrota!'}
                </h1>

                <p className="text-lg text-amber-200/60">
                    {winner?.name} venceu a partida em {gameState.turnNumber} turnos
                </p>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4 max-w-xs mx-auto mt-6">
                    <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-3">
                        <p className="text-2xl font-bold text-amber-400">{gameState.turnNumber}</p>
                        <p className="text-[10px] text-amber-200/40 uppercase">Turnos</p>
                    </div>
                    <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-3">
                        <p className="text-2xl font-bold text-amber-400">{gameState.players.length}</p>
                        <p className="text-[10px] text-amber-200/40 uppercase">Jogadores</p>
                    </div>
                </div>

                {/* Buttons */}
                <div className="flex flex-col gap-3 mt-6">
                    <button
                        onClick={onPlayAgain}
                        className="py-3 px-8 rounded-xl font-bold text-base bg-gradient-to-r from-amber-500 to-amber-600 text-gray-900 hover:from-amber-400 hover:to-amber-500 transition-all hover:-translate-y-0.5"
                    >
                        🔄 Jogar Novamente
                    </button>
                    <button
                        onClick={() => navigate('/')}
                        className="py-2.5 px-8 rounded-xl text-sm text-gray-400 border border-gray-700/50 hover:bg-gray-800/50 transition-all"
                    >
                        Menu Principal
                    </button>
                </div>
            </div>

            <style>{`
        @keyframes fade {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade {
          animation: fade 0.5s ease-out;
        }
      `}</style>
        </div>
    );
}
