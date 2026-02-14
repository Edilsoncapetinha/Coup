import { useNavigate } from 'react-router-dom';
import { Character } from '../game/types';

const CHAR_DATA: { char: Character; name: string; emoji: string; action: string; blocks: string }[] = [
    { char: Character.Duke, name: 'Duque', emoji: '👑', action: 'Taxar: +3 moedas', blocks: 'Ajuda Externa' },
    { char: Character.Assassin, name: 'Assassino', emoji: '🗡️', action: 'Assassinar: paga 3, alvo perde influência', blocks: '—' },
    { char: Character.Captain, name: 'Capitão', emoji: '⚓', action: 'Roubar: pega 2 moedas de outro', blocks: 'Roubo' },
    { char: Character.Ambassador, name: 'Embaixador', emoji: '📜', action: 'Trocar: compra 2 do baralho, troca', blocks: 'Roubo' },
    { char: Character.Contessa, name: 'Condessa', emoji: '👸', action: 'Sem ação especial', blocks: 'Assassinato' },
    { char: Character.Inquisitor, name: 'Inquisidor', emoji: '🔍', action: 'Examinar: espiona carta do alvo', blocks: 'Roubo' },
    { char: Character.Jester, name: 'Bufão', emoji: '🃏', action: 'Troca do Bufão: pega 1 do deck + 1 do alvo', blocks: '—' },
    { char: Character.Bureaucrat, name: 'Burocrata', emoji: '📋', action: 'Taxa: +3, mas dá 1 a outro', blocks: 'Ajuda Externa' },
    { char: Character.Speculator, name: 'Especulador', emoji: '💰', action: 'Especular: +3 moedas', blocks: 'Ajuda Externa' },
    { char: Character.Socialist, name: 'Socialista', emoji: '✊', action: 'Redistribuir: coleta 1 de cada', blocks: 'Roubo' },
];

export default function RulesPage() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 py-8 px-4">
            <div className="max-w-2xl mx-auto">
                <button
                    onClick={() => navigate('/')}
                    className="text-amber-400/60 hover:text-amber-400 transition-colors mb-6 flex items-center gap-2"
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                        <path d="M15 18l-6-6 6-6" />
                    </svg>
                    Voltar
                </button>

                <h1 className="text-3xl font-bold text-amber-300 mb-6">📜 Como Jogar Coup</h1>

                {/* Objective */}
                <section className="mb-8">
                    <h2 className="text-lg font-bold text-amber-200 mb-2">Objetivo</h2>
                    <p className="text-amber-100/60 text-sm leading-relaxed">
                        Ser o último jogador com cartas de influência. Cada jogador começa com 2 cartas (secretas)
                        e 2 moedas. Use blefes, desafios e estratégia para eliminar os outros.
                    </p>
                </section>

                {/* General Actions */}
                <section className="mb-8">
                    <h2 className="text-lg font-bold text-amber-200 mb-3">Ações Gerais</h2>
                    <div className="space-y-2">
                        <RuleCard title="Renda" desc="Pega 1 moeda. Sem bloqueio, sem desafio." />
                        <RuleCard title="Ajuda Externa" desc="Pega 2 moedas. Pode ser bloqueada pelo Duque." />
                        <RuleCard title="Golpe de Estado" desc="Paga 7 moedas. Alvo perde 1 influência. Obrigatório com 10+ moedas." />
                    </div>
                </section>

                {/* Characters */}
                <section className="mb-8">
                    <h2 className="text-lg font-bold text-amber-200 mb-3">Personagens</h2>
                    <div className="space-y-2">
                        {CHAR_DATA.map((c) => (
                            <div
                                key={c.char}
                                className="flex items-start gap-3 p-3 rounded-xl border border-gray-700/50 bg-gray-800/30"
                            >
                                <span className="text-2xl flex-shrink-0">{c.emoji}</span>
                                <div className="flex-1">
                                    <p className="text-amber-300 font-bold text-sm">{c.name}</p>
                                    <p className="text-amber-100/50 text-xs mt-0.5">{c.action}</p>
                                    <p className="text-purple-400/60 text-xs mt-0.5">🛡️ Bloqueia: {c.blocks}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Challenges */}
                <section className="mb-8">
                    <h2 className="text-lg font-bold text-amber-200 mb-2">Desafios</h2>
                    <p className="text-amber-100/60 text-sm leading-relaxed">
                        Quando alguém declara uma ação de personagem, qualquer jogador pode desafiar.
                        Se o jogador não tiver a carta, perde influência. Se tiver, o desafiador perde influência
                        e o jogador recebe uma nova carta.
                    </p>
                </section>

                {/* Blocks */}
                <section className="mb-8">
                    <h2 className="text-lg font-bold text-amber-200 mb-2">Bloqueios</h2>
                    <p className="text-amber-100/60 text-sm leading-relaxed">
                        Algumas ações podem ser bloqueadas. O bloqueio também pode ser desafiado!
                        Se o bloqueio não for desafiado, a ação é cancelada.
                    </p>
                </section>

                {/* Bluffing */}
                <section className="mb-8 p-4 rounded-xl border border-amber-500/20 bg-amber-500/5">
                    <h2 className="text-lg font-bold text-amber-400 mb-2">💡 Blefe</h2>
                    <p className="text-amber-200/60 text-sm leading-relaxed">
                        Você pode declarar qualquer ação, mesmo sem ter a carta correspondente.
                        Se ninguém desafiar, a ação é resolvida normalmente. Arrisque-se!
                    </p>
                </section>
            </div>
        </div>
    );
}

function RuleCard({ title, desc }: { title: string; desc: string }) {
    return (
        <div className="p-3 rounded-xl border border-gray-700/50 bg-gray-800/30">
            <p className="text-amber-300 font-bold text-sm">{title}</p>
            <p className="text-amber-100/50 text-xs mt-0.5">{desc}</p>
        </div>
    );
}
