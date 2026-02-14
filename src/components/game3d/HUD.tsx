import { useState } from 'react';
import { GamePhase, ActionType, Character, type GameState, type GameAction } from '../../game/types';
import { getAlivePlayers, getAliveInfluence, getPlayerById } from '../../game/gameEngine';
import { CHARACTER_DEFINITIONS, getCharactersThatBlock } from '../../game/characters';

/**
 * HUD overlay — 2D interface rendered on top of the 3D scene.
 * Handles all player interactions: actions, challenges, blocks, card selection.
 */

interface HUDProps {
    gameState: GameState;
    onAction: (action: GameAction) => void;
    onChallenge: (playerId: string) => void;
    onPassChallenge: (playerId: string) => void;
    onBlock: (playerId: string, character: Character) => void;
    onPassBlock: (playerId: string) => void;
    onChallengeBlock: (playerId: string) => void;
    onChooseCard: (playerId: string, cardIndex: number) => void;
    onExchange: (playerId: string, kept: Character[], returned: Character[]) => void;
    onExamine: (forceExchange: boolean, cardIndex: number) => void;
    availableActions: ActionType[];
}

const ACTION_LABELS: Record<string, string> = {
    [ActionType.Income]: 'Renda',
    [ActionType.ForeignAid]: 'Ajuda Externa',
    [ActionType.Coup]: 'Golpe',
    [ActionType.Tax]: 'Taxar',
    [ActionType.Assassinate]: 'Assassinar',
    [ActionType.Steal]: 'Roubar',
    [ActionType.Exchange]: 'Trocar',
    [ActionType.Examine]: 'Examinar',
    [ActionType.JesterExchange]: 'Troca Bufão',
    [ActionType.BureaucratTax]: 'Taxa Burocr.',
    [ActionType.SpeculatorTax]: 'Especular',
    [ActionType.SocialistRedistribute]: 'Redistribuir',
};

