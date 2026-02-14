import {
    Character,
    ActionType,
    type CharacterDefinition,
} from './types';

export const CHARACTER_DEFINITIONS: Record<Character, CharacterDefinition> = {
    // ── Base Game ───────────────────────────────────────────
    [Character.Duke]: {
        character: Character.Duke,
        action: ActionType.Tax,
        actionName: 'Taxar',
        actionDescription: 'Pega 3 moedas do tesouro.',
        actionCost: 0,
        requiresTarget: false,
        blocksActions: [ActionType.ForeignAid],
        blockDescription: 'Bloqueia Ajuda Externa.',
    },

    [Character.Assassin]: {
        character: Character.Assassin,
        action: ActionType.Assassinate,
        actionName: 'Assassinar',
        actionDescription: 'Paga 3 moedas para forçar um jogador a perder uma influência.',
        actionCost: 3,
        requiresTarget: true,
        blocksActions: [],
    },

    [Character.Captain]: {
        character: Character.Captain,
        action: ActionType.Steal,
        actionName: 'Roubar',
        actionDescription: 'Rouba 2 moedas de outro jogador.',
        actionCost: 0,
        requiresTarget: true,
        blocksActions: [ActionType.Steal],
        blockDescription: 'Bloqueia Roubo.',
    },

    [Character.Ambassador]: {
        character: Character.Ambassador,
        action: ActionType.Exchange,
        actionName: 'Trocar',
        actionDescription: 'Compra 2 cartas do baralho da corte, troca se quiser, devolve 2.',
        actionCost: 0,
        requiresTarget: false,
        blocksActions: [ActionType.Steal],
        blockDescription: 'Bloqueia Roubo.',
    },

    [Character.Contessa]: {
        character: Character.Contessa,
        actionDescription: 'Sem ação especial.',
        actionCost: 0,
        requiresTarget: false,
        blocksActions: [ActionType.Assassinate],
        blockDescription: 'Bloqueia Assassinato.',
    },

    // ── Reformation ─────────────────────────────────────────
    [Character.Inquisitor]: {
        character: Character.Inquisitor,
        action: ActionType.Examine,
        actionName: 'Examinar',
        actionDescription: 'Espiona uma carta de outro jogador. Pode forçar a troca ou devolver.',
        actionCost: 0,
        requiresTarget: true,
        blocksActions: [ActionType.Steal],
        blockDescription: 'Bloqueia Roubo.',
        replacesCharacter: Character.Ambassador,
    },

    // ── Promo Cards ─────────────────────────────────────────
    [Character.Jester]: {
        character: Character.Jester,
        action: ActionType.JesterExchange,
        actionName: 'Troca do Bufão',
        actionDescription: 'Pega 1 carta do baralho e 1 de outro jogador, troca se quiser, devolve.',
        actionCost: 0,
        requiresTarget: true,
        blocksActions: [],
        replacesCharacter: Character.Ambassador,
    },

    [Character.Bureaucrat]: {
        character: Character.Bureaucrat,
        action: ActionType.BureaucratTax,
        actionName: 'Taxa Burocrática',
        actionDescription: 'Pega 3 moedas do tesouro, mas deve dar 1 a outro jogador.',
        actionCost: 0,
        requiresTarget: true,
        blocksActions: [ActionType.ForeignAid],
        blockDescription: 'Bloqueia Ajuda Externa.',
        replacesCharacter: Character.Duke,
    },

    [Character.Speculator]: {
        character: Character.Speculator,
        action: ActionType.SpeculatorTax,
        actionName: 'Especular',
        actionDescription: 'Pega 3 moedas do tesouro.',
        actionCost: 0,
        requiresTarget: false,
        blocksActions: [ActionType.ForeignAid],
        blockDescription: 'Bloqueia Ajuda Externa.',
        replacesCharacter: Character.Duke,
    },

    [Character.Socialist]: {
        character: Character.Socialist,
        action: ActionType.SocialistRedistribute,
        actionName: 'Redistribuir',
        actionDescription: 'Coleta 1 moeda de cada jogador, fica com 1, devolve o restante.',
        actionCost: 0,
        requiresTarget: false,
        blocksActions: [ActionType.Steal],
        blockDescription: 'Bloqueia Roubo.',
        replacesCharacter: Character.Ambassador,
    },
};

// ── Ações Gerais (não requerem personagem) ────────────────
export const GENERAL_ACTIONS = [
    {
        type: ActionType.Income,
        name: 'Renda',
        description: 'Pega 1 moeda do tesouro.',
        cost: 0,
        requiresTarget: false,
        canBeBlocked: false,
        canBeChallenged: false,
    },
    {
        type: ActionType.ForeignAid,
        name: 'Ajuda Externa',
        description: 'Pega 2 moedas do tesouro. Pode ser bloqueada pelo Duque.',
        cost: 0,
        requiresTarget: false,
        canBeBlocked: true,
        canBeChallenged: false,
    },
    {
        type: ActionType.Coup,
        name: 'Golpe de Estado',
        description: 'Paga 7 moedas para forçar um jogador a perder uma influência.',
        cost: 7,
        requiresTarget: true,
        canBeBlocked: false,
        canBeChallenged: false,
    },
];

// ── Helpers ───────────────────────────────────────────────
export function getCharacterDefinition(character: Character): CharacterDefinition {
    return CHARACTER_DEFINITIONS[character];
}

export function getCharactersThatBlock(actionType: ActionType, enabledCharacters: Character[]): Character[] {
    return enabledCharacters.filter(
        (c) => CHARACTER_DEFINITIONS[c].blocksActions.includes(actionType)
    );
}

export function getCharacterForAction(actionType: ActionType, enabledCharacters: Character[]): Character | undefined {
    return enabledCharacters.find(
        (c) => CHARACTER_DEFINITIONS[c].action === actionType
    );
}

export function isActionChallengeable(actionType: ActionType): boolean {
    const generalAction = GENERAL_ACTIONS.find((a) => a.type === actionType);
    if (generalAction) return generalAction.canBeChallenged;
    return true; // character actions are always challengeable
}

export function isActionBlockable(actionType: ActionType, enabledCharacters: Character[]): boolean {
    const generalAction = GENERAL_ACTIONS.find((a) => a.type === actionType);
    if (generalAction) return generalAction.canBeBlocked;
    return getCharactersThatBlock(actionType, enabledCharacters).length > 0;
}

export function getActionCost(actionType: ActionType): number {
    const generalAction = GENERAL_ACTIONS.find((a) => a.type === actionType);
    if (generalAction) return generalAction.cost;
    const charDef = Object.values(CHARACTER_DEFINITIONS).find((d) => d.action === actionType);
    return charDef?.actionCost ?? 0;
}
