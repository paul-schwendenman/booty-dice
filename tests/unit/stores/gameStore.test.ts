import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { gameStore, currentPlayer, alivePlayers } from '$lib/stores/gameStore.js';
import { createTestGameState } from '../../factories/gameState.js';
import { resetPlayerIdCounter } from '../../factories/player.js';

describe('gameStore', () => {
	beforeEach(() => {
		gameStore.reset();
		resetPlayerIdCounter();
	});

	describe('basic operations', () => {
		it('should start with null state', () => {
			expect(get(gameStore)).toBeNull();
		});

		it('should set game state', () => {
			const state = createTestGameState();
			gameStore.set(state);

			expect(get(gameStore)).toEqual(state);
		});

		it('should reset to null', () => {
			const state = createTestGameState();
			gameStore.set(state);
			gameStore.reset();

			expect(get(gameStore)).toBeNull();
		});
	});

	describe('updateDice', () => {
		it('should update dice in state', () => {
			const state = createTestGameState();
			gameStore.set(state);

			const newDice = state.dice.map((d) => ({ ...d, locked: true }));
			gameStore.updateDice(newDice);

			const updated = get(gameStore);
			expect(updated?.dice.every((d) => d.locked)).toBe(true);
		});

		it('should not update if state is null', () => {
			gameStore.updateDice([]);
			expect(get(gameStore)).toBeNull();
		});
	});

	describe('updatePlayer', () => {
		it('should update specific player', () => {
			const state = createTestGameState();
			gameStore.set(state);

			const playerId = state.players[0].id;
			gameStore.updatePlayer(playerId, { doubloons: 100 });

			const updated = get(gameStore);
			expect(updated?.players[0].doubloons).toBe(100);
		});

		it('should not affect other players', () => {
			const state = createTestGameState();
			const originalDoubloons = state.players[1].doubloons;
			gameStore.set(state);

			gameStore.updatePlayer(state.players[0].id, { doubloons: 100 });

			const updated = get(gameStore);
			expect(updated?.players[1].doubloons).toBe(originalDoubloons);
		});

		it('should not update if state is null', () => {
			gameStore.updatePlayer('nonexistent', { doubloons: 100 });
			expect(get(gameStore)).toBeNull();
		});
	});

	describe('addLogEntry', () => {
		it('should append log entry', () => {
			const state = createTestGameState();
			gameStore.set(state);

			const entry = {
				timestamp: Date.now(),
				playerId: 'player-1',
				message: 'Test message',
				type: 'action' as const
			};
			gameStore.addLogEntry(entry);

			const updated = get(gameStore);
			expect(updated?.gameLog).toContainEqual(entry);
		});

		it('should not update if state is null', () => {
			const entry = {
				timestamp: Date.now(),
				playerId: 'player-1',
				message: 'Test message',
				type: 'action' as const
			};
			gameStore.addLogEntry(entry);
			expect(get(gameStore)).toBeNull();
		});
	});
});

describe('derived stores', () => {
	beforeEach(() => {
		gameStore.reset();
		resetPlayerIdCounter();
	});

	describe('currentPlayer', () => {
		it('should return null when game is null', () => {
			expect(get(currentPlayer)).toBeNull();
		});

		it('should return player at currentPlayerIndex', () => {
			const state = createTestGameState({ currentPlayerIndex: 1 });
			gameStore.set(state);

			expect(get(currentPlayer)).toEqual(state.players[1]);
		});

		it('should update when currentPlayerIndex changes', () => {
			const state = createTestGameState({ currentPlayerIndex: 0 });
			gameStore.set(state);

			expect(get(currentPlayer)?.id).toBe(state.players[0].id);

			gameStore.update((s) => (s ? { ...s, currentPlayerIndex: 2 } : s));

			expect(get(currentPlayer)?.id).toBe(state.players[2].id);
		});
	});

	describe('alivePlayers', () => {
		it('should return empty array when game is null', () => {
			expect(get(alivePlayers)).toEqual([]);
		});

		it('should return all players when none eliminated', () => {
			const state = createTestGameState();
			gameStore.set(state);

			expect(get(alivePlayers)).toHaveLength(3);
		});

		it('should filter out eliminated players', () => {
			const state = createTestGameState();
			state.players[1].isEliminated = true;
			gameStore.set(state);

			const alive = get(alivePlayers);
			expect(alive).toHaveLength(2);
			expect(alive.every((p) => !p.isEliminated)).toBe(true);
		});

		it('should update when player gets eliminated', () => {
			const state = createTestGameState();
			gameStore.set(state);

			expect(get(alivePlayers)).toHaveLength(3);

			gameStore.updatePlayer(state.players[0].id, { isEliminated: true });

			expect(get(alivePlayers)).toHaveLength(2);
		});
	});
});
