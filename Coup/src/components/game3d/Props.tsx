import * as THREE from 'three';

// Procedural Wood Grain Texture
function getWoodTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#2a1a05';
    ctx.fillRect(0, 0, 128, 128);
    ctx.strokeStyle = '#3d2b1f';
    ctx.lineWidth = 1;
    for (let i = 0; i < 30; i++) {
        ctx.beginPath();
        const y = Math.random() * 128;
        ctx.moveTo(0, y);
        ctx.bezierCurveTo(40, y + 5, 80, y - 5, 128, y);
        ctx.stroke();
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2, 2);
    return tex;
}

// Procedural Brick Texture
function getBrickTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#3d2218';
    ctx.fillRect(0, 0, 128, 128);
    ctx.strokeStyle = '#1a0d0a';
    ctx.lineWidth = 2;
    for (let y = 0; y < 128; y += 16) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(128, y);
        ctx.stroke();
        const offset = (y / 16) % 2 === 0 ? 0 : 16;
        for (let x = offset; x < 128; x += 32) {
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x, y + 16);
            ctx.stroke();
        }
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(4, 4);
    return tex;
}

export const woodTex = getWoodTexture();
export const brickTex = getBrickTexture();

export function Bottle({ position, type = 'classic', color = '#c06014' }: { position: [number, number, number], type?: 'classic' | 'tall' | 'flat', color?: string }) {
    return (
        <group position={position}>
            <mesh castShadow>
                {type === 'classic' && <cylinderGeometry args={[0.08, 0.08, 0.3, 8]} />}
                {type === 'tall' && <cylinderGeometry args={[0.06, 0.06, 0.45, 8]} />}
                {type === 'flat' && <boxGeometry args={[0.15, 0.3, 0.06]} />}
                <meshStandardMaterial color={color} transparent opacity={0.7} roughness={0.1} metalness={0.2} />
            </mesh>
            <mesh position={[0, type === 'tall' ? 0.25 : 0.2, 0]}>
                <cylinderGeometry args={[0.02, 0.02, 0.1, 8]} />
                <meshStandardMaterial color={color} />
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
            <mesh position={[0.035, 0, 0]}>
                <planeGeometry args={[0.3, 0.38]} />
                <meshStandardMaterial color="#fdf5e6" />
            </mesh>
        </group>
    );
}

export function Barrel({ position, rotation = [0, 0, 0] }: { position: [number, number, number], rotation?: [number, number, number] }) {
    return (
        <group position={position} rotation={rotation}>
            <mesh castShadow>
                <cylinderGeometry args={[0.4, 0.5, 1.2, 12]} />
                <meshStandardMaterial color="#3d2b1f" roughness={0.9} map={woodTex} />
            </mesh>
            {[0.4, -0.4].map((y, i) => (
                <mesh key={i} position={[0, y, 0]}>
                    <torusGeometry args={[0.48, 0.02, 8, 24]} />
                    <meshStandardMaterial color="#222" metalness={0.7} />
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
                <meshStandardMaterial color="#1a0f05" metalness={0.6} roughness={0.3} />
            </mesh>
            <mesh position={[0, 0.1, 0.15]}>
                <boxGeometry args={[0.03, 0.03, 0.25]} />
                <meshStandardMaterial color="#1a0f05" metalness={0.6} />
            </mesh>
            <mesh position={[0, 0.2, 0.25]}>
                <sphereGeometry args={[0.1, 12, 12]} />
                <meshStandardMaterial
                    color="#ffd27d"
                    emissive="#ff8c00"
                    emissiveIntensity={3}
                    transparent
                    opacity={0.8}
                />
            </mesh>
            <pointLight
                position={[0, 0.2, 0.3]}
                intensity={1.5}
                color="#ff8c00"
                distance={5}
            />
        </group>
    );
}
