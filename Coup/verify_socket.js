import { io } from 'socket.io-client';

const URL = 'http://localhost:3000';

const client1 = io(URL, { autoConnect: false });
const client2 = io(URL, { autoConnect: false });

let roomCode = '';

console.log('Starting verification...');

client1.connect();

client1.on('connect', () => {
    console.log('Client 1 connected');
    client1.emit('create_room');
});

client1.on('room_created', (code) => {
    console.log('Client 1 created room:', code);
    roomCode = code;
    client2.connect();
});

client2.on('connect', () => {
    console.log('Client 2 connected');
    if (roomCode) {
        client2.emit('join_room', roomCode);
    }
});

client2.on('room_joined', (code) => {
    console.log('Client 2 joined room:', code);
    if (code === roomCode) {
        console.log('Room join successful');

        // Test Game Action Sync
        const dummyState = { turn: 1, players: [] };
        console.log('Client 1 emitting game_action...');
        client1.emit('game_action', {
            roomCode,
            action: 'update',
            newState: dummyState
        });
    } else {
        console.error('Room code mismatch!');
        process.exit(1);
    }
});

client2.on('game_state_update', (state) => {
    console.log('Client 2 received game state update:', state);
    if (state.turn === 1) {
        console.log('Game state sync successful!');
        client1.disconnect();
        client2.disconnect();
        process.exit(0);
    }
});

// Timeout
setTimeout(() => {
    console.error('Verification timed out');
    client1.disconnect();
    client2.disconnect();
    process.exit(1);
}, 5000);
