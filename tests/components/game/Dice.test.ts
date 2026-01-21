import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import Dice from '$lib/components/game/Dice.svelte';
import { createTestDie } from '../../factories/dice.js';
import { FACE_EMOJI } from '$lib/types/index.js';

describe('Dice', () => {
	describe('rendering', () => {
		it('should display correct emoji for doubloon', () => {
			const die = createTestDie({ face: 'doubloon' });
			render(Dice, { props: { die } });

			expect(screen.getByText(FACE_EMOJI.doubloon)).toBeInTheDocument();
		});

		it('should display correct emoji for each face type', () => {
			const faces = [
				'doubloon',
				'x_marks_spot',
				'jolly_roger',
				'cutlass',
				'walk_plank',
				'shield'
			] as const;

			faces.forEach((face) => {
				const die = createTestDie({ face });
				const { unmount } = render(Dice, { props: { die } });

				expect(screen.getByText(FACE_EMOJI[face])).toBeInTheDocument();
				unmount();
			});
		});

		it('should show lock indicator when die is locked', () => {
			const die = createTestDie({ locked: true });
			render(Dice, { props: { die } });

			expect(screen.getByText('🔒')).toBeInTheDocument();
		});

		it('should not show lock indicator when die is unlocked', () => {
			const die = createTestDie({ locked: false });
			render(Dice, { props: { die } });

			expect(screen.queryByText('🔒')).not.toBeInTheDocument();
		});
	});

	describe('styling', () => {
		it('should have locked class when die is locked', () => {
			const die = createTestDie({ locked: true });
			render(Dice, { props: { die } });

			const button = screen.getByRole('button');
			expect(button).toHaveClass('locked');
		});

		it('should have rolling class when die is rolling', () => {
			const die = createTestDie({ rolling: true });
			render(Dice, { props: { die } });

			const button = screen.getByRole('button');
			expect(button).toHaveClass('rolling');
		});

		it('should have selectable class when selectable prop is true', () => {
			const die = createTestDie();
			render(Dice, { props: { die, selectable: true } });

			const button = screen.getByRole('button');
			expect(button).toHaveClass('selectable');
		});

		it('should not have selectable class when selectable is false', () => {
			const die = createTestDie();
			render(Dice, { props: { die, selectable: false } });

			const button = screen.getByRole('button');
			expect(button).not.toHaveClass('selectable');
		});
	});

	describe('interactions', () => {
		it('should call onclick when clicked and selectable', async () => {
			const die = createTestDie();
			const onclick = vi.fn();

			render(Dice, { props: { die, selectable: true, onclick } });

			const button = screen.getByRole('button');
			await fireEvent.click(button);

			expect(onclick).toHaveBeenCalledTimes(1);
		});

		it('should be disabled when not selectable', () => {
			const die = createTestDie();
			render(Dice, { props: { die, selectable: false } });

			const button = screen.getByRole('button');
			expect(button).toBeDisabled();
		});

		it('should be enabled when selectable', () => {
			const die = createTestDie();
			render(Dice, { props: { die, selectable: true } });

			const button = screen.getByRole('button');
			expect(button).not.toBeDisabled();
		});
	});
});
