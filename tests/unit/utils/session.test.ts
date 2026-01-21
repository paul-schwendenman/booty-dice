import { describe, it, expect } from 'vitest';
import { saveSession, loadSession, clearSession, type SessionData } from '$lib/utils/session.js';

// Note: In our test environment, browser is mocked as false
// These tests verify the early-return behavior when not in browser

describe('session utils', () => {
	describe('saveSession', () => {
		it('should return early when not in browser', () => {
			const data: SessionData = {
				playerId: 'test-id',
				playerName: 'Test Player',
				roomCode: 'ABC123'
			};

			// Should not throw, just return early when browser=false
			expect(() => saveSession(data)).not.toThrow();
		});
	});

	describe('loadSession', () => {
		it('should return null when not in browser', () => {
			const result = loadSession();
			expect(result).toBeNull();
		});
	});

	describe('clearSession', () => {
		it('should return early when not in browser', () => {
			// Should not throw, just return early when browser=false
			expect(() => clearSession()).not.toThrow();
		});
	});

	describe('SessionData type', () => {
		it('should define correct shape', () => {
			const session: SessionData = {
				playerId: 'p1',
				playerName: 'Player One',
				roomCode: 'ROOM01'
			};

			expect(session.playerId).toBe('p1');
			expect(session.playerName).toBe('Player One');
			expect(session.roomCode).toBe('ROOM01');
		});
	});
});
