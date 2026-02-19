import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);

const isProduction = process.env.NODE_ENV === 'production';

const io = new Server(httpServer, {
    cors: isProduction ? undefined : {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Serve static frontend files in production
if (isProduction) {
    const distPath = path.join(__dirname, '..', 'dist');
    app.use(express.static(distPath));

    // SPA fallback — serve index.html for any non-API route
    app.get(/(.*)/, (_req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
    });
}

const rooms = {};

/**
 * Filter game state so each client only sees their own hidden cards.
 * Opponents' unrevealed cards have character replaced with 'hidden'.
 * drawnCards only visible to the acting player.
 */
function filterStateForPlayer(state, socketId) {
    const isActingPlayer = state.pendingAction?.sourcePlayerId === socketId;

    return {
        ...state,
        // courtDeck is preserved — needed by client-side game engine for Exchange
        // Only the acting player sees drawnCards during exchange selection
        drawnCards: isActingPlayer ? state.drawnCards : [],
        // Filter each player's cards
        players: state.players.map(player => {
            if (player.id === socketId) {
                // This is the local player — show all their cards
                return player;
            }
            // For opponents — hide unrevealed card characters
            return {
                ...player,
                influenceCards: player.influenceCards.map(card => {
                    if (card.isRevealed) return card; // Revealed cards are public
                    return { ...card, character: 'hidden' };
                })
            };
        })
    };
}

const generateRoomCode = () => {
    return Math.floor(1000 + Math.random() * 9000).toString();
};

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('create_room', (data) => {
        const { name } = data || { name: `Player ${socket.id.slice(0, 4)}` };
        const code = generateRoomCode();
        rooms[code] = {
            players: [],
            gameState: null,
            restartRequests: []
        };
        socket.join(code);
        rooms[code].players.push({ id: socket.id, name: name });

        console.log(`[SERVER] Room created: ${code} by ${name} (${socket.id}). Players:`, rooms[code].players);

        socket.emit('room_created', code);
        io.to(code).emit('update_player_list', rooms[code].players);
    });

    socket.on('join_room', (data) => {
        const { code, name } = typeof data === 'string' ? { code: data, name: `Player ${socket.id.slice(0, 4)}` } : data;
        if (rooms[code]) {
            socket.join(code);
            if (!rooms[code].players.find(p => p.id === socket.id)) {
                rooms[code].players.push({ id: socket.id, name: name });
            }

            console.log(`[SERVER] User ${name} (${socket.id}) joined room ${code}. Players:`, rooms[code].players);

            io.to(code).emit('player_joined', { id: socket.id, name: name });
            io.to(code).emit('update_player_list', rooms[code].players);
            socket.emit('room_joined', code);

            // If game state exists, sync it (filtered)
            if (rooms[code].gameState) {
                const filtered = filterStateForPlayer(rooms[code].gameState, socket.id);
                socket.emit('game_state_update', filtered);
            }
        } else {
            socket.emit('error', 'Room not found');
        }
    });

    socket.on('request_player_list', (code) => {
        if (rooms[code]) {
            socket.emit('update_player_list', rooms[code].players);
            console.log(`[SERVER] User ${socket.id} requested player list for room ${code}`);
        } else {
            socket.emit('error', 'Room not found or session expired');
        }
    });

    socket.on('game_action', (data) => {
        const { roomCode, action, newState } = data;
        if (rooms[roomCode]) {
            rooms[roomCode].gameState = newState;

            // Send filtered state to each client individually
            const sockets = io.sockets.adapter.rooms.get(roomCode);
            if (sockets && newState && newState.players) {
                for (const socketId of sockets) {
                    // Create a filtered copy for this specific client
                    const filteredState = filterStateForPlayer(newState, socketId);
                    io.to(socketId).emit('game_state_update', filteredState);
                    io.to(socketId).emit('your_player_id', socketId);
                }
            } else {
                io.to(roomCode).emit('game_state_update', newState);
            }

            console.log(`[SERVER] Action ${action} in room ${roomCode}`);
        }
    });

    socket.on('leave_room', (roomCode) => {
        if (rooms[roomCode]) {
            const index = rooms[roomCode].players.findIndex(p => p.id === socket.id);
            if (index !== -1) {
                const player = rooms[roomCode].players[index];
                rooms[roomCode].players.splice(index, 1);
                socket.leave(roomCode);
                console.log(`[SERVER] User ${player.name} (${socket.id}) left room ${roomCode}`);

                // If room is empty, delete it
                if (rooms[roomCode].players.length === 0) {
                    delete rooms[roomCode];
                    console.log(`[SERVER] Room ${roomCode} deleted (empty)`);
                } else {
                    // Notify remaining players
                    io.to(roomCode).emit('update_player_list', rooms[roomCode].players);
                    io.to(roomCode).emit('player_left', { id: socket.id, name: player.name });
                }
            }
        }
    });

    socket.on('request_restart', (roomCode) => {
        if (rooms[roomCode]) {
            if (!rooms[roomCode].restartRequests.includes(socket.id)) {
                rooms[roomCode].restartRequests.push(socket.id);
            }

            const currentPlayers = rooms[roomCode].players.length;
            const requests = rooms[roomCode].restartRequests.length;

            console.log(`[SERVER] Restart requested in ${roomCode} (${requests}/${currentPlayers})`);

            io.to(roomCode).emit('restart_status', {
                requests,
                total: currentPlayers
            });

            if (requests >= currentPlayers) {
                console.log(`[SERVER] Restarting game in ${roomCode}`);
                rooms[roomCode].restartRequests = [];
                io.to(roomCode).emit('game_restart_approved');
                rooms[roomCode].gameState = null;
            }
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        for (const code in rooms) {
            const index = rooms[code].players.findIndex(p => p.id === socket.id);
            if (index !== -1) {
                rooms[code].players.splice(index, 1);
                io.to(code).emit('update_player_list', rooms[code].players);
                break;
            }
        }
    });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT} (${isProduction ? 'production' : 'development'})`);
});
