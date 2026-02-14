import {
    type GameState,
    type GameAction,
    type PendingBlock,
    type LogEntry,
    type Player,
    type InfluenceCard,
    type GameConfig,
    Character,
    ActionType,
    GamePhase,
    Faction,
    BotDifficulty,
    STARTING_COINS,
    COUP_COST,
    ASSASSINATE_COST,
    FORCED_COUP_THRESHOLD,
} from './types';
import { isActionChallengeable, isActionBlockable, CHARACTER_DEFINITIONS } from './characters';

// ── Helpers ───────────────────────────────────────────────
let logIdCounter = 0;

function createLogEntry(message: string, type: LogEntry['type']): LogEntry {
    return { id: `log-${++logIdCounter}`, timestamp: Date.now(), message, type };
}

function shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

function getAliveInfluence(player: Player): InfluenceCard[] {
    return player.influenceCards.filter((c) => !c.isRevealed);
}

function getAlivePlayers(state: GameState): Player[] {
    return state.players.filter((p) => !p.isEliminated);
}

function getPlayerById(state: GameState, id: string): Player {
    const player = state.players.find((p) => p.id === id);
    if (!player) throw new Error(`Player ${id} not found`);
    return player;
}

function nextAlivePlayerIndex(state: GameState): number {
    let idx = (state.currentPlayerIndex + 1) % state.players.length;
    while (state.players[idx].isEliminated) {
        idx = (idx + 1) % state.players.length;
    }
    return idx;
}

function getPlayerName(state: GameState, playerId: string): string {
    return getPlayerById(state, playerId).name;
}

// ── Criar Partida ─────────────────────────────────────────
export function createGame(config: GameConfig): GameState {
    logIdCounter = 0;

    // Build court deck: N copies of each enabled character
    const deck: Character[] = [];
    for (const char of config.enabledCharacters) {
        for (let i = 0; i < config.cardsPerCharacter; i++) {
            deck.push(char);
        }
    }

    const shuffledDeck = shuffleArray(deck);

    // Create players
    const botNames = ['Valentina', 'Ricardo', 'Isabela', 'Fernando', 'Camila'];
    const players: Player[] = [];

    for (let i = 0; i < config.playerCount; i++) {
        const isHuman = i === 0;
        const card1 = shuffledDeck.pop()!;
        const card2 = shuffledDeck.pop()!;

        players.push({
            id: `player-${i}`,
            name: isHuman ? config.humanPlayerName : botNames[i - 1] || `Bot ${i}`,
            coins: STARTING_COINS,
            influenceCards: [
                { character: card1, isRevealed: false },
                { character: card2, isRevealed: false },
            ],
            isHuman,
            botDifficulty: isHuman ? undefined : config.botDifficulty,
            faction: config.enableFactions
                ? i % 2 === 0
                    ? Faction.Loyalist
                    : Faction.Reformist
                : undefined,
            isEliminated: false,
        });
    }

    return {
        config,
        players,
        courtDeck: shuffledDeck,
        treasuryReserve: 0,
        currentPlayerIndex: 0,
        phase: GamePhase.AwaitingAction,
        pendingAction: null,
        pendingBlock: null,
        respondedPlayerIds: [],
        drawnCards: [],
        log: [createLogEntry('Partida iniciada!', 'system')],
        winnerId: null,
        turnNumber: 1,
    };
}

// ── Verificar Fim de Jogo ─────────────────────────────────
export function checkGameOver(state: GameState): GameState {
    const alive = getAlivePlayers(state);
    if (alive.length === 1) {
        return {
            ...state,
            phase: GamePhase.GameOver,
            winnerId: alive[0].id,
            log: [...state.log, createLogEntry(`${alive[0].name} venceu a partida!`, 'system')],
        };
    }
    return state;
}

