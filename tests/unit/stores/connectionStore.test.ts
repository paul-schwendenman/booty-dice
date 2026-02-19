import { describe, it, expect } from 'vitest';
import { get } from 'svelte/store';
import { connectionStore } from '$lib/stores/connectionStore.js';

describe('connectionStore', () => {
	it('should start in connecting state', () => {
		const state = get(connectionStore);
		expect(state.state).toBe('connecting');
		expect(state.errorMessage).toBe('');
	});

	it('should transition to connected', () => {
		connectionStore.setConnected();
		const state = get(connectionStore);
		expect(state.state).toBe('connected');
		expect(state.errorMessage).toBe('');
	});

	it('should transition to disconnected', () => {
		connectionStore.setDisconnected();
		const state = get(connectionStore);
		expect(state.state).toBe('disconnected');
		expect(state.errorMessage).toBe('');
	});

	it('should transition to reconnecting', () => {
		connectionStore.setReconnecting();
		const state = get(connectionStore);
		expect(state.state).toBe('reconnecting');
		expect(state.errorMessage).toBe('');
	});

	it('should transition to error with default message', () => {
		connectionStore.setError();
		const state = get(connectionStore);
		expect(state.state).toBe('error');
		expect(state.errorMessage).toBe('Connection error');
	});

	it('should transition to error with custom message', () => {
		connectionStore.setError('Server unreachable');
		const state = get(connectionStore);
		expect(state.state).toBe('error');
		expect(state.errorMessage).toBe('Server unreachable');
	});

	it('should clear error message when transitioning to connected', () => {
		connectionStore.setError('Something went wrong');
		connectionStore.setConnected();
		const state = get(connectionStore);
		expect(state.state).toBe('connected');
		expect(state.errorMessage).toBe('');
	});
});
