import { useState } from 'react';
import { ActionType, Character, type GameState } from '../../game/types';
import { CHARACTER_DEFINITIONS, GENERAL_ACTIONS } from '../../game/characters';
import { getAlivePlayers } from '../../game/gameEngine';
import { CHAR_EMOJI, CHAR_NAME, CHAR_IMAGE } from './PlayerSlot';

const ACTION_TRANSLATIONS: Record<string, string> = {
    [ActionType.Income]: 'Renda',
    [ActionType.ForeignAid]: 'Ajuda Externa',
    [ActionType.Coup]: 'Golpe de Estado',
    [ActionType.Tax]: 'Taxar',
    [ActionType.Assassinate]: 'Assassinar',
    [ActionType.Steal]: 'Roubar',
    [ActionType.Exchange]: 'Trocar',
    [ActionType.Examine]: 'Inquisidor',
    [ActionType.InquisitorSelfExchange]: 'Trocar (Inq.)',
    [ActionType.BureaucratTax]: 'Taxa Burocrática',
    [ActionType.SpeculatorTax]: 'Especular',
    [ActionType.SocialistRedistribute]: 'Redistribuir',
};

interface ActionPanelProps {
    availableActions: ActionType[];
    gameState: GameState;
    onSelectAction: (action: ActionType, target?: string) => void;
}

export default function ActionPanel({ availableActions, gameState, onSelectAction }: ActionPanelProps) {
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    const targets = getAlivePlayers(gameState).filter((p) => p.id !== currentPlayer.id);

    const generalActions = availableActions.filter((a) =>
        GENERAL_ACTIONS.some((ga) => ga.type === a)
    );

    const characterActions = availableActions.filter(
        (a) => !GENERAL_ACTIONS.some((ga) => ga.type === a)
    );

    const handleAction = (actionType: ActionType) => {
        const charDef = Object.values(CHARACTER_DEFINITIONS).find((d) => d.action === actionType);
        const needsTarget =
            charDef?.requiresTarget ||
            actionType === ActionType.Coup;

        if (needsTarget && targets.length > 0) {
            // For simplicity, show target selection inline
            return; // handled by TargetSelection below
        }

        onSelectAction(actionType);
    };

    return (
        <div className="space-y-3">
            <h3 className="text-amber-300 font-bold text-sm tracking-wider uppercase">
                Sua Vez — Escolha uma Ação
            </h3>

            {/* General Actions */}
            <div className="grid grid-cols-3 gap-2">
                {generalActions.map((action) => {
                    const needsTarget = action === ActionType.Coup;
                    return (
                        <ActionButton
                            key={action}
                            action={action}
                            targets={needsTarget ? targets : undefined}
                            onSelect={onSelectAction}
                        />
                    );
                })}
            </div>

            {/* Character Actions */}
            {characterActions.length > 0 && (
                <>
                    <div className="border-t border-gray-700/50 pt-2">
                        <p className="text-[10px] text-amber-200/40 uppercase tracking-wider mb-2">
                            Ações de Personagem (pode ser blefe!)
                        </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        {characterActions.map((action) => {
                            const charDef = Object.values(CHARACTER_DEFINITIONS).find(
                                (d) => d.action === action
                            );
                            return (
                                <ActionButton
                                    key={action}
                                    action={action}
                                    character={charDef?.character}
                                    targets={charDef?.requiresTarget ? targets : undefined}
                                    onSelect={onSelectAction}
                                />
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
}

interface ActionButtonProps {
    action: ActionType;
    character?: Character;
    targets?: ReturnType<typeof getAlivePlayers>;
    onSelect: (action: ActionType, target?: string) => void;
}

function ActionButton({ action, character, targets, onSelect }: ActionButtonProps) {
    const [showTargets, setShowTargets] = useState(false);

    const label = ACTION_TRANSLATIONS[action] || action;
    const cost = getDisplayCost(action);

    if (showTargets && targets && targets.length > 0) {
        return (
            <div className="col-span-1 space-y-1">
                <p className="text-[10px] text-amber-200/50">Alvo para {label}:</p>
                {targets.map((t) => (
                    <button
                        key={t.id}
                        onClick={() => onSelect(action, t.id)}
                        className="w-full py-1.5 px-3 rounded-lg text-xs font-medium bg-red-500/10 border border-red-500/30 text-red-300 hover:bg-red-500/20 hover:border-red-500/50 transition-all"
                    >
                        🎯 {t.name}
                    </button>
                ))}
                <button
                    onClick={() => setShowTargets(false)}
                    className="w-full py-1 text-[10px] text-gray-500 hover:text-gray-400"
                >
                    Cancelar
                </button>
            </div>
        );
    }

    return (
        <button
            onClick={() => targets ? setShowTargets(true) : onSelect(action)}
            className={`py-3 px-3 rounded-xl border text-left transition-all hover:-translate-y-0.5 active:translate-y-0 ${character
                ? 'border-amber-500/20 bg-amber-500/5 hover:border-amber-500/40 hover:bg-amber-500/10'
                : 'border-gray-600/30 bg-gray-800/30 hover:border-gray-500/40 hover:bg-gray-700/30'
                }`}
        >
            <div className="flex items-center gap-2">
                {character && (
                    CHAR_IMAGE[character] ? (
                        <img
                            src={CHAR_IMAGE[character]}
                            alt={CHAR_NAME[character]}
                            className="w-6 h-6 rounded object-cover"
                            draggable={false}
                        />
                    ) : (
                        <span className="text-base">{CHAR_EMOJI[character]}</span>
                    )
                )}
                <span className="text-sm font-semibold text-amber-200">{label}</span>
            </div>
            {cost > 0 && (
                <p className="text-[10px] text-amber-400/60 mt-1">Custo: {cost} 🪙</p>
            )}
        </button>
    );
}

function getDisplayCost(action: ActionType): number {
    if (action === ActionType.Coup) return 7;
    if (action === ActionType.Assassinate) return 3;
    return 0;
}
