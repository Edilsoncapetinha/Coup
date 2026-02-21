import { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import PokerTable from './PokerTable';
import PlayerModel from './PlayerModel';
import Card3D from './Card3D';
import CoinPile from './CoinPile';
import { getPlayerPositions, getCardPositions, getCoinPosition, getHumanCameraPos } from './TablePositions';
import { Bottle, Book, Barrel, WallSconce } from './Props';
import { type GameState } from '../../game/types';

interface GameSceneProps {
    gameState: GameState;
    myPlayerId?: string | null;
}

export default function GameScene({ gameState, myPlayerId }: GameSceneProps) {
    const orderedPlayers = useMemo(() => {
        if (!myPlayerId) return gameState.players;
        const myIndex = gameState.players.findIndex(p => p.id === myPlayerId);
        if (myIndex <= 0) return gameState.players;
        return [
            ...gameState.players.slice(myIndex),
            ...gameState.players.slice(0, myIndex),
        ];
    }, [gameState.players, myPlayerId]);

    const playerPositions = useMemo(
        () => getPlayerPositions(orderedPlayers.length),
        [orderedPlayers.length]
    );

    const humanPos = playerPositions[0];
    const cam = useMemo(
        () => getHumanCameraPos(humanPos.position, humanPos.rotation),
        [humanPos]
    );

    return (
        <Canvas
            shadows
            camera={{
                position: [cam.position.x, cam.position.y, cam.position.z],
                fov: 50,
                near: 0.1,
                far: 200, // Increased far plane
            }}
            gl={{ antialias: true }}
            style={{ position: 'absolute', inset: 0 }}
            onCreated={({ camera }) => {
                camera.lookAt(cam.lookAt);
            }}
        >
            <ambientLight intensity={1.0} />
            <pointLight position={[0, 10, 0]} intensity={2.0} />

            {/* DIAGNOSTIC: LIGHT-INDEPENDENT BOX ROOM */}
            <mesh position={[0, 5, 0]}>
                <boxGeometry args={[50, 20, 50]} />
                <meshBasicMaterial color="#4d2e1c" side={THREE.BackSide} />
            </mesh>

            {/* DIAGNOSTIC: LIGHT-INDEPENDENT FLOOR */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
                <planeGeometry args={[60, 60]} />
                <meshBasicMaterial color="#2b1a10" side={THREE.DoubleSide} />
            </mesh>

            <PokerTable />

            {orderedPlayers.map((player, idx) => {
                const pos = playerPositions[idx];
                const cardPositions = getCardPositions(player.influenceCards.length, pos.position, pos.rotation);
                const coinPos = getCoinPosition(pos.position, pos.rotation);
                const originalIdx = gameState.players.findIndex(p => p.id === player.id);
                return (
                    <group key={player.id}>
                        <PlayerModel
                            player={player}
                            position={pos.position}
                            rotation={pos.rotation}
                            isCurrentTurn={gameState.currentPlayerIndex === originalIdx}
                        />
                        {player.influenceCards.map((card, cardIdx) => (
                            <Card3D
                                key={`${player.id}-card-${cardIdx}`}
                                card={card}
                                position={cardPositions[cardIdx]?.position ?? new THREE.Vector3()}
                                rotation={cardPositions[cardIdx]?.rotation ?? new THREE.Euler()}
                                showFace={card.isRevealed}
                            />
                        ))}
                        <CoinPile count={player.coins} position={coinPos} />
                    </group>
                );
            })}
        </Canvas>
    );
}
