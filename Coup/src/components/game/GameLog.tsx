import { type LogEntry } from '../../game/types';
import { useRef, useEffect } from 'react';

const LOG_COLORS: Record<LogEntry['type'], string> = {
    action: 'text-blue-300',
    challenge: 'text-orange-400',
    block: 'text-purple-400',
    elimination: 'text-red-400',
    system: 'text-amber-400',
    exchange: 'text-emerald-400',
};

const LOG_ICONS: Record<LogEntry['type'], string> = {
    action: '⚔️',
    challenge: '❗',
    block: '🛡️',
    elimination: '💀',
    system: '📢',
    exchange: '🔄',
};

interface GameLogProps {
    entries: LogEntry[];
}

export default function GameLog({ entries }: GameLogProps) {
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [entries.length]);

    return (
        <div className="bg-gray-900/60 border border-gray-700/50 rounded-xl overflow-hidden">
            <div className="px-3 py-2 border-b border-gray-700/50">
                <h3 className="text-xs font-bold text-amber-300/70 uppercase tracking-wider">
                    📜 Log da Partida
                </h3>
            </div>
            <div ref={scrollRef} className="max-h-40 overflow-y-auto p-3 space-y-1.5 scroll-smooth">
                {entries.map((entry) => (
                    <div key={entry.id} className="flex items-start gap-2">
                        <span className="text-xs flex-shrink-0">{LOG_ICONS[entry.type]}</span>
                        <p className={`text-xs leading-relaxed ${LOG_COLORS[entry.type]}`}>
                            {entry.message}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
}
