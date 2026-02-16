import { io, type Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '$lib/types/index.js';
import { browser } from '$app/environment';
import { loadSession } from '$lib/utils/session.js';
import { connectionStore } from '$lib/stores/connectionStore.js';

let socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;
let reconnectAttempted = false;

export function getSocket(): Socket<ServerToClientEvents, ClientToServerEvents> {
	if (!browser) {
		throw new Error('Socket can only be used in browser');
	}

	if (!socket) {
		socket = io({
			autoConnect: true,
			reconnection: true,
			reconnectionAttempts: 5,
			reconnectionDelay: 1000
		});

		// Auto-reconnect to room on socket connect if session exists
		socket.on('connect', () => {
			connectionStore.setConnected();

			if (reconnectAttempted) return;
			reconnectAttempted = true;

			const session = loadSession();
			if (session && session.roomCode && session.playerId) {
				socket?.emit('player:reconnect', session.roomCode, session.playerId);
			}
		});

		socket.on('disconnect', () => {
			connectionStore.setDisconnected();
		});

		socket.on('connect_error', () => {
			connectionStore.setError('Unable to connect to server');
		});

		socket.io.on('reconnect_attempt', () => {
			connectionStore.setReconnecting();
		});

		socket.io.on('reconnect', () => {
			connectionStore.setConnected();
		});

		socket.io.on('reconnect_failed', () => {
			connectionStore.setError('Failed to reconnect to server');
		});
	}

	return socket;
}

export function attemptReconnect(): void {
	if (!browser || !socket) return;
	const session = loadSession();
	if (session && session.roomCode && session.playerId) {
		socket.emit('player:reconnect', session.roomCode, session.playerId);
	}
}

export function disconnectSocket(): void {
	if (socket) {
		socket.disconnect();
		socket = null;
		reconnectAttempted = false;
	}
}
