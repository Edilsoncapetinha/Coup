import React, { createContext, useContext, useReducer, useCallback, useRef, useEffect } from 'react';
import {
    type GameState,
    type GameAction,
    type GameConfig,
    Character,
    ActionType,
    GamePhase,
    DEFAULT_CONFIG,
} from '../game/types';
import {
    createGame,
    declareAction,
    challengeAction,
    passChallenge,
    declareBlock,
    passBlock,
    challengeBlock,
    selectCardToLose,
    completeExchange,
    resolveExamine,
    resolveAction,
    getAvailableActions,
    getAlivePlayers,
    getAliveInfluence,
    getPlayerById,
} from '../game/gameEngine';
import {
    decideBotAction,
    decideBotChallenge,
    decideBotBlock,
    decideBotCardToLose,
    getBotDelay,
} from '../game/botAI';
import { BotDifficulty } from '../game/types';

// ── Actions do Reducer ────────────────────────────────────
type GameReducerAction =
    | { type: 'START_GAME'; config: GameConfig }
    | { type: 'SET_STATE'; state: GameState }
    | { type: 'RESET' };

function gameReducer(state: GameState | null, action: GameReducerAction): GameState | null {
    switch (action.type) {
        case 'START_GAME':
            return createGame(action.config);
        case 'SET_STATE':
            return action.state;
        case 'RESET':
            return null;
    }
}

// ── Context Type ──────────────────────────────────────────
interface GameContextType {
    gameState: GameState | null;
    startGame: (config: GameConfig) => void;
    resetGame: () => void;
    performAction: (action: GameAction) => void;
    challenge: (challengerId: string) => void;
    passOnChallenge: (playerId: string) => void;
    block: (blockerId: string, character: Character) => void;
    passOnBlock: (playerId: string) => void;
    challengeTheBlock: (challengerId: string) => void;
    chooseCardToLose: (playerId: string, cardIndex: number) => void;
    doExchange: (playerId: string, kept: Character[], returned: Character[]) => void;
    doExamine: (forceExchange: boolean, cardIndex: number) => void;
    getActions: () => ActionType[];
    isHumanTurn: () => boolean;
}

const GameContext = createContext<GameContextType | null>(null);

export function useGame(): GameContextType {
    const ctx = useContext(GameContext);
    if (!ctx) throw new Error('useGame must be used within GameProvider');
    return ctx;
}

