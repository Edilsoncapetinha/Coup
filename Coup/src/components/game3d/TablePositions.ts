import * as THREE from 'three';

/**
 * Calcula posições dos jogadores ao redor da mesa.
 * O jogador humano (index 0) fica na posição "sul" (mais perto da câmera).
 */
export function getPlayerPositions(
    playerCount: number,
    tableRadiusX: number = 3.8,
    tableRadiusZ: number = 2.4
): { position: THREE.Vector3; rotation: number }[] {
    const positions: { position: THREE.Vector3; rotation: number }[] = [];

    for (let i = 0; i < playerCount; i++) {
        // Start from bottom (south) and go clockwise
        // Player 0 = south (angle = -PI/2), then distribute evenly
        const angle = (-Math.PI / 2) + (i * (2 * Math.PI) / playerCount);
        const x = Math.cos(angle) * tableRadiusX;
        const z = Math.sin(angle) * tableRadiusZ;
        // Face toward center (rotate to look at 0,0)
        const lookAngle = Math.atan2(-x, -z);

        positions.push({
            position: new THREE.Vector3(x, 0, z),
            rotation: lookAngle,
        });
    }

    return positions;
}

/**
 * Calcula posição das cartas em leque na mão de um jogador
 */
export function getCardPositions(
    cardCount: number,
    playerPos: THREE.Vector3,
    playerRotation: number,
    spread: number = 0.35
): { position: THREE.Vector3; rotation: THREE.Euler }[] {
    const cards: { position: THREE.Vector3; rotation: THREE.Euler }[] = [];
    const offsetStart = -(cardCount - 1) * spread / 2;

    for (let i = 0; i < cardCount; i++) {
        const lateralOffset = offsetStart + i * spread;
        // Cards closer to body (holding), slightly higher
        const forward = 0.45; // Closer to body radius (~0.25)
        const height = 1.15;
        const fanAngle = lateralOffset * 0.4; // More pronounced fan

        const x = playerPos.x + Math.sin(playerRotation) * forward + Math.cos(playerRotation) * lateralOffset;
        const z = playerPos.z + Math.cos(playerRotation) * forward - Math.sin(playerRotation) * lateralOffset;

        cards.push({
            position: new THREE.Vector3(x, height, z),
            rotation: new THREE.Euler(-0.2, playerRotation + Math.PI, fanAngle),
        });
    }

    return cards;
}

/**
 * Posição da pilha de moedas de um jogador (entre o jogador e o centro)
 */
export function getCoinPosition(
    playerPos: THREE.Vector3,
    playerRotation: number
): THREE.Vector3 {
    const forward = 1.2;
    return new THREE.Vector3(
        playerPos.x + Math.sin(playerRotation) * forward,
        0.42,
        playerPos.z + Math.cos(playerRotation) * forward
    );
}

/**
 * Posição da câmera atrás do jogador humano (index 0)
 */
export function getHumanCameraPos(
    humanPos: THREE.Vector3,
    humanRotation: number
): { position: THREE.Vector3; lookAt: THREE.Vector3 } {
    const behindDist = 3.5;
    const height = 4.5;
    return {
        position: new THREE.Vector3(
            humanPos.x - Math.sin(humanRotation) * behindDist,
            height,
            humanPos.z - Math.cos(humanRotation) * behindDist
        ),
        lookAt: new THREE.Vector3(0, 0.5, 0), // center of table
    };
}
