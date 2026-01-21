import type { Server, Socket } from 'socket.io';
import type {
	ClientToServerEvents,
	ServerToClientEvents,
	InterServerEvents,
	SocketData
} from '$lib/types/index.js';
import type { RoomManager } from '../rooms/RoomManager.js';
import type { GameEngine } from '../game/GameEngine.js';
import { AIPlayer } from '../ai/AIPlayer.js';

type AppServer = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
type AppSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

const aiPlayer = new AIPlayer();

export function setupGameHandlers(io: AppServer, socket: AppSocket, roomManager: RoomManager) {
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
		console.log('[game:finishRolling] called by', socket.id);
		const room = roomManager.getRoomByPlayer(socket.id);
		if (!room?.gameEngine) {
			console.log('[game:finishRolling] no room/gameEngine');
			return;
		}

		const state = room.gameEngine.getState();
		console.log(
			'[game:finishRolling] current player:',
			state.players[state.currentPlayerIndex].id,
			'socket:',
			socket.id
		);
		if (state.players[state.currentPlayerIndex].id !== socket.id) return;

		console.log(
			'[game:finishRolling] before:',
			state.turnPhase,
			'pendingActions:',
			state.pendingActions.length
		);
		room.gameEngine.finishRolling();
		const newState = room.gameEngine.getState();
		console.log('[game:finishRolling] after:', newState.turnPhase);
		io.to(room.code).emit('game:state', newState);
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
	const currentPlayer = gameEngine.getCurrentPlayer();
	console.log(
		`[handleEndTurn] Starting for player: ${currentPlayer.name} (${currentPlayer.id}), isAI: ${currentPlayer.isAI}`
	);

	// Resolve the current turn
	const resolution = gameEngine.resolveTurn();
	console.log(`[handleEndTurn] Resolution:`, JSON.stringify(resolution));

	// Emit elimination events
	resolution.eliminations.forEach((playerId) => {
		const eliminator = gameEngine.getCurrentPlayer();
		io.to(roomCode).emit('game:playerEliminated', playerId, eliminator.id);
	});

	// Check for winner
	if (resolution.winner) {
		console.log(`[handleEndTurn] Game ended, winner: ${resolution.winner}`);
		const state = gameEngine.getState();
		const winner = state.players.find((p) => p.id === resolution.winner);
		const reason = winner && winner.doubloons >= 25 ? 'doubloons' : 'last_standing';
		io.to(roomCode).emit('game:ended', resolution.winner, reason);
		io.to(roomCode).emit('game:state', state);
		return;
	}

	// Move to next turn
	console.log(`[handleEndTurn] Calling gameEngine.endTurn()`);
	gameEngine.endTurn();
	const newState = gameEngine.getState();
	console.log(
		`[handleEndTurn] New turn - player index: ${newState.currentPlayerIndex}, phase: ${newState.phase}, turnPhase: ${newState.turnPhase}`
	);
	io.to(roomCode).emit('game:state', newState);

	// Don't continue if game ended during endTurn (edge case)
	if (newState.phase === 'ended') {
		console.log(`[handleEndTurn] Game ended during endTurn, returning`);
		return;
	}

	io.to(roomCode).emit('game:turnChanged', newState.currentPlayerIndex);

	// Check if next player is AI
	const nextPlayer = newState.players[newState.currentPlayerIndex];
	console.log(
		`[handleEndTurn] Next player: ${nextPlayer.name} (${nextPlayer.id}), isAI: ${nextPlayer.isAI}, isEliminated: ${nextPlayer.isEliminated}`
	);
	if (nextPlayer.isAI && !nextPlayer.isEliminated) {
		console.log(`[handleEndTurn] Scheduling AI turn via setImmediate`);
		// Use setImmediate to break the synchronous call chain and allow
		// the event loop to process state updates before the next AI turn
		setImmediate(() => {
			console.log(`[handleEndTurn] setImmediate callback fired, calling handleAITurn`);
			handleAITurn(io, roomCode, gameEngine, roomManager).catch((err) => {
				console.error('[handleAITurn] Error during AI turn:', err);
			});
		});
	} else {
		console.log(`[handleEndTurn] Next player is human, waiting for input`);
	}
}

