import { browser } from '$app/environment';

const SESSION_KEY = 'booty-dice-session';

export interface SessionData {
	playerId: string;
	playerName: string;
	roomCode: string;
}

export function saveSession(data: SessionData): void {
	if (!browser) return;
	localStorage.setItem(SESSION_KEY, JSON.stringify(data));
}

export function loadSession(): SessionData | null {
	if (!browser) return null;
	const stored = localStorage.getItem(SESSION_KEY);
	if (!stored) return null;
	try {
		return JSON.parse(stored) as SessionData;
	} catch {
		return null;
	}
}

export function clearSession(): void {
	if (!browser) return;
	localStorage.removeItem(SESSION_KEY);
}