// ── Eliminar Jogador se Necessário ────────────────────────
function checkPlayerElimination(state: GameState, playerId: string): GameState {
    const player = getPlayerById(state, playerId);
    if (getAliveInfluence(player).length === 0 && !player.isEliminated) {
        const updatedPlayers = state.players.map((p) =>
            p.id === playerId ? { ...p, isEliminated: true } : p
        );
        return checkGameOver({
            ...state,
            players: updatedPlayers,
            log: [...state.log, createLogEntry(`${player.name} foi eliminado!`, 'elimination')],
        });
    }
    return state;
}

// ── Perder Influência ─────────────────────────────────────
export function loseInfluence(state: GameState, playerId: string, cardIndex: number): GameState {
    const player = getPlayerById(state, playerId);
    const card = player.influenceCards[cardIndex];

    if (!card || card.isRevealed) {
        throw new Error('Carta inválida ou já revelada');
    }

    const updatedPlayers = state.players.map((p) => {
        if (p.id !== playerId) return p;
        return {
            ...p,
            influenceCards: p.influenceCards.map((c, i) =>
                i === cardIndex ? { ...c, isRevealed: true } : c
            ),
        };
    });

    let newState: GameState = {
        ...state,
        players: updatedPlayers,
        log: [
            ...state.log,
            createLogEntry(`${player.name} revelou ${card.character}.`, 'elimination'),
        ],
    };

    newState = checkPlayerElimination(newState, playerId);
    return newState;
}

// ── Obter Ações Disponíveis ───────────────────────────────
export function getAvailableActions(state: GameState): ActionType[] {
    const player = state.players[state.currentPlayerIndex];
    const actions: ActionType[] = [];

    // Forced coup
    if (player.coins >= FORCED_COUP_THRESHOLD) {
        return [ActionType.Coup];
    }

    // General actions
    actions.push(ActionType.Income);
    actions.push(ActionType.ForeignAid);
    if (player.coins >= COUP_COST) actions.push(ActionType.Coup);

    // Character actions
    for (const char of state.config.enabledCharacters) {
        const { action, actionCost } = getCharacterDef(char);
        if (action && player.coins >= actionCost) {
            if (!actions.includes(action)) {
                actions.push(action);
            }
        }
    }

    return actions;
}

function getCharacterDef(char: Character) {
    return CHARACTER_DEFINITIONS[char];
}

// ── Declarar Ação ─────────────────────────────────────────
export function declareAction(state: GameState, action: GameAction): GameState {
    const player = getPlayerById(state, action.sourcePlayerId);
    const actionName = action.type;

    let logMsg = `${player.name} declara ${actionName}`;
    if (action.targetPlayerId) {
        logMsg += ` contra ${getPlayerName(state, action.targetPlayerId)}`;
    }

    const newLog = [...state.log, createLogEntry(logMsg, 'action')];

    // Check if action can be challenged
    const canBeChallenged = isActionChallengeable(action.type);

    if (canBeChallenged) {
        return {
            ...state,
            phase: GamePhase.AwaitingChallengeOnAction,
            pendingAction: action,
            respondedPlayerIds: [],
            log: newLog,
        };
    }

    // Check if action can be blocked (ForeignAid)
    const canBeBlocked = isActionBlockable(action.type, state.config.enabledCharacters);
    if (canBeBlocked) {
        return {
            ...state,
            phase: GamePhase.AwaitingBlock,
            pendingAction: action,
            respondedPlayerIds: [],
            log: newLog,
        };
    }

    // Direct resolve (Income, Coup)
    return resolveAction({
        ...state,
        pendingAction: action,
        log: newLog,
    });
}

