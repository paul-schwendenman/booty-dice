import { writable } from 'svelte/store';
import { browser } from '$app/environment';
import { loadSession, saveSession, clearSession } from '$lib/utils/session.js';

interface PlayerInfo {
	id: string;
	name: string;
	roomCode: string;
}

function createPlayerStore() {
	// Initialize from session if available
	const session = browser ? loadSession() : null;
	const initial: PlayerInfo = session
		? { id: session.playerId, name: session.playerName, roomCode: session.roomCode }
		: { id: '', name: '', roomCode: '' };

	const { subscribe, set, update } = writable<PlayerInfo>(initial);

	function persistSession(state: PlayerInfo) {
		if (browser && state.id && state.roomCode) {
			saveSession({
				playerId: state.id,
				playerName: state.name,
				roomCode: state.roomCode
			});
		}
	}

	return {
		subscribe,
		setPlayer: (id: string, name: string, roomCode: string) => {
			const newState = { id, name, roomCode };
			set(newState);
			persistSession(newState);
		},
		setId: (id: string) =>
			update((state) => {
				const newState = { ...state, id };
				persistSession(newState);
				return newState;
			}),
		setName: (name: string) =>
			update((state) => {
				const newState = { ...state, name };
				persistSession(newState);
				return newState;
			}),
		setRoomCode: (roomCode: string) =>
			update((state) => {
				const newState = { ...state, roomCode };
				persistSession(newState);
				return newState;
			}),
		set,
		reset: () => {
			set({ id: '', name: '', roomCode: '' });
			if (browser) clearSession();
		}
	};
}

export const playerStore = createPlayerStore();
