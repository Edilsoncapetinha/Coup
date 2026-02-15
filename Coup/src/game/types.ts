// ── Personagens ───────────────────────────────────────────
export enum Character {
    Duke = 'Duke',
    Assassin = 'Assassin',
    Captain = 'Captain',
    Ambassador = 'Ambassador',
    Contessa = 'Contessa',
    // Reformation
    Inquisitor = 'Inquisitor',
    // Promo Cards
    Jester = 'Jester',
    Bureaucrat = 'Bureaucrat',
    Speculator = 'Speculator',
    Socialist = 'Socialist',
}

// ── Ações ─────────────────────────────────────────────────
export enum ActionType {
    Income = 'Income',
    ForeignAid = 'ForeignAid',
    Coup = 'Coup',
    Tax = 'Tax',
    Assassinate = 'Assassinate',
    Steal = 'Steal',
    Exchange = 'Exchange',
    Examine = 'Examine',
    InquisitorSelfExchange = 'InquisitorSelfExchange',
    BureaucratTax = 'BureaucratTax',
    SpeculatorTax = 'SpeculatorTax',
    SocialistRedistribute = 'SocialistRedistribute',
    // Reformation extras
    Convert = 'Convert',
    Embezzle = 'Embezzle',
}

// ── Fases do Jogo (FSM) ──────────────────────────────────
export enum GamePhase {
    AwaitingAction = 'AwaitingAction',
    AwaitingChallengeOnAction = 'AwaitingChallengeOnAction',
    AwaitingBlock = 'AwaitingBlock',
    AwaitingChallengeOnBlock = 'AwaitingChallengeOnBlock',
    ResolvingAction = 'ResolvingAction',
    AwaitingCardSelection = 'AwaitingCardSelection',
    AwaitingExchangeSelection = 'AwaitingExchangeSelection',
    AwaitingExamineDecision = 'AwaitingExamineDecision',
    AwaitingTargetSelection = 'AwaitingTargetSelection',
    AwaitingInquisitorChoice = 'AwaitingInquisitorChoice',
    AwaitingCoupRedirect = 'AwaitingCoupRedirect',
    AwaitingCoupRedirectChallenge = 'AwaitingCoupRedirectChallenge',
    GameOver = 'GameOver',
}

// ── Facções (Reformation) ─────────────────────────────────
export enum Faction {
    Loyalist = 'Loyalist',
    Reformist = 'Reformist',
}

// ── Dificuldade dos Bots ──────────────────────────────────
export enum BotDifficulty {
    Easy = 'Easy',
    Medium = 'Medium',
    Hard = 'Hard',
}

// ── Card de Influência ────────────────────────────────────
export interface InfluenceCard {
    character: Character;
    isRevealed: boolean;
}

// ── Jogador ───────────────────────────────────────────────
export interface Player {
    id: string;
    name: string;
    coins: number;
    influenceCards: InfluenceCard[];
    isHuman: boolean;
    botDifficulty?: BotDifficulty;
    faction?: Faction;
    isEliminated: boolean;
}

// ── Ação do Jogo ──────────────────────────────────────────
export interface GameAction {
    type: ActionType;
    sourcePlayerId: string;
    targetPlayerId?: string;
    claimedCharacter?: Character;
    examinedCard?: { card: InfluenceCard; index: number };
    redirectDeclined?: boolean;
}

// ── Bloqueio Pendente ─────────────────────────────────────
export interface PendingBlock {
    blockingPlayerId: string;
    claimedCharacter: Character;
    blockedAction: GameAction;
}

// ── Entrada no Log ────────────────────────────────────────
export interface LogEntry {
    id: string;
    timestamp: number;
    message: string;
    type: 'action' | 'challenge' | 'block' | 'elimination' | 'system' | 'exchange';
}

// ── Configuração da Partida ───────────────────────────────
export interface GameConfig {
    playerCount: number;
    humanPlayerName: string;
    enabledCharacters: Character[];
    enableFactions: boolean;
    botDifficulty: BotDifficulty;
    cardsPerCharacter: number;
    botCount?: number;
    playerIds?: string[];
    playerNames?: string[];
}

// ── Estado Completo do Jogo ───────────────────────────────
export interface GameState {
    config: GameConfig;
    players: Player[];
    courtDeck: Character[];
    treasuryReserve: number; // moedas da conversão de facções
    currentPlayerIndex: number;
    phase: GamePhase;
    pendingAction: GameAction | null;
    pendingBlock: PendingBlock | null;
    // Para rastrear quem já respondeu ao desafio/bloqueio neste turno
    respondedPlayerIds: string[];
    // Para exchange/examine
    drawnCards: Character[];
    // Log
    log: LogEntry[];
    // Jogo encerrado
    winnerId: string | null;
    turnNumber: number;
    // Coup redirect chain (Bufão)
    coupRedirectChain: string[];
    coupRedirectSourceId: string | null;
    cardSelectionReason?: 'challenge-penalty' | 'action-effect';
}

// ── Definição Declarativa de Personagem ───────────────────
export interface CharacterDefinition {
    character: Character;
    action?: ActionType;
    actionName?: string;
    actionDescription: string;
    actionCost: number;
    requiresTarget: boolean;
    blocksActions: ActionType[];
    blockDescription?: string;
    replacesCharacter?: Character; // para extensões que substituem um personagem base
}

// ── Resultado de Resolução ────────────────────────────────
export interface ActionResult {
    success: boolean;
    message: string;
    stateChanges?: Partial<GameState>;
}

// ── Decisão do Bot ────────────────────────────────────────
export interface BotDecision {
    action?: GameAction;
    shouldChallenge?: boolean;
    shouldBlock?: boolean;
    blockingCharacter?: Character;
    cardToLoseIndex?: number;
    selectedCards?: Character[];
    examineForceExchange?: boolean;
}

// ── Default configs ───────────────────────────────────────
export const BASE_CHARACTERS: Character[] = [
    Character.Duke,
    Character.Assassin,
    Character.Captain,
    Character.Ambassador,
    Character.Contessa,
    Character.Inquisitor,
    Character.Jester,
];

export const REFORMATION_CHARACTERS: Character[] = [
    Character.Inquisitor,
];

export const PROMO_CHARACTERS: Character[] = [
    Character.Jester,
    Character.Bureaucrat,
    Character.Speculator,
    Character.Socialist,
];

export const ALL_CHARACTERS: Character[] = [
    ...BASE_CHARACTERS,
    ...REFORMATION_CHARACTERS,
    ...PROMO_CHARACTERS,
];

export const DEFAULT_CONFIG: GameConfig = {
    playerCount: 4,
    humanPlayerName: 'Jogador',
    enabledCharacters: [...BASE_CHARACTERS],
    enableFactions: false,
    botDifficulty: BotDifficulty.Medium,
    cardsPerCharacter: 3,
};

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 6;
export const STARTING_COINS = 2;
export const COUP_COST = 7;
export const ASSASSINATE_COST = 3;
export const FORCED_COUP_THRESHOLD = 10;
