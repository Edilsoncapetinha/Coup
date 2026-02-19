import React, { useState, useEffect } from 'react';
import { socket } from '@/services/socket';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { useGame } from '@/contexts/GameContext';
import { BASE_CHARACTERS, BotDifficulty } from '@/game/types';

const Lobby = () => {
    const [inputRoomCode, setInputRoomCode] = useState('');
    const [playerName, setPlayerName] = useState(localStorage.getItem('coup_player_name') || '');
    const [joinedRoom, setJoinedRoom] = useState<string | null>(null);
    const { toast } = useToast();
    const navigate = useNavigate();
    const {
        setRoomCode,
        gameState,
        startGame: startGameContext,
        setMyPlayerId,
        connectedPlayers,
        myPlayerId
    } = useGame();

    // Auto-navigate when game state is received
    useEffect(() => {
        if (gameState && joinedRoom) {
            navigate('/game');
        }
    }, [gameState, joinedRoom, navigate]);

    useEffect(() => {
        socket.connect();

        function onRoomCreated(code: string) {
            console.log('[LOBBY] onRoomCreated:', code, 'socket.id:', socket.id);
            // Set myPlayerId HERE — this is the guaranteed moment socket.id is correct
            if (socket.id) setMyPlayerId(socket.id);
            setJoinedRoom(code);
            setRoomCode(code);
            toast({
                title: "Room Created",
                description: `Your room code is: ${code}`,
            });
        }

        function onRoomJoined(code: string) {
            console.log('[LOBBY] onRoomJoined:', code, 'socket.id:', socket.id);
            // Set myPlayerId HERE — this is the guaranteed moment socket.id is correct
            if (socket.id) setMyPlayerId(socket.id);
            setJoinedRoom(code);
            setRoomCode(code);
            toast({
                title: "Joined Room",
                description: `Successfully joined room: ${code}`,
            });
        }

        function onConnectError(err: any) {
            console.error('[LOBBY] Connection Error:', err);
            toast({
                title: "Connection Error",
                description: "Could not connect to the server." + err.message,
                variant: "destructive"
            })
        }

        function onRoomError(message: string) {
            console.error('[LOBBY] Room Error:', message);
            toast({
                title: "Error",
                description: message,
                variant: "destructive"
            });
            if (message.includes('not found') || message.includes('expired')) {
                setJoinedRoom(null);
                setRoomCode(null);
            }
        }

        socket.on('room_created', onRoomCreated);
        socket.on('room_joined', onRoomJoined);
        socket.on('connect_error', onConnectError);
        socket.on('error', onRoomError);

        return () => {
            socket.off('room_created', onRoomCreated);
            socket.off('room_joined', onRoomJoined);
            socket.off('connect_error', onConnectError);
            socket.off('error', onRoomError);
        };
    }, [toast, setRoomCode]);

    const handleCreateRoom = () => {
        if (!playerName) {
            toast({ title: "Name Required", description: "Please enter your name first.", variant: "destructive" });
            return;
        }
        localStorage.setItem('coup_player_name', playerName);
        socket.emit('create_room', { name: playerName });
    };

    const handleJoinRoom = () => {
        if (!playerName) {
            toast({ title: "Name Required", description: "Please enter your name first.", variant: "destructive" });
            return;
        }
        if (inputRoomCode.length === 4) {
            localStorage.setItem('coup_player_name', playerName);
            socket.emit('join_room', { code: inputRoomCode, name: playerName });
        } else {
            toast({
                title: "Invalid Code",
                description: "Please enter a 4-digit room code.",
                variant: "destructive",
            });
        }
    };

    const startGame = () => {
        if (connectedPlayers.length < 2) {
            toast({
                title: "Not enough players",
                description: "Need at least 2 players to start.",
                variant: "destructive"
            });
            return;
        }

        startGameContext({
            playerCount: connectedPlayers.length,
            playerNames: connectedPlayers.map(p => p.name),
            humanPlayerName: connectedPlayers.find(p => p.id === myPlayerId)?.name || "You",
            botCount: 0,
            playerIds: connectedPlayers.map(p => p.id),
            enabledCharacters: BASE_CHARACTERS,
            enableFactions: false,
            botDifficulty: BotDifficulty.Medium,
            cardsPerCharacter: 3,
        });
    }

    if (joinedRoom) {
        return (
            <Card className="w-[350px] mx-auto mt-10">
                <CardHeader>
                    <CardTitle>Room: {joinedRoom}</CardTitle>
                    <CardDescription>Waiting for other players...</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="mb-4">
                        <p className="text-sm text-gray-500 mb-2">Players Connected: {connectedPlayers.length}</p>
                        <ul className="text-xs space-y-1">
                            {connectedPlayers.map((p, i) => (
                                <li key={p.id} className={p.id === myPlayerId ? "text-amber-500 font-bold" : "text-gray-400"}>
                                    {p.name} {p.id === myPlayerId ? "(You)" : ""}
                                </li>
                            ))}
                        </ul>
                    </div>
                    {connectedPlayers.length >= 2 ? (
                        <Button onClick={startGame} className="w-full">Start Game</Button>
                    ) : (
                        <p className="text-xs text-center text-gray-500">Waiting for at least 2 players...</p>
                    )}
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="w-[350px] mx-auto mt-10">
            <CardHeader>
                <CardTitle>Coup Multiplayer Lobby</CardTitle>
                <CardDescription>Create or join a game room.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <label className="text-xs font-medium text-gray-400">Your Name</label>
                    <Input
                        placeholder="Enter your name"
                        value={playerName}
                        onChange={(e) => setPlayerName(e.target.value)}
                    />
                </div>
                <Button onClick={handleCreateRoom} className="w-full">
                    Create New Room
                </Button>
                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">
                            Or join with code
                        </span>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Input
                        type="text"
                        placeholder="Room Code (4 digits)"
                        value={inputRoomCode}
                        onChange={(e) => setInputRoomCode(e.target.value)}
                        maxLength={4}
                    />
                    <Button onClick={handleJoinRoom}>Join</Button>
                </div>
            </CardContent>
        </Card>
    );
};

export default Lobby;
