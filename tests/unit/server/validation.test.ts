import { describe, it, expect } from 'vitest';
import { validatePlayerName, validateDiceIndices } from '$lib/server/validation.js';

describe('validatePlayerName', () => {
	it('should accept a valid name', () => {
		const result = validatePlayerName('Captain Jack');
		expect(result).toEqual({ valid: true, name: 'Captain Jack' });
	});

	it('should trim whitespace', () => {
		const result = validatePlayerName('  Jack  ');
		expect(result).toEqual({ valid: true, name: 'Jack' });
	});

	it('should reject empty string', () => {
		const result = validatePlayerName('');
		expect(result).toEqual({ valid: false, error: 'Player name cannot be empty' });
	});

	it('should reject whitespace-only string', () => {
		const result = validatePlayerName('   ');
		expect(result).toEqual({ valid: false, error: 'Player name cannot be empty' });
	});

	it('should reject non-string types', () => {
		expect(validatePlayerName(123)).toEqual({
			valid: false,
			error: 'Player name must be a string'
		});
		expect(validatePlayerName(null)).toEqual({
			valid: false,
			error: 'Player name must be a string'
		});
		expect(validatePlayerName(undefined)).toEqual({
			valid: false,
			error: 'Player name must be a string'
		});
	});

	it('should reject names longer than 20 characters', () => {
		const result = validatePlayerName('A'.repeat(21));
		expect(result).toEqual({ valid: false, error: 'Player name must be 20 characters or less' });
	});

	it('should accept exactly 20 characters', () => {
		const name = 'A'.repeat(20);
		const result = validatePlayerName(name);
		expect(result).toEqual({ valid: true, name });
	});

	it('should strip control characters', () => {
		const result = validatePlayerName('Jack\x00\x01\x7f');
		expect(result).toEqual({ valid: true, name: 'Jack' });
	});

	it('should reject if only control characters', () => {
		const result = validatePlayerName('\x00\x01\x7f');
		expect(result).toEqual({ valid: false, error: 'Player name cannot be empty' });
	});
});

describe('validateDiceIndices', () => {
	it('should accept valid indices', () => {
		const result = validateDiceIndices([0, 2, 5]);
		expect(result).toEqual({ valid: true, indices: [0, 2, 5] });
	});

	it('should accept empty array', () => {
		const result = validateDiceIndices([]);
		expect(result).toEqual({ valid: true, indices: [] });
	});

	it('should reject non-array', () => {
		expect(validateDiceIndices('not an array')).toEqual({
			valid: false,
			error: 'Dice indices must be an array'
		});
		expect(validateDiceIndices(42)).toEqual({
			valid: false,
			error: 'Dice indices must be an array'
		});
		expect(validateDiceIndices(null)).toEqual({
			valid: false,
			error: 'Dice indices must be an array'
		});
	});

	it('should reject float values', () => {
		const result = validateDiceIndices([0, 1.5, 3]);
		expect(result).toEqual({
			valid: false,
			error: 'Dice indices must be integers between 0 and 5'
		});
	});

	it('should reject out-of-range indices', () => {
		expect(validateDiceIndices([-1, 0, 1])).toEqual({
			valid: false,
			error: 'Dice indices must be integers between 0 and 5'
		});
		expect(validateDiceIndices([0, 6])).toEqual({
			valid: false,
			error: 'Dice indices must be integers between 0 and 5'
		});
	});

	it('should reject string values in array', () => {
		const result = validateDiceIndices([0, '1', 2]);
		expect(result).toEqual({
			valid: false,
			error: 'Dice indices must be integers between 0 and 5'
		});
	});

	it('should accept all valid boundary values', () => {
		const result = validateDiceIndices([0, 1, 2, 3, 4, 5]);
		expect(result).toEqual({ valid: true, indices: [0, 1, 2, 3, 4, 5] });
	});
});
