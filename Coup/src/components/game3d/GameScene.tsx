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
                toneMappingExposure: 2.2 // Back to high exposure
            }}
            style={{ position: 'absolute', inset: 0 }}
            onCreated={({ camera }) => camera.lookAt(cam.lookAt)}
        >
            {/* LIGHTS (Still here for props/players, but walls ignore them) */}
            <ambientLight intensity={1.5} color="#ffffff" />
            <spotLight position={[0, 12, 0]} angle={0.8} intensity={20} castShadow />
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
            {/* FLOOR - Basic Wood */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]}>
                <planeGeometry args={[14, 18]} />
                <meshBasicMaterial color="#ffffff" map={woodTex} side={THREE.DoubleSide} />
            </mesh>

            {/* NORTH WALL (Behind opponents) - Z=3.0, Basic Materials */}
            <group position={[0, 0, 3.0]}>
                {/* Wood lower paneling */}
                <mesh position={[0, 2, 0]}>
                    <planeGeometry args={[14, 4]} />
                    <meshBasicMaterial color="#ffffff" map={woodTex} side={THREE.DoubleSide} />
                </mesh>
                {/* Brick upper */}
                <mesh position={[0, 8, -0.05]}>
                    <planeGeometry args={[14, 8]} />
                    <meshBasicMaterial color="#ffffff" map={brickTex} side={THREE.DoubleSide} />
                </mesh>

                {/* Architectural Trims (Basic Material for visibility) */}
                <mesh position={[0, 4, 0.05]}>
                    <boxGeometry args={[14.2, 0.2, 0.1]} />
                    <meshBasicMaterial color="#1a0f05" />
                </mesh>
                <mesh position={[0, 0.1, 0.1]}>
                    <boxGeometry args={[14.2, 0.3, 0.15]} />
                    <meshBasicMaterial color="#1a0f05" />
                </mesh>

                {/* Shelves for props */}
                <group position={[0, 0, 0.1]}>
                    <mesh position={[0, 4.5, 0]}>
                        <boxGeometry args={[12, 0.05, 0.5]} />
                        <meshBasicMaterial color="#1a0f05" />
                    </mesh>
                    <Bottle position={[2, 4.8, 0]} color="#7a4a2a" />
                    <Bottle position={[-2, 4.8, 0]} color="#2a5c4a" type="tall" />
                </group>

                <WallSconce position={[-5, 5.5, 0.1]} />
                <WallSconce position={[5, 5.5, 0.1]} />
            </group>

            {/* SIDE WALLS - X=±6.0, Basic Materials */}
            <group position={[-6, 0, -2]} rotation={[0, Math.PI / 2, 0]}>
                <mesh position={[0, 5, 0]}>
                    <planeGeometry args={[12, 12]} />
                    <meshBasicMaterial color="#ffffff" map={woodTex} side={THREE.DoubleSide} />
                </mesh>
                {/* Vertical Pillars for room structure */}
                <mesh position={[6, 5, 0.1]}>
                    <boxGeometry args={[0.4, 12, 0.2]} />
                    <meshBasicMaterial color="#110a05" />
                </mesh>
                <WallSconce position={[0, 6, 0.1]} />
            </group>

            <group position={[6, 0, -2]} rotation={[0, -Math.PI / 2, 0]}>
                <mesh position={[0, 5, 0]}>
                    <planeGeometry args={[12, 12]} />
                    <meshBasicMaterial color="#ffffff" map={woodTex} side={THREE.DoubleSide} />
                </mesh>
                {/* Vertical Pillars */}
                <mesh position={[-6, 5, 0.1]}>
                    <boxGeometry args={[0.4, 12, 0.2]} />
                    <meshBasicMaterial color="#110a05" />
                </mesh>
                <WallSconce position={[0, 6, 0.1]} />
            </group>

            {/* SOUTH WALL (Behind Player) - Z=-8.5 */}
            <group position={[0, 0, -8.5]}>
                <mesh position={[0, 6, 0]}>
                    <planeGeometry args={[14, 12]} />
                    <meshBasicMaterial color="#ffffff" map={woodTex} side={THREE.DoubleSide} />
                </mesh>
            </group>

            {/* CEILING */}
            <mesh position={[0, 11, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <planeGeometry args={[14, 18]} />
                <meshBasicMaterial color="#050403" side={THREE.DoubleSide} />
            </mesh>
        </group>
    );
}
