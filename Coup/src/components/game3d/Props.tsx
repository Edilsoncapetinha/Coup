import * as THREE from 'three';

// Procedural Wood Grain Texture - VERTICAL and MORE DETAILED
function getWoodTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 512; // Taller for vertical grain
    const ctx = canvas.getContext('2d')!;

    // Base Mahogany Color
    ctx.fillStyle = '#4a2c1a';
    ctx.fillRect(0, 0, 256, 512);

    // Vertical Grain
    ctx.strokeStyle = '#3d2b1f';
    ctx.lineWidth = 1;
    for (let i = 0; i < 60; i++) {
        ctx.beginPath();
        const x = Math.random() * 256;
        ctx.moveTo(x, 0);
        ctx.bezierCurveTo(x + 10, 150, x - 10, 350, x, 512);
        ctx.stroke();
    }

    // Subtle Knots
    ctx.fillStyle = 'rgba(30, 15, 5, 0.15)';
    for (let i = 0; i < 5; i++) {
        const x = Math.random() * 256;
        const y = Math.random() * 512;
        ctx.beginPath();
        ctx.ellipse(x, y, 10, 25, Math.random() * 0.1, 0, Math.PI * 2);
        ctx.fill();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1, 1);
    return tex;
}

// Procedural Brick Texture - REFINED
function getBrickTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#5d3528'; // Brighter, more varied color
    ctx.fillRect(0, 0, 256, 256);

    // Mortar lines
    ctx.strokeStyle = '#2a1a16';
    ctx.lineWidth = 3;
    for (let y = 0; y < 256; y += 32) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(256, y);
        ctx.stroke();
        const offset = (y / 32) % 2 === 0 ? 0 : 32;
        for (let x = offset; x < 256; x += 64) {
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x, y + 32);
            ctx.stroke();
        }
    }

    // Add dirt/grit
    for (let i = 0; i < 500; i++) {
        ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.1})`;
        ctx.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2, 2);
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
            {/* Sconce bracket */}
            <mesh castShadow>
                <boxGeometry args={[0.1, 0.4, 0.05]} />
                <meshStandardMaterial color="#1a0f05" metalness={0.6} roughness={0.3} />
            </mesh>
            {/* Bulbs/Lights */}
            <mesh position={[0, 0.1, 0.2]}>
                <sphereGeometry args={[0.08, 12, 12]} />
                <meshStandardMaterial
                    color="#ffd27d"
                    emissive="#ff8c00"
                    emissiveIntensity={4}
                    transparent
                    opacity={0.9}
                />
            </mesh>
            <pointLight
                position={[0, 0.1, 0.4]}
                intensity={4}
                color="#ff8c00"
                distance={8}
                decay={2}
            />
        </group>
    );
}
