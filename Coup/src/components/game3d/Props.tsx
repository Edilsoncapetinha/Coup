import * as THREE from 'three';

export function Bottle({ position, type = 'classic', color = '#c06014' }: { position: [number, number, number], type?: 'classic' | 'tall' | 'flat', color?: string }) {
    return (
        <group position={position}>
            <mesh castShadow>
                {type === 'classic' && <cylinderGeometry args={[0.08, 0.08, 0.3, 8]} />}
                {type === 'tall' && <cylinderGeometry args={[0.06, 0.06, 0.45, 8]} />}
                {type === 'flat' && <boxGeometry args={[0.15, 0.3, 0.06]} />}
                <meshStandardMaterial color={color} roughness={0.2} metalness={0.1} />
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
        </group>
    );
}

export function WallSconce({ position, rotation = [0, 0, 0] }: { position: [number, number, number], rotation?: [number, number, number] }) {
    return (
        <group position={position} rotation={rotation}>
            <mesh castShadow>
                <boxGeometry args={[0.1, 0.4, 0.05]} />
                <meshStandardMaterial color="#1a0f05" roughness={0.5} />
            </mesh>
            <mesh position={[0, 0.2, 0.15]}>
                <sphereGeometry args={[0.1, 8, 8]} />
                <meshStandardMaterial color="#ffd27d" emissive="#ff8c00" emissiveIntensity={2} />
            </mesh>
            <pointLight intensity={2} color="#ff8c00" distance={10} />
        </group>
    );
}

export const woodTex = null;
export const brickTex = null;
