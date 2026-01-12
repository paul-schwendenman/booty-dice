import { describe, it, expect, vi } from 'vitest';
import { generateRoomCode } from '$lib/utils/roomCode.js';

describe('generateRoomCode', () => {
	it('should generate code of default length 5', () => {
		const code = generateRoomCode();
		expect(code).toHaveLength(5);
	});

	it('should generate code of specified length', () => {
		expect(generateRoomCode(3)).toHaveLength(3);
		expect(generateRoomCode(8)).toHaveLength(8);
		expect(generateRoomCode(10)).toHaveLength(10);
	});

	it('should only contain valid characters', () => {
		const validChars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
		const code = generateRoomCode(100); // Generate a long code to test more characters

		for (const char of code) {
			expect(validChars).toContain(char);
		}
	});

	it('should not contain ambiguous characters (I, O, 0, 1)', () => {
		// Generate many codes to increase chance of catching forbidden chars
		for (let i = 0; i < 50; i++) {
			const code = generateRoomCode(10);
			expect(code).not.toMatch(/[IO01]/);
		}
	});

	it('should generate different codes on successive calls', () => {
		const codes = new Set<string>();
		for (let i = 0; i < 20; i++) {
			codes.add(generateRoomCode());
		}
		// With 5-character codes from 32 chars, collisions should be extremely rare
		expect(codes.size).toBeGreaterThan(15);
	});

	it('should use Math.random for randomness', () => {
		const mockRandom = vi.spyOn(Math, 'random').mockReturnValue(0);
		const code = generateRoomCode(5);

		// With Math.random always returning 0, we should get the first character repeated
		expect(code).toBe('AAAAA');
		expect(mockRandom).toHaveBeenCalled();

		mockRandom.mockRestore();
	});
});
