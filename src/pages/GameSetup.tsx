import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../contexts/GameContext';
import {
    type GameConfig,
    Character,
    BotDifficulty,
    BASE_CHARACTERS,
    REFORMATION_CHARACTERS,
    PROMO_CHARACTERS,
    MIN_PLAYERS,
    MAX_PLAYERS,
    DEFAULT_CONFIG,
} from '../game/types';

const CHARACTER_LABELS: Record<Character, { name: string; set: string; emoji: string }> = {
    [Character.Duke]: { name: 'Duque', set: 'Base', emoji: '👑' },
    [Character.Assassin]: { name: 'Assassino', set: 'Base', emoji: '🗡️' },
    [Character.Captain]: { name: 'Capitão', set: 'Base', emoji: '⚓' },
    [Character.Ambassador]: { name: 'Embaixador', set: 'Base', emoji: '📜' },
    [Character.Contessa]: { name: 'Condessa', set: 'Base', emoji: '👸' },
    [Character.Inquisitor]: { name: 'Inquisidor', set: 'Reformation', emoji: '🔍' },
    [Character.Jester]: { name: 'Bufão', set: 'Promo', emoji: '🃏' },
    [Character.Bureaucrat]: { name: 'Burocrata', set: 'Promo', emoji: '📋' },
    [Character.Speculator]: { name: 'Especulador', set: 'Promo', emoji: '💰' },
    [Character.Socialist]: { name: 'Socialista', set: 'Promo', emoji: '✊' },
};

const DIFFICULTY_LABELS: Record<BotDifficulty, { name: string; desc: string }> = {
    [BotDifficulty.Easy]: { name: 'Fácil', desc: 'Bots nunca blefam' },
    [BotDifficulty.Medium]: { name: 'Médio', desc: 'Bots usam estratégias básicas' },
    [BotDifficulty.Hard]: { name: 'Difícil', desc: 'Bots blefam e contam cartas' },
};

