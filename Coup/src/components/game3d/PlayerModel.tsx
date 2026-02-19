import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Character, type Player } from '../../game/types';

// Character-specific colors and accessory configs
const CHAR_STYLES: Record<Character, { bodyColor: string; accent: string }> = {
    [Character.Duke]: { bodyColor: '#8B008B', accent: '#FFD700' },
    [Character.Assassin]: { bodyColor: '#1a1a2e', accent: '#DC143C' },
    [Character.Captain]: { bodyColor: '#003366', accent: '#4169E1' },
    [Character.Ambassador]: { bodyColor: '#2F4F4F', accent: '#98FB98' },
    [Character.Contessa]: { bodyColor: '#800020', accent: '#FF69B4' },
    [Character.Inquisitor]: { bodyColor: '#4a2844', accent: '#E6E6FA' },
    [Character.Jester]: { bodyColor: '#FF6347', accent: '#FFFF00' },
    [Character.Bureaucrat]: { bodyColor: '#556B2F', accent: '#BDB76B' },
    [Character.Speculator]: { bodyColor: '#CD853F', accent: '#FFD700' },
    [Character.Socialist]: { bodyColor: '#8B0000', accent: '#FF4500' },
};

interface PlayerModelProps {
    player: Player;
    position: THREE.Vector3;
    rotation: number;
    isCurrentTurn: boolean;
}

export default function PlayerModel({
    player,
    position,
    rotation,
    isCurrentTurn,
}: PlayerModelProps) {
    const groupRef = useRef<THREE.Group>(null);
    const glowRef = useRef<THREE.Mesh>(null);

    // Use the first alive card's character for color, fallback to Duke
    const primaryChar = useMemo(() => {
        const alive = player.influenceCards.find((c) => !c.isRevealed);
        return alive?.character ?? Character.Duke;
    }, [player.influenceCards]);

    const DEFAULT_STYLE = { bodyColor: '#444', accent: '#888' };
    const style = CHAR_STYLES[primaryChar] ?? DEFAULT_STYLE;

    // Idle breathing animation
    useFrame((state) => {
        if (groupRef.current) {
            const t = state.clock.elapsedTime;
            groupRef.current.position.y = player.isEliminated
                ? -0.3
                : Math.sin(t * 1.5 + position.x) * 0.02;

            // Eliminated: tilt over
            if (player.isEliminated) {
                groupRef.current.rotation.z = THREE.MathUtils.lerp(
                    groupRef.current.rotation.z,
                    Math.PI / 4,
                    0.02
                );
            }
        }

        // Turn indicator glow pulse
        if (glowRef.current) {
            const pulse = Math.sin(state.clock.elapsedTime * 3) * 0.5 + 0.5;
            (glowRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity =
                isCurrentTurn ? 0.3 + pulse * 0.7 : 0;
        }
    });

    return (
        <group
            ref={groupRef}
            position={[position.x, 0, position.z]}
            rotation={[0, rotation, 0]}
        >
            {/* Body — capsule-like (cylinder + spheres) */}
            <mesh position={[0, 0.7, 0]} castShadow>
                <cylinderGeometry args={[0.2, 0.25, 0.6, 16]} />
                <meshStandardMaterial
                    color={player.isEliminated ? '#333' : style.bodyColor}
                    roughness={0.6}
                    metalness={0.2}
                />
            </mesh>

            {/* Head */}
            <mesh position={[0, 1.15, 0]} castShadow>
                <sphereGeometry args={[0.18, 16, 16]} />
                <meshStandardMaterial
                    color={player.isEliminated ? '#444' : '#e8d5b7'}
                    roughness={0.7}
                    metalness={0.05}
                />
            </mesh>

            {/* Eyes */}
            <mesh position={[0.06, 1.18, 0.14]}>
                <sphereGeometry args={[0.03, 8, 8]} />
                <meshStandardMaterial color={player.isEliminated ? '#222' : '#111'} />
            </mesh>
            <mesh position={[-0.06, 1.18, 0.14]}>
                <sphereGeometry args={[0.03, 8, 8]} />
                <meshStandardMaterial color={player.isEliminated ? '#222' : '#111'} />
            </mesh>

            {/* Character accessory on top of head */}
            <CharacterAccessory character={primaryChar} eliminated={player.isEliminated} accentColor={style.accent} />

            {/* Shoulders */}
            <mesh position={[0.28, 0.9, 0]} castShadow>
                <sphereGeometry args={[0.1, 8, 8]} />
                <meshStandardMaterial
                    color={player.isEliminated ? '#333' : style.bodyColor}
                    roughness={0.6}
                />
            </mesh>
            <mesh position={[-0.28, 0.9, 0]} castShadow>
                <sphereGeometry args={[0.1, 8, 8]} />
                <meshStandardMaterial
                    color={player.isEliminated ? '#333' : style.bodyColor}
                    roughness={0.6}
                />
            </mesh>

            {/* Arms holding cards */}
            <mesh position={[0.2, 0.85, 0.3]} rotation={[0.5, 0, -0.2]} castShadow>
                <capsuleGeometry args={[0.06, 0.4, 8, 16]} />
                <meshStandardMaterial color={player.isEliminated ? '#333' : style.bodyColor} roughness={0.6} />
            </mesh>
            <mesh position={[-0.2, 0.85, 0.3]} rotation={[0.5, 0, 0.2]} castShadow>
                <capsuleGeometry args={[0.06, 0.4, 8, 16]} />
                <meshStandardMaterial color={player.isEliminated ? '#333' : style.bodyColor} roughness={0.6} />
            </mesh>

            {/* Turn glow ring (on the table surface around the player) */}
            <mesh ref={glowRef} position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[0.4, 0.5, 32]} />
                <meshStandardMaterial
                    color="#FFD700"
                    emissive="#FFD700"
                    emissiveIntensity={0}
                    transparent
                    opacity={isCurrentTurn ? 0.8 : 0}
                />
            </mesh>
        </group>
    );
}

