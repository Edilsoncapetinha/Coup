import { type Player, type InfluenceCard, Character, Faction } from '../../game/types';

const CHAR_EMOJI: Record<Character, string> = {
    [Character.Duke]: '👑',
    [Character.Assassin]: '🗡️',
    [Character.Captain]: '⚓',
    [Character.Ambassador]: '📜',
    [Character.Contessa]: '👸',
    [Character.Inquisitor]: '🔍',
    [Character.Jester]: '🃏',
    [Character.Bureaucrat]: '📋',
    [Character.Speculator]: '💰',
    [Character.Socialist]: '✊',
};

const CHAR_NAME: Record<Character, string> = {
    [Character.Duke]: 'Duque',
    [Character.Assassin]: 'Assassino',
    [Character.Captain]: 'Capitão',
    [Character.Ambassador]: 'Embaixador',
    [Character.Contessa]: 'Condessa',
    [Character.Inquisitor]: 'Inquisidor',
    [Character.Jester]: 'Bufão',
    [Character.Bureaucrat]: 'Burocrata',
    [Character.Speculator]: 'Especulador',
    [Character.Socialist]: 'Socialista',
};

const CHAR_IMAGE: Partial<Record<Character, string>> = {
    [Character.Captain]: '/cartas/capitao.png',
    [Character.Duke]: '/cartas/duque.png',
    [Character.Assassin]: '/cartas/assassino.png',
    [Character.Contessa]: '/cartas/condessa.png',
    [Character.Ambassador]: '/cartas/embaixador.png',
    [Character.Inquisitor]: '/cartas/inquisidor.png',
    [Character.Jester]: '/cartas/bufao.png',
};

interface PlayerSlotProps {
    player: Player;
    isCurrentTurn: boolean;
    isHuman: boolean;
    showCards?: boolean;
    compact?: boolean;
}

export default function PlayerSlot({
    player,
    isCurrentTurn,
    isHuman,
    showCards = false,
    compact = false,
}: PlayerSlotProps) {
    return (
        <div
            className={`relative rounded-xl border transition-all duration-500 ${player.isEliminated
                ? 'opacity-40 border-gray-800 bg-gray-900/50'
                : isCurrentTurn
                    ? 'border-amber-500/60 bg-amber-500/10 shadow-lg shadow-amber-500/10 scale-[1.02]'
                    : 'border-gray-700/50 bg-gray-800/40'
                } ${compact ? 'p-3' : 'p-4'}`}
        >
            {/* Turn indicator */}
            {isCurrentTurn && !player.isEliminated && (
                <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-amber-400 rounded-full animate-pulse" />
            )}

            {/* Header row */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-amber-200">
                        {player.name}
                    </span>
                    {isHuman && (
                        <span className="text-[9px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-full font-medium">
                            VOCÊ
                        </span>
                    )}
                    {player.faction && (
                        <span
                            className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${player.faction === Faction.Loyalist
                                ? 'bg-blue-500/20 text-blue-400'
                                : 'bg-red-500/20 text-red-400'
                                }`}
                        >
                            {player.faction === Faction.Loyalist ? 'Lealista' : 'Reformista'}
                        </span>
                    )}
                </div>

                {/* Coins */}
                <div className="flex items-center gap-1">
                    <span className="text-amber-400 text-sm">🪙</span>
                    <span className="text-amber-300 font-bold text-sm">{player.coins}</span>
                </div>
            </div>

            {/* Cards */}
            <div className="flex gap-2">
                {player.influenceCards.map((card, idx) => (
                    <CardChip
                        key={idx}
                        card={card}
                        showFace={isHuman || card.isRevealed || showCards}
                    />
                ))}
            </div>

            {player.isEliminated && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-red-500/60 text-2xl font-black tracking-widest rotate-[-10deg]">
                        ELIMINADO
                    </span>
                </div>
            )}
        </div>
    );
}

function CardChip({ card, showFace }: { card: InfluenceCard; showFace: boolean }) {
    const imageSrc = CHAR_IMAGE[card.character];

    if (card.isRevealed) {
        return (
            <div className="flex-1 rounded-lg border border-red-900/40 bg-red-950/30 text-center overflow-hidden opacity-50">
                {imageSrc ? (
                    <img
                        src={imageSrc}
                        alt={CHAR_NAME[card.character]}
                        className="w-full h-20 object-cover grayscale brightness-50"
                        draggable={false}
                    />
                ) : (
                    <div className="py-2 px-2">
                        <div className="text-lg">{CHAR_EMOJI[card.character]}</div>
                    </div>
                )}
                <div className="text-[9px] text-red-300/60 py-1 line-through">
                    {CHAR_NAME[card.character]}
                </div>
            </div>
        );
    }

    if (showFace) {
        return (
            <div className="flex-1 rounded-lg border border-amber-500/30 bg-gradient-to-b from-amber-500/10 to-amber-500/5 text-center overflow-hidden hover:border-amber-500/50 hover:shadow-md hover:shadow-amber-500/10 transition-all group">
                {imageSrc ? (
                    <img
                        src={imageSrc}
                        alt={CHAR_NAME[card.character]}
                        className="w-full h-20 object-cover group-hover:scale-105 transition-transform duration-300"
                        draggable={false}
                    />
                ) : (
                    <div className="py-2 px-2">
                        <div className="text-lg">{CHAR_EMOJI[card.character]}</div>
                    </div>
                )}
                <div className="text-[9px] text-amber-300 py-1 font-medium">
                    {CHAR_NAME[card.character]}
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 rounded-lg border border-gray-600/30 bg-gradient-to-b from-gray-700/30 to-gray-800/30 text-center overflow-hidden">
            <div className="h-20 flex items-center justify-center bg-gradient-to-br from-gray-700/40 to-gray-900/40">
                <span className="text-2xl opacity-40">🂠</span>
            </div>
            <div className="text-[9px] text-gray-500 py-1">???</div>
        </div>
    );
}

export { CHAR_EMOJI, CHAR_NAME, CHAR_IMAGE };