export default function GameSetup() {
    const navigate = useNavigate();
    const { startGame } = useGame();

    const [playerName, setPlayerName] = useState('Jogador');
    const [playerCount, setPlayerCount] = useState(4);
    const [difficulty, setDifficulty] = useState<BotDifficulty>(BotDifficulty.Medium);
    const [enabledChars, setEnabledChars] = useState<Character[]>([...BASE_CHARACTERS]);
    const [enableFactions, setEnableFactions] = useState(false);

    const toggleCharacter = (char: Character) => {
        const info = CHARACTER_LABELS[char];
        if (info.set === 'Base') return; // Can't disable base characters

        setEnabledChars((prev) =>
            prev.includes(char)
                ? prev.filter((c) => c !== char)
                : [...prev, char]
        );
    };

    const handleStart = () => {
        if (enabledChars.length < 5) {
            alert('Mínimo de 5 tipos de personagens!');
            return;
        }

        const config: GameConfig = {
            playerCount,
            humanPlayerName: playerName || 'Jogador',
            enabledCharacters: enabledChars,
            enableFactions,
            botDifficulty: difficulty,
            cardsPerCharacter: 3,
        };

        startGame(config);
        navigate('/game');
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex flex-col items-center py-8 px-4">
            {/* Header */}
            <button
                onClick={() => navigate('/')}
                className="self-start text-amber-400/60 hover:text-amber-400 transition-colors mb-8 flex items-center gap-2"
            >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                    <path d="M15 18l-6-6 6-6" />
                </svg>
                Voltar
            </button>

            <h1 className="text-3xl font-bold text-amber-300 mb-8">Configurar Partida</h1>

            <div className="w-full max-w-lg space-y-8">
                {/* Player Name */}
                <div>
                    <label className="block text-amber-200/70 text-sm font-medium mb-2">Seu Nome</label>
                    <input
                        type="text"
                        value={playerName}
                        onChange={(e) => setPlayerName(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-amber-500/20 text-amber-100 placeholder-amber-200/30 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 transition-all"
                        placeholder="Digite seu nome..."
                    />
                </div>

                {/* Player Count */}
                <div>
                    <label className="block text-amber-200/70 text-sm font-medium mb-3">
                        Jogadores: <span className="text-amber-400 font-bold text-lg">{playerCount}</span>
                    </label>
                    <input
                        type="range"
                        min={MIN_PLAYERS}
                        max={MAX_PLAYERS}
                        value={playerCount}
                        onChange={(e) => setPlayerCount(Number(e.target.value))}
                        className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-gray-700 accent-amber-500"
                    />
                    <div className="flex justify-between text-xs text-amber-200/40 mt-1">
                        {Array.from({ length: MAX_PLAYERS - MIN_PLAYERS + 1 }).map((_, i) => (
                            <span key={i}>{MIN_PLAYERS + i}</span>
                        ))}
                    </div>
                </div>

                {/* Difficulty */}
                <div>
                    <label className="block text-amber-200/70 text-sm font-medium mb-3">Dificuldade dos Bots</label>
                    <div className="grid grid-cols-3 gap-3">
                        {Object.entries(DIFFICULTY_LABELS).map(([key, val]) => (
                            <button
                                key={key}
                                onClick={() => setDifficulty(key as BotDifficulty)}
                                className={`py-3 px-4 rounded-xl text-sm font-semibold transition-all border ${difficulty === key
                                        ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                                        : 'bg-gray-800/30 border-gray-700/50 text-gray-400 hover:border-gray-600'
                                    }`}
                            >
                                {val.name}
                                <p className="text-[10px] font-normal mt-1 opacity-60">{val.desc}</p>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Characters */}
                <div>
                    <label className="block text-amber-200/70 text-sm font-medium mb-3">Personagens Ativos</label>

                    {/* Base */}
                    <p className="text-xs text-amber-200/40 mb-2 uppercase tracking-wider">Base (obrigatório)</p>
                    <div className="grid grid-cols-5 gap-2 mb-4">
                        {BASE_CHARACTERS.map((char) => (
                            <div
                                key={char}
                                className="py-2 px-2 rounded-lg border border-amber-500/30 bg-amber-500/10 text-center"
                            >
                                <div className="text-xl mb-1">{CHARACTER_LABELS[char].emoji}</div>
                                <div className="text-[10px] text-amber-300 font-medium">{CHARACTER_LABELS[char].name}</div>
                            </div>
                        ))}
                    </div>

                    {/* Extensions */}
                    <p className="text-xs text-amber-200/40 mb-2 uppercase tracking-wider">Extensões (clique para ativar)</p>
                    <div className="grid grid-cols-5 gap-2">
                        {[...REFORMATION_CHARACTERS, ...PROMO_CHARACTERS].map((char) => (
                            <button
                                key={char}
                                onClick={() => toggleCharacter(char)}
                                className={`py-2 px-2 rounded-lg border transition-all text-center ${enabledChars.includes(char)
                                        ? 'border-emerald-500/50 bg-emerald-500/10'
                                        : 'border-gray-700/50 bg-gray-800/30 opacity-50'
                                    }`}
                            >
                                <div className="text-xl mb-1">{CHARACTER_LABELS[char].emoji}</div>
                                <div className={`text-[10px] font-medium ${enabledChars.includes(char) ? 'text-emerald-300' : 'text-gray-500'}`}>
                                    {CHARACTER_LABELS[char].name}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Factions Toggle */}
                <div className="flex items-center justify-between p-4 rounded-xl border border-gray-700/50 bg-gray-800/30">
                    <div>
                        <p className="text-amber-200 font-medium text-sm">Facções (Reformation)</p>
                        <p className="text-[11px] text-amber-200/40 mt-0.5">Lealistas vs Reformistas</p>
                    </div>
                    <button
                        onClick={() => setEnableFactions(!enableFactions)}
                        className={`w-12 h-6 rounded-full transition-all duration-300 relative ${enableFactions ? 'bg-amber-500' : 'bg-gray-700'
                            }`}
                    >
                        <div
                            className={`w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-300 absolute top-0.5 ${enableFactions ? 'translate-x-6' : 'translate-x-0.5'
                                }`}
                        />
                    </button>
                </div>

                {/* Start Button */}
                <button
                    onClick={handleStart}
                    className="w-full py-4 px-8 rounded-xl font-bold text-lg bg-gradient-to-r from-amber-500 to-amber-600 text-gray-900 hover:from-amber-400 hover:to-amber-500 hover:shadow-lg hover:shadow-amber-500/25 transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0"
                >
                    🎮 Iniciar Partida
                </button>
            </div>
        </div>
    );
}
