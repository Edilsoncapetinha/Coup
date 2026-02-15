
import {
    createGame,
    declareAction,
    declareCoupRedirect,
    challengeCoupRedirect,
    selectCardToLose,
    getAliveInfluence,
    getPlayerById,
    resolveAction
} from '../game/gameEngine';
import {
    ActionType,
    Character,
    GamePhase,
    DEFAULT_CONFIG,
    GameState
} from '../game/types';

const originalLog = console.log;
console.log = (...args) => {
    originalLog('[TEST]', ...args);
};

function runTest() {
    originalLog('--- Starting Redirection Challenge Repro Test ---');

    // 1. Create Game
    let state = createGame({
        ...DEFAULT_CONFIG,
        playerCount: 2,
        humanPlayerName: 'P1'
    });

    // P1 turn. P1 has coins.
    state.players[0].coins = 10;
    // P2 has 2 cards (including a Jester for a valid claim)
    state.players[1].influenceCards = [
        { character: Character.Jester, isRevealed: false },
        { character: Character.Duke, isRevealed: false }
    ];
    state.currentPlayerIndex = 0;
    const p1Id = state.players[0].id;
    const p2Id = state.players[1].id;

    originalLog('Initial State: P1 coins:', state.players[0].coins, 'P2 cards:', getAliveInfluence(state.players[1]).length);

    // 2. P1 declares Coup on P2
    state = declareAction(state, {
        type: ActionType.Coup,
        sourcePlayerId: p1Id,
        targetPlayerId: p2Id
    });
    originalLog('Action: P1 Coup P2. Phase:', state.phase);

    // 3. P2 Redirects to P1 (claims Jester)
    state = declareCoupRedirect(state, p2Id, p1Id);
    originalLog('Action: P2 Redirects back to P1. Phase:', state.phase);

    // 4. P1 Challenges P2's Jester
    state = challengeCoupRedirect(state, p1Id);
    originalLog('Action: P1 Challenges P2. Phase:', state.phase);
    // P2 has Jester, so challenge fails. P1 should lose a card for the penalty.

    const p1InfluenceBefore = getAliveInfluence(getPlayerById(state, p1Id)).length;
    originalLog('P1 Alive cards before penalty choice:', p1InfluenceBefore);

    // 5. P1 Selects card to lose for challenge penalty
    // Since we are in AwaitingCardSelection for the penalty
    state = selectCardToLose(state, p1Id, 0);
    originalLog('Action: P1 selects card 0 for PENALTY. Phase:', state.phase);

    // EXPECTATION: 
    // After losing the penalty card, the Coup should now resolve on P1 (the new target).
    // Phase should be AwaitingCoupRedirect (if P1 has Jester) or AwaitingCardSelection (for Coup damage).

    const p1InfluenceAfterPenalty = getAliveInfluence(getPlayerById(state, p1Id)).length;
    originalLog('P1 Alive cards after penalty selection:', p1InfluenceAfterPenalty);

    if (p1InfluenceAfterPenalty !== 1) {
        originalLog('FAILURE: P1 should have exactly 1 card left after penalty.');
    }

    if (state.phase === GamePhase.AwaitingAction) {
        originalLog('FAILURE: Turn advanced prematurely! P1 should still take Coup damage.');
    } else {
        originalLog('SUCCESS: Phase is', state.phase, '(Correctly waiting for Coup damage/redirect)');
    }

    // 6. Complete the Coup damage
    if (state.phase === GamePhase.AwaitingCardSelection) {
        originalLog('Action: P1 selects last card for COUP DAMAGE');
        state = selectCardToLose(state, p1Id, 1);
        originalLog('Final Result - P1 Cards:', getAliveInfluence(getPlayerById(state, p1Id)).length, 'Phase:', state.phase);

        if (getAliveInfluence(getPlayerById(state, p1Id)).length === 0) {
            originalLog('FINAL_SUCCESS: P1 lost both cards correctly.');
        } else {
            originalLog('FAILURE: P1 still has cards!');
        }
    }
}

try {
    runTest();
} catch (e) {
    originalLog('CRASH:', e);
}