// ── Desafio à Ação ────────────────────────────────────────
export function challengeAction(state: GameState, challengerId: string): GameState {
    if (!state.pendingAction) throw new Error('Sem ação pendente para desafiar');

    const challenger = getPlayerById(state, challengerId);
    const actor = getPlayerById(state, state.pendingAction.sourcePlayerId);
    const claimedChar = state.pendingAction.claimedCharacter;

    if (!claimedChar) throw new Error('Ação não possui personagem reivindicado');

    const logMsg = `${challenger.name} desafia ${actor.name}!`;
    let newState: GameState = {
        ...state,
        log: [...state.log, createLogEntry(logMsg, 'challenge')],
    };

    // Check if actor has the claimed character
    const actorAliveCards = getAliveInfluence(actor);
    const hasCharacter = actorAliveCards.some((c) => c.character === claimedChar);

    if (hasCharacter) {
        // Challenge fails: challenger loses influence
        newState = {
            ...newState,
            log: [
                ...newState.log,
                createLogEntry(
                    `${actor.name} revela ${claimedChar}! ${challenger.name} perde influência.`,
                    'challenge'
                ),
            ],
        };

        // Replace actor's revealed card with new one from deck
        newState = replaceRevealedCard(newState, actor.id, claimedChar);

        // Challenger must lose a card
        const challengerAlive = getAliveInfluence(getPlayerById(newState, challengerId));
        if (challengerAlive.length === 1) {
            // Auto-lose the only card
            const cardIdx = getPlayerById(newState, challengerId).influenceCards.findIndex(
                (c) => !c.isRevealed
            );
            newState = loseInfluence(newState, challengerId, cardIdx);

            if (newState.phase === GamePhase.GameOver) return newState;

            // Action still resolves since challenge failed
            const canBeBlocked = isActionBlockable(
                state.pendingAction!.type,
                newState.config.enabledCharacters
            );
            if (canBeBlocked) {
                return { ...newState, phase: GamePhase.AwaitingBlock, respondedPlayerIds: [] };
            }
            return resolveAction(newState);
        }

        // Challenger needs to choose which card to lose
        return {
            ...newState,
            phase: GamePhase.AwaitingCardSelection,
            respondedPlayerIds: [challengerId], // mark who needs to select
        };
    }

    // Challenge succeeds: actor loses influence, action fails
    newState = {
        ...newState,
        log: [
            ...newState.log,
            createLogEntry(
                `${actor.name} não tem ${claimedChar}! ${actor.name} perde influência.`,
                'challenge'
            ),
        ],
    };

    // Refund action cost
    const actionCost = getActionCost(state.pendingAction.type);
    if (actionCost > 0) {
        newState = {
            ...newState,
            players: newState.players.map((p) =>
                p.id === actor.id ? { ...p, coins: p.coins + actionCost } : p
            ),
        };
    }

    const actorAlive = getAliveInfluence(getPlayerById(newState, actor.id));
    if (actorAlive.length === 1) {
        const cardIdx = getPlayerById(newState, actor.id).influenceCards.findIndex(
            (c) => !c.isRevealed
        );
        newState = loseInfluence(newState, actor.id, cardIdx);
        return advanceTurn(newState);
    }

    // Actor needs to choose which card to lose, action is canceled
    return {
        ...newState,
        phase: GamePhase.AwaitingCardSelection,
        respondedPlayerIds: [actor.id],
    };
}

function getActionCost(actionType: ActionType): number {
    if (actionType === ActionType.Coup) return COUP_COST;
    if (actionType === ActionType.Assassinate) return ASSASSINATE_COST;
    return 0;
}

// ── Passar Desafio (não desafia) ──────────────────────────
export function passChallenge(state: GameState, playerId: string): GameState {
    const responded = [...state.respondedPlayerIds, playerId];
    const alive = getAlivePlayers(state).filter(
        (p) => p.id !== state.pendingAction?.sourcePlayerId
    );

    // All alive players passed
    if (responded.length >= alive.length) {
        if (state.phase === GamePhase.AwaitingChallengeOnAction) {
            const canBeBlocked = isActionBlockable(
                state.pendingAction!.type,
                state.config.enabledCharacters
            );
            if (canBeBlocked) {
                return {
                    ...state,
                    phase: GamePhase.AwaitingBlock,
                    respondedPlayerIds: [],
                };
            }
            return resolveAction(state);
        }

        if (state.phase === GamePhase.AwaitingChallengeOnBlock) {
            // Block succeeds, action is canceled
            return advanceTurn({
                ...state,
                log: [
                    ...state.log,
                    createLogEntry('Bloqueio aceito. Ação cancelada.', 'block'),
                ],
            });
        }
    }

    return { ...state, respondedPlayerIds: responded };
}

