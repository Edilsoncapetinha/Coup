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
            <ambientLight intensity={1.2} color="#ffd699" />
            <spotLight
                position={[0, 8, 0]}
                angle={1.2}
                penumbra={0.5}
                intensity={12}
                color="#fff1d0"
                castShadow
                shadow-mapSize-width={2048}
                shadow-mapSize-height={2048}
            />
            <pointLight position={[0, 2, 0]} intensity={2.5} color="#1a5c3a" distance={10} />
            <color attach="background" args={['#0f0d0b']} />

            <group>
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
                    <planeGeometry args={[60, 60]} />
                    <meshStandardMaterial color="#2b1a10" roughness={0.9} metalness={0.0} side={THREE.DoubleSide} />
                </mesh>
                <group position={[0, 0, -12]}>
                    <mesh position={[0, 2, 0]} receiveShadow>
                        <planeGeometry args={[40, 4]} />
                        <meshStandardMaterial color="#4d2e1c" roughness={0.4} metalness={0.1} side={THREE.DoubleSide} />
                    </mesh>
                    <mesh position={[0, 7, -0.1]} receiveShadow>
                        <planeGeometry args={[40, 6]} />
                        <meshStandardMaterial color="#5e3828" roughness={1} side={THREE.DoubleSide} />
                    </mesh>
                    <group position={[0, 0, 0.2]}>
                        {[2.5, 4.5, 6.5, 8.5].map((y) => (
                            <mesh key={y} position={[0, y, 0]} receiveShadow castShadow>
                                <boxGeometry args={[25, 0.1, 0.5]} />
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
                    <WallSconce position={[-10, 5, 0.2]} />
                    <WallSconce position={[10, 5, 0.2]} />
                </group>
                <group position={[-15, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
                    <mesh position={[0, 5, 0]} receiveShadow>
                        <planeGeometry args={[40, 10]} />
                        <meshStandardMaterial color="#4d2e1c" roughness={0.5} side={THREE.DoubleSide} />
                    </mesh>
                    <mesh position={[0, 0.8, 1.2]} castShadow receiveShadow>
                        <boxGeometry args={[12, 1.6, 2]} />
                        <meshStandardMaterial color="#2b1a10" roughness={0.3} metalness={0.1} />
                    </mesh>
                    <WallSconce position={[0, 5, 0.2]} />
                </group>
                <group position={[15, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
                    <mesh position={[0, 5, 0]} receiveShadow>
                        <planeGeometry args={[40, 10]} />
                        <meshStandardMaterial color="#4d2e1c" roughness={0.5} side={THREE.DoubleSide} />
                    </mesh>
                    <group position={[0, 0.8, 1.5]}>
                        <Barrel position={[0, 0, 0]} />
                        <Barrel position={[1.2, 0, 0.3]} rotation={[0, 0.4, 0]} />
                        <Barrel position={[0.6, 1.2, 0]} rotation={[Math.PI / 2, 0, 0]} />
                    </group>
                    <WallSconce position={[0, 5, 0.2]} />
                </group>
                <mesh position={[0, 10, 0]} rotation={[Math.PI / 2, 0, 0]}>
                    <planeGeometry args={[60, 60]} />
                    <meshStandardMaterial color="#0f0f0f" roughness={1} side={THREE.DoubleSide} />
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