// ── Provider ──────────────────────────────────────────────
export function GameProvider({ children }: { children: React.ReactNode }) {
    const [gameState, dispatch] = useReducer(gameReducer, null);
    const botTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

    const updateState = useCallback((newState: GameState) => {
        dispatch({ type: 'SET_STATE', state: newState });
    }, []);

    const startGame = useCallback((config: GameConfig) => {
        dispatch({ type: 'START_GAME', config });
    }, []);

    const resetGame = useCallback(() => {
        if (botTimeoutRef.current) clearTimeout(botTimeoutRef.current);
        dispatch({ type: 'RESET' });
    }, []);

    const performAction = useCallback(
        (action: GameAction) => {
            if (!gameState) return;
            // Deduct cost before declaring
            let state = gameState;
            if (action.type === ActionType.Coup) {
                // cost is deducted in resolveAction
            }
            if (action.type === ActionType.Assassinate) {
                // cost is deducted in resolveAction
            }
            const newState = declareAction(state, action);
            updateState(newState);
        },
        [gameState, updateState]
    );

    const challenge = useCallback(
        (challengerId: string) => {
            if (!gameState) return;
            updateState(challengeAction(gameState, challengerId));
        },
        [gameState, updateState]
    );

    const passOnChallenge = useCallback(
        (playerId: string) => {
            if (!gameState) return;
            updateState(passChallenge(gameState, playerId));
        },
        [gameState, updateState]
    );

    const block = useCallback(
        (blockerId: string, character: Character) => {
            if (!gameState) return;
            updateState(declareBlock(gameState, blockerId, character));
        },
        [gameState, updateState]
    );

    const passOnBlock = useCallback(
        (playerId: string) => {
            if (!gameState) return;
            updateState(passBlock(gameState, playerId));
        },
        [gameState, updateState]
    );

    const challengeTheBlock = useCallback(
        (challengerId: string) => {
            if (!gameState) return;
            updateState(challengeBlock(gameState, challengerId));
        },
        [gameState, updateState]
    );

    const chooseCardToLose = useCallback(
        (playerId: string, cardIndex: number) => {
            if (!gameState) return;
            updateState(selectCardToLose(gameState, playerId, cardIndex));
        },
        [gameState, updateState]
    );

    const doExchange = useCallback(
        (playerId: string, kept: Character[], returned: Character[]) => {
            if (!gameState) return;
            updateState(completeExchange(gameState, playerId, kept, returned));
        },
        [gameState, updateState]
    );

    const doExamine = useCallback(
        (forceExchange: boolean, cardIndex: number) => {
            if (!gameState) return;
            updateState(resolveExamine(gameState, forceExchange, cardIndex));
        },
        [gameState, updateState]
    );

    const getActions = useCallback(() => {
        if (!gameState) return [];
        return getAvailableActions(gameState);
    }, [gameState]);

    const isHumanTurn = useCallback(() => {
        if (!gameState) return false;
        return gameState.players[gameState.currentPlayerIndex]?.isHuman ?? false;
    }, [gameState]);

    // ── Bot Loop ──────────────────────────────────────────
    useEffect(() => {
        if (!gameState || gameState.phase === GamePhase.GameOver) return;

        const currentPlayer = gameState.players[gameState.currentPlayerIndex];

        // Handle bot actions during AwaitingAction phase
        if (gameState.phase === GamePhase.AwaitingAction && !currentPlayer.isHuman) {
            const delay = getBotDelay(currentPlayer.botDifficulty ?? BotDifficulty.Medium);
            botTimeoutRef.current = setTimeout(() => {
                const action = decideBotAction(gameState, currentPlayer.id);
                const newState = declareAction(gameState, action);
                updateState(newState);
            }, delay);
            return () => clearTimeout(botTimeoutRef.current);
        }

        // Handle bot responses to challenges on actions
        if (gameState.phase === GamePhase.AwaitingChallengeOnAction && gameState.pendingAction) {
            const botsToRespond = getAlivePlayers(gameState).filter(
                (p) =>
                    !p.isHuman &&
                    p.id !== gameState.pendingAction?.sourcePlayerId &&
                    !gameState.respondedPlayerIds.includes(p.id)
            );

            if (botsToRespond.length > 0) {
                const bot = botsToRespond[0];
                const delay = getBotDelay(bot.botDifficulty ?? BotDifficulty.Medium);
                botTimeoutRef.current = setTimeout(() => {
                    const shouldChallenge = decideBotChallenge(gameState, bot.id, gameState.pendingAction!);
                    if (shouldChallenge) {
                        updateState(challengeAction(gameState, bot.id));
                    } else {
                        updateState(passChallenge(gameState, bot.id));
                    }
                }, delay);
                return () => clearTimeout(botTimeoutRef.current);
            }

            // If human still needs to respond, wait
            const humanPlayer = gameState.players.find(
                (p) =>
                    p.isHuman &&
                    !p.isEliminated &&
                    p.id !== gameState.pendingAction?.sourcePlayerId &&
                    !gameState.respondedPlayerIds.includes(p.id)
            );
            if (!humanPlayer) {
                // All passed, move on
                // This will be handled by passChallenge when last bot passes
            }
        }

        // Handle bot responses to block opportunities
        if (gameState.phase === GamePhase.AwaitingBlock && gameState.pendingAction) {
            const botsToRespond = getAlivePlayers(gameState).filter(
                (p) =>
                    !p.isHuman &&
                    p.id !== gameState.pendingAction?.sourcePlayerId &&
                    !gameState.respondedPlayerIds.includes(p.id)
            );

            if (botsToRespond.length > 0) {
                const bot = botsToRespond[0];
                const delay = getBotDelay(bot.botDifficulty ?? BotDifficulty.Medium);
                botTimeoutRef.current = setTimeout(() => {
                    const blockDecision = decideBotBlock(gameState, bot.id, gameState.pendingAction!);
                    if (blockDecision.shouldBlock && blockDecision.character) {
                        updateState(declareBlock(gameState, bot.id, blockDecision.character));
                    } else {
                        updateState(passBlock(gameState, bot.id));
                    }
                }, delay);
                return () => clearTimeout(botTimeoutRef.current);
            }
        }

        // Handle bot responses to challenges on blocks
        if (gameState.phase === GamePhase.AwaitingChallengeOnBlock && gameState.pendingBlock) {
            const actorId = gameState.pendingAction?.sourcePlayerId;
            const actor = actorId ? getPlayerById(gameState, actorId) : null;

            if (actor && !actor.isHuman && !gameState.respondedPlayerIds.includes(actor.id)) {
                const delay = getBotDelay(actor.botDifficulty ?? BotDifficulty.Medium);
                botTimeoutRef.current = setTimeout(() => {
                    // Bots sometimes challenge blocks
                    const shouldChallenge = Math.random() > 0.5;
                    if (shouldChallenge) {
                        updateState(challengeBlock(gameState, actor.id));
                    } else {
                        // Accept the block
                        const newState = {
                            ...gameState,
                            phase: GamePhase.AwaitingAction as GamePhase,
                            pendingAction: null,
                            pendingBlock: null,
                            currentPlayerIndex:
                                (gameState.currentPlayerIndex + 1) % gameState.players.length,
                            turnNumber: gameState.turnNumber + 1,
                        };
                        // Find next alive player
                        let idx = newState.currentPlayerIndex;
                        while (newState.players[idx].isEliminated) {
                            idx = (idx + 1) % newState.players.length;
                        }
                        newState.currentPlayerIndex = idx;
                        updateState(newState as GameState);
                    }
                }, delay);
                return () => clearTimeout(botTimeoutRef.current);
            }
        }

        // Handle bot card selection
        if (gameState.phase === GamePhase.AwaitingCardSelection) {
            const botIds = gameState.respondedPlayerIds.filter((id) => {
                const p = getPlayerById(gameState, id);
                return !p.isHuman && !p.isEliminated;
            });

            if (botIds.length > 0) {
                const botId = botIds[0];
                const delay = getBotDelay(BotDifficulty.Medium);
                botTimeoutRef.current = setTimeout(() => {
                    const cardIdx = decideBotCardToLose(gameState, botId);
                    updateState(selectCardToLose(gameState, botId, cardIdx));
                }, delay);
                return () => clearTimeout(botTimeoutRef.current);
            }
        }

        // Handle bot exchange
        if (gameState.phase === GamePhase.AwaitingExchangeSelection) {
            const actor = gameState.pendingAction
                ? getPlayerById(gameState, gameState.pendingAction.sourcePlayerId)
                : null;

            if (actor && !actor.isHuman) {
                const delay = getBotDelay(actor.botDifficulty ?? BotDifficulty.Medium);
                botTimeoutRef.current = setTimeout(() => {
                    const aliveCards = getAliveInfluence(actor).map((c) => c.character);
                    const allCards = [...aliveCards, ...gameState.drawnCards];
                    // Bot keeps best cards
                    const kept = allCards.slice(0, getAliveInfluence(actor).length);
                    const returned = allCards.slice(getAliveInfluence(actor).length);
                    updateState(completeExchange(gameState, actor.id, kept, returned));
                }, delay);
                return () => clearTimeout(botTimeoutRef.current);
            }
        }

        // Handle bot examine decision
        if (gameState.phase === GamePhase.AwaitingExamineDecision) {
            const actor = gameState.pendingAction
                ? getPlayerById(gameState, gameState.pendingAction.sourcePlayerId)
                : null;

            if (actor && !actor.isHuman && gameState.pendingAction?.targetPlayerId) {
                const delay = getBotDelay(actor.botDifficulty ?? BotDifficulty.Medium);
                botTimeoutRef.current = setTimeout(() => {
                    const target = getPlayerById(gameState, gameState.pendingAction!.targetPlayerId!);
                    const aliveCards = target.influenceCards
                        .map((c, i) => ({ card: c, index: i }))
                        .filter((x) => !x.card.isRevealed);
                    const cardIdx = aliveCards[0]?.index ?? 0;
                    const forceExchange = Math.random() > 0.5;
                    updateState(resolveExamine(gameState, forceExchange, cardIdx));
                }, delay);
                return () => clearTimeout(botTimeoutRef.current);
            }
        }
    }, [gameState, updateState]);

    const value: GameContextType = {
        gameState,
        startGame,
        resetGame,
        performAction,
        challenge,
        passOnChallenge,
        block,
        passOnBlock,
        challengeTheBlock,
        chooseCardToLose,
        doExchange,
        doExamine,
        getActions,
        isHumanTurn,
    };

    return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}
