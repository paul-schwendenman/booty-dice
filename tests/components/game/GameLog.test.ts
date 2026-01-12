import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import GameLog from '$lib/components/game/GameLog.svelte';
import type { LogEntry } from '$lib/types/index.js';

describe('GameLog', () => {
	const createLogEntry = (
		message: string,
		type: LogEntry['type'] = 'action',
		playerId = 'player-1'
	): LogEntry => ({
		timestamp: Date.now(),
		playerId,
		message,
		type
	});

	describe('rendering', () => {
		it('should display the Game Log header', () => {
			render(GameLog, { props: { entries: [] } });

			expect(screen.getByText('Game Log')).toBeInTheDocument();
		});

		it('should render log entries', () => {
			const entries: LogEntry[] = [
				{ timestamp: 1000, playerId: 'p1', message: 'Player rolled the dice', type: 'roll' },
				{ timestamp: 2000, playerId: 'p1', message: 'Player gained 4 doubloons', type: 'action' }
			];

			render(GameLog, { props: { entries } });

			expect(screen.getByText('Player rolled the dice')).toBeInTheDocument();
			expect(screen.getByText('Player gained 4 doubloons')).toBeInTheDocument();
		});

		it('should render empty when no entries', () => {
			render(GameLog, { props: { entries: [] } });

			// Should only have the header, no entry elements
			expect(screen.getByText('Game Log')).toBeInTheDocument();
			expect(screen.queryByText(/rolled/)).not.toBeInTheDocument();
		});
	});

	describe('entry types', () => {
		it('should apply correct class for roll entries', () => {
			const entries = [createLogEntry('Rolled dice', 'roll')];
			const { container } = render(GameLog, { props: { entries } });

			const entry = container.querySelector('.entry-roll');
			expect(entry).toBeInTheDocument();
		});

		it('should apply correct class for combo entries', () => {
			const entries = [createLogEntry('MUTINY!', 'combo')];
			const { container } = render(GameLog, { props: { entries } });

			const entry = container.querySelector('.entry-combo');
			expect(entry).toBeInTheDocument();
		});

		it('should apply correct class for elimination entries', () => {
			const entries = [createLogEntry('Player was eliminated!', 'elimination')];
			const { container } = render(GameLog, { props: { entries } });

			const entry = container.querySelector('.entry-elimination');
			expect(entry).toBeInTheDocument();
		});

		it('should apply correct class for win entries', () => {
			const entries = [createLogEntry('Player wins!', 'win')];
			const { container } = render(GameLog, { props: { entries } });

			const entry = container.querySelector('.entry-win');
			expect(entry).toBeInTheDocument();
		});

		it('should apply correct class for summary entries', () => {
			const entries = [createLogEntry('Turn end: 2 rolls, +4 coins', 'summary')];
			const { container } = render(GameLog, { props: { entries } });

			const entry = container.querySelector('.entry-summary');
			expect(entry).toBeInTheDocument();
		});

		it('should apply correct class for action entries', () => {
			const entries = [createLogEntry('Shield absorbed damage', 'action')];
			const { container } = render(GameLog, { props: { entries } });

			const entry = container.querySelector('.entry-action');
			expect(entry).toBeInTheDocument();
		});
	});

	describe('multiple entries', () => {
		it('should render all entries in order', () => {
			const entries: LogEntry[] = [
				{ timestamp: 1000, playerId: 'p1', message: 'First message', type: 'roll' },
				{ timestamp: 2000, playerId: 'p1', message: 'Second message', type: 'action' },
				{ timestamp: 3000, playerId: 'p2', message: 'Third message', type: 'combo' }
			];

			const { container } = render(GameLog, { props: { entries } });

			const entryElements = container.querySelectorAll('.entry');
			expect(entryElements).toHaveLength(3);
		});
	});
});