function CharacterAccessory({
    character,
    eliminated,
    accentColor,
}: {
    character: Character;
    eliminated: boolean;
    accentColor: string;
}) {
    const color = eliminated ? '#555' : accentColor;

    switch (character) {
        case Character.Duke:
        case Character.Bureaucrat:
        case Character.Speculator:
            // Crown — 3 points
            return (
                <group position={[0, 1.38, 0]}>
                    <mesh>
                        <cylinderGeometry args={[0.12, 0.14, 0.06, 5]} />
                        <meshStandardMaterial color={color} metalness={0.7} roughness={0.2} />
                    </mesh>
                    {[0, 1, 2].map((i) => (
                        <mesh key={i} position={[Math.cos(i * 2.1) * 0.08, 0.06, Math.sin(i * 2.1) * 0.08]}>
                            <coneGeometry args={[0.03, 0.08, 4]} />
                            <meshStandardMaterial color={color} metalness={0.7} roughness={0.2} />
                        </mesh>
                    ))}
                </group>
            );

        case Character.Assassin:
            // Dagger on back
            return (
                <group position={[0.15, 1.05, -0.1]} rotation={[0, 0, -0.4]}>
                    <mesh>
                        <boxGeometry args={[0.03, 0.2, 0.02]} />
                        <meshStandardMaterial color={color} metalness={0.8} roughness={0.15} />
                    </mesh>
                    <mesh position={[0, 0.12, 0]}>
                        <coneGeometry args={[0.025, 0.08, 4]} />
                        <meshStandardMaterial color={color} metalness={0.8} roughness={0.15} />
                    </mesh>
                </group>
            );

        case Character.Captain:
            // Sailor hat
            return (
                <group position={[0, 1.35, 0]}>
                    <mesh>
                        <cylinderGeometry args={[0.15, 0.15, 0.05, 16]} />
                        <meshStandardMaterial color={color} roughness={0.4} />
                    </mesh>
                    <mesh position={[0, 0.04, 0]}>
                        <cylinderGeometry args={[0.1, 0.12, 0.08, 16]} />
                        <meshStandardMaterial color="#ffffff" roughness={0.4} />
                    </mesh>
                </group>
            );

        case Character.Contessa:
            // Tiara
            return (
                <mesh position={[0, 1.35, 0.05]}>
                    <torusGeometry args={[0.12, 0.02, 8, 16, Math.PI]} />
                    <meshStandardMaterial color={color} metalness={0.6} roughness={0.2} />
                </mesh>
            );

        case Character.Inquisitor:
            // Magnifying glass
            return (
                <group position={[0.2, 1.0, 0.1]} rotation={[0, 0, -0.5]}>
                    <mesh>
                        <torusGeometry args={[0.06, 0.012, 8, 16]} />
                        <meshStandardMaterial color={color} metalness={0.5} roughness={0.3} />
                    </mesh>
                    <mesh position={[0, -0.1, 0]}>
                        <cylinderGeometry args={[0.012, 0.012, 0.12, 8]} />
                        <meshStandardMaterial color="#8B4513" roughness={0.6} />
                    </mesh>
                </group>
            );

        case Character.Jester:
            // Jester hat (2 prongs)
            return (
                <group position={[0, 1.35, 0]}>
                    {[-1, 1].map((side) => (
                        <group key={side}>
                            <mesh position={[side * 0.08, 0.06, 0]} rotation={[0, 0, side * 0.4]}>
                                <coneGeometry args={[0.04, 0.12, 6]} />
                                <meshStandardMaterial color={color} roughness={0.5} />
                            </mesh>
                            <mesh position={[side * 0.12, 0.12, 0]}>
                                <sphereGeometry args={[0.025, 8, 8]} />
                                <meshStandardMaterial color={color} roughness={0.5} />
                            </mesh>
                        </group>
                    ))}
                </group>
            );

        case Character.Socialist:
            // Raised fist
            return (
                <group position={[0, 1.4, 0]}>
                    <mesh>
                        <boxGeometry args={[0.06, 0.08, 0.05]} />
                        <meshStandardMaterial color={color} roughness={0.5} />
                    </mesh>
                    <mesh position={[0, 0.05, 0]}>
                        <cylinderGeometry args={[0.03, 0.03, 0.04, 8]} />
                        <meshStandardMaterial color={color} roughness={0.5} />
                    </mesh>
                </group>
            );

        default:
            // Ambassador and default — scroll
            return (
                <group position={[0.18, 1.0, 0.05]} rotation={[0, 0, -0.3]}>
                    <mesh>
                        <cylinderGeometry args={[0.04, 0.04, 0.15, 8]} />
                        <meshStandardMaterial color="#f5e6c8" roughness={0.6} />
                    </mesh>
                </group>
            );
    }
}
