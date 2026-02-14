import { Character, type GameState } from '../../game/types';
import { getCharactersThatBlock } from '../../game/characters';
import { getAlivePlayers, getPlayerById } from '../../game/gameEngine';
import { CHAR_EMOJI, CHAR_NAME } from './PlayerSlot';

interface ChallengeBlockModalProps {
    gameState: GameState;
    mode: 'challenge-action' | 'block' | 'challenge-block';
    onChallenge: () => void;
    onPass: () => void;
    onBlock?: (character: Character) => void;
}

export default function ChallengeBlockModal({
    gameState,
    mode,
    onChallenge,
    onPass,
    onBlock,
}: ChallengeBlockModalProps) {
    const action = gameState.pendingAction;
    const block = gameState.pendingBlock;

    if (!action && !block) return null;

    let title = '';
    let description = '';

    if (mode === 'challenge-action' && action) {
        const actor = getPlayerById(gameState, action.sourcePlayerId);
        title = `${actor.name} declara ${action.type}`;
        description = action.claimedCharacter
            ? `Afirma ter ${CHAR_NAME[action.claimedCharacter]} ${CHAR_EMOJI[action.claimedCharacter]}`
            : 'Ação geral';
    } else if (mode === 'block' && action) {
        const actor = getPlayerById(gameState, action.sourcePlayerId);
        title = `${actor.name} quer ${action.type}`;
        description = 'Você pode bloquear esta ação!';
    } else if (mode === 'challenge-block' && block) {
        const blocker = getPlayerById(gameState, block.blockingPlayerId);
        title = `${blocker.name} bloqueia com ${CHAR_NAME[block.claimedCharacter]}`;
        description = `${CHAR_EMOJI[block.claimedCharacter]} Deseja desafiar o bloqueio?`;
    }

    const blockableChars =
        mode === 'block' && action
            ? getCharactersThatBlock(action.type, gameState.config.enabledCharacters)
            : [];

    return (
        <div className="bg-gray-800/80 border border-amber-500/30 rounded-xl p-4 space-y-3 backdrop-blur-sm animate-slide-up">
            <div className="text-center">
                <h3 className="text-amber-300 font-bold text-sm">{title}</h3>
                <p className="text-amber-200/50 text-xs mt-1">{description}</p>
            </div>

            <div className="flex flex-col gap-2">
                {(mode === 'challenge-action' || mode === 'challenge-block') && (
                    <button
                        onClick={onChallenge}
                        className="w-full py-2.5 rounded-lg font-semibold text-sm bg-orange-500/10 border border-orange-500/40 text-orange-400 hover:bg-orange-500/20 transition-all"
                    >
                        ❗ Desafiar
                    </button>
                )}

                {mode === 'block' && blockableChars.length > 0 && onBlock && (
                    <div className="grid grid-cols-2 gap-2">
                        {blockableChars.map((char) => (
                            <button
                                key={char}
                                onClick={() => onBlock(char)}
                                className="py-2.5 rounded-lg font-semibold text-sm bg-purple-500/10 border border-purple-500/40 text-purple-400 hover:bg-purple-500/20 transition-all"
                            >
                                🛡️ Bloquear ({CHAR_NAME[char]})
                            </button>
                        ))}
                    </div>
                )}

                <button
                    onClick={onPass}
                    className="w-full py-2 rounded-lg text-sm text-gray-400 border border-gray-700/50 hover:bg-gray-700/30 transition-all"
                >
                    Passar
                </button>
            </div>

            <style>{`
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
        </div>
    );
}