const CHAR_LABELS: Record<Character, string> = {
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

export default function HUD({
    gameState,
    onAction,
    onChallenge,
    onPassChallenge,
    onBlock,
    onPassBlock,
    onChallengeBlock,
    onChooseCard,
    onExchange,
    onExamine,
    availableActions,
}: HUDProps) {
    const humanPlayer = gameState.players.find((p) => p.isHuman);
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    const isHumanTurn = currentPlayer?.isHuman ?? false;
    const phase = gameState.phase;

    const humanNeedsToRespond =
        humanPlayer &&
        !humanPlayer.isEliminated &&
        !gameState.respondedPlayerIds.includes(humanPlayer.id) &&
        humanPlayer.id !== gameState.pendingAction?.sourcePlayerId;

    return (
        <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 10 }}>
            {/* Top bar: turn info + player stats */}
            <div className="pointer-events-auto flex items-center justify-between px-6 py-3">
                <div className="bg-black/70 backdrop-blur-md rounded-xl px-4 py-2 border border-amber-500/20">
                    <span className="text-amber-400 font-bold text-sm">Turno {gameState.turnNumber}</span>
                    <span className="text-gray-500 mx-2">·</span>
                    <span className="text-amber-200/60 text-xs">
                        {currentPlayer.name}{isHumanTurn ? ' (Você)' : ''}
                    </span>
                </div>

                {/* Opponent coin counters */}
                <div className="flex gap-2">
                    {gameState.players.filter((p) => !p.isHuman && !p.isEliminated).map((p) => (
                        <div
                            key={p.id}
                            className={`bg-black/70 backdrop-blur-md rounded-lg px-3 py-1.5 border text-xs ${gameState.currentPlayerIndex === gameState.players.indexOf(p)
                                    ? 'border-amber-500/40 text-amber-300'
                                    : 'border-gray-700/40 text-gray-400'
                                }`}
                        >
                            {p.name} · 🪙{p.coins}
                        </div>
                    ))}
                </div>
            </div>

            {/* Game log — right side */}
            <div className="absolute right-4 top-16 w-64 pointer-events-auto">
                <div className="bg-black/60 backdrop-blur-md rounded-xl border border-gray-700/30 overflow-hidden">
                    <div className="px-3 py-1.5 border-b border-gray-700/30">
                        <span className="text-[10px] text-amber-300/50 uppercase tracking-wider font-bold">Log</span>
                    </div>
                    <div className="max-h-44 overflow-y-auto p-2 space-y-1">
                        {gameState.log.slice(-12).map((entry) => (
                            <p
                                key={entry.id}
                                className={`text-[11px] leading-snug ${entry.type === 'system' ? 'text-amber-400/70' :
                                        entry.type === 'challenge' ? 'text-orange-400/70' :
                                            entry.type === 'block' ? 'text-purple-400/70' :
                                                entry.type === 'elimination' ? 'text-red-400/70' :
                                                    entry.type === 'exchange' ? 'text-emerald-400/70' :
                                                        'text-gray-400/70'
                                    }`}
                            >
                                {entry.message}
                            </p>
                        ))}
                    </div>
                </div>
            </div>

            {/* Bottom panel — human player info + actions */}
            <div className="absolute bottom-0 left-0 right-0 pointer-events-auto">
                <div className="bg-gradient-to-t from-black/90 via-black/70 to-transparent pt-12 pb-4 px-6">
                    {/* Your cards info */}
                    {humanPlayer && (
                        <div className="flex items-center gap-4 mb-3">
                            <div className="flex items-center gap-2">
                                <span className="text-amber-400 text-sm font-bold">{humanPlayer.name}</span>
                                <span className="text-amber-300/60 text-xs">🪙 {humanPlayer.coins}</span>
                            </div>
                            <div className="flex gap-1">
                                {humanPlayer.influenceCards.map((card, i) => (
                                    <span
                                        key={i}
                                        className={`text-xs px-2 py-0.5 rounded ${card.isRevealed
                                                ? 'bg-red-900/40 text-red-400/50 line-through'
                                                : 'bg-amber-500/20 text-amber-300'
                                            }`}
                                    >
                                        {card.isRevealed ? CHAR_LABELS[card.character] : CHAR_LABELS[card.character]}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Action buttons when it's human's turn */}
                    {isHumanTurn && phase === GamePhase.AwaitingAction && (
                        <ActionButtons
                            actions={availableActions}
                            gameState={gameState}
                            onAction={onAction}
                        />
                    )}

                    {/* Challenge on action */}
                    {phase === GamePhase.AwaitingChallengeOnAction && humanNeedsToRespond && humanPlayer && (
                        <ResponseBar
                            message={`${getPlayerById(gameState, gameState.pendingAction!.sourcePlayerId).name} declara ${gameState.pendingAction!.type}`}
                            buttons={[
                                { label: '❗ Desafiar', color: 'orange', onClick: () => onChallenge(humanPlayer.id) },
                                { label: 'Passar', color: 'gray', onClick: () => onPassChallenge(humanPlayer.id) },
                            ]}
                        />
                    )}

                    {/* Block opportunity */}
                    {phase === GamePhase.AwaitingBlock && humanNeedsToRespond && humanPlayer && gameState.pendingAction && (
                        <BlockBar
                            gameState={gameState}
                            humanId={humanPlayer.id}
                            onBlock={onBlock}
                            onPass={onPassBlock}
                        />
                    )}

                    {/* Challenge on block */}
                    {phase === GamePhase.AwaitingChallengeOnBlock && humanPlayer &&
                        gameState.pendingAction?.sourcePlayerId === humanPlayer.id && (
                            <ResponseBar
                                message={`${getPlayerById(gameState, gameState.pendingBlock!.blockingPlayerId).name} bloqueia com ${CHAR_LABELS[gameState.pendingBlock!.claimedCharacter]}`}
                                buttons={[
                                    { label: '❗ Desafiar Bloqueio', color: 'orange', onClick: () => onChallengeBlock(humanPlayer.id) },
                                    { label: 'Aceitar', color: 'gray', onClick: () => onPassChallenge(humanPlayer.id) },
                                ]}
                            />
                        )}

                    {/* Card selection (lose influence) */}
                    {phase === GamePhase.AwaitingCardSelection && humanPlayer &&
                        gameState.respondedPlayerIds.includes(humanPlayer.id) && (
                            <CardLoseBar player={humanPlayer} onChoose={(idx) => onChooseCard(humanPlayer.id, idx)} />
                        )}

                    {/* Exchange selection */}
                    {phase === GamePhase.AwaitingExchangeSelection && humanPlayer &&
                        gameState.pendingAction?.sourcePlayerId === humanPlayer.id && (
                            <ExchangeBar
                                player={humanPlayer}
                                drawnCards={gameState.drawnCards}
                                onExchange={(kept, returned) => onExchange(humanPlayer.id, kept, returned)}
                            />
                        )}

                    {/* Examine decision */}
                    {phase === GamePhase.AwaitingExamineDecision && humanPlayer &&
                        gameState.pendingAction?.sourcePlayerId === humanPlayer.id &&
                        gameState.pendingAction?.targetPlayerId && (
                            <ExamineBar gameState={gameState} onExamine={onExamine} />
                        )}

                    {/* Waiting message */}
                    {!isHumanTurn && phase === GamePhase.AwaitingAction && (
                        <p className="text-amber-200/30 text-sm text-center animate-pulse">
                            Aguardando {currentPlayer.name}...
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}

// ── Sub-components ────────────────────────────────

function ActionButtons({
    actions,
    gameState,
    onAction,
}: {
    actions: ActionType[];
    gameState: GameState;
    onAction: (action: GameAction) => void;
}) {
    const [targetFor, setTargetFor] = useState<ActionType | null>(null);
    const humanPlayer = gameState.players.find((p) => p.isHuman)!;
    const targets = getAlivePlayers(gameState).filter((p) => p.id !== humanPlayer.id);

    if (targetFor) {
        return (
            <div className="flex flex-wrap gap-2 items-center">
                <span className="text-amber-200/50 text-xs mr-2">Alvo para {ACTION_LABELS[targetFor]}:</span>
                {targets.map((t) => (
                    <button
                        key={t.id}
                        onClick={() => {
                            const charDef = Object.values(CHARACTER_DEFINITIONS).find((d) => d.action === targetFor);
                            onAction({
                                type: targetFor,
                                sourcePlayerId: humanPlayer.id,
                                targetPlayerId: t.id,
                                claimedCharacter: charDef?.character,
                            });
                            setTargetFor(null);
                        }}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/15 border border-red-500/30 text-red-300 hover:bg-red-500/25 transition-all"
                    >
                        🎯 {t.name}
                    </button>
                ))}
                <button onClick={() => setTargetFor(null)} className="text-[10px] text-gray-500 hover:text-gray-400 ml-2">
                    Cancelar
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-wrap gap-2">
            {actions.map((action) => {
                const charDef = Object.values(CHARACTER_DEFINITIONS).find((d) => d.action === action);
                const needsTarget = charDef?.requiresTarget || action === ActionType.Coup;

                return (
                    <button
                        key={action}
                        onClick={() => {
                            if (needsTarget) {
                                setTargetFor(action);
                            } else {
                                onAction({
                                    type: action,
                                    sourcePlayerId: humanPlayer.id,
                                    claimedCharacter: charDef?.character,
                                });
                            }
                        }}
                        className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-all hover:-translate-y-0.5 active:translate-y-0 ${charDef
                                ? 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20'
                                : 'bg-gray-800/50 border-gray-600/30 text-gray-300 hover:bg-gray-700/50'
                            }`}
                    >
                        {ACTION_LABELS[action] ?? action}
                    </button>
                );
            })}
        </div>
    );
}

function ResponseBar({
    message,
    buttons,
}: {
    message: string;
    buttons: { label: string; color: string; onClick: () => void }[];
}) {
    return (
        <div className="flex items-center gap-3">
            <span className="text-amber-200/60 text-xs flex-1">{message}</span>
            {buttons.map((btn, i) => (
                <button
                    key={i}
                    onClick={btn.onClick}
                    className={`px-4 py-2 rounded-lg text-xs font-semibold border transition-all ${btn.color === 'orange'
                            ? 'bg-orange-500/15 border-orange-500/40 text-orange-400 hover:bg-orange-500/25'
                            : 'bg-gray-800/50 border-gray-600/30 text-gray-400 hover:bg-gray-700/50'
                        }`}
                >
                    {btn.label}
                </button>
            ))}
        </div>
    );
}

function BlockBar({
    gameState,
    humanId,
    onBlock,
    onPass,
}: {
    gameState: GameState;
    humanId: string;
    onBlock: (playerId: string, character: Character) => void;
    onPass: (playerId: string) => void;
}) {
    const blockChars = getCharactersThatBlock(
        gameState.pendingAction!.type,
        gameState.config.enabledCharacters
    );

    return (
        <div className="flex items-center gap-3">
            <span className="text-amber-200/60 text-xs">Bloquear?</span>
            {blockChars.map((char) => (
                <button
                    key={char}
                    onClick={() => onBlock(humanId, char)}
                    className="px-3 py-2 rounded-lg text-xs font-semibold bg-purple-500/15 border border-purple-500/40 text-purple-400 hover:bg-purple-500/25 transition-all"
                >
                    🛡️ {CHAR_LABELS[char]}
                </button>
            ))}
            <button
                onClick={() => onPass(humanId)}
                className="px-3 py-2 rounded-lg text-xs text-gray-400 border border-gray-600/30 hover:bg-gray-700/50 transition-all"
            >
                Passar
            </button>
        </div>
    );
}

function CardLoseBar({
    player,
    onChoose,
}: {
    player: NonNullable<ReturnType<typeof getAlivePlayers>[0]>;
    onChoose: (index: number) => void;
}) {
    const aliveCards = player.influenceCards
        .map((c, i) => ({ card: c, index: i }))
        .filter((x) => !x.card.isRevealed);

    return (
        <div className="flex items-center gap-3">
            <span className="text-red-400/70 text-xs font-bold">Escolha uma carta para perder:</span>
            {aliveCards.map(({ card, index }) => (
                <button
                    key={index}
                    onClick={() => onChoose(index)}
                    className="px-4 py-2 rounded-lg text-xs font-semibold bg-red-500/15 border border-red-500/40 text-red-300 hover:bg-red-500/25 transition-all"
                >
                    {CHAR_LABELS[card.character]}
                </button>
            ))}
        </div>
    );
}

function ExchangeBar({
    player,
    drawnCards,
    onExchange,
}: {
    player: NonNullable<ReturnType<typeof getAlivePlayers>[0]>;
    drawnCards: Character[];
    onExchange: (kept: Character[], returned: Character[]) => void;
}) {
    const aliveCards = getAliveInfluence(player).map((c) => c.character);
    const allCards = [...aliveCards, ...drawnCards];
    const keepCount = aliveCards.length;
    const [selected, setSelected] = useState<number[]>([]);

    const toggle = (idx: number) => {
        setSelected((prev) =>
            prev.includes(idx) ? prev.filter((i) => i !== idx) : prev.length < keepCount ? [...prev, idx] : prev
        );
    };

    return (
        <div className="flex items-center gap-3 flex-wrap">
            <span className="text-emerald-400/70 text-xs font-bold">Mantenha {keepCount}:</span>
            {allCards.map((char, idx) => (
                <button
                    key={idx}
                    onClick={() => toggle(idx)}
                    className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-all ${selected.includes(idx)
                            ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 scale-105'
                            : 'bg-gray-800/50 border-gray-600/30 text-gray-400'
                        }`}
                >
                    {CHAR_LABELS[char]}
                </button>
            ))}
            <button
                onClick={() => {
                    const kept = selected.map((i) => allCards[i]);
                    const returned = allCards.filter((_, i) => !selected.includes(i));
                    onExchange(kept, returned);
                }}
                disabled={selected.length !== keepCount}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 disabled:opacity-30 transition-all"
            >
                Confirmar
            </button>
        </div>
    );
}

function ExamineBar({
    gameState,
    onExamine,
}: {
    gameState: GameState;
    onExamine: (forceExchange: boolean, cardIndex: number) => void;
}) {
    const target = getPlayerById(gameState, gameState.pendingAction!.targetPlayerId!);
    const aliveCards = target.influenceCards
        .map((c, i) => ({ card: c, index: i }))
        .filter((x) => !x.card.isRevealed);
    const examined = aliveCards[0];
    if (!examined) return null;

    return (
        <div className="flex items-center gap-3">
            <span className="text-cyan-400/70 text-xs">
                Carta de {target.name}: <strong className="text-cyan-300">{CHAR_LABELS[examined.card.character]}</strong>
            </span>
            <button
                onClick={() => onExamine(true, examined.index)}
                className="px-3 py-2 rounded-lg text-xs font-semibold bg-red-500/15 border border-red-500/40 text-red-300 hover:bg-red-500/25 transition-all"
            >
                Forçar Troca
            </button>
            <button
                onClick={() => onExamine(false, examined.index)}
                className="px-3 py-2 rounded-lg text-xs text-gray-400 border border-gray-600/30 hover:bg-gray-700/50 transition-all"
            >
                Devolver
            </button>
        </div>
    );
}