// ── Declarar Bloqueio ─────────────────────────────────────
export function declareBlock(
    state: GameState,
    blockerId: string,
    claimedCharacter: Character
): GameState {
    if (!state.pendingAction) throw new Error('Sem ação pendente para bloquear');

    const blocker = getPlayerById(state, blockerId);

    return {
        ...state,
        phase: GamePhase.AwaitingChallengeOnBlock,
        pendingBlock: {
            blockingPlayerId: blockerId,
            claimedCharacter,
            blockedAction: state.pendingAction,
        },
        respondedPlayerIds: [],
        log: [
            ...state.log,
            createLogEntry(
                `${blocker.name} bloqueia com ${claimedCharacter}!`,
                'block'
            ),
        ],
    };
}

// ── Passar Bloqueio ───────────────────────────────────────
export function passBlock(state: GameState, playerId: string): GameState {
    const responded = [...state.respondedPlayerIds, playerId];
    const alive = getAlivePlayers(state).filter(
        (p) => p.id !== state.pendingAction?.sourcePlayerId
    );

    if (responded.length >= alive.length) {
        return resolveAction(state);
    }

    return { ...state, respondedPlayerIds: responded };
}

// ── Desafiar Bloqueio ─────────────────────────────────────
export function challengeBlock(state: GameState, challengerId: string): GameState {
    if (!state.pendingBlock) throw new Error('Sem bloqueio pendente');

    const challenger = getPlayerById(state, challengerId);
    const blocker = getPlayerById(state, state.pendingBlock.blockingPlayerId);
    const claimedChar = state.pendingBlock.claimedCharacter;

    let newState: GameState = {
        ...state,
        log: [
            ...state.log,
            createLogEntry(`${challenger.name} desafia o bloqueio de ${blocker.name}!`, 'challenge'),
        ],
    };

    const blockerAlive = getAliveInfluence(blocker);
    const hasChar = blockerAlive.some((c) => c.character === claimedChar);

    if (hasChar) {
        // Challenge on block fails -> challenger loses influence, block succeeds
        newState = {
            ...newState,
            log: [
                ...newState.log,
                createLogEntry(
                    `${blocker.name} revela ${claimedChar}! Bloqueio bem-sucedido.`,
                    'challenge'
                ),
            ],
        };

        newState = replaceRevealedCard(newState, blocker.id, claimedChar);

        const chalAlive = getAliveInfluence(getPlayerById(newState, challengerId));
        if (chalAlive.length === 1) {
            const idx = getPlayerById(newState, challengerId).influenceCards.findIndex(
                (c) => !c.isRevealed
            );
            newState = loseInfluence(newState, challengerId, idx);
            return advanceTurn(newState);
        }

        return {
            ...newState,
            phase: GamePhase.AwaitingCardSelection,
            respondedPlayerIds: [challengerId],
        };
    }

    // Challenge on block succeeds -> blocker loses influence, action resolves
    newState = {
        ...newState,
        log: [
            ...newState.log,
            createLogEntry(
                `${blocker.name} não tem ${claimedChar}! Bloqueio falhou.`,
                'challenge'
            ),
        ],
    };

    const blkAlive = getAliveInfluence(getPlayerById(newState, blocker.id));
    if (blkAlive.length === 1) {
        const idx = getPlayerById(newState, blocker.id).influenceCards.findIndex(
            (c) => !c.isRevealed
        );
        newState = loseInfluence(newState, blocker.id, idx);
        if (newState.phase === GamePhase.GameOver) return newState;
        return resolveAction(newState);
    }

    return {
        ...newState,
        phase: GamePhase.AwaitingCardSelection,
        respondedPlayerIds: [blocker.id],
    };
}

