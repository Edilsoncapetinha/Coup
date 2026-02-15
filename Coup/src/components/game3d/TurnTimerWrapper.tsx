import { GamePhase, ActionType, type GameState, type GameAction } from '../../game/types';
import { getAlivePlayers } from '../../game/gameEngine';
import TurnTimer from '../game/TurnTimer';

// Helper component to isolate timer logic
export default function TurnTimerWrapper({
    gameState,
    humanPlayer,
    onAction,
    onPassChallenge,
    onPassBlock,
    onPassCoupRedirect,
    onPassCoupRedirectChallenge,
}: {
    gameState: GameState;
    humanPlayer: NonNullable<ReturnType<typeof getAlivePlayers>[0]> | undefined;
    onAction: (action: GameAction) => void;
    onPassChallenge: (playerId: string) => void;
    onPassBlock: (playerId: string) => void;
    onPassCoupRedirect: (playerId: string) => void;
    onPassCoupRedirectChallenge: (playerId: string) => void;
}) {
    // 30 seconds duration
    const DURATION = 30;

    // Identify if timer should be active for ME
    const isMyTurn = humanPlayer && gameState.players[gameState.currentPlayerIndex].id === humanPlayer.id;
    const phase = gameState.phase;

    let isActive = false;
    let onTimeout = () => { };

    // Logic to determine if I need to act
    if (!humanPlayer || humanPlayer.isEliminated) {
        isActive = false;
    } else if (isMyTurn && phase === GamePhase.AwaitingAction) {
        // My main turn
        isActive = true;
        onTimeout = () => {
            console.log("Timer expired: Auto-Income");
            onAction({
                type: ActionType.Income,
                sourcePlayerId: humanPlayer.id,
            });
        };
    } else if (
        phase === GamePhase.AwaitingChallengeOnAction &&
        !gameState.respondedPlayerIds.includes(humanPlayer.id) &&
        gameState.pendingAction?.sourcePlayerId !== humanPlayer.id
    ) {
        // React to opponent's action (Challenge/Pass)
        isActive = true;
        onTimeout = () => {
            console.log("Timer expired: Auto-Pass Challenge");
            onPassChallenge(humanPlayer.id);
        };
    } else if (
        phase === GamePhase.AwaitingBlock &&
        !gameState.respondedPlayerIds.includes(humanPlayer.id) &&
        gameState.pendingAction?.sourcePlayerId !== humanPlayer.id
    ) {
        // Opportunity to Block (or Pass)
        isActive = true;
        onTimeout = () => {
            console.log("Timer expired: Auto-Pass Block");
            onPassBlock(humanPlayer.id);
        };
    } else if (
        phase === GamePhase.AwaitingChallengeOnBlock &&
        gameState.pendingAction?.sourcePlayerId === humanPlayer.id
    ) {
        // My action was blocked, I can Challenge the block
        isActive = true;
        onTimeout = () => {
            console.log("Timer expired: Auto-Pass Block Challenge (Accept Block)");
            onPassChallenge(humanPlayer.id);
        };
    } else if (
        phase === GamePhase.AwaitingCoupRedirect &&
        gameState.coupRedirectChain[gameState.coupRedirectChain.length - 1] === humanPlayer.id
    ) {
        // I am being Couped, can Redirect or Pass (Accept)
        isActive = true;
        onTimeout = () => {
            console.log("Timer expired: Auto-Pass Coup Redirect (Accept Coup)");
            onPassCoupRedirect(humanPlayer.id);
        };
    } else if (
        phase === GamePhase.AwaitingCoupRedirectChallenge &&
        gameState.coupRedirectChain.length >= 2 &&
        gameState.coupRedirectChain[gameState.coupRedirectChain.length - 2] !== humanPlayer.id &&
        !gameState.respondedPlayerIds.includes(humanPlayer.id)
    ) {
        // Someone redirected, I can challenge
        isActive = true;
        onTimeout = () => {
            console.log("Timer expired: Auto-Pass Redirect Challenge");
            onPassCoupRedirectChallenge(humanPlayer.id);
        }
    }

    const isTimedPhase = [
        GamePhase.AwaitingAction,
        GamePhase.AwaitingChallengeOnAction,
        GamePhase.AwaitingBlock,
        GamePhase.AwaitingChallengeOnBlock,
        GamePhase.AwaitingCoupRedirect,
        GamePhase.AwaitingCoupRedirectChallenge
    ].includes(phase);

    if (!isTimedPhase) {
        return null;
    }

    const resetKey = `${gameState.turnNumber}-${gameState.phase}-${gameState.pendingAction?.type || ''}-${gameState.coupRedirectChain.length}`;

    // If it's NOT my responsibility, onTimeout should be no-op to avoid double submission or errors.
    const safeOnTimeout = isActive ? onTimeout : () => { };

    // Visual: Always show if we are in a timed phase.
    // If it's NOT my responsibility, I still see the timer but it does nothing when it ends for me.

    return (
        <div className="w-48">
            <TurnTimer
                duration={DURATION}
                onTimeout={safeOnTimeout}
                isActive={true}
                resetKey={resetKey}
            />
        </div>
    );
}
