import { type Player, Character } from '../../game/types';
import { getAliveInfluence } from '../../game/gameEngine';
import { CHAR_EMOJI, CHAR_NAME } from './PlayerSlot';

interface CardSelectModalProps {
    player: Player;
    mode: 'lose' | 'exchange';
    drawnCards?: Character[];
    onSelectToLose?: (cardIndex: number) => void;
    onCompleteExchange?: (kept: Character[], returned: Character[]) => void;
}

export default function CardSelectModal({
    player,
    mode,
    drawnCards = [],
    onSelectToLose,
    onCompleteExchange,
}: CardSelectModalProps) {
    if (mode === 'lose') {
        const aliveCards = player.influenceCards
            .map((c, i) => ({ card: c, index: i }))
            .filter((x) => !x.card.isRevealed);

        return (
            <div className="bg-gray-800/80 border border-red-500/30 rounded-xl p-4 space-y-3 backdrop-blur-sm">
                <div className="text-center">
                    <h3 className="text-red-400 font-bold text-sm">Escolha uma carta para perder</h3>
                    <p className="text-red-300/50 text-xs mt-1">Esta carta será revelada</p>
                </div>

                <div className="flex gap-3 justify-center">
                    {aliveCards.map(({ card, index }) => (
                        <button
                            key={index}
                            onClick={() => onSelectToLose?.(index)}
                            className="py-4 px-6 rounded-xl border border-red-500/30 bg-red-500/5 hover:bg-red-500/15 hover:border-red-500/50 transition-all hover:-translate-y-1 active:translate-y-0 text-center"
                        >
                            <div className="text-2xl mb-1">{CHAR_EMOJI[card.character]}</div>
                            <div className="text-xs text-red-300 font-medium">{CHAR_NAME[card.character]}</div>
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    // Exchange mode
    const aliveCards = getAliveInfluence(player).map((c) => c.character);
    const allCards = [...aliveCards, ...drawnCards];
    const keepCount = aliveCards.length;

    return <ExchangeSelector allCards={allCards} keepCount={keepCount} onComplete={onCompleteExchange!} />;
}

import { useState } from 'react';

function ExchangeSelector({
    allCards,
    keepCount,
    onComplete,
}: {
    allCards: Character[];
    keepCount: number;
    onComplete: (kept: Character[], returned: Character[]) => void;
}) {
    const [selected, setSelected] = useState<number[]>([]);

    const toggle = (idx: number) => {
        setSelected((prev) =>
            prev.includes(idx)
                ? prev.filter((i) => i !== idx)
                : prev.length < keepCount
                    ? [...prev, idx]
                    : prev
        );
    };

    const handleConfirm = () => {
        const kept = selected.map((i) => allCards[i]);
        const returned = allCards.filter((_, i) => !selected.includes(i));
        onComplete(kept, returned);
    };

    return (
        <div className="bg-gray-800/80 border border-emerald-500/30 rounded-xl p-4 space-y-3 backdrop-blur-sm">
            <div className="text-center">
                <h3 className="text-emerald-400 font-bold text-sm">
                    Escolha {keepCount} carta(s) para manter
                </h3>
                <p className="text-emerald-300/50 text-xs mt-1">As outras voltam ao baralho</p>
            </div>

            <div className="flex gap-2 justify-center flex-wrap">
                {allCards.map((char, idx) => (
                    <button
                        key={idx}
                        onClick={() => toggle(idx)}
                        className={`py-3 px-4 rounded-xl border transition-all text-center ${selected.includes(idx)
                                ? 'border-emerald-500/60 bg-emerald-500/15 scale-105'
                                : 'border-gray-600/30 bg-gray-700/20 hover:border-gray-500/40'
                            }`}
                    >
                        <div className="text-xl mb-1">{CHAR_EMOJI[char]}</div>
                        <div className={`text-[10px] font-medium ${selected.includes(idx) ? 'text-emerald-300' : 'text-gray-400'}`}>
                            {CHAR_NAME[char]}
                        </div>
                    </button>
                ))}
            </div>

            <button
                onClick={handleConfirm}
                disabled={selected.length !== keepCount}
                className="w-full py-2.5 rounded-lg font-semibold text-sm bg-emerald-500/10 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
                Confirmar ({selected.length}/{keepCount})
            </button>
        </div>
    );
}
