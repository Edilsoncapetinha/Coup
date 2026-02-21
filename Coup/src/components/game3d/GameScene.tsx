import { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import { getPlayerPositions, getCardPositions, getCoinPosition, getHumanCameraPos } from './TablePositions';
import { type GameState } from '../../game/types';

// Importing components
import PokerTable from './PokerTable';
import PlayerModel from './PlayerModel';
import Card3D from './Card3D';
import CoinPile from './CoinPile';
import { Bottle, Book, Barrel, WallSconce, woodTex, brickTex } from './Props';

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

    const playerPositions = useMemo(() => getPlayerPositions(orderedPlayers.length), [orderedPlayers.length]);
    const humanPos = playerPositions[0];
    const cam = useMemo(() => getHumanCameraPos(humanPos.position, humanPos.rotation), [humanPos]);

    return (
        <Canvas
            shadows
            camera={{
                position: [cam.position.x, cam.position.y, cam.position.z],
                fov: 50,
                near: 0.1,
                far: 150,
            }}
            gl={{
                antialias: true,
                toneMapping: THREE.ACESFilmicToneMapping,
                toneMappingExposure: 2.2 // Significant exposure boost
            }}
            style={{ position: 'absolute', inset: 0 }}
            onCreated={({ camera }) => camera.lookAt(cam.lookAt)}
        >
            {/* POWERFUL AMBIENT LIGHTING */}
            <ambientLight intensity={1.5} color="#ffffff" />

            <directionalLight
                position={[5, 10, 5]}
                intensity={1.0}
                castShadow
            />

            <spotLight
                position={[0, 12, 0]}
                angle={0.8}
                intensity={20}
                castShadow
            />

            <color attach="background" args={['#1a1512']} />

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
            {/* FLOOR - Bright Wood */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]}>
                <planeGeometry args={[50, 50]} />
                <meshBasicMaterial color="#ffffff" map={woodTex} side={THREE.DoubleSide} />
            </mesh>

            {/* NORTH WALL (Behind opponents) - Moved closer to the table (Z=4.2) */}
            <group position={[0, 0, 4.2]}>
                {/* Wood lower */}
                <mesh position={[0, 2.5, 0]}>
                    <planeGeometry args={[30, 5]} />
                    <meshBasicMaterial color="#ffffff" map={woodTex} side={THREE.DoubleSide} />
                </mesh>
                {/* Brick upper */}
                <mesh position={[0, 9, -0.05]}>
                    <planeGeometry args={[30, 8]} />
                    <meshBasicMaterial color="#ffffff" map={brickTex} side={THREE.DoubleSide} />
                </mesh>

                {/* Standard props to react to lights */}
                <group position={[0, 0, -0.2]}>
                    <mesh position={[0, 2.8, 0]} castShadow receiveShadow>
                        <boxGeometry args={[18, 0.1, 0.6]} />
                        <meshStandardMaterial color="#3d1f0b" roughness={0.7} map={woodTex} />
                    </mesh>
                    <Bottle position={[3, 3.1, 0]} color="#7a4a2a" />
                    <Bottle position={[-3, 3.1, 0]} color="#2a5c4a" type="tall" />
                </group>

                <WallSconce position={[-8, 5, -0.2]} rotation={[0, Math.PI, 0]} />
                <WallSconce position={[8, 5, -0.2]} rotation={[0, Math.PI, 0]} />
            </group>

            {/* SIDE WALLS */}
            <group position={[-15, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
                <mesh position={[0, 7.5, 0]}>
                    <planeGeometry args={[40, 15]} />
                    <meshBasicMaterial color="#ffffff" map={woodTex} side={THREE.DoubleSide} />
                </mesh>
                <WallSconce position={[0, 6, -0.2]} rotation={[0, Math.PI, 0]} />
            </group>

            <group position={[15, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
                <mesh position={[0, 7.5, 0]}>
                    <planeGeometry args={[40, 15]} />
                    <meshBasicMaterial color="#ffffff" map={woodTex} side={THREE.DoubleSide} />
                </mesh>
                <Barrel position={[0, 0.6, -1.5]} />
                <WallSconce position={[0, 6, -0.2]} rotation={[0, Math.PI, 0]} />
            </group>

            {/* SOUTH WALL (Behind Player/Camera) */}
            <group position={[0, 0, -10]}>
                <mesh position={[0, 7.5, 0]}>
                    <planeGeometry args={[40, 15]} />
                    <meshBasicMaterial color="#ffffff" map={woodTex} side={THREE.DoubleSide} />
                </mesh>
            </group>
        </group>
    );
}
