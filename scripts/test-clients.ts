#!/usr/bin/env npx tsx
/**
 * Test script to simulate multiple players connecting to a game.
 *
 * Usage:
 *   npx tsx scripts/test-clients.ts [options]
 *
 * Options:
 *   --players <n>   Number of players (default: 2)
 *   --room <code>   Join existing room instead of creating one
 *   --url <url>     Server URL (default: http://localhost:5173)
 *   --auto-play     Automatically play turns (roll and end turn)
 *   --watch         Keep running and log all events
 */

import { io, Socket } from 'socket.io-client';

interface Player {
	id: string;
	name: string;
	doubloons: number;
	lives: number;
	shields: number;
	isAI: boolean;
	isReady: boolean;
	isConnected: boolean;
	isEliminated: boolean;
}

interface Die {
	face: string;
	locked: boolean;
}

interface GameState {
	roomCode: string;
	phase: 'waiting' | 'playing' | 'ended';
	players: Player[];
	currentPlayerIndex: number;
	turnNumber: number;
	rollsRemaining: number;
	dice: Die[];
	turnPhase: 'rolling' | 'selecting_targets' | 'resolving';
	pendingActions: Array<{
		dieIndex: number;
		face: string;
		resolved: boolean;
		targetPlayerId?: string;
	}>;
	winnerId: string | null;
}

// Parse CLI args
const args = process.argv.slice(2);
function getArg(name: string, defaultValue: string): string {
	const idx = args.indexOf(`--${name}`);
	return idx !== -1 && args[idx + 1] ? args[idx + 1] : defaultValue;
}
function hasFlag(name: string): boolean {
	return args.includes(`--${name}`);
}

const NUM_PLAYERS = parseInt(getArg('players', '2'), 10);
const ROOM_CODE = getArg('room', '');
const SERVER_URL = getArg('url', 'http://localhost:5173');
const AUTO_PLAY = hasFlag('auto-play');
const WATCH = hasFlag('watch');

const PIRATE_NAMES = [
	'Captain Blackbeard',
	'Red Beard Pete',
	'One-Eye Jack',
	'Scurvy Steve',
	'Barnacle Bill',
	'Salty Sam'
];

interface TestClient {
	socket: Socket;
	name: string;
	playerId: string | null;
	roomCode: string | null;
	isHost: boolean;
	gameState: GameState | null;
}

const clients: TestClient[] = [];
let sharedRoomCode: string | null = ROOM_CODE || null;

function log(client: TestClient | null, message: string) {
	const prefix = client ? `[${client.name}]` : '[system]';
	console.log(`${prefix} ${message}`);
}

function createClient(name: string, isHost: boolean): TestClient {
	const socket = io(SERVER_URL, {
		autoConnect: false,
		reconnection: false
	});

	const client: TestClient = {
		socket,
		name,
		playerId: null,
		roomCode: null,
		isHost,
		gameState: null
	};

	// Setup event handlers
	socket.on('connect', () => {
		client.playerId = socket.id ?? null;
		log(client, `Connected (id: ${socket.id})`);
	});

	socket.on('disconnect', (reason) => {
		log(client, `Disconnected: ${reason}`);
	});

	socket.on('lobby:state', (players: Player[], canStart: boolean) => {
		log(client, `Lobby state: ${players.length} players, canStart: ${canStart}`);
		players.forEach((p) => {
			log(client, `  - ${p.name} ${p.isReady ? '✓' : '○'} ${p.isAI ? '(AI)' : ''}`);
		});
	});

	socket.on('lobby:playerJoined', (player: Player) => {
		log(client, `Player joined: ${player.name}`);
	});

	socket.on('lobby:playerLeft', (playerId: string) => {
		log(client, `Player left: ${playerId}`);
	});

	socket.on('lobby:gameStarting', () => {
		log(client, `Game starting!`);
	});

	socket.on('game:state', (state: GameState) => {
		client.gameState = state;
		const currentPlayer = state.players[state.currentPlayerIndex];
		const isMyTurn = currentPlayer?.id === client.playerId;

		log(
			client,
			`Game state: turn ${state.turnNumber}, phase: ${state.phase}, ` +
				`turnPhase: ${state.turnPhase}, rolls: ${state.rollsRemaining}, ` +
				`current: ${currentPlayer?.name}${isMyTurn ? ' (MY TURN)' : ''}`
		);

		if (state.phase === 'ended' && state.winnerId) {
			const winner = state.players.find((p) => p.id === state.winnerId);
			log(client, `🏆 GAME OVER - Winner: ${winner?.name}`);
		}

		// Auto-play logic
		if (AUTO_PLAY && isMyTurn && state.phase === 'playing') {
			handleAutoPlay(client, state);
		}
	});

	socket.on('game:diceRolled', (dice: Die[], combo: string | null) => {
		const faces = dice.map((d) => `${d.face}${d.locked ? '🔒' : ''}`).join(' ');
		log(client, `Dice rolled: ${faces}${combo ? ` (COMBO: ${combo})` : ''}`);
	});

	socket.on('game:turnChanged', (playerIndex: number) => {
		const state = client.gameState;
		if (state) {
			const player = state.players[playerIndex];
			log(client, `Turn changed to: ${player?.name}`);
		}
	});

	socket.on('game:playerEliminated', (playerId: string, eliminatorId: string) => {
		log(client, `Player eliminated: ${playerId} by ${eliminatorId}`);
	});

	socket.on('game:ended', (winnerId: string, reason: string) => {
		log(client, `Game ended! Winner: ${winnerId}, Reason: ${reason}`);
	});

	socket.on('error', (message: string) => {
		log(client, `ERROR: ${message}`);
	});

	return client;
}

