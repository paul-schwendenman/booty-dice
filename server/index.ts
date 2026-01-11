import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { handler } from '../build/handler.js';
import { setupSocketHandlers } from '../src/lib/server/socket/socketServer.js';
import type {
	ClientToServerEvents,
	ServerToClientEvents,
	InterServerEvents,
	SocketData
} from '../src/lib/types/index.js';

const app = express();
const server = createServer(app);

const io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(
	server,
	{
		cors: { origin: '*' }
	}
);

setupSocketHandlers(io);

// SvelteKit handles all HTTP requests
app.use(handler);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
	console.log(`Booty Dice server running on http://localhost:${PORT}`);
});
