import type { Die } from './dice.js';
import type { Player } from './player.js';

export type GamePhase = 'waiting' | 'playing' | 'ended';

export type TurnPhase = 'rolling' | 'selecting_targets' | 'resolving';

export interface PendingAction {
	dieIndex: number;
	face: 'cutlass' | 'jolly_roger';
	resolved: boolean;
	targetPlayerId?: string;
}

export interface LogEntry {
	timestamp: number;
	playerId: string;
	message: string;
	type: 'roll' | 'action' | 'combo' | 'elimination' | 'win' | 'summary';
}

export interface GameState {
	roomCode: string;
	phase: GamePhase;
	players: Player[];
	currentPlayerIndex: number;
	turnNumber: number;
	rollsRemaining: number;
	dice: Die[];
	turnPhase: TurnPhase;
	pendingActions: PendingAction[];
	gameLog: LogEntry[];
	winnerId: string | null;
}

export interface ResolvedEffect {
	type: 'damage' | 'coins_lost' | 'coins_gained' | 'shield_gained' | 'life_lost' | 'stolen';
	targetId: string;
	sourceId?: string;
	amount: number;
	description: string;
}

export interface TurnResolution {
	effects: ResolvedEffect[];
	eliminations: string[];
	winner: string | null;
}
