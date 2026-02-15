import { useState } from 'react';
import { GamePhase, ActionType, Character, type GameState, type GameAction } from '../../game/types';
import { getAlivePlayers, getAliveInfluence, getPlayerById } from '../../game/gameEngine';
import { CHARACTER_DEFINITIONS, getCharactersThatBlock } from '../../game/characters';
import { CHAR_IMAGE } from '../game/PlayerSlot';
import TurnTimerWrapper from './TurnTimerWrapper';

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
    onCoupRedirect: (playerId: string, newTargetId: string) => void;
    onPassCoupRedirect: (playerId: string) => void;
    onChallengeCoupRedirect: (playerId: string) => void;
    onPassCoupRedirectChallenge: (playerId: string) => void;
    onInquisitorChoice: (choice: 'self-exchange' | 'examine', targetPlayerId?: string) => void;
    availableActions: ActionType[];
    myPlayerId: string | null;
}

const ACTION_LABELS: Record<string, string> = {
    [ActionType.Income]: 'Renda',
    [ActionType.ForeignAid]: 'Ajuda Externa',
    [ActionType.Coup]: 'Golpe',
    [ActionType.Tax]: 'Taxar',
    [ActionType.Assassinate]: 'Assassinar',
    [ActionType.Steal]: 'Roubar',
    [ActionType.Exchange]: 'Trocar',
    [ActionType.Examine]: 'Inquisidor',
    [ActionType.InquisitorSelfExchange]: 'Trocar (Inq.)',
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
    onCoupRedirect,
    onPassCoupRedirect,
    onChallengeCoupRedirect,
    onPassCoupRedirectChallenge,
    onInquisitorChoice,
    availableActions,
    myPlayerId,
}: HUDProps) {
    // In multiplayer, use myPlayerId. In single player, find the human.
    const humanPlayer = myPlayerId
        ? gameState.players.find((p) => p.id === myPlayerId)
        : gameState.players.find((p) => p.isHuman);

    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    // It is my turn if I am the current player
    const isHumanTurn = humanPlayer ? currentPlayer.id === humanPlayer.id : false;
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
                    {/* Turn Timer */}
                    <div className="mt-1 w-full flex justify-center">
                        <TurnTimerWrapper
                            gameState={gameState}
                            humanPlayer={humanPlayer}
                            onAction={onAction}
                            onPassChallenge={onPassChallenge}
                            onPassBlock={onPassBlock}
                            onPassCoupRedirect={onPassCoupRedirect}
                            onPassCoupRedirectChallenge={onPassCoupRedirectChallenge}
                        />
                    </div>
                </div>

                {/* Opponent coin counters */}
                <div className="flex gap-2">
                    {gameState.players
                        .filter((p) => p.id !== humanPlayer?.id && !p.isEliminated)
                        .map((p) => (
                            <div
                                key={p.id}
                                className={`bg-black/70 backdrop-blur-md rounded-lg px-3 py-1.5 border text-xs ${gameState.currentPlayerIndex === gameState.players.indexOf(p)
                                    ? 'border-amber-500/40 text-amber-300'
                                    : 'border-gray-700/40 text-gray-400'
                                    }`}
                            >
                                {p.name} · 🪙{p.coins} · 🃏{p.influenceCards.filter(c => !c.isRevealed).length}
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
                            <div className="flex gap-3">
                                {humanPlayer.influenceCards.map((card, i) => (
                                    <div
                                        key={i}
                                        className={`rounded-xl border-2 overflow-hidden flex flex-col items-center w-36 ${card.isRevealed
                                            ? 'border-red-900/40 opacity-50'
                                            : 'border-amber-500/40 hover:border-amber-500/60 hover:shadow-lg hover:shadow-amber-500/20 hover:-translate-y-1'
                                            } transition-all`}
                                    >
                                        {CHAR_IMAGE[card.character] ? (
                                            <img
                                                src={CHAR_IMAGE[card.character]}
                                                alt={CHAR_LABELS[card.character]}
                                                className={`w-full h-44 object-cover ${card.isRevealed ? 'grayscale brightness-50' : ''}`}
                                                draggable={false}
                                            />
                                        ) : (
                                            <div className="h-44 w-full flex items-center justify-center bg-gray-800/50">
                                                <span className="text-4xl">🂠</span>
                                            </div>
                                        )}
                                        <span className={`text-sm py-1 font-bold ${card.isRevealed ? 'text-red-400/50 line-through' : 'text-amber-300'}`}>
                                            {CHAR_LABELS[card.character]}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Action buttons when it's human's turn */}
                    {isHumanTurn && phase === GamePhase.AwaitingAction && humanPlayer && (
                        <ActionButtons
                            actions={availableActions}
                            gameState={gameState}
                            onAction={onAction}
                            humanId={humanPlayer.id}
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

                    {/* Inquisitor choice: self-exchange or examine */}
                    {phase === GamePhase.AwaitingInquisitorChoice && humanPlayer &&
                        gameState.pendingAction?.sourcePlayerId === humanPlayer.id && (
                            <InquisitorChoiceBar
                                gameState={gameState}
                                humanId={humanPlayer.id}
                                onInquisitorChoice={onInquisitorChoice}
                            />
                        )}

                    {/* Coup Redirect (Bufão) */}
                    {phase === GamePhase.AwaitingCoupRedirect && humanPlayer && (() => {
                        const chain = gameState.coupRedirectChain;
                        const currentTargetId = chain[chain.length - 1];
                        return currentTargetId === humanPlayer.id;
                    })() && (
                            <CoupRedirectBar
                                gameState={gameState}
                                humanId={humanPlayer.id}
                                onRedirect={onCoupRedirect}
                                onPass={onPassCoupRedirect}
                            />
                        )}

                    {/* Challenge on Coup Redirect */}
                    {phase === GamePhase.AwaitingCoupRedirectChallenge && humanPlayer && (() => {
                        const chain = gameState.coupRedirectChain;
                        const redirectorId = chain[chain.length - 2];
                        return humanPlayer.id !== redirectorId &&
                            !humanPlayer.isEliminated &&
                            !gameState.respondedPlayerIds.includes(humanPlayer.id);
                    })() && (
                            <ResponseBar
                                message={`${getPlayerById(gameState, gameState.coupRedirectChain[gameState.coupRedirectChain.length - 2]).name} alega Bufão para redirecionar o Golpe`}
                                buttons={[
                                    { label: '❗ Desafiar Bufão', color: 'orange', onClick: () => onChallengeCoupRedirect(humanPlayer.id) },
                                    { label: 'Aceitar', color: 'gray', onClick: () => onPassCoupRedirectChallenge(humanPlayer.id) },
                                ]}
                            />
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
    humanId,
}: {
    actions: ActionType[];
    gameState: GameState;
    onAction: (action: GameAction) => void;
    humanId: string;
}) {
    const [targetFor, setTargetFor] = useState<ActionType | null>(null);
    const humanPlayer = getPlayerById(gameState, humanId);
    const targets = getAlivePlayers(gameState).filter((p) => p.id !== humanId);

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
                        className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-all hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-1.5 ${charDef
                            ? 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20'
                            : 'bg-gray-800/50 border-gray-600/30 text-gray-300 hover:bg-gray-700/50'
                            }`}
                    >
                        {charDef && CHAR_IMAGE[charDef.character] && (
                            <img src={CHAR_IMAGE[charDef.character]} alt={CHAR_LABELS[charDef.character]} className="w-5 h-5 rounded object-cover" draggable={false} />
                        )}
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
                    className="px-3 py-2 rounded-lg text-xs font-semibold bg-purple-500/15 border border-purple-500/40 text-purple-400 hover:bg-purple-500/25 transition-all flex items-center gap-1.5"
                >
                    {CHAR_IMAGE[char] ? (
                        <img src={CHAR_IMAGE[char]} alt={CHAR_LABELS[char]} className="w-5 h-5 rounded object-cover" draggable={false} />
                    ) : (
                        <span>🛡️</span>
                    )}
                    {CHAR_LABELS[char]}
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
                    className="rounded-lg border border-red-500/40 bg-red-500/10 hover:bg-red-500/20 transition-all overflow-hidden flex flex-col items-center w-20 hover:-translate-y-1"
                >
                    {CHAR_IMAGE[card.character] ? (
                        <img src={CHAR_IMAGE[card.character]} alt={CHAR_LABELS[card.character]} className="w-full h-16 object-cover" draggable={false} />
                    ) : (
                        <div className="h-16 w-full flex items-center justify-center"><span className="text-xl">🂠</span></div>
                    )}
                    <span className="text-[10px] text-red-300 font-medium py-1">{CHAR_LABELS[card.character]}</span>
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
                    className={`rounded-lg border transition-all overflow-hidden flex flex-col items-center w-20 ${selected.includes(idx)
                        ? 'border-emerald-500/50 scale-105 ring-2 ring-emerald-500/40'
                        : 'border-gray-600/30 bg-gray-800/50'
                        }`}
                >
                    {CHAR_IMAGE[char] ? (
                        <img src={CHAR_IMAGE[char]} alt={CHAR_LABELS[char]} className="w-full h-16 object-cover" draggable={false} />
                    ) : (
                        <div className="h-16 w-full flex items-center justify-center"><span className="text-xl">🂠</span></div>
                    )}
                    <span className={`text-[10px] font-medium py-1 ${selected.includes(idx) ? 'text-emerald-300' : 'text-gray-400'}`}>{CHAR_LABELS[char]}</span>
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
    // Prefer the specific card chosen by engine, else fallback to first alive
    let examined = gameState.pendingAction?.examinedCard;

    if (!examined) {
        // Fallback (shouldn't happen with new logic)
        const aliveCards = target.influenceCards
            .map((c, i) => ({ card: c, index: i }))
            .filter((x) => !x.card.isRevealed);
        examined = aliveCards[0];
    }

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

function InquisitorChoiceBar({
    gameState,
    humanId,
    onInquisitorChoice,
}: {
    gameState: GameState;
    humanId: string;
    onInquisitorChoice: (choice: 'self-exchange' | 'examine', targetPlayerId?: string) => void;
}) {
    const [mode, setMode] = useState<'choose' | 'selectTarget'>('choose');
    const targets = getAlivePlayers(gameState).filter((p) => p.id !== humanId);

    if (mode === 'selectTarget') {
        return (
            <div className="flex flex-wrap gap-2 items-center">
                <span className="text-cyan-400/70 text-xs mr-2">Examinar quem?</span>
                {targets.map((t) => (
                    <button
                        key={t.id}
                        onClick={() => onInquisitorChoice('examine', t.id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/25 transition-all"
                    >
                        🔍 {t.name}
                    </button>
                ))}
                <button onClick={() => setMode('choose')} className="text-[10px] text-gray-500 hover:text-gray-400 ml-2">
                    Voltar
                </button>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-3">
            <span className="text-cyan-400/70 text-xs font-bold">Inquisidor — Escolha:</span>
            <button
                onClick={() => onInquisitorChoice('self-exchange')}
                className="px-3 py-2 rounded-lg text-xs font-semibold bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25 transition-all"
            >
                🔄 Trocar minha carta
            </button>
            <button
                onClick={() => setMode('selectTarget')}
                className="px-3 py-2 rounded-lg text-xs font-semibold bg-cyan-500/15 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/25 transition-all"
            >
                🔍 Examinar adversário
            </button>
        </div>
    );
}

function CoupRedirectBar({
    gameState,
    humanId,
    onRedirect,
    onPass,
}: {
    gameState: GameState;
    humanId: string;
    onRedirect: (playerId: string, newTargetId: string) => void;
    onPass: (playerId: string) => void;
}) {
    const [selectingTarget, setSelectingTarget] = useState(false);
    const targets = getAlivePlayers(gameState).filter(
        (p) => p.id !== humanId
    );

    if (selectingTarget) {
        return (
            <div className="flex flex-wrap gap-2 items-center">
                <span className="text-amber-200/50 text-xs mr-2">Redirecionar para quem?</span>
                {targets.map((t) => (
                    <button
                        key={t.id}
                        onClick={() => onRedirect(humanId, t.id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/15 border border-red-500/30 text-red-300 hover:bg-red-500/25 transition-all"
                    >
                        🎯 {t.name}
                    </button>
                ))}
                <button onClick={() => setSelectingTarget(false)} className="text-[10px] text-gray-500 hover:text-gray-400 ml-2">
                    Cancelar
                </button>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-3">
            <span className="text-red-400/70 text-xs font-bold">Você está sendo alvo de um Golpe!</span>
            <button
                onClick={() => setSelectingTarget(true)}
                className="px-3 py-2 rounded-lg text-xs font-semibold bg-amber-500/15 border border-amber-500/40 text-amber-300 hover:bg-amber-500/25 transition-all"
            >
                🃏 Redirecionar (Bufão)
            </button>
            <button
                onClick={() => onPass(humanId)}
                className="px-3 py-2 rounded-lg text-xs text-gray-400 border border-gray-600/30 hover:bg-gray-700/50 transition-all"
            >
                Aceitar Golpe
            </button>
        </div>
    );
}
