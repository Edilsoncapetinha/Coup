
import { createGame, declareAction, challengeAction, resolveAction } from './src/game/gameEngine';
import { GameConfig, Character, ActionType, GamePhase } from './src/game/types';

const config: GameConfig = {
    playerCount: 2,
    enabledCharacters: [Character.Duke, Character.Assassin, Character.Captain, Character.Ambassador, Character.Contessa],
    cardsPerCharacter: 3,
    enableFactions: false,
};

function runTest() {
    console.log('--- Starting Coin Loss Test ---');
    let state = createGame(config);

    // Setup: Player 1 needs coins for assassination (3)
    // By default players start with 2 coins. Let's give P1 more coins.
    state.players[0].coins = 7;
    state.players[1].coins = 7;

    console.log(`Initial State: P1 Coins: ${state.players[0].coins}, P2 Coins: ${state.players[1].coins}`);

    // P1 declares Assassination on P2
    console.log('P1 declares Assassination on P2...');
    const action = {
        type: ActionType.Assassinate,
        sourcePlayerId: state.players[0].id,
        targetPlayerId: state.players[1].id,
        claimedCharacter: Character.Assassin
    };

    // Check coins after declaration (Expectation: Should be deducted immediately in NEW logic, but currently likely NOT)
    state = declareAction(state, action);
    console.log(`After Declaration: P1 Coins: ${state.players[0].coins}`);

    // P2 challenges P1
    console.log('P2 challenges P1...');
    const p2 = state.players[1];

    // Force P1 to NOT have Assassin to ensure challenge succeeds
    state.players[0].influenceCards = [
        { character: Character.Duke, isRevealed: false },
        { character: Character.Duke, isRevealed: false }
    ];

    state = challengeAction(state, p2.id);

    // Check coins after failed challenge (Expectation: P1 should have lost 3 coins total)
    // Current Bug: P1 likely has 7 (refunded) or even more if logic is weird.
    console.log(`After Challenge (P1 lost): P1 Coins: ${state.players[0].coins}`);

    if (state.players[0].coins === 7) {
        console.log('FAIL: P1 still has 7 coins. Coins were refunded/not deducted.');
    } else if (state.players[0].coins === 4) {
        console.log('SUCCESS: P1 has 4 coins. Coins were correctly deducted/not refunded.');
    } else {
        console.log(`UNKNOWN: P1 has ${state.players[0].coins} coins.`);
    }
}

runTest();
