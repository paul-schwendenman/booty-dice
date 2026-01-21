import { writable, derived } from 'svelte/store';
import type { Player } from '$lib/types/index.js';
import { playerStore } from './playerStore.js';

interface LobbyState {
	roomCode: string;
	players: Player[];
	canStart: boolean;
	isHost: boolean;
}

function createLobbyStore() {
	const { subscribe, set, update } = writable<LobbyState>({
		roomCode: '',
		players: [],
		canStart: false,
		isHost: false
	});

	return {
		subscribe,

		setRoom: (roomCode: string, isHost: boolean) =>
			update((state) => ({
				...state,
				roomCode,
				isHost
			})),

		updatePlayers: (players: Player[], canStart: boolean) =>
			update((state) => ({
				...state,
				players,
				canStart
			})),

		addPlayer: (player: Player) =>
			update((state) => ({
				...state,
				players: [...state.players, player]
			})),

		removePlayer: (playerId: string) =>
			update((state) => ({
				...state,
				players: state.players.filter((p) => p.id !== playerId)
			})),

		reset: () =>
			set({
				roomCode: '',
				players: [],
				canStart: false,
				isHost: false
			})
	};
}

export const lobbyStore = createLobbyStore();

export const myLobbyPlayer = derived(
	[lobbyStore, playerStore],
	([$lobby, $player]) => $lobby.players.find((p) => p.id === $player.id) ?? null
);
