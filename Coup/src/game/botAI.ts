import {
    type GameState,
    type GameAction,
    type BotDecision,
    Character,
    ActionType,
    GamePhase,
    BotDifficulty,
    COUP_COST,
    ASSASSINATE_COST,
    FORCED_COUP_THRESHOLD,
} from './types';
import {
    getAvailableActions,
    getAlivePlayers,
    getAliveInfluence,
    getPlayerById,
} from './gameEngine';
import { getCharactersThatBlock, CHARACTER_DEFINITIONS } from './characters';

// ── Delay simulado para parecer "pensando" ────────────────
export function getBotDelay(difficulty: BotDifficulty): number {
    switch (difficulty) {
        case BotDifficulty.Easy: return 800 + Math.random() * 600;
        case BotDifficulty.Medium: return 1000 + Math.random() * 800;
        case BotDifficulty.Hard: return 1200 + Math.random() * 1000;
    }
}

// ── Decidir Ação ──────────────────────────────────────────
export function decideBotAction(state: GameState, botPlayerId: string): GameAction {
    const bot = getPlayerById(state, botPlayerId);
    const difficulty = bot.botDifficulty ?? BotDifficulty.Medium;
    const available = getAvailableActions(state);
    const alivePlayers = getAlivePlayers(state).filter((p) => p.id !== botPlayerId);

    // Forced coup
    if (bot.coins >= FORCED_COUP_THRESHOLD) {
        const target = pickTarget(alivePlayers, difficulty);
        return {
            type: ActionType.Coup,
            sourcePlayerId: botPlayerId,
            targetPlayerId: target.id,
        };
    }

    switch (difficulty) {
        case BotDifficulty.Easy:
            return decideEasy(state, botPlayerId, available, alivePlayers);
        case BotDifficulty.Medium:
            return decideMedium(state, botPlayerId, available, alivePlayers);
        case BotDifficulty.Hard:
            return decideHard(state, botPlayerId, available, alivePlayers);
    }
}

function decideEasy(
    state: GameState,
    botPlayerId: string,
    available: ActionType[],
    targets: ReturnType<typeof getAlivePlayers>
): GameAction {
    const bot = getPlayerById(state, botPlayerId);
    const botCards = getAliveInfluence(bot).map((c) => c.character);

    // Easy bots never bluff — only use actions for characters they actually have
    const safeActions = available.filter((a) => {
        if ([ActionType.Income, ActionType.ForeignAid, ActionType.Coup].includes(a)) return true;
        // Check if bot has the character for this action
        const charDef = Object.values(CHARACTER_DEFINITIONS).find((d) => d.action === a);
        return charDef && botCards.includes(charDef.character);
    });

    // Prefer coup if affordable
    if (bot.coins >= COUP_COST && safeActions.includes(ActionType.Coup)) {
        return {
            type: ActionType.Coup,
            sourcePlayerId: botPlayerId,
            targetPlayerId: pickTarget(targets, BotDifficulty.Easy).id,
        };
    }

    // Random from safe actions
    const chosen = safeActions[Math.floor(Math.random() * safeActions.length)] || ActionType.Income;
    return buildAction(chosen, botPlayerId, targets, BotDifficulty.Easy);
}

