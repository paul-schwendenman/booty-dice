export function validatePlayerName(
	name: unknown
): { valid: true; name: string } | { valid: false; error: string } {
	if (typeof name !== 'string') {
		return { valid: false, error: 'Player name must be a string' };
	}

	// Strip control characters and trim
	// eslint-disable-next-line no-control-regex
	const sanitized = name.replace(/[\x00-\x1f\x7f]/g, '').trim();

	if (sanitized.length === 0) {
		return { valid: false, error: 'Player name cannot be empty' };
	}

	if (sanitized.length > 20) {
		return { valid: false, error: 'Player name must be 20 characters or less' };
	}

	return { valid: true, name: sanitized };
}

export function validateDiceIndices(
	indices: unknown
): { valid: true; indices: number[] } | { valid: false; error: string } {
	if (!Array.isArray(indices)) {
		return { valid: false, error: 'Dice indices must be an array' };
	}

	for (const index of indices) {
		if (typeof index !== 'number' || !Number.isInteger(index) || index < 0 || index > 5) {
			return { valid: false, error: 'Dice indices must be integers between 0 and 5' };
		}
	}

	return { valid: true, indices: indices as number[] };
}
