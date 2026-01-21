import '@testing-library/jest-dom/vitest';
import { vi, beforeEach } from 'vitest';

// Reset mocks between tests
beforeEach(() => {
	vi.clearAllMocks();
});
