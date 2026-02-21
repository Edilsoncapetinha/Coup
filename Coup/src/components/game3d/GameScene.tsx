import { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import PokerTable from './PokerTable';
import PlayerModel from './PlayerModel';
import Card3D from './Card3D';
import CoinPile from './CoinPile';
import { getPlayerPositions, getCardPositions, getCoinPosition, getHumanCameraPos } from './TablePositions';
import { Bottle, Book, Barrel, WallSconce, woodTex, brickTex } from './Props';
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
                far: 60,
            }}
            gl={{
                antialias: true,
                toneMapping: THREE.ACESFilmicToneMapping,
                toneMappingExposure: 1.2,
                outputColorSpace: THREE.SRGBColorSpace
            }}
            style={{ position: 'absolute', inset: 0 }}
            onCreated={({ camera }) => {
                camera.lookAt(cam.lookAt);
            }}
        >
            <ambientLight intensity={0.15} color="#ffd699" />
            <spotLight
                position={[0, 7, 0]}
                angle={0.8}
                penumbra={0.7}
                intensity={22}
                color="#fff1d0"
                castShadow
                shadow-mapSize-width={2048}
                shadow-mapSize-height={2048}
                shadow-bias={-0.0001}
            />
            <pointLight position={[0, 1.5, 0]} intensity={2.5} color="#1a5c3a" distance={8} />
            <fog attach="fog" args={['#070503', 8, 28]} />
            <color attach="background" args={['#070503']} />

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

            {/* Central Ceiling Lamp */}
            <group position={[0, 6.8, 0]}>
                <mesh>
                    <coneGeometry args={[1.2, 0.6, 6, 1, true]} />
                    <meshStandardMaterial color="#1a1a1a" roughness={0.7} side={THREE.DoubleSide} />
                </mesh>
                <mesh position={[0, -0.25, 0]}>
                    <circleGeometry args={[1, 16]} />
                    <meshStandardMaterial color="#ffe4b5" emissive="#ffe4b5" emissiveIntensity={1.5} side={THREE.DoubleSide} />
                </mesh>
            </group>
        </Canvas>
    );
}

function SpeakeasyRoom() {
    return (
        <group>
            {/* INTIMATE FLOOR */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
                <planeGeometry args={[25, 25]} />
                <meshStandardMaterial color="#1a0f05" roughness={0.8} map={woodTex} />
            </mesh>

            {/* BACK WALL (North - Behind opponents) */}
            <group position={[0, 0, 7]}>
                {/* Mahogany Paneling */}
                <mesh position={[0, 1.5, 0]} receiveShadow>
                    <planeGeometry args={[20, 3]} />
                    <meshStandardMaterial color="#2d1a08" roughness={0.3} map={woodTex} side={THREE.DoubleSide} />
                </mesh>
                {/* Brick Upper */}
                <mesh position={[0, 6.5, -0.05]} receiveShadow>
                    <planeGeometry args={[20, 7]} />
                    <meshStandardMaterial color="#3d2218" roughness={1} map={brickTex} side={THREE.DoubleSide} />
                </mesh>
                {/* Shelves */}
                <group position={[0, 0, 0.2]}>
                    {[2, 3.5, 5, 6.5].map((y) => (
                        <mesh key={y} position={[0, y, 0]} receiveShadow castShadow>
                            <boxGeometry args={[15, 0.08, 0.5]} />
                            <meshStandardMaterial color="#1a0f05" roughness={0.6} map={woodTex} />
                        </mesh>
                    ))}
                    {/* Populated Props */}
                    <Bottle position={[2, 2.3, 0]} color="#4e3b31" />
                    <Bottle position={[2.2, 2.3, 0]} color="#1a3d31" type="tall" />
                    <Bottle position={[2.4, 2.3, 0]} color="#7a4a2a" />
                    <Book position={[-3, 2.3, 0]} color="#3d1a1a" />
                    <Book position={[-3.1, 2.3, 0]} color="#1a2b3d" rotation={[0, 0.1, 0]} />
                    <Bottle position={[-5, 3.8, 0]} color="#5a3a1a" />
                    <Bottle position={[-4.8, 3.8, 0]} color="#2a4a1a" type="flat" />
                    <Book position={[4, 3.8, 0]} color="#4a4a1a" />
                    <Book position={[4.1, 3.8, 0]} color="#1a1a1a" />
                    <Bottle position={[0, 5.3, 0]} color="#c06014" type="tall" />
                </group>
                <WallSconce position={[-7, 4, 0.1]} />
                <WallSconce position={[7, 4, 0.1]} />
            </group>

            {/* SIDE WALLS - Closer for intimacy */}
            <group position={[-10, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
                <mesh position={[0, 5, 0]} receiveShadow>
                    <planeGeometry args={[20, 10]} />
                    <meshStandardMaterial color="#2d1a08" roughness={0.5} map={woodTex} side={THREE.DoubleSide} />
                </mesh>
                <mesh position={[0, 0.8, 0.8]} castShadow receiveShadow>
                    <boxGeometry args={[8, 1.6, 1.2]} />
                    <meshStandardMaterial color="#1a0f05" roughness={0.3} map={woodTex} />
                </mesh>
                <WallSconce position={[0, 4, 0.1]} />
            </group>

            <group position={[10, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
                <mesh position={[0, 5, 0]} receiveShadow>
                    <planeGeometry args={[20, 10]} />
                    <meshStandardMaterial color="#2d1a08" roughness={0.5} map={woodTex} side={THREE.DoubleSide} />
                </mesh>
                <group position={[0, 0.8, 1]}>
                    <Barrel position={[0, 0, 0]} />
                    <Barrel position={[1, 0, 0.2]} rotation={[0, 0.4, 0]} />
                    <Barrel position={[0.5, 1, 0]} rotation={[Math.PI / 2, 0, 0]} />
                </group>
                <WallSconce position={[0, 4, 0.1]} />
            </group>

            {/* CEILING */}
            <mesh position={[0, 10, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <planeGeometry args={[25, 25]} />
                <meshStandardMaterial color="#050403" roughness={1} side={THREE.DoubleSide} />
            </mesh>
        </group>
    );
}
