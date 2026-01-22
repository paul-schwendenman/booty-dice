import type { Server, Socket } from 'socket.io';
import type {
	ClientToServerEvents,
	ServerToClientEvents,
	InterServerEvents,
	SocketData
} from '$lib/types/index.js';
import type { RoomManager } from '../rooms/RoomManager.js';

type AppServer = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
type AppSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

const BROWSE_ROOM = 'browse';

export function setupBrowseHandlers(io: AppServer, socket: AppSocket, roomManager: RoomManager) {
	socket.on('browse:subscribe', () => {
		socket.join(BROWSE_ROOM);
		const lobbies = roomManager.getActiveLobbies();
		socket.emit('browse:lobbies', lobbies);
	});

	socket.on('browse:unsubscribe', () => {
		socket.leave(BROWSE_ROOM);
	});
}

export function broadcastLobbyUpdate(io: AppServer, roomManager: RoomManager) {
	const lobbies = roomManager.getActiveLobbies();
	io.to(BROWSE_ROOM).emit('browse:lobbies', lobbies);
}
