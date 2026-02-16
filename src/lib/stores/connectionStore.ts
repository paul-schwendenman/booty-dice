import { writable } from 'svelte/store';

type ConnectionState = 'connected' | 'connecting' | 'reconnecting' | 'disconnected' | 'error';

interface ConnectionStoreState {
	state: ConnectionState;
	errorMessage: string;
}

function createConnectionStore() {
	const { subscribe, set } = writable<ConnectionStoreState>({
		state: 'connecting',
		errorMessage: ''
	});

	return {
		subscribe,

		setConnected: () => set({ state: 'connected', errorMessage: '' }),

		setDisconnected: () => set({ state: 'disconnected', errorMessage: '' }),

		setReconnecting: () => set({ state: 'reconnecting', errorMessage: '' }),

		setError: (message = 'Connection error') => set({ state: 'error', errorMessage: message })
	};
}

export const connectionStore = createConnectionStore();
