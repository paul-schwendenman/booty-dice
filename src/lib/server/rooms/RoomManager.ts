import type { Player, GameState } from '$lib/types/index.js';
import { createPlayer } from '$lib/types/index.js';
import { GameEngine } from '../game/GameEngine.js';
import { generateRoomCode } from '$lib/utils/roomCode.js';

interface Room {
	code: string;
	hostId: string;
	players: Map<string, Player>;
	gameEngine: GameEngine | null;
	createdAt: number;
}

const AI_NAMES = [
	'Captain Blackbyte',
	'Rusty Hook',
	'One-Eyed Otto',
	'Sea Dog Sally',
	'Barnacle Bill',
	'Pegleg Pete'
];

export class RoomManager {
	private rooms: Map<string, Room> = new Map();
	private playerToRoom: Map<string, string> = new Map();

	createRoom(hostSocketId: string, hostName: string): string {
		let code = generateRoomCode();
		while (this.rooms.has(code)) {
			code = generateRoomCode();
		}

		const host = createPlayer(hostSocketId, hostName, false);

		this.rooms.set(code, {
			code,
			hostId: hostSocketId,
			players: new Map([[hostSocketId, host]]),
			gameEngine: null,
			createdAt: Date.now()
		});

		this.playerToRoom.set(hostSocketId, code);
		return code;
	}

	joinRoom(
		code: string,
		socketId: string,
		name: string
	): { success: boolean; error?: string } {
		const room = this.rooms.get(code.toUpperCase());
		if (!room) return { success: false, error: 'Room not found' };
		if (room.players.size >= 6) return { success: false, error: 'Room is full' };
		if (room.gameEngine) return { success: false, error: 'Game already in progress' };

		const player = createPlayer(socketId, name, false);
		room.players.set(socketId, player);
		this.playerToRoom.set(socketId, code.toUpperCase());
		return { success: true };
	}

	addAIPlayer(roomCode: string): Player | null {
		const room = this.rooms.get(roomCode);
		if (!room || room.players.size >= 6) return null;

		const usedNames = [...room.players.values()].map((p) => p.name);
		const availableNames = AI_NAMES.filter((n) => !usedNames.includes(n));
		const aiName = availableNames[0] || `AI Pirate ${room.players.size}`;

		const aiId = `ai_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
		const ai = createPlayer(aiId, aiName, true);

		room.players.set(aiId, ai);
		return ai;
	}

	removeAIPlayer(roomCode: string, aiId: string): boolean {
		const room = this.rooms.get(roomCode);
		if (!room) return false;

		const player = room.players.get(aiId);
		if (!player || !player.isAI) return false;

		room.players.delete(aiId);
		return true;
	}

	setPlayerReady(socketId: string, isReady: boolean): void {
		const room = this.getRoomByPlayer(socketId);
		if (!room) return;

		const player = room.players.get(socketId);
		if (player) {
			player.isReady = isReady;
		}
	}

	canStartGame(roomCode: string): boolean {
		const room = this.rooms.get(roomCode);
		if (!room) return false;
		if (room.players.size < 2) return false;
		return [...room.players.values()].every((p) => p.isReady || p.isAI);
	}

	startGame(roomCode: string): GameState | null {
		const room = this.rooms.get(roomCode);
		if (!room || !this.canStartGame(roomCode)) return null;

		room.gameEngine = new GameEngine([...room.players.values()], roomCode);
		return room.gameEngine.getState();
	}

	getRoom(code: string): Room | undefined {
		return this.rooms.get(code.toUpperCase());
	}

	getRoomByPlayer(socketId: string): Room | undefined {
		const code = this.playerToRoom.get(socketId);
		return code ? this.rooms.get(code) : undefined;
	}

	getPlayersInRoom(roomCode: string): Player[] {
		const room = this.rooms.get(roomCode);
		return room ? [...room.players.values()] : [];
	}

	isHost(roomCode: string, socketId: string): boolean {
		const room = this.rooms.get(roomCode);
		return room?.hostId === socketId;
	}

	handleDisconnect(socketId: string): { roomCode: string; wasHost: boolean } | null {
		const room = this.getRoomByPlayer(socketId);
		if (!room) return null;

		const player = room.players.get(socketId);
		const wasHost = room.hostId === socketId;

		if (player) {
			if (room.gameEngine) {
				// Game in progress - mark as disconnected
				player.isConnected = false;
			} else {
				// In lobby - remove player
				room.players.delete(socketId);
				this.playerToRoom.delete(socketId);

				// If host left and players remain, assign new host
				if (wasHost && room.players.size > 0) {
					const humanPlayers = [...room.players.values()].filter((p) => !p.isAI);
					if (humanPlayers.length > 0) {
						room.hostId = humanPlayers[0].id;
					}
				}
			}
		}

		// Clean up empty rooms
		if (room.players.size === 0 || [...room.players.values()].every((p) => p.isAI)) {
			this.rooms.delete(room.code);
		}

		return { roomCode: room.code, wasHost };
	}

	handleReconnect(
		roomCode: string,
		oldPlayerId: string,
		newSocketId: string
	): boolean {
		const room = this.rooms.get(roomCode.toUpperCase());
		if (!room) return false;

		const player = room.players.get(oldPlayerId);
		if (!player || player.isConnected) return false;

		// Update player ID
		room.players.delete(oldPlayerId);
		player.id = newSocketId;
		player.isConnected = true;
		room.players.set(newSocketId, player);

		this.playerToRoom.delete(oldPlayerId);
		this.playerToRoom.set(newSocketId, roomCode.toUpperCase());

		if (room.hostId === oldPlayerId) {
			room.hostId = newSocketId;
		}

		return true;
	}
}
