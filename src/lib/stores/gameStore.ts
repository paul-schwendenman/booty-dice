import { writable, derived } from 'svelte/store';
import type { GameState, Player, Die, LogEntry } from '$lib/types/index.js';
import { playerStore } from './playerStore.js';

function createGameStore() {
	const { subscribe, set, update } = writable<GameState | null>(null);

	return {
		subscribe,
		set,
		update,

		updateDice: (dice: Die[]) =>
			update((state) => {
				if (!state) return state;
				return { ...state, dice };
			}),

		updatePlayer: (playerId: string, updates: Partial<Player>) =>
			update((state) => {
				if (!state) return state;
				return {
					...state,
					players: state.players.map((p) => (p.id === playerId ? { ...p, ...updates } : p))
				};
			}),

		addLogEntry: (entry: LogEntry) =>
			update((state) => {
				if (!state) return state;
				return {
					...state,
					gameLog: [...state.gameLog, entry]
				};
			}),

		reset: () => set(null)
	};
}

export const gameStore = createGameStore();

export const currentPlayer = derived(gameStore, ($game) =>
	$game ? $game.players[$game.currentPlayerIndex] : null
);

export const myPlayer = derived(
	[gameStore, playerStore],
	([$game, $player]) => $game?.players.find((p) => p.id === $player.id) ?? null
);

export const isMyTurn = derived(
	[currentPlayer, playerStore],
	([$current, $player]) => $current?.id === $player.id
);

export const alivePlayers = derived(gameStore, ($game) =>
	$game ? $game.players.filter((p) => !p.isEliminated) : []
);

export const otherAlivePlayers = derived([alivePlayers, playerStore], ([$alive, $player]) =>
	$alive.filter((p) => p.id !== $player.id)
);
