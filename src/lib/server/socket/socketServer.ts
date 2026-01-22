import type { Server } from 'socket.io';
import type {
	ClientToServerEvents,
	ServerToClientEvents,
	InterServerEvents,
	SocketData
} from '$lib/types/index.js';
import { RoomManager } from '../rooms/RoomManager.js';
import { setupLobbyHandlers } from './lobbyHandlers.js';
import { setupGameHandlers } from './gameHandlers.js';
import { setupBrowseHandlers, broadcastLobbyUpdate } from './browseHandlers.js';

type AppServer = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

const roomManager = new RoomManager();

export function setupSocketHandlers(io: AppServer) {
	io.on('connection', (socket) => {
		console.log(`Client connected: ${socket.id}`);

		setupLobbyHandlers(io, socket, roomManager);
		setupGameHandlers(io, socket, roomManager);
		setupBrowseHandlers(io, socket, roomManager);

		socket.on('disconnect', () => {
			console.log(`Client disconnected: ${socket.id}`);
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
				}
				broadcastLobbyUpdate(io, roomManager);
			}
		});
	});
}

export { roomManager };
