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
    // Reorder players so the local player is always at index 0 (camera position)
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

    // Camera behind local player (index 0 after reorder)
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
                far: 80,
            }}
            gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.0 }}
            style={{ position: 'absolute', inset: 0 }}
            onCreated={({ camera }) => {
                camera.lookAt(cam.lookAt);
            }}
        >
            {/* ═══ SPEAKEASY CHIAROSCURO LIGHTING ═══ */}

            {/* Increased ambient light for better visibility */}
            <ambientLight intensity={0.35} color="#ffd699" />

            {/* Main overhead pendant lamp - high contrast focal point */}
            <spotLight
                position={[0, 6, 0]}
                angle={0.8}
                penumbra={0.6}
                intensity={6.5}
                color="#fff1d0"
                castShadow
                shadow-mapSize-width={2048}
                shadow-mapSize-height={2048}
                shadow-bias={-0.0001}
            />

            {/* Subtle bounce light from table to illuminate characters */}
            <pointLight position={[0, 1.2, 0]} intensity={1.2} color="#1a5c3a" distance={6} />

            {/* Speakeasy atmosphere fog — pushed further back */}
            <fog attach="fog" args={['#0a0806', 15, 35]} />

            {/* Background — dark but tinted */}
            <color attach="background" args={['#0a0806']} />

            <SpeakeasyRoom />

            <PokerTable />

            {orderedPlayers.map((player, idx) => {
                const pos = playerPositions[idx];
                const cardPositions = getCardPositions(
                    player.influenceCards.length,
                    pos.position,
                    pos.rotation
                );
                const coinPos = getCoinPosition(pos.position, pos.rotation);
                // Find original index for turn indicator
                const originalIdx = gameState.players.findIndex(p => p.id === player.id);

                return (
                    <group key={player.id}>
                        <PlayerModel
                            player={player}
                            position={pos.position}
                            rotation={pos.rotation}
                            isCurrentTurn={gameState.currentPlayerIndex === originalIdx}
                        />

                        {/* Cards */}
                        {player.influenceCards.map((card, cardIdx) => (
                            <Card3D
                                key={`${player.id}-card-${cardIdx}`}
                                card={card}
                                position={cardPositions[cardIdx]?.position ?? new THREE.Vector3()}
                                rotation={cardPositions[cardIdx]?.rotation ?? new THREE.Euler()}
                                showFace={card.isRevealed}
                            />
                        ))}

                        {/* Coins */}
                        <CoinPile count={player.coins} position={coinPos} />
                    </group>
                );
            })}

            <group position={[0, 5.5, 0]}>
                {/* Lamp shade */}
                <mesh>
                    <coneGeometry args={[1.2, 0.5, 6, 1, true]} />
                    <meshStandardMaterial
                        color="#2a2a2a"
                        roughness={0.8}
                        metalness={0.3}
                        side={THREE.DoubleSide}
                    />
                </mesh>
                {/* Lamp inner glow */}
                <mesh position={[0, -0.15, 0]}>
                    <circleGeometry args={[1.15, 16]} />
                    <meshStandardMaterial
                        color="#ffe4b5"
                        emissive="#ffe4b5"
                        emissiveIntensity={0.8}
                        side={THREE.DoubleSide}
                    />
                </mesh>
                {/* Cord */}
                <mesh position={[0, 1.5, 0]}>
                    <cylinderGeometry args={[0.01, 0.01, 3, 4]} />
                    <meshStandardMaterial color="#333" />
                </mesh>
            </group>
        </Canvas>
    );
}

/**
 * Speakeasy room — mahogany walls, brick accents, shelves with props
 */
function SpeakeasyRoom() {
    return (
        <group>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
                <planeGeometry args={[40, 40]} />
                <meshStandardMaterial color="#140d08" roughness={0.9} metalness={0.0} />
            </mesh>
            <group position={[0, 0, -10]}>
                <mesh position={[0, 1.5, 0]} receiveShadow>
                    <planeGeometry args={[30, 3]} />
                    <meshStandardMaterial color="#2b1a10" roughness={0.4} metalness={0.1} />
                </mesh>
                <mesh position={[0, 6.5, -0.1]} receiveShadow>
                    <planeGeometry args={[30, 7]} />
                    <meshStandardMaterial color="#3d2218" roughness={1} />
                </mesh>
                <group position={[0, 0, 0.2]}>
                    {[2, 3.5, 5, 6.5].map((y) => (
                        <mesh key={y} position={[0, y, 0]} receiveShadow castShadow>
                            <boxGeometry args={[20, 0.05, 0.4]} />
                            <meshStandardMaterial color="#1a0f08" roughness={0.8} />
                        </mesh>
                    ))}
                    <Bottle position={[2, 2.2, 0]} color="#4e3b31" />
                    <Bottle position={[2.2, 2.2, 0]} color="#1a3d31" type="tall" />
                    <Bottle position={[2.4, 2.2, 0]} color="#7a4a2a" />
                    <Book position={[-3, 2.2, 0]} color="#3d1a1a" />
                    <Book position={[-3.1, 2.22, 0]} color="#1a2b3d" rotation={[0, 0.05, 0]} />
                    <Bottle position={[-5, 3.7, 0]} color="#5a3a1a" />
                    <Bottle position={[-4.8, 3.7, 0]} color="#2a4a1a" type="flat" />
                    <Book position={[4, 3.71, 0]} color="#4a4a1a" />
                    <Book position={[4.1, 3.72, 0]} color="#1a1a1a" />
                    <Book position={[4.2, 3.7, 0]} color="#3d2a10" />
                    <Bottle position={[0, 5.2, 0]} color="#c06014" type="tall" />
                    <Bottle position={[0.3, 5.2, 0]} color="#1a1a1a" />
                    <Book position={[-1, 6.7, 0]} color="#222" />
                </group>
                <WallSconce position={[-8, 3.5, 0.1]} />
                <WallSconce position={[8, 3.5, 0.1]} />
            </group>
            <group position={[-12, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
                <mesh position={[0, 5, 0]} receiveShadow>
                    <planeGeometry args={[30, 10]} />
                    <meshStandardMaterial color="#2b1a10" roughness={0.5} />
                </mesh>
                <mesh position={[0, 0.6, 0.8]} castShadow receiveShadow>
                    <boxGeometry args={[10, 1.2, 1.5]} />
                    <meshStandardMaterial color="#1a0f08" roughness={0.3} metalness={0.1} />
                </mesh>
                <WallSconce position={[0, 3.5, 0.1]} />
            </group>
            <group position={[12, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
                <mesh position={[0, 5, 0]} receiveShadow>
                    <planeGeometry args={[30, 10]} />
                    <meshStandardMaterial color="#2b1a10" roughness={0.5} />
                </mesh>
                <group position={[0, 0.6, 1]}>
                    <Barrel position={[0, 0, 0]} />
                    <Barrel position={[1, 0, 0.2]} rotation={[0, 0.4, 0]} />
                    <Barrel position={[0.5, 1, 0]} rotation={[Math.PI / 2, 0, 0]} />
                </group>
                <WallSconce position={[0, 3.5, 0.1]} />
            </group>
            <mesh position={[0, 10, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <planeGeometry args={[40, 40]} />
                <meshStandardMaterial color="#050403" roughness={1} />
            </mesh>
        </group>
    );
}
