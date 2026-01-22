import { writable } from 'svelte/store';
import type { LobbyInfo } from '$lib/types/index.js';

interface BrowseState {
	lobbies: LobbyInfo[];
	isLoading: boolean;
}

function createBrowseStore() {
	const { subscribe, set, update } = writable<BrowseState>({
		lobbies: [],
		isLoading: true
	});

	return {
		subscribe,

		setLobbies: (lobbies: LobbyInfo[]) =>
			update((state) => ({
				...state,
				lobbies,
				isLoading: false
			})),

		setLoading: (isLoading: boolean) =>
			update((state) => ({
				...state,
				isLoading
			})),

		reset: () =>
			set({
				lobbies: [],
				isLoading: true
			})
	};
}

export const browseStore = createBrowseStore();
