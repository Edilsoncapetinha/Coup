import { useMemo } from 'react';
import * as THREE from 'three';

export default function PokerTable() {
    const tableWidth = 5.5;
    const tableDepth = 3.2;
    const tableHeight = 0.45;

    const feltShape = useMemo(() => createOvalShape(tableWidth * 0.38, tableDepth * 0.32), []);
    const innerRailShape = useMemo(() => createOvalShape(tableWidth * 0.43, tableDepth * 0.38), []);
    const outerRailShape = useMemo(() => createOvalShape(tableWidth * 0.5, tableDepth * 0.48), []);
    const armrestShape = useMemo(() => createOvalShape(tableWidth * 0.52, tableDepth * 0.5), []);

    const cupHolders = useMemo(() => {
        const positions: { x: number; z: number }[] = [];
        const count = 10;
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const rx = tableWidth * 0.44;
            const rz = tableDepth * 0.4;
            positions.push({ x: Math.cos(angle) * rx, z: Math.sin(angle) * rz });
        }
        return positions;
    }, []);

    return (
        <group position={[0, 0, 0]}>
            <mesh position={[0, tableHeight + 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
                <shapeGeometry args={[feltShape]} />
                <meshStandardMaterial color="#1a5c3a" roughness={0.9} metalness={0.0} side={THREE.DoubleSide} />
            </mesh>
            <RailRing shape={innerRailShape} innerShape={feltShape} y={tableHeight} height={0.06} color="#8B6914" roughness={0.35} metalness={0.15} />
            <RailRing shape={createOvalShape(tableWidth * 0.385, tableDepth * 0.325)} innerShape={feltShape} y={tableHeight + 0.015} height={0.01} color="#C5A028" roughness={0.2} metalness={0.6} />
            <RailRing shape={armrestShape} innerShape={outerRailShape} y={tableHeight - 0.02} height={0.1} color="#3D1F0B" roughness={0.7} metalness={0.05} />
            <RailRing shape={createOvalShape(tableWidth * 0.515, tableDepth * 0.495)} innerShape={createOvalShape(tableWidth * 0.435, tableDepth * 0.385)} y={tableHeight + 0.06} height={0.025} color="#4A2810" roughness={0.65} metalness={0.05} />
            {cupHolders.map((pos, i) => (
                <group key={i} position={[pos.x, tableHeight + 0.03, pos.z]}>
                    <mesh>
                        <torusGeometry args={[0.065, 0.015, 8, 16]} />
                        <meshStandardMaterial color="#C5A028" roughness={0.2} metalness={0.7} />
                    </mesh>
                    <mesh rotation={[-Math.PI / 2, 0, 0]}>
                        <circleGeometry args={[0.05, 16]} />
                        <meshStandardMaterial color="#0a0a0a" />
                    </mesh>
                </group>
            ))}
            <mesh position={[0, tableHeight * 0.5, 0]}>
                <boxGeometry args={[tableWidth * 0.85, tableHeight, tableDepth * 0.7]} />
                <meshStandardMaterial color="#5C3A1E" roughness={0.5} metalness={0.1} />
            </mesh>
            <PedestalLeg position={[-tableWidth * 0.28, 0, 0]} />
            <PedestalLeg position={[tableWidth * 0.28, 0, 0]} />
            <mesh position={[0, 0.12, 0]}>
                <boxGeometry args={[tableWidth * 0.46, 0.08, 0.1]} />
                <meshStandardMaterial color="#5C3A1E" roughness={0.45} metalness={0.1} />
            </mesh>
            <mesh position={[0, 0.12, 0]} rotation={[0, 0, Math.PI / 2]}>
                <torusGeometry args={[0.06, 0.025, 8, 16]} />
                <meshStandardMaterial color="#6B4226" roughness={0.4} metalness={0.15} />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
                <planeGeometry args={[24, 24]} />
                <meshStandardMaterial color="#1a1008" roughness={0.7} metalness={0.05} />
            </mesh>
        </group>
    );
}

function PedestalLeg({ position }: { position: [number, number, number] }) {
    return (
        <group position={position}>
            <mesh position={[0, 0.03, 0]} castShadow>
                <boxGeometry args={[0.35, 0.06, 0.6]} />
                <meshStandardMaterial color="#4A2810" roughness={0.5} metalness={0.1} />
            </mesh>
            <mesh position={[0, 0.04, 0.32]} rotation={[0.3, 0, 0]} castShadow>
                <boxGeometry args={[0.25, 0.04, 0.12]} />
                <meshStandardMaterial color="#4A2810" roughness={0.5} metalness={0.1} />
            </mesh>
            <mesh position={[0, 0.04, -0.32]} rotation={[-0.3, 0, 0]} castShadow>
                <boxGeometry args={[0.25, 0.04, 0.12]} />
                <meshStandardMaterial color="#4A2810" roughness={0.5} metalness={0.1} />
            </mesh>
            <mesh position={[0, 0.12, 0]} castShadow>
                <cylinderGeometry args={[0.12, 0.16, 0.15, 16]} />
                <meshStandardMaterial color="#5C3A1E" roughness={0.4} metalness={0.1} />
            </mesh>
            <mesh position={[0, 0.2, 0]}>
                <torusGeometry args={[0.13, 0.02, 8, 16]} />
                <meshStandardMaterial color="#6B4226" roughness={0.35} metalness={0.15} />
            </mesh>
            <mesh position={[0, 0.32, 0]} castShadow>
                <cylinderGeometry args={[0.1, 0.12, 0.2, 16]} />
                <meshStandardMaterial color="#5C3A1E" roughness={0.4} metalness={0.1} />
            </mesh>
            <mesh position={[0, 0.38, 0]}>
                <torusGeometry args={[0.11, 0.018, 8, 16]} />
                <meshStandardMaterial color="#6B4226" roughness={0.35} metalness={0.15} />
            </mesh>
            <mesh position={[0, 0.42, 0]} castShadow>
                <cylinderGeometry args={[0.14, 0.1, 0.06, 16]} />
                <meshStandardMaterial color="#5C3A1E" roughness={0.4} metalness={0.1} />
            </mesh>
        </group>
    );
}

function createOvalShape(rx: number, ry: number): THREE.Shape {
    const shape = new THREE.Shape();
    const segments = 64;
    for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        const x = Math.cos(angle) * rx;
        const y = Math.sin(angle) * ry;
        if (i === 0) shape.moveTo(x, y);
        else shape.lineTo(x, y);
    }
    shape.closePath();
    return shape;
}

function RailRing({ shape, innerShape, y, height, color, roughness, metalness }: { shape: THREE.Shape; innerShape: THREE.Shape; y: number; height: number; color: string; roughness: number; metalness: number; }) {
    const geometry = useMemo(() => {
        const outerShape = shape.clone();
        outerShape.holes = [new THREE.Path(innerShape.getPoints(64))];
        const extrudeSettings: THREE.ExtrudeGeometryOptions = {
            depth: height,
            bevelEnabled: true,
            bevelThickness: 0.005,
            bevelSize: 0.005,
            bevelSegments: 2,
        };
        const geo = new THREE.ExtrudeGeometry(outerShape, extrudeSettings);
        geo.rotateX(-Math.PI / 2);
        return geo;
    }, [shape, innerShape, height]);
    return (
        <mesh position={[0, y, 0]} geometry={geometry} receiveShadow castShadow>
            <meshStandardMaterial color={color} roughness={roughness} metalness={metalness} />
        </mesh>
    );
}
