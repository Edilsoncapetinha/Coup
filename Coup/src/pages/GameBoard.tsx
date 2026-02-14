import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../contexts/GameContext';
import {
    GamePhase,
    ActionType,
    type GameAction,
    Character,
} from '../game/types';
import { CHARACTER_DEFINITIONS } from '../game/characters';
import GameScene from '../components/game3d/GameScene';
import HUD from '../components/game3d/HUD';
import GameOverScreen from '../components/game/GameOverScreen';

export default function GameBoard() {
    const navigate = useNavigate();
    const {
        gameState,
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
        getActions,
        startGame,
        myPlayerId,
    } = useGame();

    useEffect(() => {
        if (!gameState) navigate('/');
    }, [gameState, navigate]);

    if (!gameState) return null;

    const handlePlayAgain = () => {
        resetGame();
        if (gameState.config) {
            startGame(gameState.config);
        }
    };

    return (
        <div className="relative w-screen h-screen overflow-hidden bg-black">
            {/* 3D Scene (full screen background) */}
            <GameScene gameState={gameState} />

            {/* 2D HUD Overlay */}
            <HUD
                gameState={gameState}
                onAction={performAction}
                onChallenge={challenge}
                onPassChallenge={passOnChallenge}
                onBlock={block}
                onPassBlock={passOnBlock}
                onChallengeBlock={challengeTheBlock}
                onChooseCard={chooseCardToLose}
                onExchange={doExchange}
                onExamine={doExamine}
                onCoupRedirect={doCoupRedirect}
                onPassCoupRedirect={doPassCoupRedirect}
                onChallengeCoupRedirect={doChallengeCoupRedirect}
                onPassCoupRedirectChallenge={doPassCoupRedirectChallenge}
                onInquisitorChoice={doInquisitorChoice}
                availableActions={getActions()}
                myPlayerId={myPlayerId}
            />

            {/* Exit button */}
            <button
                onClick={() => { resetGame(); navigate('/'); }}
                className="absolute top-3 left-4 z-20 text-amber-400/30 hover:text-amber-400 text-sm transition-colors bg-black/40 px-3 py-1 rounded-lg"
            >
                ✕ Sair
            </button>

            {/* Game Over */}
            {gameState.phase === GamePhase.GameOver && (
                <GameOverScreen gameState={gameState} onPlayAgain={handlePlayAgain} />
            )}
        </div>
    );
}
