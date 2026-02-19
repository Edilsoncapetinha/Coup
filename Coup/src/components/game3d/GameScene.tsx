import { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import PokerTable from './PokerTable';
import PlayerModel from './PlayerModel';
import Card3D from './Card3D';
import CoinPile from './CoinPile';
import { getPlayerPositions, getCardPositions, getCoinPosition, getHumanCameraPos } from './TablePositions';
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
            {/* ═══ CASINO LIGHTING SETUP ═══ */}

            {/* Warm ambient — like indoor casino */}
            <ambientLight intensity={0.5} color="#ffe8cc" />

            {/* Main overhead pendant lamp on table */}
            <spotLight
                position={[0, 6, 0]}
                angle={0.9}
                penumbra={0.4}
                intensity={3.5}
                color="#ffe4b5"
                castShadow
                shadow-mapSize-width={2048}
                shadow-mapSize-height={2048}
                shadow-bias={-0.0005}
            />

            {/* Warm fill lights from sides — like wall sconces */}
            <pointLight position={[6, 3, 0]} intensity={0.6} color="#ffcc88" distance={15} />
            <pointLight position={[-6, 3, 0]} intensity={0.6} color="#ffcc88" distance={15} />
            <pointLight position={[0, 3, 5]} intensity={0.4} color="#ffd699" distance={15} />
            <pointLight position={[0, 3, -5]} intensity={0.4} color="#ffd699" distance={15} />

            {/* Subtle top fill for visibility */}
            <directionalLight position={[0, 8, 3]} intensity={0.4} color="#fff5e6" />

            {/* Colored accent lights — casino neon feel */}
            <pointLight position={[8, 2, 8]} intensity={0.3} color="#ff4444" distance={12} />
            <pointLight position={[-8, 2, -8]} intensity={0.3} color="#4488ff" distance={12} />

            {/* Casino atmosphere fog — warm and subtle */}
            <fog attach="fog" args={['#1a1410', 12, 30]} />

            {/* Background — dark casino interior */}
            <color attach="background" args={['#1a1410']} />

            {/* ═══ CASINO ENVIRONMENT ═══ */}
            <CasinoRoom />

            {/* ═══ TABLE ═══ */}
            <PokerTable />

            {/* ═══ PLAYERS, CARDS & COINS ═══ */}
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
                                showFace={(myPlayerId ? player.id === myPlayerId : player.isHuman) || card.isRevealed}
                            />
                        ))}

                        {/* Coins */}
                        <CoinPile count={player.coins} position={coinPos} />
                    </group>
                );
            })}

            {/* ═══ OVERHEAD LAMP MODEL ═══ */}
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
 * Casino room — walls, carpet, decorative elements
 */
