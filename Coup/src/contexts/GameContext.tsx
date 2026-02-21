import React, { createContext, useContext, useReducer, useCallback, useRef, useEffect, useState } from 'react';
import { socket } from '@/services/socket';
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
    declareCoupRedirect,
    passCoupRedirect,
    challengeCoupRedirect,
    passCoupRedirectChallenge,
    resolveInquisitorChoice,
} from '../game/gameEngine';
import {
    decideBotAction,
    decideBotChallenge,
    decideBotBlock,
    decideBotCardToLose,
    decideBotCoupRedirect,
    decideBotInquisitorChoice,
    getBotDelay,
} from '../game/botAI';
import { BotDifficulty } from '../game/types';
import { isBlockableOnlyByTarget } from '../game/characters';

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
    doCoupRedirect: (playerId: string, newTargetId: string) => void;
    doPassCoupRedirect: (playerId: string) => void;
    doChallengeCoupRedirect: (playerId: string) => void;
    doPassCoupRedirectChallenge: (playerId: string) => void;
    doInquisitorChoice: (choice: 'self-exchange' | 'examine', targetPlayerId?: string) => void;
    requestRestart: () => void;
    leaveRoom: () => void;
    restartStatus: { requests: number, total: number } | null;
    getActions: () => ActionType[];
    isHumanTurn: () => boolean;
    roomCode: string | null;
    setRoomCode: (code: string | null) => void;
    myPlayerId: string | null;
    setMyPlayerId: (id: string | null) => void;
    connectedPlayers: { id: string, name: string }[];
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
    const [roomCode, setRoomCode] = useState<string | null>(null);
    // Initialize myPlayerId from socket.id immediately (socket.id is set once connected)
    const [myPlayerId, setMyPlayerId] = useState<string | null>(() => socket.id ?? null);
    const [connectedPlayers, setConnectedPlayers] = useState<{ id: string, name: string }[]>([]);
    const [restartStatus, setRestartStatus] = useState<{ requests: number, total: number } | null>(null);
    const botTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

    // Keep myPlayerId in sync with socket connection
    useEffect(() => {
        const onConnect = () => setMyPlayerId(socket.id ?? null);
        socket.on('connect', onConnect);
        // If already connected, set immediately
        if (socket.connected && socket.id) setMyPlayerId(socket.id);
        return () => { socket.off('connect', onConnect); };
    }, []);

    // Socket.io sync
    useEffect(() => {
        if (!roomCode) return;

        const onGameStateUpdate = (newState: GameState) => {
            dispatch({ type: 'SET_STATE', state: newState });
        };

        const onPlayerListUpdate = (players: { id: string, name: string }[]) => {
            setConnectedPlayers(players);
            if (socket.id) {
                setMyPlayerId(socket.id);
            }
        };

        const onYourPlayerId = (id: string) => {
            setMyPlayerId(id);
        };

        const onRestartStatus = (status: { requests: number, total: number }) => {
            setRestartStatus(status);
        };

        const onGameRestartApproved = () => {
            setRestartStatus(null);
            dispatch({ type: 'RESET' });
        };

        socket.on('game_state_update', onGameStateUpdate);
        socket.on('update_player_list', onPlayerListUpdate);
        socket.on('your_player_id', onYourPlayerId);
        socket.on('restart_status', onRestartStatus);
        socket.on('game_restart_approved', onGameRestartApproved);

        // Request list immediately in case we're already in a room (e.g. reload)
        socket.emit('request_player_list', roomCode);

        return () => {
            socket.off('game_state_update', onGameStateUpdate);
            socket.off('update_player_list', onPlayerListUpdate);
            socket.off('your_player_id', onYourPlayerId);
            socket.off('restart_status', onRestartStatus);
            socket.off('game_restart_approved', onGameRestartApproved);
        };
    }, [roomCode]);

    const updateState = useCallback((newState: GameState) => {
        if (roomCode) {
            socket.emit('game_action', {
                roomCode,
                action: 'update',
                newState
            });
            // Optimistic update
            dispatch({ type: 'SET_STATE', state: newState });
        } else {
            dispatch({ type: 'SET_STATE', state: newState });
        }
    }, [roomCode]);

    const startGame = useCallback((config: GameConfig) => {
        // Create initial state locally
        const newState = createGame(config);
        // Broadcast to server (if connected) and update local state
        updateState(newState);
    }, [updateState]);

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

    const doCoupRedirect = useCallback(
        (playerId: string, newTargetId: string) => {
            if (!gameState) return;
            updateState(declareCoupRedirect(gameState, playerId, newTargetId));
        },
        [gameState, updateState]
    );

    const doPassCoupRedirect = useCallback(
        (playerId: string) => {
            if (!gameState) return;
            updateState(passCoupRedirect(gameState, playerId));
        },
        [gameState, updateState]
    );

    const doChallengeCoupRedirect = useCallback(
        (playerId: string) => {
            if (!gameState) return;
            updateState(challengeCoupRedirect(gameState, playerId));
        },
        [gameState, updateState]
    );

    const doPassCoupRedirectChallenge = useCallback(
        (playerId: string) => {
            if (!gameState) return;
            updateState(passCoupRedirectChallenge(gameState, playerId));
        },
        [gameState, updateState]
    );

    const doInquisitorChoice = useCallback(
        (choice: 'self-exchange' | 'examine', targetPlayerId?: string) => {
            if (!gameState) return;
            updateState(resolveInquisitorChoice(gameState, choice, targetPlayerId));
        },
        [gameState, updateState]
    );

    const requestRestart = useCallback(() => {
        if (!roomCode) return;
        socket.emit('request_restart', roomCode);
    }, [roomCode]);

    const leaveRoom = useCallback(() => {
        if (roomCode) {
            socket.emit('leave_room', roomCode);
            setRoomCode(null);
            setMyPlayerId(null);
            setConnectedPlayers([]);
            setRestartStatus(null);
            dispatch({ type: 'RESET' });
        }
    }, [roomCode]);

    const getActions = useCallback(() => {
        if (!gameState) return [];
        return getAvailableActions(gameState);
    }, [gameState]);

    const isHumanTurn = useCallback(() => {
        if (!gameState) return false;
        const current = gameState.players[gameState.currentPlayerIndex];
        // If multiplayer, check if it's MY turn
        if (roomCode && myPlayerId) {
            return current.id === myPlayerId;
        }
        // Local game
        return current.isHuman;
    }, [gameState, roomCode, myPlayerId]);

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
            const actionType = gameState.pendingAction.type;
            const targetOnly = isBlockableOnlyByTarget(actionType);

            const botsToRespond = getAlivePlayers(gameState).filter(
                (p) =>
                    !p.isHuman &&
                    p.id !== gameState.pendingAction?.sourcePlayerId &&
                    !gameState.respondedPlayerIds.includes(p.id) &&
                    (!targetOnly || p.id === gameState.pendingAction?.targetPlayerId)
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
                            phase: GamePhase.AwaitingAction,
                            pendingAction: null,
                            pendingBlock: null,
                            respondedPlayerIds: [],
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

        // Handle bot coup redirect decision
        if (gameState.phase === GamePhase.AwaitingCoupRedirect) {
            const chain = gameState.coupRedirectChain;
            const currentTargetId = chain[chain.length - 1];
            const target = getPlayerById(gameState, currentTargetId);

            if (!target.isHuman) {
                const delay = getBotDelay(target.botDifficulty ?? BotDifficulty.Medium);
                botTimeoutRef.current = setTimeout(() => {
                    const decision = decideBotCoupRedirect(gameState, currentTargetId);
                    if (decision.shouldRedirect && decision.targetId) {
                        updateState(declareCoupRedirect(gameState, currentTargetId, decision.targetId));
                    } else {
                        updateState(passCoupRedirect(gameState, currentTargetId));
                    }
                }, delay);
                return () => clearTimeout(botTimeoutRef.current);
            }
        }

        // Handle bot challenge on coup redirect
        if (gameState.phase === GamePhase.AwaitingCoupRedirectChallenge) {
            const chain = gameState.coupRedirectChain;
            const redirectorId = chain[chain.length - 2];
            const botsToRespond = getAlivePlayers(gameState).filter(
                (p) =>
                    !p.isHuman &&
                    p.id !== redirectorId &&
                    !gameState.respondedPlayerIds.includes(p.id)
            );

            if (botsToRespond.length > 0) {
                const bot = botsToRespond[0];
                const delay = getBotDelay(bot.botDifficulty ?? BotDifficulty.Medium);
                botTimeoutRef.current = setTimeout(() => {
                    // Bots rarely challenge redirects
                    const shouldChallenge = Math.random() > 0.7;
                    if (shouldChallenge) {
                        updateState(challengeCoupRedirect(gameState, bot.id));
                    } else {
                        updateState(passCoupRedirectChallenge(gameState, bot.id));
                    }
                }, delay);
                return () => clearTimeout(botTimeoutRef.current);
            }
        }

        // Handle bot inquisitor choice
        if (gameState.phase === GamePhase.AwaitingInquisitorChoice) {
            const actor = gameState.pendingAction
                ? getPlayerById(gameState, gameState.pendingAction.sourcePlayerId)
                : null;

            if (actor && !actor.isHuman) {
                const delay = getBotDelay(actor.botDifficulty ?? BotDifficulty.Medium);
                botTimeoutRef.current = setTimeout(() => {
                    const decision = decideBotInquisitorChoice(gameState, actor.id);
                    updateState(resolveInquisitorChoice(gameState, decision.choice, decision.targetPlayerId));
                }, delay);
                return () => clearTimeout(botTimeoutRef.current);
            }
        }
    }, [gameState, updateState]);

    // ── Delayed Resolution for Double Loss (Assassination) ──
    useEffect(() => {
        if (gameState?.pendingSecondCardLoss && gameState.phase === GamePhase.ResolvingAction) {
            console.log('[DEBUG-DOUBLE-LOSS] Delay started...');

            const timer = setTimeout(() => {
                console.log('[DEBUG-DOUBLE-LOSS] Delay expired. Syncing resolved state.');
                const finalState = resolveAction({ ...gameState, pendingSecondCardLoss: false });
                updateState(finalState);
            }, 1000);
            return () => clearTimeout(timer);
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
        doCoupRedirect,
        doPassCoupRedirect,
        doChallengeCoupRedirect,
        doPassCoupRedirectChallenge,
        doInquisitorChoice,
        requestRestart,
        leaveRoom,
        restartStatus,
        getActions,
        isHumanTurn,
        roomCode,
        setRoomCode,
        myPlayerId,
        setMyPlayerId,
        connectedPlayers,
    };

    return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}
