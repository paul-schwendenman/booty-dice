import type { Player } from '$lib/types/index.js';

let playerIdCounter = 0;

export function createTestPlayer(overrides: Partial<Player> = {}): Player {
	return {
		id: `player-${++playerIdCounter}`,
		name: `Test Player ${playerIdCounter}`,
		doubloons: 5,
		lives: 10,
		shields: 0,
		isAI: false,
		isReady: true,
		isConnected: true,
		isEliminated: false,
		...overrides
	};
}

export function createTestPlayers(count: number, overrides: Partial<Player>[] = []): Player[] {
	return Array.from({ length: count }, (_, i) => createTestPlayer(overrides[i] ?? {}));
}

export function resetPlayerIdCounter(): void {
	playerIdCounter = 0;
}
