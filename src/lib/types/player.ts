export interface Player {
	id: string;
	name: string;
	doubloons: number;
	lives: number;
	shields: number;
	isAI: boolean;
	isReady: boolean;
	isConnected: boolean;
	isEliminated: boolean;
}

export interface PlayerAction {
	type: 'attack' | 'steal';
	targetPlayerId: string;
}

export function createPlayer(
	id: string,
	name: string,
	isAI: boolean = false
): Player {
	return {
		id,
		name,
		doubloons: 5,
		lives: 10,
		shields: 0,
		isAI,
		isReady: isAI,
		isConnected: true,
		isEliminated: false
	};
}
