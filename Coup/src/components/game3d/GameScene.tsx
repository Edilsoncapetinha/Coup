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
                far: 100,
            }}
            gl={{
                antialias: true,
                toneMapping: THREE.ACESFilmicToneMapping,
                toneMappingExposure: 1.5 // Balanced exposure for Standard materials
            }}
            style={{ position: 'absolute', inset: 0 }}
            onCreated={({ camera }) => camera.lookAt(cam.lookAt)}
        >
            {/* ATMOSPHERIC DYNAMIC LIGHTING */}
            <ambientLight intensity={0.4} color="#ffd699" />
            <spotLight
                position={[0, 8, 0]}
                angle={0.8}
                penumbra={0.7}
                intensity={20}
                color="#fff1d0"
                castShadow
                shadow-mapSize-width={1024}
                shadow-mapSize-height={1024}
            />
            <pointLight position={[0, 1.5, 0]} intensity={3} color="#1a5c3a" distance={8} />
            <color attach="background" args={['#070503']} />
            <fog attach="fog" args={['#070503', 10, 30]} />

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
            {/* SOLID FLOOR */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
                <planeGeometry args={[20, 20]} />
                <meshStandardMaterial color="#2d1a08" roughness={0.8} map={woodTex} />
            </mesh>

            {/* WALLS GROUP */}
            <group>
                {/* NORTH WALL (Behind opponents) - Intimate Z=3.5 */}
                <group position={[0, 0, 3.5]}>
                    {/* Lower Wainscot (Wood) */}
                    <mesh position={[0, 1.5, 0]} receiveShadow>
                        <planeGeometry args={[14, 3]} />
                        <meshStandardMaterial color="#3d2b1f" roughness={0.4} map={woodTex} />
                    </mesh>
                    {/* Upper Wall (Brick) */}
                    <mesh position={[0, 6.5, -0.05]} receiveShadow>
                        <planeGeometry args={[14, 7]} />
                        <meshStandardMaterial color="#4d2e24" roughness={1} map={brickTex} />
                    </mesh>
                    {/* Architectural Trim (Molding) */}
                    <mesh position={[0, 3, 0.05]} receiveShadow>
                        <boxGeometry args={[14.2, 0.15, 0.1]} />
                        <meshStandardMaterial color="#1a0f05" />
                    </mesh>
                    <mesh position={[0, 0.1, 0.1]} receiveShadow>
                        <boxGeometry args={[14.2, 0.2, 0.15]} />
                        <meshStandardMaterial color="#1a0f05" />
                    </mesh>

                    {/* Props */}
                    <group position={[0, 0, 0.1]}>
                        <mesh position={[0, 4, 0]} castShadow receiveShadow>
                            <boxGeometry args={[8, 0.05, 0.4]} />
                            <meshStandardMaterial color="#1a0f05" map={woodTex} />
                        </mesh>
                        <Bottle position={[1.5, 4.3, 0]} color="#7a4a2a" />
                        <Book position={[-1, 4.3, 0]} color="#3d1a1a" />
                    </group>
                    <WallSconce position={[-5, 5, 0.1]} />
                    <WallSconce position={[5, 5, 0.1]} />
                </group>

                {/* SIDE WALLS - Very Tight X=±5.8 */}
                <group position={[-6, 0, -2]} rotation={[0, Math.PI / 2, 0]}>
                    <mesh position={[0, 5, 0]} receiveShadow>
                        <planeGeometry args={[12, 10]} />
                        <meshStandardMaterial color="#3d2b1f" roughness={0.6} map={woodTex} />
                    </mesh>
                    {/* Framing Pillars */}
                    <mesh position={[6, 5, 0.1]}>
                        <boxGeometry args={[0.3, 10, 0.2]} />
                        <meshStandardMaterial color="#1a0f05" />
                    </mesh>
                    <WallSconce position={[0, 5, 0.1]} />
                </group>

                <group position={[6, 0, -2]} rotation={[0, -Math.PI / 2, 0]}>
                    <mesh position={[0, 5, 0]} receiveShadow>
                        <planeGeometry args={[12, 10]} />
                        <meshStandardMaterial color="#3d2b1f" roughness={0.6} map={woodTex} />
                    </mesh>
                    {/* Framing Pillars */}
                    <mesh position={[-6, 5, 0.1]}>
                        <boxGeometry args={[0.3, 10, 0.2]} />
                        <meshStandardMaterial color="#1a0f05" />
                    </mesh>
                    <Barrel position={[0, 0.6, 1.5]} />
                    <WallSconce position={[0, 5, 0.1]} />
                </group>

                {/* SOUTH WALL (Behind Player) */}
                <group position={[0, 0, -8]}>
                    <mesh position={[0, 5, 0]} receiveShadow>
                        <planeGeometry args={[14, 10]} />
                        <meshStandardMaterial color="#3d2b1f" roughness={0.8} map={woodTex} />
                    </mesh>
                </group>

                {/* CEILING */}
                <mesh position={[0, 10, 0]} rotation={[Math.PI / 2, 0, 0]}>
                    <planeGeometry args={[14, 14]} />
                    <meshStandardMaterial color="#0a0806" roughness={1} />
                </mesh>
            </group>
        </group>
    );
}
