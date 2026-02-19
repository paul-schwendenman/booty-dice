import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import PlayerCard from '$lib/components/game/PlayerCard.svelte';
import { createTestPlayer, resetPlayerIdCounter } from '../../factories/player.js';

describe('PlayerCard', () => {
	beforeEach(() => {
		resetPlayerIdCounter();
	});

	describe('rendering', () => {
		it('should display player name', () => {
			const player = createTestPlayer({ name: 'Captain Jack' });
			render(PlayerCard, { props: { player } });

			expect(screen.getByText('Captain Jack')).toBeInTheDocument();
		});

		it('should display player doubloons', () => {
			const player = createTestPlayer({ doubloons: 15 });
			render(PlayerCard, { props: { player } });

			expect(screen.getByText('🪙15')).toBeInTheDocument();
		});

		it('should display player lives', () => {
			const player = createTestPlayer({ lives: 7 });
			render(PlayerCard, { props: { player } });

			expect(screen.getByText('❤️7')).toBeInTheDocument();
		});

		it('should display player shields', () => {
			const player = createTestPlayer({ shields: 2 });
			render(PlayerCard, { props: { player } });

			expect(screen.getByText('🛡️2')).toBeInTheDocument();
		});

		it('should show AI badge for AI players', () => {
			const player = createTestPlayer({ isAI: true });
			render(PlayerCard, { props: { player } });

			expect(screen.getByText('AI')).toBeInTheDocument();
		});

		it('should not show AI badge for human players', () => {
			const player = createTestPlayer({ isAI: false });
			render(PlayerCard, { props: { player } });

			expect(screen.queryByText('AI')).not.toBeInTheDocument();
		});

		it('should show You badge when isMe is true', () => {
			const player = createTestPlayer();
			render(PlayerCard, { props: { player, isMe: true } });

			expect(screen.getByText('You')).toBeInTheDocument();
		});

		it('should not show You badge when isMe is false', () => {
			const player = createTestPlayer();
			render(PlayerCard, { props: { player, isMe: false } });

			expect(screen.queryByText('You')).not.toBeInTheDocument();
		});

		it('should show DC badge for disconnected players', () => {
			const player = createTestPlayer({ isConnected: false });
			render(PlayerCard, { props: { player } });

			expect(screen.getByText('DC')).toBeInTheDocument();
		});

		it('should not show DC badge for connected players', () => {
			const player = createTestPlayer({ isConnected: true });
			render(PlayerCard, { props: { player } });

			expect(screen.queryByText('DC')).not.toBeInTheDocument();
		});

		it('should show ELIMINATED overlay for eliminated players', () => {
			const player = createTestPlayer({ isEliminated: true });
			render(PlayerCard, { props: { player } });

			expect(screen.getByText('ELIMINATED')).toBeInTheDocument();
		});

		it('should not show ELIMINATED overlay for alive players', () => {
			const player = createTestPlayer({ isEliminated: false });
			render(PlayerCard, { props: { player } });

			expect(screen.queryByText('ELIMINATED')).not.toBeInTheDocument();
		});
	});

	describe('styling', () => {
		it('should have current-turn class when isCurrentTurn is true', () => {
			const player = createTestPlayer();
			render(PlayerCard, {
				props: { player, isCurrentTurn: true }
			});

			const button = screen.getByRole('button');
			expect(button).toHaveClass('current-turn');
		});

		it('should have targetable class when isTargetable is true', () => {
			const player = createTestPlayer();
			render(PlayerCard, {
				props: { player, isTargetable: true }
			});

			const button = screen.getByRole('button');
			expect(button).toHaveClass('targetable');
		});

		it('should have is-me class when isMe is true', () => {
			const player = createTestPlayer();
			render(PlayerCard, {
				props: { player, isMe: true }
			});

			const button = screen.getByRole('button');
			expect(button).toHaveClass('is-me');
		});

		it('should have eliminated class when player is eliminated', () => {
			const player = createTestPlayer({ isEliminated: true });
			render(PlayerCard, { props: { player } });

			const button = screen.getByRole('button');
			expect(button).toHaveClass('eliminated');
		});

		it('should have ai class when player is AI', () => {
			const player = createTestPlayer({ isAI: true });
			render(PlayerCard, { props: { player } });

			const button = screen.getByRole('button');
			expect(button).toHaveClass('ai');
		});
	});

	describe('interactions', () => {
		it('should call onSelect when clicked and targetable', async () => {
			const player = createTestPlayer();
			const onSelect = vi.fn();

			render(PlayerCard, {
				props: { player, isTargetable: true, onSelect }
			});

			const button = screen.getByRole('button');
			await fireEvent.click(button);

			expect(onSelect).toHaveBeenCalledTimes(1);
		});

		it('should not call onSelect when clicked and not targetable', async () => {
			const player = createTestPlayer();
			const onSelect = vi.fn();

			render(PlayerCard, {
				props: { player, isTargetable: false, onSelect }
			});

			const button = screen.getByRole('button');
			await fireEvent.click(button);

			expect(onSelect).not.toHaveBeenCalled();
		});

		it('should be disabled when not targetable', () => {
			const player = createTestPlayer();
			render(PlayerCard, {
				props: { player, isTargetable: false }
			});

			const button = screen.getByRole('button');
			expect(button).toBeDisabled();
		});

		it('should be enabled when targetable', () => {
			const player = createTestPlayer();
			render(PlayerCard, {
				props: { player, isTargetable: true }
			});

			const button = screen.getByRole('button');
			expect(button).not.toBeDisabled();
		});
	});
});
