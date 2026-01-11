import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import type { ViteDevServer } from 'vite';
import type { Plugin } from 'vite';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const webSocketServer: Plugin = {
	name: 'webSocketServer',
	configureServer(server: ViteDevServer) {
		if (!server.httpServer) return;

		const io = new Server(server.httpServer, {
			cors: { origin: '*' }
		});

		// Use absolute path for dynamic import
		const socketServerPath = path.join(__dirname, 'src/lib/server/socket/socketServer.ts');

		// Use vite's ssrLoadModule to properly resolve $lib aliases
		server.ssrLoadModule(socketServerPath).then((module) => {
			const { setupSocketHandlers } = module as { setupSocketHandlers: (io: Server) => void };
			setupSocketHandlers(io);
			console.log('Socket.io server initialized');
		}).catch((err) => {
			console.error('Failed to load socket server:', err);
		});

		// Store globally for potential access
		(globalThis as Record<string, unknown>).__socketIO = io;
	}
};

export default defineConfig({
	plugins: [sveltekit(), webSocketServer]
});