async function handleAutoPlay(client: TestClient, state: GameState) {
	// Add delay to make it watchable
	await sleep(500);

	if (state.turnPhase === 'rolling' && state.rollsRemaining > 0) {
		log(client, `Auto-rolling...`);
		client.socket.emit('game:roll');
	} else if (state.turnPhase === 'rolling' && state.rollsRemaining === 0) {
		log(client, `Auto-finishing rolling phase...`);
		client.socket.emit('game:finishRolling');
	} else if (state.turnPhase === 'selecting_targets') {
		// Find unresolved actions and pick random targets
		const unresolvedActions = state.pendingActions.filter((a) => !a.resolved);
		if (unresolvedActions.length > 0) {
			const action = unresolvedActions[0];
			const targets = state.players.filter((p) => p.id !== client.playerId && !p.isEliminated);
			if (targets.length > 0) {
				const target = targets[Math.floor(Math.random() * targets.length)];
				log(client, `Auto-selecting target: ${target.name} for ${action.face}`);
				client.socket.emit('game:selectTarget', action.dieIndex, target.id);
			}
		} else {
			log(client, `Auto-ending turn...`);
			client.socket.emit('game:endTurn');
		}
	} else if (state.turnPhase === 'resolving') {
		log(client, `Auto-ending turn...`);
		client.socket.emit('game:endTurn');
	}
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

async function connectClient(client: TestClient): Promise<void> {
	return new Promise((resolve, reject) => {
		const timeout = setTimeout(() => reject(new Error('Connection timeout')), 5000);
		client.socket.once('connect', () => {
			clearTimeout(timeout);
			resolve();
		});
		client.socket.once('connect_error', (err) => {
			clearTimeout(timeout);
			reject(err);
		});
		client.socket.connect();
	});
}

async function createRoom(client: TestClient): Promise<string> {
	return new Promise((resolve) => {
		client.socket.emit('lobby:create', client.name, (roomCode: string) => {
			client.roomCode = roomCode;
			log(client, `Created room: ${roomCode}`);
			resolve(roomCode);
		});
	});
}

async function joinRoom(client: TestClient, roomCode: string): Promise<void> {
	return new Promise((resolve, reject) => {
		client.socket.emit('lobby:join', roomCode, client.name, (success: boolean, error?: string) => {
			if (success) {
				client.roomCode = roomCode;
				log(client, `Joined room: ${roomCode}`);
				resolve();
			} else {
				reject(new Error(error || 'Failed to join room'));
			}
		});
	});
}

async function readyUp(client: TestClient): Promise<void> {
	client.socket.emit('lobby:ready', true);
	log(client, `Ready!`);
	await sleep(100);
}

async function startGame(client: TestClient): Promise<void> {
	log(client, `Starting game...`);
	client.socket.emit('lobby:startGame');
}

async function main() {
	console.log('='.repeat(50));
	console.log('Booty Dice Test Client');
	console.log('='.repeat(50));
	console.log(`Server: ${SERVER_URL}`);
	console.log(`Players: ${NUM_PLAYERS}`);
	console.log(`Auto-play: ${AUTO_PLAY}`);
	console.log(`Watch mode: ${WATCH}`);
	if (ROOM_CODE) console.log(`Joining room: ${ROOM_CODE}`);
	console.log('='.repeat(50));

	try {
		// Create clients
		for (let i = 0; i < NUM_PLAYERS; i++) {
			const name = PIRATE_NAMES[i] || `Pirate ${i + 1}`;
			const isHost = i === 0 && !ROOM_CODE;
			clients.push(createClient(name, isHost));
		}

		// Connect all clients
		log(null, 'Connecting clients...');
		await Promise.all(clients.map(connectClient));

		// Create or join room
		if (!sharedRoomCode) {
			sharedRoomCode = await createRoom(clients[0]);
		}

		// Join room for other clients
		for (let i = sharedRoomCode === ROOM_CODE ? 0 : 1; i < clients.length; i++) {
			await joinRoom(clients[i], sharedRoomCode);
			await sleep(200);
		}

		// Ready up
		await sleep(500);
		for (const client of clients) {
			await readyUp(client);
		}

		// Start game (host only)
		await sleep(500);
		const host = clients.find((c) => c.isHost);
		if (host) {
			await startGame(host);
		}

		// Keep running if watch mode or auto-play
		if (WATCH || AUTO_PLAY) {
			log(null, 'Running... Press Ctrl+C to exit');
			await new Promise(() => {}); // Run forever
		} else {
			// Wait a bit then disconnect
			await sleep(3000);
			log(null, 'Test complete, disconnecting...');
			clients.forEach((c) => c.socket.disconnect());
			process.exit(0);
		}
	} catch (err) {
		console.error('Error:', err);
		clients.forEach((c) => c.socket.disconnect());
		process.exit(1);
	}
}

main();