function decideMedium(
    state: GameState,
    botPlayerId: string,
    available: ActionType[],
    targets: ReturnType<typeof getAlivePlayers>
): GameAction {
    const bot = getPlayerById(state, botPlayerId);
    const botCards = getAliveInfluence(bot).map((c) => c.character);

    // Coup if possible
    if (bot.coins >= COUP_COST) {
        return {
            type: ActionType.Coup,
            sourcePlayerId: botPlayerId,
            targetPlayerId: pickTarget(targets, BotDifficulty.Medium).id,
        };
    }

    // Assassinate if have the card and coins
    if (
        botCards.includes(Character.Assassin) &&
        bot.coins >= ASSASSINATE_COST &&
        available.includes(ActionType.Assassinate)
    ) {
        return {
            type: ActionType.Assassinate,
            sourcePlayerId: botPlayerId,
            targetPlayerId: pickTarget(targets, BotDifficulty.Medium).id,
            claimedCharacter: Character.Assassin,
        };
    }

    // Tax if have Duke
    if (botCards.includes(Character.Duke) && available.includes(ActionType.Tax)) {
        return {
            type: ActionType.Tax,
            sourcePlayerId: botPlayerId,
            claimedCharacter: Character.Duke,
        };
    }

    // Steal if have Captain
    if (
        botCards.includes(Character.Captain) &&
        available.includes(ActionType.Steal) &&
        targets.some((t) => t.coins > 0)
    ) {
        const richTarget = [...targets].sort((a, b) => b.coins - a.coins)[0];
        return {
            type: ActionType.Steal,
            sourcePlayerId: botPlayerId,
            targetPlayerId: richTarget.id,
            claimedCharacter: Character.Captain,
        };
    }

    // Foreign aid or income
    if (Math.random() > 0.4 && available.includes(ActionType.ForeignAid)) {
        return { type: ActionType.ForeignAid, sourcePlayerId: botPlayerId };
    }

    return { type: ActionType.Income, sourcePlayerId: botPlayerId };
}

function decideHard(
    state: GameState,
    botPlayerId: string,
    available: ActionType[],
    targets: ReturnType<typeof getAlivePlayers>
): GameAction {
    const bot = getPlayerById(state, botPlayerId);
    const botCards = getAliveInfluence(bot).map((c) => c.character);

    // Coup if possible — always target the strongest player
    if (bot.coins >= COUP_COST) {
        const strongest = [...targets].sort((a, b) => {
            const aInf = getAliveInfluence(b).length - getAliveInfluence(a).length;
            if (aInf !== 0) return aInf;
            return b.coins - a.coins;
        })[0];
        return {
            type: ActionType.Coup,
            sourcePlayerId: botPlayerId,
            targetPlayerId: strongest.id,
        };
    }

    // Assassinate — will bluff if needed
    if (
        bot.coins >= ASSASSINATE_COST &&
        available.includes(ActionType.Assassinate)
    ) {
        const target = pickTarget(targets, BotDifficulty.Hard);
        return {
            type: ActionType.Assassinate,
            sourcePlayerId: botPlayerId,
            targetPlayerId: target.id,
            claimedCharacter: Character.Assassin,
        };
    }

    // Tax — will bluff Duke
    if (available.includes(ActionType.Tax)) {
        return {
            type: ActionType.Tax,
            sourcePlayerId: botPlayerId,
            claimedCharacter: Character.Duke,
        };
    }

    // Steal from richest
    if (available.includes(ActionType.Steal) && targets.some((t) => t.coins >= 2)) {
        const richest = [...targets].sort((a, b) => b.coins - a.coins)[0];
        return {
            type: ActionType.Steal,
            sourcePlayerId: botPlayerId,
            targetPlayerId: richest.id,
            claimedCharacter: Character.Captain,
        };
    }

    // Foreign Aid
    if (available.includes(ActionType.ForeignAid)) {
        return { type: ActionType.ForeignAid, sourcePlayerId: botPlayerId };
    }

    return { type: ActionType.Income, sourcePlayerId: botPlayerId };
}

