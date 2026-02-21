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
                toneMappingExposure: 1.5 // Increased exposure
            }}
            style={{ position: 'absolute', inset: 0 }}
            onCreated={({ camera }) => camera.lookAt(cam.lookAt)}
        >
            {/* AMBIENT LIGHTING FOR VISIBILITY */}
            <ambientLight intensity={0.8} color="#ffffff" />
            <spotLight
                position={[0, 10, 0]}
                angle={1.0}
                intensity={12}
                castShadow
            />
            <color attach="background" args={['#0a0806']} />

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
            {/* FLOOR - Using Basic Material to GUARANTEE visibility */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]}>
                <planeGeometry args={[40, 40]} />
                <meshBasicMaterial color="#3d2b1f" map={woodTex} side={THREE.DoubleSide} />
            </mesh>

            {/* NORTH WALL (Behind opponents) - Very close at Z=6, Basic Material */}
            <group position={[0, 0, 6]}>
                <mesh position={[0, 5, 0]}>
                    <planeGeometry args={[30, 20]} />
                    <meshBasicMaterial color="#2d1a08" map={woodTex} side={THREE.DoubleSide} />
                </mesh>

                {/* Shelves and Props remain Standard to react to spotlight */}
                <group position={[0, 0, -0.2]}>
                    <mesh position={[0, 2.5, 0]} castShadow receiveShadow>
                        <boxGeometry args={[18, 0.1, 0.6]} />
                        <meshStandardMaterial color="#1a0f05" roughness={0.7} map={woodTex} />
                    </mesh>
                    <Bottle position={[3, 2.8, 0]} color="#7a4a2a" />
                    <Bottle position={[-3, 2.8, 0]} color="#1a3d31" type="tall" />
                    <Book position={[1, 2.8, 0]} color="#3d1a1a" />
                </group>

                <WallSconce position={[-8, 4.5, -0.2]} rotation={[0, Math.PI, 0]} />
                <WallSconce position={[8, 4.5, -0.2]} rotation={[0, Math.PI, 0]} />
            </group>

            {/* SIDE WALLS - Basic Material */}
            <group position={[-12, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
                <mesh position={[0, 5, 0]}>
                    <planeGeometry args={[30, 20]} />
                    <meshBasicMaterial color="#2d1a08" map={woodTex} side={THREE.DoubleSide} />
                </mesh>
                <WallSconce position={[0, 4.5, -0.2]} rotation={[0, Math.PI, 0]} />
            </group>

            <group position={[12, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
                <mesh position={[0, 5, 0]}>
                    <planeGeometry args={[30, 20]} />
                    <meshBasicMaterial color="#2d1a08" map={woodTex} side={THREE.DoubleSide} />
                </mesh>
                <Barrel position={[0, 0.6, -1.2]} />
                <WallSconce position={[0, 4.5, -0.2]} rotation={[0, Math.PI, 0]} />
            </group>
        </group>
    );
}
