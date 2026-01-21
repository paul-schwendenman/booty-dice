import { readable } from 'svelte/store';

export const page = readable({
	params: { roomCode: 'TEST01' },
	url: new URL('http://localhost:5173/game/TEST01'),
	route: { id: '/game/[roomCode]' }
});

export const navigating = readable(null);
export const updated = readable(false);
