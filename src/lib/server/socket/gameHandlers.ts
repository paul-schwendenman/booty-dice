import type { Server, Socket } from 'socket.io';
import type {
	ClientToServerEvents,
	ServerToClientEvents,
	InterServerEvents,
	SocketData,
	GameState
} from '$lib/types/index.js';
import type { RoomManager } from '../rooms/RoomManager.js';
import type { GameEngine } from '../game/GameEngine.js';
import { AIPlayer } from '../ai/AIPlayer.js';

type AppServer = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
type AppSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

const aiPlayer = new AIPlayer();

export function setupGameHandlers(
	io: AppServer,
	socket: AppSocket,
	roomManager: RoomManager
) {
	socket.on('game:lockDice', (diceIndices) => {
		const room = roomManager.getRoomByPlayer(socket.id);
		if (!room?.gameEngine) return;

		const state = room.gameEngine.getState();
		if (state.players[state.currentPlayerIndex].id !== socket.id) return;

		room.gameEngine.lockDice(diceIndices);
		io.to(room.code).emit('game:state', room.gameEngine.getState());
	});

	socket.on('game:roll', () => {
		const room = roomManager.getRoomByPlayer(socket.id);
		if (!room?.gameEngine) return;

		const state = room.gameEngine.getState();
		if (state.players[state.currentPlayerIndex].id !== socket.id) return;

		try {
			const result = room.gameEngine.roll();
			io.to(room.code).emit('game:diceRolled', result.dice, result.combo);
			io.to(room.code).emit('game:state', room.gameEngine.getState());
		} catch {
			socket.emit('error', 'Cannot roll - no rolls remaining');
		}
	});

	socket.on('game:finishRolling', () => {
		const room = roomManager.getRoomByPlayer(socket.id);
		if (!room?.gameEngine) return;

		const state = room.gameEngine.getState();
		if (state.players[state.currentPlayerIndex].id !== socket.id) return;

		room.gameEngine.finishRolling();
		io.to(room.code).emit('game:state', room.gameEngine.getState());
	});

	socket.on('game:selectTarget', (dieIndex, targetPlayerId) => {
		const room = roomManager.getRoomByPlayer(socket.id);
		if (!room?.gameEngine) return;

		const state = room.gameEngine.getState();
		if (state.players[state.currentPlayerIndex].id !== socket.id) return;

		try {
			room.gameEngine.selectTarget(dieIndex, targetPlayerId);
			io.to(room.code).emit('game:state', room.gameEngine.getState());
		} catch {
			socket.emit('error', 'Invalid target selection');
		}
	});

	socket.on('game:endTurn', () => {
		const room = roomManager.getRoomByPlayer(socket.id);
		if (!room?.gameEngine) return;

		const state = room.gameEngine.getState();
		if (state.players[state.currentPlayerIndex].id !== socket.id) return;

		// Don't allow ending turn if there are unresolved targets
		if (room.gameEngine.hasUnresolvedTargets()) {
			socket.emit('error', 'Select targets for all attacks and steals first');
			return;
		}

		handleEndTurn(io, room.code, room.gameEngine, roomManager);
	});

	socket.on('player:reconnect', (roomCode, playerId) => {
		if (roomManager.handleReconnect(roomCode, playerId, socket.id)) {
			socket.join(roomCode.toUpperCase());
			socket.data.roomCode = roomCode.toUpperCase();
			socket.data.playerId = socket.id;

			const room = roomManager.getRoom(roomCode);
			if (room?.gameEngine) {
				socket.emit('game:state', room.gameEngine.getState());
			} else {
				const players = roomManager.getPlayersInRoom(roomCode.toUpperCase());
				socket.emit('lobby:state', players, roomManager.canStartGame(roomCode.toUpperCase()));
			}
		}
	});
}

function handleEndTurn(
	io: AppServer,
	roomCode: string,
	gameEngine: GameEngine,
	roomManager: RoomManager
) {
	// Resolve the current turn
	const resolution = gameEngine.resolveTurn();

	// Emit elimination events
	resolution.eliminations.forEach((playerId) => {
		const eliminator = gameEngine.getCurrentPlayer();
		io.to(roomCode).emit('game:playerEliminated', playerId, eliminator.id);
	});

	// Check for winner
	if (resolution.winner) {
		const state = gameEngine.getState();
		const winner = state.players.find((p) => p.id === resolution.winner);
		const reason = winner && winner.doubloons >= 25 ? 'doubloons' : 'last_standing';
		io.to(roomCode).emit('game:ended', resolution.winner, reason);
		io.to(roomCode).emit('game:state', state);
		return;
	}

	// Move to next turn
	gameEngine.endTurn();
	const newState = gameEngine.getState();
	io.to(roomCode).emit('game:state', newState);
	io.to(roomCode).emit('game:turnChanged', newState.currentPlayerIndex);

	// Check if next player is AI
	const nextPlayer = newState.players[newState.currentPlayerIndex];
	if (nextPlayer.isAI && !nextPlayer.isEliminated) {
		handleAITurn(io, roomCode, gameEngine, roomManager);
	}
}

async function handleAITurn(
	io: AppServer,
	roomCode: string,
	gameEngine: GameEngine,
	roomManager: RoomManager
) {
	const state = gameEngine.getState();

	await aiPlayer.takeTurn(state, {
		onLockDice: (indices) => {
			gameEngine.lockDice(indices);
			io.to(roomCode).emit('game:state', gameEngine.getState());
		},
		onRoll: async () => {
			const result = gameEngine.roll();
			io.to(roomCode).emit('game:diceRolled', result.dice, result.combo);
			io.to(roomCode).emit('game:state', gameEngine.getState());
			return result.dice;
		},
		onFinishRolling: () => {
			gameEngine.finishRolling();
			io.to(roomCode).emit('game:state', gameEngine.getState());
		},
		onSelectTarget: (dieIndex, targetId) => {
			gameEngine.selectTarget(dieIndex, targetId);
			io.to(roomCode).emit('game:state', gameEngine.getState());
		},
		onEndTurn: () => {
			handleEndTurn(io, roomCode, gameEngine, roomManager);
		}
	});
}
