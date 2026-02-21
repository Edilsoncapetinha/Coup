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
                far: 100,
            }}
            gl={{
                antialias: true,
                toneMapping: THREE.ACESFilmicToneMapping,
                toneMappingExposure: 1.2
            }}
            style={{ position: 'absolute', inset: 0 }}
            onCreated={({ camera }) => {
                camera.lookAt(cam.lookAt);
            }}
        >
            {/* HIGH AMBIENT LIGHT FOR DIAGNOSTICS */}
            <ambientLight intensity={1.0} color="#ffffff" />

            <spotLight
                position={[0, 8, 0]}
                angle={1.0}
                intensity={15}
                castShadow
            />

            <SpeakeasyRoom />
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

function SpeakeasyRoom() {
    return (
        <group>
            {/* THE BOX ROOM - Guaranteed to be visible if you are inside it */}
            <mesh position={[0, 5, 0]}>
                <boxGeometry args={[30, 10, 30]} />
                <meshStandardMaterial color="#4d2e1c" side={THREE.BackSide} roughness={1} />
            </mesh>

            {/* Simple Floor */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
                <planeGeometry args={[40, 40]} />
                <meshStandardMaterial color="#2b1a10" side={THREE.DoubleSide} />
            </mesh>

            {/* Back wall details - closer now */}
            <group position={[0, 0, 10]}>
                <mesh position={[0, 2, 0]} receiveShadow>
                    <planeGeometry args={[20, 4]} />
                    <meshStandardMaterial color="#3d1f0b" side={THREE.DoubleSide} />
                </mesh>
                <group position={[0, 0, -0.1]}>
                    <WallSconce position={[-6, 4, 0]} rotation={[0, Math.PI, 0]} />
                    <WallSconce position={[6, 4, 0]} rotation={[0, Math.PI, 0]} />
                    <Bottle position={[2, 2.5, 0]} color="#7a4a2a" />
                    <Bottle position={[-2, 2.5, 0]} color="#1a3d31" />
                </group>
            </group>
        </group>
    );
}
