import { describe, it, expect, beforeEach } from 'vitest';
import { RoomManager } from '$lib/server/rooms/RoomManager.js';

describe('RoomManager', () => {
	let roomManager: RoomManager;

	beforeEach(() => {
		roomManager = new RoomManager();
	});

	describe('createRoom', () => {
		it('should create a room and return a room code', () => {
			const roomCode = roomManager.createRoom('socket-1', 'Captain Jack');

			expect(roomCode).toBeDefined();
			expect(roomCode).toHaveLength(5);
		});

		it('should add the host to the room', () => {
			const roomCode = roomManager.createRoom('socket-1', 'Captain Jack');
			const players = roomManager.getPlayersInRoom(roomCode);

			expect(players).toHaveLength(1);
			expect(players[0].name).toBe('Captain Jack');
			expect(players[0].id).toBe('socket-1');
		});
	});

	describe('joinRoom', () => {
		it('should allow a player to join an existing room', () => {
			const roomCode = roomManager.createRoom('socket-1', 'Captain Jack');
			const result = roomManager.joinRoom(roomCode, 'socket-2', 'Blackbeard');

			expect(result.success).toBe(true);
			expect(roomManager.getPlayersInRoom(roomCode)).toHaveLength(2);
		});

		it('should return error for non-existent room', () => {
			const result = roomManager.joinRoom('NOTREAL', 'socket-2', 'Blackbeard');

			expect(result.success).toBe(false);
			expect(result.error).toBe('Room not found');
		});

		it('should return error when room is full', () => {
			const roomCode = roomManager.createRoom('socket-1', 'Player 1');
			roomManager.joinRoom(roomCode, 'socket-2', 'Player 2');
			roomManager.joinRoom(roomCode, 'socket-3', 'Player 3');
			roomManager.joinRoom(roomCode, 'socket-4', 'Player 4');
			roomManager.joinRoom(roomCode, 'socket-5', 'Player 5');
			roomManager.joinRoom(roomCode, 'socket-6', 'Player 6');

			const result = roomManager.joinRoom(roomCode, 'socket-7', 'Player 7');

			expect(result.success).toBe(false);
			expect(result.error).toBe('Room is full');
		});
	});

	describe('addAIPlayer', () => {
		it('should add an AI player to the room', () => {
			const roomCode = roomManager.createRoom('socket-1', 'Captain Jack');
			const ai = roomManager.addAIPlayer(roomCode);

			expect(ai).not.toBeNull();
			expect(ai?.isAI).toBe(true);
			expect(ai?.isReady).toBe(true);
			expect(roomManager.getPlayersInRoom(roomCode)).toHaveLength(2);
		});
	});

	describe('startGame', () => {
		it('should start a game when all players are ready', () => {
			const roomCode = roomManager.createRoom('socket-1', 'Captain Jack');
			roomManager.setPlayerReady('socket-1', true);
			roomManager.addAIPlayer(roomCode);

			const gameState = roomManager.startGame(roomCode);

			expect(gameState).not.toBeNull();
			expect(gameState?.phase).toBe('playing');
		});

		it('should return null when not enough players', () => {
			const roomCode = roomManager.createRoom('socket-1', 'Captain Jack');
			roomManager.setPlayerReady('socket-1', true);

			const gameState = roomManager.startGame(roomCode);

			expect(gameState).toBeNull();
		});
	});

	describe('resetGameRoom', () => {
		it('should return false for non-existent room', () => {
			const result = roomManager.resetGameRoom('NOTREAL');

			expect(result).toBe(false);
		});

		it('should clear the game engine', () => {
			const roomCode = roomManager.createRoom('socket-1', 'Captain Jack');
			roomManager.setPlayerReady('socket-1', true);
			roomManager.addAIPlayer(roomCode);
			roomManager.startGame(roomCode);

			const room = roomManager.getRoom(roomCode);
			expect(room?.gameEngine).not.toBeNull();

			roomManager.resetGameRoom(roomCode);

			expect(room?.gameEngine).toBeNull();
		});

		it('should reset player doubloons to 5', () => {
			const roomCode = roomManager.createRoom('socket-1', 'Captain Jack');
			roomManager.setPlayerReady('socket-1', true);
			roomManager.addAIPlayer(roomCode);
			roomManager.startGame(roomCode);

			// Simulate game changing player state
			const players = roomManager.getPlayersInRoom(roomCode);
			players[0].doubloons = 25;
			players[1].doubloons = 0;

			roomManager.resetGameRoom(roomCode);

			const resetPlayers = roomManager.getPlayersInRoom(roomCode);
			expect(resetPlayers[0].doubloons).toBe(5);
			expect(resetPlayers[1].doubloons).toBe(5);
		});

		it('should reset player lives to 10', () => {
			const roomCode = roomManager.createRoom('socket-1', 'Captain Jack');
			roomManager.setPlayerReady('socket-1', true);
			roomManager.addAIPlayer(roomCode);
			roomManager.startGame(roomCode);

			// Simulate game changing player state
			const players = roomManager.getPlayersInRoom(roomCode);
			players[0].lives = 0;
			players[1].lives = 3;

			roomManager.resetGameRoom(roomCode);

			const resetPlayers = roomManager.getPlayersInRoom(roomCode);
			expect(resetPlayers[0].lives).toBe(10);
			expect(resetPlayers[1].lives).toBe(10);
		});

		it('should reset player shields to 0', () => {
			const roomCode = roomManager.createRoom('socket-1', 'Captain Jack');
			roomManager.setPlayerReady('socket-1', true);
			roomManager.addAIPlayer(roomCode);
			roomManager.startGame(roomCode);

			// Simulate game changing player state
			const players = roomManager.getPlayersInRoom(roomCode);
			players[0].shields = 5;
			players[1].shields = 3;

			roomManager.resetGameRoom(roomCode);

			const resetPlayers = roomManager.getPlayersInRoom(roomCode);
			expect(resetPlayers[0].shields).toBe(0);
			expect(resetPlayers[1].shields).toBe(0);
		});

		it('should reset isEliminated to false', () => {
			const roomCode = roomManager.createRoom('socket-1', 'Captain Jack');
			roomManager.setPlayerReady('socket-1', true);
			roomManager.addAIPlayer(roomCode);
			roomManager.startGame(roomCode);

			// Simulate elimination
			const players = roomManager.getPlayersInRoom(roomCode);
			players[0].isEliminated = true;

			roomManager.resetGameRoom(roomCode);

			const resetPlayers = roomManager.getPlayersInRoom(roomCode);
			expect(resetPlayers[0].isEliminated).toBe(false);
			expect(resetPlayers[1].isEliminated).toBe(false);
		});

		it('should set isReady to false for human players', () => {
			const roomCode = roomManager.createRoom('socket-1', 'Captain Jack');
			roomManager.joinRoom(roomCode, 'socket-2', 'Blackbeard');
			roomManager.setPlayerReady('socket-1', true);
			roomManager.setPlayerReady('socket-2', true);
			roomManager.startGame(roomCode);

			roomManager.resetGameRoom(roomCode);

			const resetPlayers = roomManager.getPlayersInRoom(roomCode);
			const humanPlayers = resetPlayers.filter((p) => !p.isAI);
			expect(humanPlayers.every((p) => p.isReady === false)).toBe(true);
		});

		it('should keep isReady true for AI players', () => {
			const roomCode = roomManager.createRoom('socket-1', 'Captain Jack');
			roomManager.setPlayerReady('socket-1', true);
			roomManager.addAIPlayer(roomCode);
			roomManager.startGame(roomCode);

			roomManager.resetGameRoom(roomCode);

			const resetPlayers = roomManager.getPlayersInRoom(roomCode);
			const aiPlayers = resetPlayers.filter((p) => p.isAI);
			expect(aiPlayers.every((p) => p.isReady === true)).toBe(true);
		});

		it('should handle case-insensitive room codes', () => {
			const roomCode = roomManager.createRoom('socket-1', 'Captain Jack');
			roomManager.setPlayerReady('socket-1', true);
			roomManager.addAIPlayer(roomCode);
			roomManager.startGame(roomCode);

			const result = roomManager.resetGameRoom(roomCode.toLowerCase());

			expect(result).toBe(true);
		});

		it('should return true on successful reset', () => {
			const roomCode = roomManager.createRoom('socket-1', 'Captain Jack');
			roomManager.setPlayerReady('socket-1', true);
			roomManager.addAIPlayer(roomCode);
			roomManager.startGame(roomCode);

			const result = roomManager.resetGameRoom(roomCode);

			expect(result).toBe(true);
		});
	});

	describe('canStartGame', () => {
		it('should return false with only one player', () => {
			const roomCode = roomManager.createRoom('socket-1', 'Captain Jack');
			roomManager.setPlayerReady('socket-1', true);

			expect(roomManager.canStartGame(roomCode)).toBe(false);
		});

		it('should return true when all players are ready', () => {
			const roomCode = roomManager.createRoom('socket-1', 'Captain Jack');
			roomManager.setPlayerReady('socket-1', true);
			roomManager.addAIPlayer(roomCode);

			expect(roomManager.canStartGame(roomCode)).toBe(true);
		});

		it('should return false when human player not ready', () => {
			const roomCode = roomManager.createRoom('socket-1', 'Captain Jack');
			roomManager.addAIPlayer(roomCode);

			expect(roomManager.canStartGame(roomCode)).toBe(false);
		});
	});
});
