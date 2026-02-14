import { useMemo } from 'react';
import * as THREE from 'three';

interface CoinPileProps {
    count: number;
    position: THREE.Vector3;
}

export default function CoinPile({ count, position }: CoinPileProps) {
    const coins = useMemo(() => {
        const result: { y: number; xOff: number; zOff: number; rot: number }[] = [];
        const displayed = Math.min(count, 15); // cap visual coins

        for (let i = 0; i < displayed; i++) {
            const stack = Math.floor(i / 5);
            const inStack = i % 5;
            result.push({
                y: inStack * 0.035,
                xOff: stack * 0.18 - (Math.floor(displayed / 5) * 0.09),
                zOff: (Math.random() - 0.5) * 0.04,
                rot: Math.random() * Math.PI,
            });
        }
        return result;
    }, [count]);

    if (count === 0) return null;

    return (
        <group position={[position.x, position.y, position.z]}>
            {coins.map((coin, idx) => (
                <mesh
                    key={idx}
                    position={[coin.xOff, coin.y, coin.zOff]}
                    rotation={[Math.PI / 2, coin.rot, 0]}
                    castShadow
                >
                    <cylinderGeometry args={[0.06, 0.06, 0.02, 16]} />
                    <meshStandardMaterial
                        color="#DAA520"
                        roughness={0.25}
                        metalness={0.75}
                        emissive="#8B6914"
                        emissiveIntensity={0.1}
                    />
                </mesh>
            ))}
        </group>
    );
}
