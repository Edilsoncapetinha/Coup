import { useRef, useMemo } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import { Character, type InfluenceCard } from '../../game/types';

const CHAR_IMAGE_PATHS: Partial<Record<Character, string>> = {
    [Character.Captain]: '/cartas/capitao.png',
    [Character.Duke]: '/cartas/duque.png',
    [Character.Assassin]: '/cartas/assassino.png',
    [Character.Contessa]: '/cartas/condessa.png',
    [Character.Ambassador]: '/cartas/embaixador.png',
    [Character.Inquisitor]: '/cartas/inquisidor.png',
    [Character.Jester]: '/cartas/bufao.png',
};

const CHAR_COLORS: Record<Character, string> = {
    [Character.Duke]: '#8B008B',
    [Character.Assassin]: '#1a1a2e',
    [Character.Captain]: '#003366',
    [Character.Ambassador]: '#2F4F4F',
    [Character.Contessa]: '#800020',
    [Character.Inquisitor]: '#4a2844',
    [Character.Jester]: '#FF6347',
    [Character.Bureaucrat]: '#556B2F',
    [Character.Speculator]: '#CD853F',
    [Character.Socialist]: '#8B0000',
};

const CHAR_SYMBOLS: Record<Character, string> = {
    [Character.Duke]: '♛',
    [Character.Assassin]: '†',
    [Character.Captain]: '⚓',
    [Character.Ambassador]: '✦',
    [Character.Contessa]: '♕',
    [Character.Inquisitor]: '⊕',
    [Character.Jester]: '♠',
    [Character.Bureaucrat]: '▣',
    [Character.Speculator]: '◈',
    [Character.Socialist]: '✊',
};

interface Card3DProps {
    card: InfluenceCard;
    position: THREE.Vector3;
    rotation: THREE.Euler;
    showFace: boolean;
}

export default function Card3D({ card, position, rotation, showFace }: Card3DProps) {
    const meshRef = useRef<THREE.Mesh>(null);
    const targetFlip = showFace || card.isRevealed ? 0 : Math.PI;
    const currentFlip = useRef(targetFlip);

    const imagePath = CHAR_IMAGE_PATHS[card.character];

    const frontTexture = useMemo(() => {
        if (imagePath) {
            const loader = new THREE.TextureLoader();
            const tex = loader.load(imagePath);
            tex.colorSpace = THREE.SRGBColorSpace;
            return tex;
        }
        return createCardFrontTexture(card.character, card.isRevealed);
    }, [card.character, card.isRevealed, imagePath]);

    const backTexture = useMemo(() => createCardBackTexture(), []);

    // Smooth flip animation
    useFrame(() => {
        currentFlip.current = THREE.MathUtils.lerp(currentFlip.current, targetFlip, 0.08);
        if (meshRef.current) {
            meshRef.current.rotation.y = rotation.y + currentFlip.current;
        }
    });

    const sideMat = <meshStandardMaterial color="#222" roughness={0.8} />;

    return (
        <mesh
            ref={meshRef}
            position={[position.x, position.y, position.z]}
            rotation={[rotation.x, rotation.y, rotation.z]}
            castShadow
        >
            <boxGeometry args={[0.35, 0.5, 0.008]} />
            <meshStandardMaterial attach="material-0" color="#222" roughness={0.8} /> {/* side */}
            <meshStandardMaterial attach="material-1" color="#222" roughness={0.8} /> {/* side */}
            <meshStandardMaterial attach="material-2" color="#222" roughness={0.8} /> {/* top */}
            <meshStandardMaterial attach="material-3" color="#222" roughness={0.8} /> {/* bottom */}
            <meshStandardMaterial attach="material-4" map={frontTexture} roughness={0.5} /> {/* front */}
            <meshStandardMaterial attach="material-5" map={backTexture} roughness={0.5} /> {/* back */}
        </mesh>
    );
}

function createCardFrontTexture(character: Character, isRevealed: boolean): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 384;
    const ctx = canvas.getContext('2d')!;

    const baseColor = isRevealed ? '#331111' : (CHAR_COLORS[character] ?? '#333');

    // Background
    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, 256, 384);

    // Border
    ctx.strokeStyle = isRevealed ? '#661111' : '#b8860b';
    ctx.lineWidth = 6;
    ctx.strokeRect(8, 8, 240, 368);

    // Inner border
    ctx.strokeStyle = isRevealed ? '#441111' : '#8b6914';
    ctx.lineWidth = 2;
    ctx.strokeRect(16, 16, 224, 352);

    // Symbol
    ctx.fillStyle = isRevealed ? '#661111' : '#FFD700';
    ctx.font = 'bold 80px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(CHAR_SYMBOLS[character] ?? '?', 128, 160);

    // Character name
    ctx.fillStyle = isRevealed ? '#553333' : '#ffffffcc';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText(character, 128, 310);

    if (isRevealed) {
        // X overlay
        ctx.strokeStyle = '#ff000066';
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.moveTo(40, 40);
        ctx.lineTo(216, 344);
        ctx.moveTo(216, 40);
        ctx.lineTo(40, 344);
        ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
}

function createCardBackTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 384;
    const ctx = canvas.getContext('2d')!;

    // Dark background
    ctx.fillStyle = '#1a0e05';
    ctx.fillRect(0, 0, 256, 384);

    // Gold border
    ctx.strokeStyle = '#b8860b';
    ctx.lineWidth = 6;
    ctx.strokeRect(8, 8, 240, 368);

    // Diamond pattern
    ctx.strokeStyle = '#8b691433';
    ctx.lineWidth = 1;
    for (let i = 0; i < 12; i++) {
        for (let j = 0; j < 18; j++) {
            const x = 20 + i * 20;
            const y = 20 + j * 20;
            ctx.beginPath();
            ctx.moveTo(x, y - 8);
            ctx.lineTo(x + 8, y);
            ctx.lineTo(x, y + 8);
            ctx.lineTo(x - 8, y);
            ctx.closePath();
            ctx.stroke();
        }
    }

    // Center emblem
    ctx.fillStyle = '#b8860b';
    ctx.font = 'bold 48px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('C', 128, 192);

    // Decorative circle
    ctx.strokeStyle = '#b8860b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(128, 192, 40, 0, Math.PI * 2);
    ctx.stroke();

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
}
