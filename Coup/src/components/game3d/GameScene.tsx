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
            gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.5 }}
            style={{ position: 'absolute', inset: 0 }}
            onCreated={({ camera }) => {
                camera.lookAt(cam.lookAt);
            }}
        >
            <ambientLight intensity={1.5} color="#ffd699" />
            <spotLight
                position={[0, 10, 0]}
                angle={1.2}
                penumbra={0.5}
                intensity={15}
                color="#fff1d0"
                castShadow
                shadow-mapSize-width={2048}
                shadow-mapSize-height={2048}
            />
            <pointLight position={[0, 2, 0]} intensity={3} color="#1a5c3a" distance={15} />
            <color attach="background" args={['#1a1512']} />

            <group>
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
                    <planeGeometry args={[100, 100]} />
                    <meshStandardMaterial color="#3d2b1f" roughness={1} side={THREE.DoubleSide} />
                </mesh>

                {/* THE MAIN BACK WALL (North - Visible from Camera) */}
                <group position={[0, 0, 15]}>
                    <mesh position={[0, 5, 0]} receiveShadow>
                        <planeGeometry args={[50, 10]} />
                        <meshStandardMaterial color="#4d2e1c" roughness={0.5} side={THREE.DoubleSide} />
                    </mesh>
                    <group position={[0, 0, -0.2]}>
                        {[2, 4, 6, 8].map((y) => (
                            <mesh key={y} position={[0, y, 0]} receiveShadow castShadow>
                                <boxGeometry args={[30, 0.15, 0.6]} />
                                <meshStandardMaterial color="#2b1a10" roughness={0.8} />
                            </mesh>
                        ))}
                        <Bottle position={[3, 2.8, 0]} color="#6e5b51" />
                        <Bottle position={[3.3, 2.8, 0]} color="#2a4d41" type="tall" />
                        <Bottle position={[3.6, 2.8, 0]} color="#8a5a3a" />
                        <Book position={[-4, 2.8, 0]} color="#4d2a2a" />
                        <Book position={[-4.2, 2.82, 0]} color="#2a3b4d" rotation={[0, 0.1, 0]} />
                        <Bottle position={[-6, 4.8, 0]} color="#6a4a2a" />
                        <Bottle position={[-5.7, 4.8, 0]} color="#3a5a2a" type="flat" />
                        <Book position={[5, 4.81, 0]} color="#5a5a2a" />
                        <Book position={[5.2, 4.82, 0]} color="#2a2a2a" />
                        <Bottle position={[0, 6.8, 0]} color="#d07024" type="tall" />
                        <Bottle position={[0.4, 6.8, 0]} color="#2a2a2a" />
                        <Book position={[-2, 8.8, 0]} color="#333" />
                    </group>
                    <WallSconce position={[-12, 5, -0.3]} rotation={[0, Math.PI, 0]} />
                    <WallSconce position={[12, 5, -0.3]} rotation={[0, Math.PI, 0]} />
                </group>

                {/* SIDE WALLS */}
                <group position={[-20, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
                    <mesh position={[0, 5, 0]} receiveShadow>
                        <planeGeometry args={[50, 10]} />
                        <meshStandardMaterial color="#3d2b1f" roughness={0.6} side={THREE.DoubleSide} />
                    </mesh>
                </group>
                <group position={[20, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
                    <mesh position={[0, 5, 0]} receiveShadow>
                        <planeGeometry args={[50, 10]} />
                        <meshStandardMaterial color="#3d2b1f" roughness={0.6} side={THREE.DoubleSide} />
                    </mesh>
                </group>

                {/* FRONT WALL (Behind Camera) */}
                <group position={[0, 0, -20]}>
                    <mesh position={[0, 5, 0]} receiveShadow>
                        <planeGeometry args={[50, 10]} />
                        <meshStandardMaterial color="#3d2b1f" roughness={0.6} side={THREE.DoubleSide} />
                    </mesh>
                </group>

                <mesh position={[0, 10, 0]} rotation={[Math.PI / 2, 0, 0]}>
                    <planeGeometry args={[100, 100]} />
                    <meshStandardMaterial color="#111" roughness={1} side={THREE.DoubleSide} />
                </mesh>
            </group>

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
            <group position={[0, 6.5, 0]}>
                <mesh>
                    <coneGeometry args={[1.5, 0.7, 6, 1, true]} />
                    <meshStandardMaterial color="#333" roughness={0.8} metalness={0.3} side={THREE.DoubleSide} />
                </mesh>
                <mesh position={[0, -0.2, 0]}>
                    <circleGeometry args={[1.4, 16]} />
                    <meshStandardMaterial color="#ffe4b5" emissive="#ffe4b5" emissiveIntensity={1.2} side={THREE.DoubleSide} />
                </mesh>
                <mesh position={[0, 2, 0]}>
                    <cylinderGeometry args={[0.02, 0.02, 4, 4]} />
                    <meshStandardMaterial color="#222" />
                </mesh>
            </group>
        </Canvas>
    );
}
