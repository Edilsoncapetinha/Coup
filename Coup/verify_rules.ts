/**
 * Verification script for game rule fixes.
 * Tests:
 * 1. Non-target cannot block assassination
 * 2. Non-target cannot block steal
 * 3. Assassination only removes 1 card from target
 */

import {
    Character,
    ActionType,
    GamePhase,
    BotDifficulty,
    type GameConfig,
} from './src/game/types';
import {
    createGame,
    declareAction,
    passChallenge,
    passBlock,
    declareBlock,
    selectCardToLose,
    getAliveInfluence,
    getPlayerById,
} from './src/game/gameEngine';
import { isBlockableOnlyByTarget } from './src/game/characters';

const config: GameConfig = {
    playerCount: 3,
    botCount: 0,
    botDifficulty: BotDifficulty.Medium,
    enabledCharacters: [
        Character.Duke,
        Character.Assassin,
        Character.Captain,
        Character.Ambassador,
        Character.Contessa,
    ],
    humanPlayerName: 'Player1',
    enableFactions: false,
    playerIds: ['p1', 'p2', 'p3'],
    playerNames: ['Player1', 'Player2', 'Player3'],
};

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
    if (condition) {
        console.log(`  ✅ ${message}`);
        passed++;
    } else {
        console.log(`  ❌ FAIL: ${message}`);
        failed++;
    }
}

// Test 1: isBlockableOnlyByTarget
console.log('\n=== Test 1: isBlockableOnlyByTarget ===');
assert(isBlockableOnlyByTarget(ActionType.Assassinate) === true, 'Assassinate is target-only blockable');
assert(isBlockableOnlyByTarget(ActionType.Steal) === true, 'Steal is target-only blockable');
assert(isBlockableOnlyByTarget(ActionType.ForeignAid) === false, 'ForeignAid is not target-only blockable');

// Test 2: passBlock for assassination (only target should need to respond)
console.log('\n=== Test 2: passBlock for Assassination ===');
{
    let state = createGame(config);
    // Player 0 (p1) assassinates Player 2 (p3)
    // Give p1 enough coins
    state = {
        ...state,
        players: state.players.map((p, i) =>
            i === 0 ? { ...p, coins: 5 } : p
        ),
    };

    state = declareAction(state, {
        type: ActionType.Assassinate,
        sourcePlayerId: 'p1',
        targetPlayerId: 'p3',
        claimedCharacter: Character.Assassin,
    });

    assert(state.phase === GamePhase.AwaitingChallengeOnAction, 'Phase is AwaitingChallengeOnAction after declare');

    // All pass challenge
    state = passChallenge(state, 'p2');
    state = passChallenge(state, 'p3');
    assert(state.phase === GamePhase.AwaitingBlock, 'Phase is AwaitingBlock after all pass challenge');

    // Only target (p3) passes block — should resolve immediately
    state = passBlock(state, 'p3');
    assert(
        state.phase === GamePhase.AwaitingCardSelection || state.phase === GamePhase.AwaitingAction,
        `After target passes block, phase should advance (got ${state.phase})`
    );
    assert(state.phase !== GamePhase.AwaitingBlock, 'Should NOT still be in AwaitingBlock');
}

// Test 3: passBlock for steal (only target should need to respond)
console.log('\n=== Test 3: passBlock for Steal ===');
{
    let state = createGame(config);

    state = declareAction(state, {
        type: ActionType.Steal,
        sourcePlayerId: 'p1',
        targetPlayerId: 'p3',
        claimedCharacter: Character.Captain,
    });

    assert(state.phase === GamePhase.AwaitingChallengeOnAction, 'Phase is AwaitingChallengeOnAction after declare');

    state = passChallenge(state, 'p2');
    state = passChallenge(state, 'p3');
    assert(state.phase === GamePhase.AwaitingBlock, 'Phase is AwaitingBlock after all pass challenge');

    // Only target (p3) passes block
    state = passBlock(state, 'p3');
    assert(state.phase === GamePhase.AwaitingAction, `After target passes block for Steal, phase should be AwaitingAction (got ${state.phase})`);
}

// Test 4: declareBlock throws for non-target on assassination
console.log('\n=== Test 4: Non-target cannot block assassination ===');
{
    let state = createGame(config);
    state = {
        ...state,
        players: state.players.map((p, i) =>
            i === 0 ? { ...p, coins: 5 } : p
        ),
    };

    state = declareAction(state, {
        type: ActionType.Assassinate,
        sourcePlayerId: 'p1',
        targetPlayerId: 'p3',
        claimedCharacter: Character.Assassin,
    });

    state = passChallenge(state, 'p2');
    state = passChallenge(state, 'p3');

    let threw = false;
    try {
        declareBlock(state, 'p2', Character.Contessa); // p2 is NOT the target
    } catch (e) {
        threw = true;
    }
    assert(threw, 'declareBlock throws when non-target (p2) tries to block assassination');
}

// Test 5: Assassination removes only 1 card
console.log('\n=== Test 5: Assassination removes 1 card (no challenge, no block) ===');
{
    let state = createGame(config);
    state = {
        ...state,
        players: state.players.map((p, i) =>
            i === 0 ? { ...p, coins: 5 } : p
        ),
    };

    const targetCardsBefore = getAliveInfluence(getPlayerById(state, 'p3')).length;
    assert(targetCardsBefore === 2, `Target starts with 2 cards`);

    state = declareAction(state, {
        type: ActionType.Assassinate,
        sourcePlayerId: 'p1',
        targetPlayerId: 'p3',
        claimedCharacter: Character.Assassin,
    });

    // All pass challenge
    state = passChallenge(state, 'p2');
    state = passChallenge(state, 'p3');

    // Target passes block
    state = passBlock(state, 'p3');

    // Target should be asked to choose a card
    assert(state.phase === GamePhase.AwaitingCardSelection, `After assassination resolves, phase is AwaitingCardSelection (got ${state.phase})`);

    // Target chooses first alive card
    const targetPlayer = getPlayerById(state, 'p3');
    const aliveIdx = targetPlayer.influenceCards.findIndex(c => !c.isRevealed);
    state = selectCardToLose(state, 'p3', aliveIdx);

    const targetCardsAfter = getAliveInfluence(getPlayerById(state, 'p3')).length;
    assert(targetCardsAfter === 1, `Target should have 1 card after assassination (has ${targetCardsAfter})`);
    assert(state.phase === GamePhase.AwaitingAction, `Phase should be AwaitingAction after card selection (got ${state.phase})`);
}

// Test 6: passBlock for ForeignAid (ALL players should respond, not just target)
console.log('\n=== Test 6: passBlock for ForeignAid requires all non-source ===');
{
    let state = createGame(config);

    state = declareAction(state, {
        type: ActionType.ForeignAid,
        sourcePlayerId: 'p1',
    });

    // ForeignAid is not challengeable, goes straight to AwaitingBlock
    assert(state.phase === GamePhase.AwaitingBlock, `ForeignAid goes to AwaitingBlock (got ${state.phase})`);

    // p2 passes — should NOT resolve yet (p3 hasn't passed)
    state = passBlock(state, 'p2');
    assert(state.phase === GamePhase.AwaitingBlock, `Still AwaitingBlock after only p2 passes (got ${state.phase})`);

    // p3 passes — NOW should resolve
    state = passBlock(state, 'p3');
    assert(state.phase === GamePhase.AwaitingAction, `Resolves after all pass for ForeignAid (got ${state.phase})`);
}

console.log(`\n${'='.repeat(40)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
    process.exit(1);
}
