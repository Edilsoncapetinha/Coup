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

    const botCount = config.botCount ?? (config.playerCount - 1);

    for (let i = 0; i < config.playerCount; i++) {
        // Determine if player is human based on botCount
        // If 2 players and botCount 0, both are human.
        // If 4 players and botCount 3, only first is human (classic single player)
        // If 4 players and botCount 0, all 4 are human.

        // Logic: The last `botCount` players are bots. The first N are humans.
        const humanCount = config.playerCount - botCount;
        const isHuman = i < humanCount;

        const card1 = shuffledDeck.pop()!;
        const card2 = shuffledDeck.pop()!;

        // Determine ID and Name
        const customId = config.playerIds?.[i];
        const id = customId || `player-${i}`;

        // Determine Name
        let name = `Player ${i + 1}`;
        if (config.playerNames?.[i]) {
            name = config.playerNames[i];
        } else if (isHuman && i === 0 && config.humanPlayerName) {
            name = config.humanPlayerName;
        } else if (!isHuman) {
            name = botNames[i % botNames.length] || `Bot ${i}`;
        }

        players.push({
            id,
            name,
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
        coupRedirectChain: [],
        coupRedirectSourceId: null,
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

    // Deduct cost immediately
    const actionCost = getActionCost(action.type);
    let newState = { ...state, log: newLog };

    if (actionCost > 0) {
        newState = {
            ...newState,
            players: newState.players.map((p) =>
                p.id === player.id ? { ...p, coins: p.coins - actionCost } : p
            ),
        };
    }

    // Check if action can be challenged
    const canBeChallenged = isActionChallengeable(action.type);

    if (canBeChallenged) {
        return {
            ...newState,
            phase: GamePhase.AwaitingChallengeOnAction,
            pendingAction: action,
            respondedPlayerIds: [],
        };
    }

    // Check if action can be blocked (ForeignAid)
    const canBeBlocked = isActionBlockable(action.type, state.config.enabledCharacters);
    if (canBeBlocked) {
        return {
            ...newState,
            phase: GamePhase.AwaitingBlock,
            pendingAction: action,
            respondedPlayerIds: [],
        };
    }

    // Direct resolve (Income, Coup)
    return resolveAction({
        ...newState,
        pendingAction: action,
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

            // Assassinate rule: If challenge fails, skip block phase and resolve
            if (state.pendingAction.type === ActionType.Assassinate) {
                return resolveAction(newState);
            }

            // For other actions, check if they can be blocked
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
        cardSelectionReason: 'challenge-penalty',
    };

    // Refund action cost
    // Refund action cost REMOVED - Coins are lost on failed challenge too
    /*
    const actionCost = getActionCost(state.pendingAction.type);
    if (actionCost > 0) {
        newState = {
            ...newState,
            players: newState.players.map((p) =>
                p.id === actor.id ? { ...p, coins: p.coins + actionCost } : p
            ),
        };
    }
    */

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
                `${blocker.name} bloqueia com ${claimedCharacter} !`,
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
            createLogEntry(`${challenger.name} desafia o bloqueio de ${blocker.name} !`, 'challenge'),
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
                    `${blocker.name} revela ${claimedChar} !Bloqueio bem - sucedido.`,
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
        cardSelectionReason: 'challenge-penalty',
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
            const coupLog: GameState = {
                ...state,
                players: state.players.map((p) =>
                    p.id === actor.id ? { ...p } : p
                ),
                log: [
                    ...state.log,
                    createLogEntry(
                        `${actor.name} dá um Golpe em ${getPlayerName(state, action.targetPlayerId)} !`,
                        'action'
                    ),
                ],
            };

            // Check if target can claim Jester to redirect
            const coupTarget = getPlayerById(coupLog, action.targetPlayerId);
            if (!action.redirectDeclined && !coupTarget.isEliminated && state.config.enabledCharacters.includes(Character.Jester)) {
                return {
                    ...coupLog,
                    phase: GamePhase.AwaitingCoupRedirect,
                    coupRedirectChain: [action.targetPlayerId],
                    coupRedirectSourceId: actor.id,
                };
            }

            // No Jester in game, resolve normally
            const targetAlive = getAliveInfluence(coupTarget);
            if (targetAlive.length === 1) {
                const idx = coupTarget.influenceCards.findIndex((c) => !c.isRevealed);
                return advanceTurn(loseInfluence(coupLog, action.targetPlayerId, idx));
            }

            return {
                ...coupLog,
                phase: GamePhase.AwaitingCardSelection,
                respondedPlayerIds: [action.targetPlayerId],
                cardSelectionReason: 'action-effect',
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
                    p.id === actor.id ? { ...p } : p
                ),
                log: [
                    ...state.log,
                    createLogEntry(
                        `${actor.name} assassina ${getPlayerName(state, action.targetPlayerId)} !`,
                        'action'
                    ),
                ],
            };

            const target = getPlayerById(newState, action.targetPlayerId);
            const targetAlive = getAliveInfluence(target);

            // If target is already eliminated (e.g. lost last card to challenge), just advance
            if (targetAlive.length === 0) {
                return advanceTurn(newState);
            }

            if (targetAlive.length === 1) {
                const idx = target.influenceCards.findIndex((c) => !c.isRevealed);
                return advanceTurn(loseInfluence(newState, action.targetPlayerId, idx));
            }

            return {
                ...newState,
                phase: GamePhase.AwaitingCardSelection,
                respondedPlayerIds: [action.targetPlayerId],
                cardSelectionReason: 'action-effect',
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
            // Ambassador: return all alive cards to deck, draw same count
            const aliveCards = getAliveInfluence(actor);
            const aliveCount = aliveCards.length;
            const returnedChars = aliveCards.map((c) => c.character);

            // Put alive cards back and shuffle
            let newDeck = shuffleArray([...state.courtDeck, ...returnedChars]);

            // Draw same number of cards
            const newCards: Character[] = [];
            for (let i = 0; i < aliveCount && newDeck.length > 0; i++) {
                newCards.push(newDeck.pop()!);
            }

            // Build new influence cards (new drawn + existing revealed)
            const newInfluence = [
                ...newCards.map((c) => ({ character: c, isRevealed: false })),
                ...actor.influenceCards.filter((c) => c.isRevealed),
            ];

            return advanceTurn({
                ...state,
                courtDeck: newDeck,
                players: state.players.map((p) =>
                    p.id === actor.id ? { ...p, influenceCards: newInfluence } : p
                ),
                log: [
                    ...state.log,
                    createLogEntry(`${actor.name} troca suas cartas com o baralho.`, 'exchange'),
                ],
            });
        }

        case ActionType.Examine: {
            // Enter Inquisitor choice phase: examine OR self-exchange
            return {
                ...state,
                phase: GamePhase.AwaitingInquisitorChoice,
                log: [
                    ...state.log,
                    createLogEntry(
                        `${actor.name} usa o poder do Inquisidor.`,
                        'action'
                    ),
                ],
            };
        }



        case ActionType.InquisitorSelfExchange: {
            // Draw 1 card from deck for self-exchange
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
                    createLogEntry(`${actor.name} troca sua própria carta(Inquisidor).`, 'exchange'),
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

// ── Coup Redirect (Bufão) ─────────────────────────────────
export function declareCoupRedirect(
    state: GameState,
    redirectorId: string,
    newTargetId: string
): GameState {
    const redirector = getPlayerById(state, redirectorId);
    const newTarget = getPlayerById(state, newTargetId);

    const matchSource = state.coupRedirectSourceId || state.pendingAction?.sourcePlayerId || '';
    if (!matchSource) {
        console.error('CRITICAL: Missing coup source in declareCoupRedirect');
        // fallback to prevent crash, but this is bad state
    }

    return {
        ...state,
        phase: GamePhase.AwaitingCoupRedirectChallenge,
        pendingAction: {
            type: ActionType.Coup,
            sourcePlayerId: matchSource,
            targetPlayerId: newTargetId,
            claimedCharacter: Character.Jester,
        },
        respondedPlayerIds: [],
        coupRedirectChain: [...state.coupRedirectChain, newTargetId],
        log: [
            ...state.log,
            createLogEntry(
                `${redirector.name} alega Bufão e redireciona o Golpe para ${newTarget.name} !`,
                'action'
            ),
        ],
    };
}

export function passCoupRedirect(state: GameState, playerId: string): GameState {
    // Player accepts the coup, loses influence
    const player = getPlayerById(state, playerId);
    const aliveCards = getAliveInfluence(player);

    const newState: GameState = {
        ...state,
        pendingAction: { ...state.pendingAction!, redirectDeclined: true },
        coupRedirectChain: [],
        coupRedirectSourceId: null,
        log: [
            ...state.log,
            createLogEntry(`${player.name} aceita o Golpe.`, 'action'),
        ],
    };

    if (aliveCards.length === 1) {
        const idx = player.influenceCards.findIndex((c) => !c.isRevealed);
        return advanceTurn(loseInfluence(newState, playerId, idx));
    }

    return {
        ...newState,
        phase: GamePhase.AwaitingCardSelection,
        respondedPlayerIds: [playerId],
        cardSelectionReason: 'action-effect',
    };
}

export function challengeCoupRedirect(state: GameState, challengerId: string): GameState {
    // The last person in the redirect chain claimed Jester
    const chain = state.coupRedirectChain;
    const redirectorId = chain[chain.length - 2]; // The one who redirected
    const redirector = getPlayerById(state, redirectorId);
    const challenger = getPlayerById(state, challengerId);

    let newState: GameState = {
        ...state,
        log: [
            ...state.log,
            createLogEntry(
                `${challenger.name} desafia o Bufão de ${redirector.name} !`,
                'challenge'
            ),
        ],
    };

    const redirectorCards = getAliveInfluence(redirector);
    const jesterCount = redirectorCards.filter((c) => c.character === Character.Jester).length;

    // Count how many times this redirector appears in the chain (excluding the new target at the end)
    // The chain includes the victims.
    // [A, B, A, C] -> A redirected to B (index 0), B to A (index 1), A to C (index 2).
    // Redirector is chain[chain.length - 2] (A).
    // A appears at 0 and 2. So A has redirected 2 times.
    const redirectorOccurrences = chain.slice(0, chain.length - 1).filter((id) => id === redirectorId).length;

    const hasEnoughJesters = jesterCount >= redirectorOccurrences;

    if (hasEnoughJesters) {
        // Challenge fails — challenger loses influence, redirect stands
        // Reveal and replace ALL required Jesters
        newState = {
            ...newState,
            log: [
                ...newState.log,
                createLogEntry(
                    `${redirector.name} revela ${redirectorOccurrences}x Bufão! ${challenger.name} perde influência.`,
                    'challenge'
                ),
            ],
        };

        // Replace the required number of Jesters
        for (let i = 0; i < redirectorOccurrences; i++) {
            newState = replaceRevealedCard(newState, redirector.id, Character.Jester);
        }

        const chalAlive = getAliveInfluence(getPlayerById(newState, challengerId));
        if (chalAlive.length === 1) {
            const idx = getPlayerById(newState, challengerId).influenceCards.findIndex(
                (c) => !c.isRevealed
            );
            newState = loseInfluence(newState, challengerId, idx);
            if (newState.phase === GamePhase.GameOver) return newState;
        } else {
            // Challenger must choose which card to lose, then redirect continues
            return {
                ...newState,
                phase: GamePhase.AwaitingCardSelection,
                respondedPlayerIds: [challengerId],
                cardSelectionReason: 'challenge-penalty',
            };
        }

        // After challenger lost card, redirect stands — check new target
        const newTargetId = chain[chain.length - 1];
        const newTarget = getPlayerById(newState, newTargetId);
        if (newTarget.isEliminated) {
            return advanceTurn({ ...newState, coupRedirectChain: [], coupRedirectSourceId: null });
        }

        // New target can also try to redirect
        if (state.config.enabledCharacters.includes(Character.Jester)) {
            return {
                ...newState,
                phase: GamePhase.AwaitingCoupRedirect,
            };
        }

        // No more redirects, target loses influence
        const targetAlive = getAliveInfluence(newTarget);
        if (targetAlive.length === 1) {
            const idx = newTarget.influenceCards.findIndex((c) => !c.isRevealed);
            return advanceTurn(loseInfluence({ ...newState, coupRedirectChain: [], coupRedirectSourceId: null }, newTargetId, idx));
        }
        return {
            ...newState,
            coupRedirectChain: [],
            coupRedirectSourceId: null,
            phase: GamePhase.AwaitingCardSelection,
            respondedPlayerIds: [newTargetId],
        };
    }

    // Challenge succeeds — redirector loses BOTH cards (double loss)
    newState = {
        ...newState,
        log: [
            ...newState.log,
            createLogEntry(
                `${redirector.name} não tem ${redirectorOccurrences}x Bufão! Perde DUAS cartas(perda dupla)!`,
                'challenge'
            ),
        ],
    };

    // Lose all alive cards
    const aliveCards = getAliveInfluence(getPlayerById(newState, redirectorId));
    for (const card of aliveCards) {
        // Find index of first unrevealed card
        const idx = getPlayerById(newState, redirectorId).influenceCards.findIndex(
            (c) => !c.isRevealed
        );
        if (idx !== -1) {
            newState = loseInfluence(newState, redirectorId, idx);
        }
        if (newState.phase === GamePhase.GameOver) return newState;
    }

    return advanceTurn({ ...newState, coupRedirectChain: [], coupRedirectSourceId: null });
}

export function passCoupRedirectChallenge(state: GameState, playerId: string): GameState {
    const responded = [...state.respondedPlayerIds, playerId];
    const alive = getAlivePlayers(state).filter(
        (p) => {
            const chain = state.coupRedirectChain;
            const redirectorId = chain[chain.length - 2];
            return p.id !== redirectorId; // Everyone except the redirector can challenge
        }
    );

    if (responded.length >= alive.length) {
        // No one challenged, redirect succeeds
        const chain = state.coupRedirectChain;
        const newTargetId = chain[chain.length - 1];
        const newTarget = getPlayerById(state, newTargetId);

        if (newTarget.isEliminated) {
            return advanceTurn({ ...state, coupRedirectChain: [], coupRedirectSourceId: null });
        }

        // New target can also try to redirect
        if (state.config.enabledCharacters.includes(Character.Jester)) {
            return {
                ...state,
                phase: GamePhase.AwaitingCoupRedirect,
                respondedPlayerIds: [],
            };
        }

        // Resolve coup on new target
        const targetAlive = getAliveInfluence(newTarget);
        if (targetAlive.length === 1) {
            const idx = newTarget.influenceCards.findIndex((c) => !c.isRevealed);
            return advanceTurn(loseInfluence({ ...state, coupRedirectChain: [], coupRedirectSourceId: null }, newTargetId, idx));
        }
        return {
            ...state,
            coupRedirectChain: [],
            coupRedirectSourceId: null,
            phase: GamePhase.AwaitingCardSelection,
            respondedPlayerIds: [newTargetId],
        };
    }

    return { ...state, respondedPlayerIds: responded };
}

// ── Inquisitor Choice ─────────────────────────────────
export function resolveInquisitorChoice(
    state: GameState,
    choice: 'self-exchange' | 'examine',
    targetPlayerId?: string
): GameState {
    if (!state.pendingAction) throw new Error('Sem ação pendente');
    const actor = getPlayerById(state, state.pendingAction.sourcePlayerId);

    if (choice === 'self-exchange') {
        // Treat as InquisitorSelfExchange
        const updatedAction = { ...state.pendingAction, type: ActionType.InquisitorSelfExchange };
        return resolveAction({ ...state, pendingAction: updatedAction });
    }

    // choice === 'examine' - need a target
    if (!targetPlayerId) throw new Error('Examine requer alvo');

    const target = getPlayerById(state, targetPlayerId);
    const aliveCards = target.influenceCards
        .map((c, i) => ({ card: c, index: i }))
        .filter((x) => !x.card.isRevealed);

    if (aliveCards.length === 0) throw new Error('Alvo sem cartas');
    const selected = aliveCards[Math.floor(Math.random() * aliveCards.length)];

    return {
        ...state,
        phase: GamePhase.AwaitingExamineDecision,
        pendingAction: {
            ...state.pendingAction,
            type: ActionType.Examine,
            targetPlayerId,
            examinedCard: selected,
        },
        log: [
            ...state.log,
            createLogEntry(`${actor.name} examina a mão de ${target.name}.`, 'action'),
        ],
    };
}

// ── Completar Seleção de Carta (perder influência) ────────
export function selectCardToLose(state: GameState, playerId: string, cardIndex: number): GameState {
    let newState = loseInfluence(state, playerId, cardIndex);

    if (newState.phase === GamePhase.GameOver) return newState;

    // After losing card from challenge on action, continue to block phase or resolve
    if (state.phase === GamePhase.AwaitingCardSelection && state.pendingAction) {
        console.log('[DEBUG-V2] Fix loaded: Checking ActionType', state.pendingAction.type);
        // Was this the challenger losing a card? (challenge failed, action proceeds)
        if (playerId !== state.pendingAction.sourcePlayerId) {
            // Assassinate rule: If challenge failed, skip block phase and resolve
            if (state.pendingAction.type === ActionType.Assassinate) {
                return resolveAction(newState);
            }

            // Fix for Coup Double Damage: Coup damage is final, do not re-resolve
            if (state.pendingAction.type === ActionType.Coup) {
                return advanceTurn({ ...newState, cardSelectionReason: undefined });
            }

            const canBeBlocked = isActionBlockable(
                state.pendingAction.type,
                newState.config.enabledCharacters
            );
            if (state.cardSelectionReason === 'action-effect') {
                return advanceTurn({ ...newState, cardSelectionReason: undefined });
            }

            if (canBeBlocked) {
                return { ...newState, phase: GamePhase.AwaitingBlock, respondedPlayerIds: [] };
            }

            return resolveAction(newState);
        }

        // Actor lost a card (challenge succeeded, action fails)
        return advanceTurn({ ...newState, cardSelectionReason: undefined });
    }

    return advanceTurn({ ...newState, cardSelectionReason: undefined });
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
        coupRedirectChain: [],
        coupRedirectSourceId: null,
        cardSelectionReason: undefined,
    };
}

// ── Re-export helpers ─────────────────────────────────────
export { getAliveInfluence, getAlivePlayers, getPlayerById };
