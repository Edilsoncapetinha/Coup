import { useNavigate } from 'react-router-dom';

export default function MainMenu() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex flex-col items-center justify-center relative overflow-hidden">
            {/* Background particles */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {Array.from({ length: 20 }).map((_, i) => (
                    <div
                        key={i}
                        className="absolute rounded-full opacity-10 animate-pulse"
                        style={{
                            width: `${Math.random() * 4 + 2}px`,
                            height: `${Math.random() * 4 + 2}px`,
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                            backgroundColor: '#d4af37',
                            animationDelay: `${Math.random() * 3}s`,
                            animationDuration: `${2 + Math.random() * 4}s`,
                        }}
                    />
                ))}
            </div>

            {/* Radial glow */}
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-500/5 rounded-full blur-3xl" />

            {/* Logo + Title */}
            <div className="relative z-10 text-center mb-16 animate-fade-in">
                {/* Crown icon */}
                <div className="mb-6 flex justify-center">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20 rotate-3 hover:rotate-0 transition-transform duration-500">
                        <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            className="w-10 h-10 text-gray-900"
                        >
                            <path d="M2 17l3-12 5 7 2-8 2 8 5-7 3 12H2z" />
                            <path d="M2 17h20v2a2 2 0 01-2 2H4a2 2 0 01-2-2v-2z" />
                        </svg>
                    </div>
                </div>

                <h1 className="text-7xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 mb-3 drop-shadow-lg">
                    COUP
                </h1>
                <p className="text-lg text-amber-200/50 tracking-[0.4em] uppercase font-light">
                    Blefe · Traição · Poder
                </p>
            </div>

            {/* Buttons */}
            <div className="relative z-10 flex flex-col gap-4 w-80">
                <button
                    onClick={() => navigate('/setup')}
                    className="group relative w-full py-4 px-8 rounded-xl font-bold text-lg transition-all duration-300 bg-gradient-to-r from-amber-500 to-amber-600 text-gray-900 hover:from-amber-400 hover:to-amber-500 hover:shadow-lg hover:shadow-amber-500/25 hover:-translate-y-0.5 active:translate-y-0"
                >
                    <span className="relative z-10">Nova Partida</span>
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-amber-300 to-amber-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm -z-10" />
                </button>

                <button
                    onClick={() => navigate('/rules')}
                    className="w-full py-3.5 px-8 rounded-xl font-semibold text-base transition-all duration-300 border border-amber-500/20 text-amber-300/80 hover:text-amber-200 hover:border-amber-500/40 hover:bg-amber-500/5 hover:-translate-y-0.5 active:translate-y-0 backdrop-blur-sm"
                >
                    Como Jogar
                </button>
            </div>

            {/* Footer info */}
            <p className="absolute bottom-6 text-amber-200/20 text-xs tracking-wider">
                2–6 Jogadores · Offline · Todas as Extensões
            </p>

            <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.8s ease-out forwards;
        }
      `}</style>
        </div>
    );
}
