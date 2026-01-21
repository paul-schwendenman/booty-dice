import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { playerStore } from '$lib/stores/playerStore.js';

describe('playerStore', () => {
	beforeEach(() => {
		playerStore.reset();
	});

	describe('initial state', () => {
		it('should have empty initial state', () => {
			const state = get(playerStore);
			expect(state.id).toBe('');
			expect(state.name).toBe('');
			expect(state.roomCode).toBe('');
		});
	});

	describe('setPlayer', () => {
		it('should set all player properties', () => {
			playerStore.setPlayer('player-123', 'Captain Jack', 'ROOM01');

			const state = get(playerStore);
			expect(state.id).toBe('player-123');
			expect(state.name).toBe('Captain Jack');
			expect(state.roomCode).toBe('ROOM01');
		});
	});

	describe('setId', () => {
		it('should update only the id', () => {
			playerStore.setPlayer('old-id', 'Player Name', 'ROOM01');
			playerStore.setId('new-id');

			const state = get(playerStore);
			expect(state.id).toBe('new-id');
			expect(state.name).toBe('Player Name');
			expect(state.roomCode).toBe('ROOM01');
		});
	});

	describe('setName', () => {
		it('should update only the name', () => {
			playerStore.setPlayer('player-id', 'Old Name', 'ROOM01');
			playerStore.setName('New Name');

			const state = get(playerStore);
			expect(state.id).toBe('player-id');
			expect(state.name).toBe('New Name');
			expect(state.roomCode).toBe('ROOM01');
		});
	});

	describe('setRoomCode', () => {
		it('should update only the room code', () => {
			playerStore.setPlayer('player-id', 'Player Name', 'OLD01');
			playerStore.setRoomCode('NEW01');

			const state = get(playerStore);
			expect(state.id).toBe('player-id');
			expect(state.name).toBe('Player Name');
			expect(state.roomCode).toBe('NEW01');
		});
	});

	describe('set', () => {
		it('should allow direct state setting', () => {
			playerStore.set({ id: 'direct-id', name: 'Direct Name', roomCode: 'DIRECT' });

			const state = get(playerStore);
			expect(state.id).toBe('direct-id');
			expect(state.name).toBe('Direct Name');
			expect(state.roomCode).toBe('DIRECT');
		});
	});

	describe('reset', () => {
		it('should reset to empty state', () => {
			playerStore.setPlayer('some-id', 'Some Name', 'SOME01');
			playerStore.reset();

			const state = get(playerStore);
			expect(state.id).toBe('');
			expect(state.name).toBe('');
			expect(state.roomCode).toBe('');
		});
	});
});
