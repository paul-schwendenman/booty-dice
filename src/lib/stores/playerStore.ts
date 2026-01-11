import { writable } from 'svelte/store';

interface PlayerInfo {
	id: string;
	name: string;
}

function createPlayerStore() {
	const { subscribe, set, update } = writable<PlayerInfo>({
		id: '',
		name: ''
	});

	return {
		subscribe,
		setId: (id: string) => update((state) => ({ ...state, id })),
		setName: (name: string) => update((state) => ({ ...state, name })),
		set,
		reset: () => set({ id: '', name: '' })
	};
}

export const playerStore = createPlayerStore();