// ── Decidir se Desafia ────────────────────────────────────
export function decideBotChallenge(
    state: GameState,
    botPlayerId: string,
    action: GameAction
): boolean {
    const bot = getPlayerById(state, botPlayerId);
    const difficulty = bot.botDifficulty ?? BotDifficulty.Medium;

    if (!action.claimedCharacter) return false;

    const botCards = getAliveInfluence(bot).map((c) => c.character);

    // If bot holds the claimed character, high chance to challenge (they know it's a bluff)
    const botHoldsChar = botCards.includes(action.claimedCharacter);

    switch (difficulty) {
        case BotDifficulty.Easy:
            return false; // Never challenges

        case BotDifficulty.Medium:
            if (botHoldsChar) return Math.random() > 0.3; // 70% challenge
            return Math.random() > 0.85; // 15% random challenge

        case BotDifficulty.Hard: {
            if (botHoldsChar) return Math.random() > 0.1; // 90% challenge
            // Count how many of that character could be in play
            const totalCopies = state.config.cardsPerCharacter;
            const revealedCount = state.players.reduce((acc, p) =>
                acc + p.influenceCards.filter((c) => c.isRevealed && c.character === action.claimedCharacter).length,
                0
            );
            const heldByBot = botCards.filter((c) => c === action.claimedCharacter).length;
            const remaining = totalCopies - revealedCount - heldByBot;

            if (remaining <= 0) return true; // Impossible, definitely bluff
            if (remaining === 1) return Math.random() > 0.3; // Likely bluff
            return Math.random() > 0.7; // 30% chance
        }
    }
}

// ── Decidir se Bloqueia ───────────────────────────────────
export function decideBotBlock(
    state: GameState,
    botPlayerId: string,
    action: GameAction
): { shouldBlock: boolean; character?: Character } {
    const bot = getPlayerById(state, botPlayerId);
    const difficulty = bot.botDifficulty ?? BotDifficulty.Medium;
    const botCards = getAliveInfluence(bot).map((c) => c.character);

    const blockers = getCharactersThatBlock(action.type, state.config.enabledCharacters);
    if (blockers.length === 0) return { shouldBlock: false };

    // Check if bot actually has a blocking character
    const hasBlocker = blockers.find((b) => botCards.includes(b));

    switch (difficulty) {
        case BotDifficulty.Easy:
            // Only block if actually has the character
            if (hasBlocker) return { shouldBlock: true, character: hasBlocker };
            return { shouldBlock: false };

        case BotDifficulty.Medium:
            if (hasBlocker) return { shouldBlock: true, character: hasBlocker };
            // Small chance of bluff block
            if (action.targetPlayerId === botPlayerId && Math.random() > 0.7) {
                return { shouldBlock: true, character: blockers[0] };
            }
            return { shouldBlock: false };

        case BotDifficulty.Hard:
            if (hasBlocker) return { shouldBlock: true, character: hasBlocker };
            // Will bluff block when targeted
            if (action.targetPlayerId === botPlayerId && Math.random() > 0.4) {
                return { shouldBlock: true, character: blockers[0] };
            }
            // Will bluff block Foreign Aid sometimes
            if (action.type === ActionType.ForeignAid && Math.random() > 0.6) {
                return { shouldBlock: true, character: blockers[0] };
            }
            return { shouldBlock: false };
    }
}

// ── Decidir Carta para Perder ─────────────────────────────
export function decideBotCardToLose(state: GameState, botPlayerId: string): number {
    const bot = getPlayerById(state, botPlayerId);
    const aliveCards = bot.influenceCards
        .map((c, i) => ({ card: c, index: i }))
        .filter((x) => !x.card.isRevealed);

    if (aliveCards.length === 1) return aliveCards[0].index;

    // Prefer to lose the less useful character
    const charPriority: Record<Character, number> = {
        [Character.Contessa]: 1,    // Defensive only
        [Character.Ambassador]: 2,
        [Character.Jester]: 3,      // Passive defensive (redirects coups)
        [Character.Socialist]: 3,
        [Character.Speculator]: 3,
        [Character.Bureaucrat]: 3,
        [Character.Inquisitor]: 4,
        [Character.Captain]: 5,
        [Character.Duke]: 6,
        [Character.Assassin]: 7,    // Most aggressive
    };

    aliveCards.sort((a, b) => charPriority[a.card.character] - charPriority[b.card.character]);
    return aliveCards[0].index;
}