export async function handleAITurn(
	io: AppServer,
	roomCode: string,
	gameEngine: GameEngine,
	roomManager: RoomManager
) {
	const state = gameEngine.getState();
	console.log(
		`[handleAITurn] Starting - phase: ${state.phase}, turnPhase: ${state.turnPhase}, rollsRemaining: ${state.rollsRemaining}`
	);

	// Don't run AI turn if game has ended
	if (state.phase === 'ended') {
		console.log(`[handleAITurn] Game already ended, returning`);
		return;
	}

	// Verify the current player is actually an AI and not eliminated
	const currentPlayer = state.players[state.currentPlayerIndex];
	console.log(
		`[handleAITurn] Current player: ${currentPlayer.name} (${currentPlayer.id}), isAI: ${currentPlayer.isAI}, isEliminated: ${currentPlayer.isEliminated}`
	);
	if (!currentPlayer.isAI || currentPlayer.isEliminated) {
		console.error('[handleAITurn] Called but current player is not a valid AI');
		return;
	}

	console.log(`[handleAITurn] Calling aiPlayer.takeTurn()`);
	await aiPlayer.takeTurn(state, {
		onLockDice: (indices) => {
			console.log(`[handleAITurn:onLockDice] Locking dice indices: ${JSON.stringify(indices)}`);
			if (gameEngine.getState().phase === 'ended') {
				console.log(`[handleAITurn:onLockDice] Game ended, skipping`);
				return;
			}
			gameEngine.lockDice(indices);
			io.to(roomCode).emit('game:state', gameEngine.getState());
		},
		onRoll: async () => {
			console.log(`[handleAITurn:onRoll] Rolling dice`);
			if (gameEngine.getState().phase === 'ended') {
				console.log(`[handleAITurn:onRoll] Game ended, returning stale dice`);
				return state.dice;
			}
			try {
				const result = gameEngine.roll();
				console.log(
					`[handleAITurn:onRoll] Roll result: ${result.dice.map((d) => d.face).join(', ')}, combo: ${result.combo || 'none'}`
				);
				io.to(roomCode).emit('game:diceRolled', result.dice, result.combo);
				io.to(roomCode).emit('game:state', gameEngine.getState());
				return result.dice;
			} catch (err) {
				console.error(`[handleAITurn:onRoll] Error rolling:`, err);
				throw err;
			}
		},
		onFinishRolling: () => {
			console.log(`[handleAITurn:onFinishRolling] Finishing rolling phase`);
			if (gameEngine.getState().phase === 'ended') {
				console.log(`[handleAITurn:onFinishRolling] Game ended, skipping`);
				return;
			}
			gameEngine.finishRolling();
			const newState = gameEngine.getState();
			console.log(
				`[handleAITurn:onFinishRolling] New turnPhase: ${newState.turnPhase}, pendingActions: ${newState.pendingActions.length}`
			);
			io.to(roomCode).emit('game:state', newState);
		},
		onSelectTarget: (dieIndex, targetId) => {
			console.log(
				`[handleAITurn:onSelectTarget] Selecting target: dieIndex=${dieIndex}, targetId=${targetId}`
			);
			if (gameEngine.getState().phase === 'ended') {
				console.log(`[handleAITurn:onSelectTarget] Game ended, skipping`);
				return;
			}
			gameEngine.selectTarget(dieIndex, targetId);
			io.to(roomCode).emit('game:state', gameEngine.getState());
		},
		onEndTurn: () => {
			console.log(`[handleAITurn:onEndTurn] AI ending turn`);
			if (gameEngine.getState().phase === 'ended') {
				console.log(`[handleAITurn:onEndTurn] Game ended, skipping`);
				return;
			}
			handleEndTurn(io, roomCode, gameEngine, roomManager);
		}
	});
	console.log(`[handleAITurn] aiPlayer.takeTurn() completed`);
}
