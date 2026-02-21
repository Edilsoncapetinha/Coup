import * as THREE from 'three';

export function Bottle({ position, type = 'classic', color = '#c06014' }: { position: [number, number, number], type?: 'classic' | 'tall' | 'flat', color?: string }) {
    return (
        <group position={position}>
            <mesh castShadow>
                {type === 'classic' && <cylinderGeometry args={[0.08, 0.08, 0.3, 8]} />}
                {type === 'tall' && <cylinderGeometry args={[0.06, 0.06, 0.45, 8]} />}
                {type === 'flat' && <boxGeometry args={[0.15, 0.3, 0.06]} />}
                <meshStandardMaterial color={color} transparent opacity={0.7} roughness={0.1} metalness={0.2} />
            </mesh>
            <mesh position={[0, type === 'tall' ? 0.25 : 0.2, 0]} castShadow>
                <cylinderGeometry args={[0.02, 0.02, 0.1, 8]} />
                <meshStandardMaterial color={color} transparent opacity={0.8} />
            </mesh>
            <mesh position={[0, 0, type === 'flat' ? 0.031 : 0.081]}>
                <planeGeometry args={[0.08, 0.1]} />
                <meshStandardMaterial color="#f5f5dc" roughness={0.9} />
            </mesh>
        </group>
    );
}

export function Book({ position, rotation = [0, 0, 0], color = '#4a2c2a' }: { position: [number, number, number], rotation?: [number, number, number], color?: string }) {
    return (
        <group position={position} rotation={rotation}>
            <mesh castShadow>
                <boxGeometry args={[0.06, 0.4, 0.3]} />
                <meshStandardMaterial color={color} roughness={0.8} />
            </mesh>
            <mesh position={[0.031, 0, 0]}>
                <planeGeometry args={[0.3, 0.38]} />
                <meshStandardMaterial color="#e8d8b5" roughness={1} />
            </mesh>
        </group>
    );
}

export function Barrel({ position, rotation = [0, 0, 0] }: { position: [number, number, number], rotation?: [number, number, number] }) {
    return (
        <group position={position} rotation={rotation}>
            <mesh castShadow>
                <cylinderGeometry args={[0.4, 0.5, 1.2, 12]} />
                <meshStandardMaterial color="#3d2b1f" roughness={0.9} />
            </mesh>
            {[0.3, -0.3, 0.5, -0.5].map((y, i) => (
                <mesh key={i} position={[0, y, 0]}>
                    <torusGeometry args={[0.48, 0.02, 8, 24]} />
                    <meshStandardMaterial color="#222" metalness={0.8} roughness={0.2} />
                </mesh>
            ))}
        </group>
    );
}

export function WallSconce({ position, rotation = [0, 0, 0] }: { position: [number, number, number], rotation?: [number, number, number] }) {
    return (
        <group position={position} rotation={rotation}>
            <mesh castShadow>
                <boxGeometry args={[0.1, 0.4, 0.05]} />
                <meshStandardMaterial color="#2a1a05" metalness={0.6} roughness={0.3} />
            </mesh>
            <mesh position={[0, 0.1, 0.15]}>
                <boxGeometry args={[0.05, 0.05, 0.3]} />
                <meshStandardMaterial color="#2a1a05" metalness={0.6} roughness={0.3} />
            </mesh>
            <mesh position={[0, 0.2, 0.25]}>
                <sphereGeometry args={[0.1, 8, 8]} />
                <meshStandardMaterial
                    color="#ffd27d"
                    emissive="#ff8c00"
                    emissiveIntensity={2.5}
                    transparent
                    opacity={0.8}
                />
            </mesh>
            <pointLight
                position={[0, 0.2, 0.4]}
                intensity={1.5}
                color="#ff8c00"
                distance={12}
                decay={1.5}
            />
        </group>
    );
}
