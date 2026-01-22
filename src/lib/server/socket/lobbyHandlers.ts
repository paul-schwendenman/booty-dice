import type { Server, Socket } from 'socket.io';
import type {
	ClientToServerEvents,
	ServerToClientEvents,
	InterServerEvents,
	SocketData
} from '$lib/types/index.js';
import type { RoomManager } from '../rooms/RoomManager.js';
import { handleAITurn } from './gameHandlers.js';

type AppServer = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
type AppSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

export function setupLobbyHandlers(io: AppServer, socket: AppSocket, roomManager: RoomManager) {
	socket.on('lobby:create', (playerName, callback) => {
		const roomCode = roomManager.createRoom(socket.id, playerName);
		socket.join(roomCode);
		socket.data.roomCode = roomCode;
		socket.data.playerId = socket.id;
		socket.data.playerName = playerName;
		callback(roomCode);

		const players = roomManager.getPlayersInRoom(roomCode);
		io.to(roomCode).emit('lobby:state', players, false);
	});

	socket.on('lobby:join', (roomCode, playerName, callback) => {
		const result = roomManager.joinRoom(roomCode, socket.id, playerName);

		if (!result.success) {
			callback(false, result.error);
			return;
		}

		const normalizedCode = roomCode.toUpperCase();
		socket.join(normalizedCode);
		socket.data.roomCode = normalizedCode;
		socket.data.playerId = socket.id;
		socket.data.playerName = playerName;

		// If this is a reconnection, send game state instead of lobby state
		if (result.isReconnect) {
			callback(true, undefined, true);
			const room = roomManager.getRoom(normalizedCode);
			if (room?.gameEngine) {
				// Send game state to the reconnecting player
				socket.emit('game:state', room.gameEngine.getState());
			} else {
				// Game ended while disconnected, send lobby state
				const players = roomManager.getPlayersInRoom(normalizedCode);
				io.to(normalizedCode).emit(
					'lobby:state',
					players,
					roomManager.canStartGame(normalizedCode)
				);
			}
			return;
		}

		callback(true);

		const players = roomManager.getPlayersInRoom(normalizedCode);
		const player = players.find((p) => p.id === socket.id);
		if (player) {
			io.to(normalizedCode).emit('lobby:playerJoined', player);
		}
		io.to(normalizedCode).emit('lobby:state', players, roomManager.canStartGame(normalizedCode));
	});

	socket.on('lobby:ready', (isReady) => {
		const roomCode = socket.data.roomCode;
		if (!roomCode) return;

		roomManager.setPlayerReady(socket.id, isReady);
		const players = roomManager.getPlayersInRoom(roomCode);
		io.to(roomCode).emit('lobby:state', players, roomManager.canStartGame(roomCode));
	});

	socket.on('lobby:addAI', () => {
		const roomCode = socket.data.roomCode;
		if (!roomCode) return;
		if (!roomManager.isHost(roomCode, socket.id)) return;

		const ai = roomManager.addAIPlayer(roomCode);
		if (ai) {
			io.to(roomCode).emit('lobby:playerJoined', ai);
			const players = roomManager.getPlayersInRoom(roomCode);
			io.to(roomCode).emit('lobby:state', players, roomManager.canStartGame(roomCode));
		}
	});

	socket.on('lobby:removeAI', (aiId) => {
		const roomCode = socket.data.roomCode;
		if (!roomCode) return;
		if (!roomManager.isHost(roomCode, socket.id)) return;

		if (roomManager.removeAIPlayer(roomCode, aiId)) {
			io.to(roomCode).emit('lobby:playerLeft', aiId);
			const players = roomManager.getPlayersInRoom(roomCode);
			io.to(roomCode).emit('lobby:state', players, roomManager.canStartGame(roomCode));
		}
	});

	socket.on('lobby:startGame', () => {
		const roomCode = socket.data.roomCode;
		console.log(`[lobby:startGame] Starting game for room: ${roomCode}`);
		if (!roomCode) return;
		if (!roomManager.isHost(roomCode, socket.id)) return;
		if (!roomManager.canStartGame(roomCode)) return;

		io.to(roomCode).emit('lobby:gameStarting');

		const gameState = roomManager.startGame(roomCode);
		if (gameState) {
			console.log(
				`[lobby:startGame] Game created, first player index: ${gameState.currentPlayerIndex}`
			);
			setTimeout(() => {
				console.log(`[lobby:startGame] Emitting initial game state`);
				io.to(roomCode).emit('game:state', gameState);

				// Check if the first player is AI and trigger their turn
				const firstPlayer = gameState.players[gameState.currentPlayerIndex];
				console.log(
					`[lobby:startGame] First player: ${firstPlayer.name}, isAI: ${firstPlayer.isAI}`
				);
				if (firstPlayer.isAI && !firstPlayer.isEliminated) {
					const room = roomManager.getRoom(roomCode);
					if (room?.gameEngine) {
						console.log(`[lobby:startGame] First player is AI, scheduling initial AI turn`);
						setImmediate(() => {
							console.log(`[lobby:startGame] setImmediate fired, calling handleAITurn`);
							handleAITurn(io, roomCode, room.gameEngine!, roomManager).catch((err) => {
								console.error('[lobby:startGame] Error during initial AI turn:', err);
							});
						});
					}
				}
			}, 500);
		}
	});

	socket.on('lobby:resetGame', () => {
		const roomCode = socket.data.roomCode;
		if (!roomCode) return;

		if (roomManager.resetGameRoom(roomCode)) {
			const players = roomManager.getPlayersInRoom(roomCode);
			io.to(roomCode).emit('lobby:state', players, roomManager.canStartGame(roomCode));
		}
	});
}
