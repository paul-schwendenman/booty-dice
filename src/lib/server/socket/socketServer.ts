import type { Server } from 'socket.io';
import type {
	ClientToServerEvents,
	ServerToClientEvents,
	InterServerEvents,
	SocketData
} from '$lib/types/index.js';
import { RoomManager } from '../rooms/RoomManager.js';
import { setupLobbyHandlers } from './lobbyHandlers.js';
import { setupGameHandlers, handleEndTurn } from './gameHandlers.js';

type AppServer = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

const roomManager = new RoomManager();

export function setupSocketHandlers(io: AppServer) {
	io.on('connection', (socket) => {
		console.log(`Client connected: ${socket.id}`);

		setupLobbyHandlers(io, socket, roomManager);
		setupGameHandlers(io, socket, roomManager);

		socket.on('disconnect', () => {
			console.log(`Client disconnected: ${socket.id}`);

			// If player is in an active game and it's their turn, handle it before disconnect
			const roomBeforeDisconnect = roomManager.getRoomByPlayer(socket.id);
			if (roomBeforeDisconnect?.gameEngine) {
				const state = roomBeforeDisconnect.gameEngine.getState();
				const currentPlayer = state.players[state.currentPlayerIndex];
				if (currentPlayer.id === socket.id && state.phase === 'playing') {
					// Finish rolling if in rolling phase
					roomBeforeDisconnect.gameEngine.finishRolling();

					// Auto-resolve any pending actions
					const updatedState = roomBeforeDisconnect.gameEngine.getState();
					if (updatedState.turnPhase === 'selecting_targets') {
						const otherAlive = updatedState.players.filter(
							(p) => p.id !== socket.id && !p.isEliminated
						);
						for (const action of updatedState.pendingActions) {
							if (!action.resolved && otherAlive.length > 0) {
								roomBeforeDisconnect.gameEngine.selectTarget(action.dieIndex, otherAlive[0].id);
							}
						}
					}

					// End the turn
					handleEndTurn(
						io,
						roomBeforeDisconnect.code,
						roomBeforeDisconnect.gameEngine,
						roomManager
					);
				}
			}

			const result = roomManager.handleDisconnect(socket.id);
			if (result) {
				io.to(result.roomCode).emit('lobby:playerLeft', socket.id);
				const players = roomManager.getPlayersInRoom(result.roomCode);
				if (players.length > 0) {
					io.to(result.roomCode).emit(
						'lobby:state',
						players,
						roomManager.canStartGame(result.roomCode)
					);

					// Notify about host change
					if (result.wasHost) {
						const room = roomManager.getRoom(result.roomCode);
						if (room) {
							io.to(result.roomCode).emit('lobby:hostChanged', room.hostId);
						}
					}
				}
			}
		});
	});
}

export { roomManager };
