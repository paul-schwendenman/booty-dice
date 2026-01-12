import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { lobbyStore, myLobbyPlayer } from '$lib/stores/lobbyStore.js';
import { playerStore } from '$lib/stores/playerStore.js';
import { createTestPlayer, resetPlayerIdCounter } from '../../factories/player.js';

describe('lobbyStore', () => {
	beforeEach(() => {
		lobbyStore.reset();
		resetPlayerIdCounter();
	});

	describe('initial state', () => {
		it('should have empty initial state', () => {
			const state = get(lobbyStore);
			expect(state.roomCode).toBe('');
			expect(state.players).toEqual([]);
			expect(state.canStart).toBe(false);
			expect(state.isHost).toBe(false);
		});
	});

	describe('setRoom', () => {
		it('should set room code and host status', () => {
			lobbyStore.setRoom('ABC123', true);

			const state = get(lobbyStore);
			expect(state.roomCode).toBe('ABC123');
			expect(state.isHost).toBe(true);
		});

		it('should preserve players when setting room', () => {
			const player = createTestPlayer();
			lobbyStore.updatePlayers([player], false);
			lobbyStore.setRoom('XYZ789', false);

			const state = get(lobbyStore);
			expect(state.players).toHaveLength(1);
			expect(state.roomCode).toBe('XYZ789');
		});
	});

	describe('updatePlayers', () => {
		it('should update players and canStart', () => {
			const players = [createTestPlayer(), createTestPlayer()];
			lobbyStore.updatePlayers(players, true);

			const state = get(lobbyStore);
			expect(state.players).toHaveLength(2);
			expect(state.canStart).toBe(true);
		});
	});

	describe('addPlayer', () => {
		it('should add player to list', () => {
			const player = createTestPlayer();
			lobbyStore.addPlayer(player);

			const state = get(lobbyStore);
			expect(state.players).toHaveLength(1);
			expect(state.players[0].id).toBe(player.id);
		});

		it('should append to existing players', () => {
			lobbyStore.addPlayer(createTestPlayer());
			lobbyStore.addPlayer(createTestPlayer());

			const state = get(lobbyStore);
			expect(state.players).toHaveLength(2);
		});
	});

	describe('removePlayer', () => {
		it('should remove player by id', () => {
			const player1 = createTestPlayer();
			const player2 = createTestPlayer();
			lobbyStore.updatePlayers([player1, player2], false);

			lobbyStore.removePlayer(player1.id);

			const state = get(lobbyStore);
			expect(state.players).toHaveLength(1);
			expect(state.players[0].id).toBe(player2.id);
		});

		it('should not fail if player not found', () => {
			const player = createTestPlayer();
			lobbyStore.addPlayer(player);

			lobbyStore.removePlayer('nonexistent-id');

			const state = get(lobbyStore);
			expect(state.players).toHaveLength(1);
		});
	});

	describe('reset', () => {
		it('should reset to initial state', () => {
			lobbyStore.setRoom('ABC123', true);
			lobbyStore.updatePlayers([createTestPlayer()], true);

			lobbyStore.reset();

			const state = get(lobbyStore);
			expect(state.roomCode).toBe('');
			expect(state.players).toEqual([]);
			expect(state.canStart).toBe(false);
			expect(state.isHost).toBe(false);
		});
	});
});

describe('myLobbyPlayer derived store', () => {
	beforeEach(() => {
		lobbyStore.reset();
		playerStore.reset();
		resetPlayerIdCounter();
	});

	it('should return null when no players', () => {
		expect(get(myLobbyPlayer)).toBeNull();
	});

	it('should return null when my id not in lobby', () => {
		const player = createTestPlayer();
		lobbyStore.addPlayer(player);
		playerStore.setPlayer('different-id', 'Me', 'TEST01');

		expect(get(myLobbyPlayer)).toBeNull();
	});

	it('should return my player when in lobby', () => {
		const player = createTestPlayer({ name: 'Me' });
		lobbyStore.addPlayer(player);
		playerStore.setPlayer(player.id, 'Me', 'TEST01');

		const me = get(myLobbyPlayer);
		expect(me).not.toBeNull();
		expect(me?.id).toBe(player.id);
		expect(me?.name).toBe('Me');
	});
});