// ── Decidir Redirecionamento de Golpe (Bufão) ─────────────
export function decideBotCoupRedirect(
    state: GameState,
    botPlayerId: string
): { shouldRedirect: boolean; targetId?: string } {
    const bot = getPlayerById(state, botPlayerId);
    const botCards = getAliveInfluence(bot).map((c) => c.character);
    const difficulty = bot.botDifficulty ?? BotDifficulty.Medium;
    const hasJester = botCards.includes(Character.Jester);

    const possibleTargets = getAlivePlayers(state).filter(
        (p) => p.id !== botPlayerId
    );

    if (possibleTargets.length === 0) return { shouldRedirect: false };

    if (hasJester) {
        // Always redirect if we have the Jester
        const target = pickTarget(possibleTargets, difficulty);
        return { shouldRedirect: true, targetId: target.id };
    }

    // Bluffing decision based on difficulty
    switch (difficulty) {
        case BotDifficulty.Easy:
            return { shouldRedirect: false }; // Never bluffs
        case BotDifficulty.Medium:
            if (Math.random() < 0.15) {
                const target = pickTarget(possibleTargets, difficulty);
                return { shouldRedirect: true, targetId: target.id };
            }
            return { shouldRedirect: false };
        case BotDifficulty.Hard:
            // Bluff more aggressively with 2 cards alive (less costly)
            const bluffChance = getAliveInfluence(bot).length > 1 ? 0.3 : 0.05;
            if (Math.random() < bluffChance) {
                const target = pickTarget(possibleTargets, difficulty);
                return { shouldRedirect: true, targetId: target.id };
            }
            return { shouldRedirect: false };
    }
}

// ── Decidir Escolha do Inquisidor ─────────────────────────
export function decideBotInquisitorChoice(
    state: GameState,
    botPlayerId: string
): { choice: 'self-exchange' | 'examine'; targetPlayerId?: string } {
    const bot = getPlayerById(state, botPlayerId);
    const difficulty = bot.botDifficulty ?? BotDifficulty.Medium;
    const targets = getAlivePlayers(state).filter((p) => p.id !== botPlayerId);

    // Easy bots: always self-exchange
    if (difficulty === BotDifficulty.Easy) {
        return { choice: 'self-exchange' };
    }

    // Medium/Hard: 60% examine, 40% self-exchange
    if (Math.random() < 0.6 && targets.length > 0) {
        const target = pickTarget(targets, difficulty);
        return { choice: 'examine', targetPlayerId: target.id };
    }

    return { choice: 'self-exchange' };
}

// ── Helpers ───────────────────────────────────────────────
function pickTarget(
    targets: ReturnType<typeof getAlivePlayers>,
    difficulty: BotDifficulty
) {
    if (difficulty === BotDifficulty.Easy) {
        return targets[Math.floor(Math.random() * targets.length)];
    }

    // Target player with least influence (closest to elimination)
    const sorted = [...targets].sort((a, b) => {
        const aAlive = getAliveInfluence(a).length;
        const bAlive = getAliveInfluence(b).length;
        if (aAlive !== bAlive) return aAlive - bAlive;
        return b.coins - a.coins; // Then by most coins
    });

    return sorted[0];
}

function buildAction(
    actionType: ActionType,
    botPlayerId: string,
    targets: ReturnType<typeof getAlivePlayers>,
    difficulty: BotDifficulty
): GameAction {
    const charDef = Object.values(CHARACTER_DEFINITIONS).find((d) => d.action === actionType);

    const action: GameAction = {
        type: actionType,
        sourcePlayerId: botPlayerId,
        claimedCharacter: charDef?.character,
    };

    if (charDef?.requiresTarget || actionType === ActionType.Coup) {
        action.targetPlayerId = pickTarget(targets, difficulty).id;
    }

    return action;
}