// ── Substituir carta revelada por desafio ─────────────────
function replaceRevealedCard(state: GameState, playerId: string, character: Character): GameState {
    const player = getPlayerById(state, playerId);
    const cardIdx = player.influenceCards.findIndex(
        (c) => c.character === character && !c.isRevealed
    );

    if (cardIdx === -1) return state;

    // Put card back in deck and draw new one
    const newDeck = shuffleArray([...state.courtDeck, character]);
    const newCard = newDeck.pop()!;

    return {
        ...state,
        courtDeck: newDeck,
        players: state.players.map((p) => {
            if (p.id !== playerId) return p;
            return {
                ...p,
                influenceCards: p.influenceCards.map((c, i) =>
                    i === cardIdx ? { character: newCard, isRevealed: false } : c
                ),
            };
        }),
    };
}

// ── Resolver Ação ─────────────────────────────────────────
export function resolveAction(state: GameState): GameState {
    const action = state.pendingAction;
    if (!action) throw new Error('Sem ação a resolver');

    const actor = getPlayerById(state, action.sourcePlayerId);

    switch (action.type) {
        case ActionType.Income:
            return advanceTurn({
                ...state,
                players: state.players.map((p) =>
                    p.id === actor.id ? { ...p, coins: p.coins + 1 } : p
                ),
                log: [...state.log, createLogEntry(`${actor.name} recebe 1 moeda.`, 'action')],
            });

        case ActionType.ForeignAid:
            return advanceTurn({
                ...state,
                players: state.players.map((p) =>
                    p.id === actor.id ? { ...p, coins: p.coins + 2 } : p
                ),
                log: [...state.log, createLogEntry(`${actor.name} recebe 2 moedas.`, 'action')],
            });

        case ActionType.Coup: {
            if (!action.targetPlayerId) throw new Error('Coup requer alvo');
            const newState: GameState = {
                ...state,
                players: state.players.map((p) =>
                    p.id === actor.id ? { ...p, coins: p.coins - COUP_COST } : p
                ),
                log: [
                    ...state.log,
                    createLogEntry(
                        `${actor.name} dá um Golpe em ${getPlayerName(state, action.targetPlayerId)}!`,
                        'action'
                    ),
                ],
            };

            const target = getPlayerById(newState, action.targetPlayerId);
            const targetAlive = getAliveInfluence(target);

            if (targetAlive.length === 1) {
                const idx = target.influenceCards.findIndex((c) => !c.isRevealed);
                return advanceTurn(loseInfluence(newState, action.targetPlayerId, idx));
            }

            return {
                ...newState,
                phase: GamePhase.AwaitingCardSelection,
                respondedPlayerIds: [action.targetPlayerId],
            };
        }

        case ActionType.Tax:
        case ActionType.SpeculatorTax:
            return advanceTurn({
                ...state,
                players: state.players.map((p) =>
                    p.id === actor.id ? { ...p, coins: p.coins + 3 } : p
                ),
                log: [...state.log, createLogEntry(`${actor.name} taxa 3 moedas.`, 'action')],
            });

        case ActionType.BureaucratTax: {
            if (!action.targetPlayerId) throw new Error('BureaucratTax requer alvo');
            return advanceTurn({
                ...state,
                players: state.players.map((p) => {
                    if (p.id === actor.id) return { ...p, coins: p.coins + 2 }; // +3 -1
                    if (p.id === action.targetPlayerId) return { ...p, coins: p.coins + 1 };
                    return p;
                }),
                log: [
                    ...state.log,
                    createLogEntry(
                        `${actor.name} taxa 3 moedas e dá 1 para ${getPlayerName(state, action.targetPlayerId)}.`,
                        'action'
                    ),
                ],
            });
        }

        case ActionType.Assassinate: {
            if (!action.targetPlayerId) throw new Error('Assassinate requer alvo');
            const newState: GameState = {
                ...state,
                players: state.players.map((p) =>
                    p.id === actor.id ? { ...p, coins: p.coins - ASSASSINATE_COST } : p
                ),
                log: [
                    ...state.log,
                    createLogEntry(
                        `${actor.name} assassina ${getPlayerName(state, action.targetPlayerId)}!`,
                        'action'
                    ),
                ],
            };

            const target = getPlayerById(newState, action.targetPlayerId);
            const targetAlive = getAliveInfluence(target);

            if (targetAlive.length === 1) {
                const idx = target.influenceCards.findIndex((c) => !c.isRevealed);
                return advanceTurn(loseInfluence(newState, action.targetPlayerId, idx));
            }

            return {
                ...newState,
                phase: GamePhase.AwaitingCardSelection,
                respondedPlayerIds: [action.targetPlayerId],
            };
        }

        case ActionType.Steal: {
            if (!action.targetPlayerId) throw new Error('Steal requer alvo');
            const target = getPlayerById(state, action.targetPlayerId);
            const stolen = Math.min(2, target.coins);

            return advanceTurn({
                ...state,
                players: state.players.map((p) => {
                    if (p.id === actor.id) return { ...p, coins: p.coins + stolen };
                    if (p.id === action.targetPlayerId) return { ...p, coins: p.coins - stolen };
                    return p;
                }),
                log: [
                    ...state.log,
                    createLogEntry(
                        `${actor.name} rouba ${stolen} moeda(s) de ${getPlayerName(state, action.targetPlayerId)}.`,
                        'action'
                    ),
                ],
            });
        }

        case ActionType.Exchange: {
            // Draw 2 cards from deck
            const newDeck = [...state.courtDeck];
            const drawn: Character[] = [];
            for (let i = 0; i < 2 && newDeck.length > 0; i++) {
                drawn.push(newDeck.pop()!);
            }

            return {
                ...state,
                courtDeck: newDeck,
                drawnCards: drawn,
                phase: GamePhase.AwaitingExchangeSelection,
                log: [
                    ...state.log,
                    createLogEntry(`${actor.name} realiza uma troca diplomática.`, 'exchange'),
                ],
            };
        }

        case ActionType.Examine: {
            if (!action.targetPlayerId) throw new Error('Examine requer alvo');
            return {
                ...state,
                phase: GamePhase.AwaitingExamineDecision,
                log: [
                    ...state.log,
                    createLogEntry(
                        `${actor.name} examina uma carta de ${getPlayerName(state, action.targetPlayerId)}.`,
                        'action'
                    ),
                ],
            };
        }

        case ActionType.JesterExchange: {
            if (!action.targetPlayerId) throw new Error('JesterExchange requer alvo');
            const newDeck = [...state.courtDeck];
            const drawn: Character[] = [];
            if (newDeck.length > 0) drawn.push(newDeck.pop()!);

            return {
                ...state,
                courtDeck: newDeck,
                drawnCards: drawn,
                phase: GamePhase.AwaitingExchangeSelection,
                log: [
                    ...state.log,
                    createLogEntry(
                        `${actor.name} faz uma troca de bufão com ${getPlayerName(state, action.targetPlayerId)}.`,
                        'exchange'
                    ),
                ],
            };
        }

        case ActionType.SocialistRedistribute: {
            const alivePlayers = getAlivePlayers(state).filter((p) => p.id !== actor.id);
            let totalCollected = 0;
            const updatedPlayers = state.players.map((p) => {
                if (p.id === actor.id || p.isEliminated) return p;
                const take = Math.min(1, p.coins);
                totalCollected += take;
                return { ...p, coins: p.coins - take };
            });

            const kept = Math.min(1, totalCollected);
            const returned = totalCollected - kept;

            return advanceTurn({
                ...state,
                players: updatedPlayers.map((p) =>
                    p.id === actor.id ? { ...p, coins: p.coins + kept } : p
                ),
                log: [
                    ...state.log,
                    createLogEntry(
                        `${actor.name} redistribui: coletou ${totalCollected}, ficou com ${kept}.`,
                        'action'
                    ),
                ],
            });
        }

        default:
            return advanceTurn(state);
    }
}