function CasinoRoom() {
    return (
        <group>
            {/* ═══ FLOOR — rich casino carpet ═══ */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
                <planeGeometry args={[30, 30]} />
                <meshStandardMaterial
                    color="#1a0f08"
                    roughness={0.85}
                    metalness={0.0}
                />
            </mesh>

            {/* Carpet pattern — decorative diamond center */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.005, 0]}>
                <ringGeometry args={[5, 6, 4]} />
                <meshStandardMaterial
                    color="#2a1510"
                    roughness={0.9}
                    transparent
                    opacity={0.5}
                />
            </mesh>

            {/* ═══ BACK WALL ═══ */}
            <mesh position={[0, 4, -12]} receiveShadow>
                <planeGeometry args={[30, 10]} />
                <meshStandardMaterial color="#1e1410" roughness={0.7} />
            </mesh>

            {/* Wall wainscoting (lower panel) */}
            <mesh position={[0, 1.5, -11.98]}>
                <planeGeometry args={[30, 3]} />
                <meshStandardMaterial color="#2a1a10" roughness={0.5} metalness={0.05} />
            </mesh>

            {/* Gold molding strip */}
            <mesh position={[0, 3, -11.96]}>
                <planeGeometry args={[30, 0.08]} />
                <meshStandardMaterial
                    color="#C5A028"
                    roughness={0.2}
                    metalness={0.6}
                    emissive="#8B6914"
                    emissiveIntensity={0.1}
                />
            </mesh>

            {/* ═══ SIDE WALLS ═══ */}
            <mesh position={[-12, 4, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
                <planeGeometry args={[30, 10]} />
                <meshStandardMaterial color="#1e1410" roughness={0.7} />
            </mesh>
            <mesh position={[12, 4, 0]} rotation={[0, -Math.PI / 2, 0]} receiveShadow>
                <planeGeometry args={[30, 10]} />
                <meshStandardMaterial color="#1e1410" roughness={0.7} />
            </mesh>

            {/* ═══ WALL SCONCES (decorative lights on walls) ═══ */}
            {[-7, -3, 3, 7].map((x) => (
                <group key={`sconce-back-${x}`} position={[x, 3.5, -11.9]}>
                    {/* Sconce bracket */}
                    <mesh>
                        <boxGeometry args={[0.15, 0.3, 0.1]} />
                        <meshStandardMaterial color="#C5A028" roughness={0.3} metalness={0.6} />
                    </mesh>
                    {/* Sconce glow */}
                    <mesh position={[0, 0.15, 0.05]}>
                        <sphereGeometry args={[0.08, 8, 8]} />
                        <meshStandardMaterial
                            color="#ffe4b5"
                            emissive="#ffcc66"
                            emissiveIntensity={1.5}
                        />
                    </mesh>
                    {/* Sconce light */}
                    <pointLight position={[0, 0.15, 0.3]} intensity={0.15} color="#ffcc66" distance={4} />
                </group>
            ))}

            {/* ═══ SIDE WALL SCONCES ═══ */}
            {[-5, 0, 5].map((z) => (
                <group key={`sconce-left-${z}`}>
                    <group position={[-11.9, 3.5, z]} rotation={[0, Math.PI / 2, 0]}>
                        <mesh>
                            <boxGeometry args={[0.15, 0.3, 0.1]} />
                            <meshStandardMaterial color="#C5A028" roughness={0.3} metalness={0.6} />
                        </mesh>
                        <mesh position={[0, 0.15, 0.05]}>
                            <sphereGeometry args={[0.08, 8, 8]} />
                            <meshStandardMaterial color="#ffe4b5" emissive="#ffcc66" emissiveIntensity={1.5} />
                        </mesh>
                        <pointLight position={[0, 0.15, 0.3]} intensity={0.12} color="#ffcc66" distance={4} />
                    </group>
                    <group position={[11.9, 3.5, z]} rotation={[0, -Math.PI / 2, 0]}>
                        <mesh>
                            <boxGeometry args={[0.15, 0.3, 0.1]} />
                            <meshStandardMaterial color="#C5A028" roughness={0.3} metalness={0.6} />
                        </mesh>
                        <mesh position={[0, 0.15, 0.05]}>
                            <sphereGeometry args={[0.08, 8, 8]} />
                            <meshStandardMaterial color="#ffe4b5" emissive="#ffcc66" emissiveIntensity={1.5} />
                        </mesh>
                        <pointLight position={[0, 0.15, 0.3]} intensity={0.12} color="#ffcc66" distance={4} />
                    </group>
                </group>
            ))}

            {/* ═══ CEILING ═══ */}
            <mesh position={[0, 8, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <planeGeometry args={[30, 30]} />
                <meshStandardMaterial color="#0f0a06" roughness={0.9} />
            </mesh>

            {/* ═══ DECORATIVE NEON "COUP" SIGN on back wall ═══ */}
            <group position={[0, 5.5, -11.85]}>
                {/* Sign backing */}
                <mesh>
                    <planeGeometry args={[3, 0.8]} />
                    <meshStandardMaterial color="#0a0604" roughness={0.9} />
                </mesh>
                {/* Neon glow effect */}
                <mesh position={[0, 0, 0.01]}>
                    <planeGeometry args={[2.6, 0.5]} />
                    <meshStandardMaterial
                        color="#ff3333"
                        emissive="#ff2222"
                        emissiveIntensity={2.0}
                        transparent
                        opacity={0.8}
                    />
                </mesh>
                {/* Neon light cast */}
                <pointLight position={[0, 0, 0.5]} intensity={0.5} color="#ff3333" distance={5} />
            </group>
        </group>
    );
}
