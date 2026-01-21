import type { Die, ComboType } from './dice.js';
import type { Player } from './player.js';
import type { GameState, LogEntry, ResolvedEffect } from './game.js';

export interface ClientToServerEvents {
	'lobby:create': (playerName: string, callback: (roomCode: string) => void) => void;
	'lobby:join': (
		roomCode: string,
		playerName: string,
		callback: (success: boolean, error?: string) => void
	) => void;
	'lobby:ready': (isReady: boolean) => void;
	'lobby:addAI': () => void;
	'lobby:removeAI': (aiId: string) => void;
	'lobby:startGame': () => void;
	'lobby:resetGame': () => void;

	'game:lockDice': (diceIndices: number[]) => void;
	'game:roll': () => void;
	'game:finishRolling': () => void;
	'game:selectTarget': (dieIndex: number, targetPlayerId: string) => void;
	'game:endTurn': () => void;

	'player:reconnect': (roomCode: string, playerId: string) => void;
}

export interface ServerToClientEvents {
	'lobby:state': (players: Player[], canStart: boolean) => void;
	'lobby:playerJoined': (player: Player) => void;
	'lobby:playerLeft': (playerId: string) => void;
	'lobby:gameStarting': () => void;

	'game:state': (state: GameState) => void;
	'game:diceRolled': (dice: Die[], combo: ComboType) => void;
	'game:actionResolved': (effect: ResolvedEffect) => void;
	'game:turnChanged': (currentPlayerIndex: number) => void;
	'game:playerEliminated': (playerId: string, eliminatorId: string) => void;
	'game:ended': (winnerId: string, reason: 'doubloons' | 'last_standing') => void;
	'game:log': (entry: LogEntry) => void;

	error: (message: string) => void;
}

export interface InterServerEvents {
	ping: () => void;
}

export interface SocketData {
	playerId: string;
	playerName: string;
	roomCode: string;
}