// ── Completar Seleção de Carta (perder influência) ────────
export function selectCardToLose(state: GameState, playerId: string, cardIndex: number): GameState {
    let newState = loseInfluence(state, playerId, cardIndex);

    if (newState.phase === GamePhase.GameOver) return newState;

    // After losing card from challenge on action, continue to block phase or resolve
    if (state.phase === GamePhase.AwaitingCardSelection && state.pendingAction) {
        // Was this the challenger losing a card? (challenge failed, action proceeds)
        if (playerId !== state.pendingAction.sourcePlayerId) {
            const canBeBlocked = isActionBlockable(
                state.pendingAction.type,
                newState.config.enabledCharacters
            );
            if (canBeBlocked) {
                return { ...newState, phase: GamePhase.AwaitingBlock, respondedPlayerIds: [] };
            }
            return resolveAction(newState);
        }

        // Actor lost a card (challenge succeeded, action fails)
        return advanceTurn(newState);
    }

    return advanceTurn(newState);
}

// ── Completar Troca (Exchange) ────────────────────────────
export function completeExchange(
    state: GameState,
    playerId: string,
    keptCards: Character[],
    returnedCards: Character[]
): GameState {
    const player = getPlayerById(state, playerId);
    const aliveCount = getAliveInfluence(player).length;

    if (keptCards.length !== aliveCount) {
        throw new Error(`Deve manter exatamente ${aliveCount} carta(s)`);
    }

    const newInfluence: InfluenceCard[] = [
        ...keptCards.map((c) => ({ character: c, isRevealed: false })),
        ...player.influenceCards.filter((c) => c.isRevealed),
    ];

    const newDeck = shuffleArray([...state.courtDeck, ...returnedCards]);

    return advanceTurn({
        ...state,
        courtDeck: newDeck,
        drawnCards: [],
        players: state.players.map((p) =>
            p.id === playerId ? { ...p, influenceCards: newInfluence } : p
        ),
        log: [
            ...state.log,
            createLogEntry(`${player.name} completou a troca.`, 'exchange'),
        ],
    });
}

// ── Decisão do Inquisitor (Examine) ───────────────────────
export function resolveExamine(
    state: GameState,
    forceExchange: boolean,
    targetCardIndex: number
): GameState {
    if (!state.pendingAction?.targetPlayerId) throw new Error('Sem alvo de examine');

    const target = getPlayerById(state, state.pendingAction.targetPlayerId);
    const card = target.influenceCards[targetCardIndex];

    if (!card || card.isRevealed) throw new Error('Carta inválida');

    if (forceExchange) {
        // Force target to exchange the card
        const newDeck = shuffleArray([...state.courtDeck, card.character]);
        const newCard = newDeck.pop()!;

        return advanceTurn({
            ...state,
            courtDeck: newDeck,
            players: state.players.map((p) => {
                if (p.id !== target.id) return p;
                return {
                    ...p,
                    influenceCards: p.influenceCards.map((c, i) =>
                        i === targetCardIndex ? { character: newCard, isRevealed: false } : c
                    ),
                };
            }),
            log: [
                ...state.log,
                createLogEntry(`Inquisitor forçou ${target.name} a trocar uma carta.`, 'action'),
            ],
        });
    }

    return advanceTurn({
        ...state,
        log: [
            ...state.log,
            createLogEntry(`Inquisitor permite que ${target.name} mantenha a carta.`, 'action'),
        ],
    });
}

// ── Avançar Turno ─────────────────────────────────────────
export function advanceTurn(state: GameState): GameState {
    if (state.phase === GamePhase.GameOver) return state;

    const nextIdx = nextAlivePlayerIndex(state);

    return {
        ...state,
        currentPlayerIndex: nextIdx,
        phase: GamePhase.AwaitingAction,
        pendingAction: null,
        pendingBlock: null,
        respondedPlayerIds: [],
        drawnCards: [],
        turnNumber: state.turnNumber + 1,
    };
}

// ── Re-export helpers ─────────────────────────────────────
export { getAliveInfluence, getAlivePlayers, getPlayerById };
