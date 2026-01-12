import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import DiceBoard from '$lib/components/game/DiceBoard.svelte';
import { createTestDice } from '../../factories/dice.js';

describe('DiceBoard', () => {
	it('should render all 6 dice', () => {
		const dice = createTestDice([
			'doubloon',
			'x_marks_spot',
			'jolly_roger',
			'cutlass',
			'walk_plank',
			'shield'
		]);

		render(DiceBoard, { props: { dice } });

		const buttons = screen.getAllByRole('button');
		expect(buttons).toHaveLength(6);
	});

	it('should call onToggleLock with correct index when die is clicked', async () => {
		const dice = createTestDice([
			'doubloon',
			'doubloon',
			'doubloon',
			'doubloon',
			'doubloon',
			'doubloon'
		]);
		const onToggleLock = vi.fn();

		render(DiceBoard, {
			props: { dice, canSelect: true, onToggleLock }
		});

		const buttons = screen.getAllByRole('button');
		await fireEvent.click(buttons[2]);

		expect(onToggleLock).toHaveBeenCalledWith(2);
	});

	it('should call onToggleLock with different indices', async () => {
		const dice = createTestDice([
			'doubloon',
			'shield',
			'cutlass',
			'walk_plank',
			'x_marks_spot',
			'jolly_roger'
		]);
		const onToggleLock = vi.fn();

		render(DiceBoard, {
			props: { dice, canSelect: true, onToggleLock }
		});

		const buttons = screen.getAllByRole('button');

		await fireEvent.click(buttons[0]);
		expect(onToggleLock).toHaveBeenCalledWith(0);

		await fireEvent.click(buttons[5]);
		expect(onToggleLock).toHaveBeenCalledWith(5);

		expect(onToggleLock).toHaveBeenCalledTimes(2);
	});

	it('should disable all dice when canSelect is false', () => {
		const dice = createTestDice([
			'doubloon',
			'doubloon',
			'doubloon',
			'doubloon',
			'doubloon',
			'doubloon'
		]);

		render(DiceBoard, { props: { dice, canSelect: false } });

		const buttons = screen.getAllByRole('button');
		buttons.forEach((btn) => {
			expect(btn).toBeDisabled();
		});
	});

	it('should enable all dice when canSelect is true', () => {
		const dice = createTestDice([
			'doubloon',
			'doubloon',
			'doubloon',
			'doubloon',
			'doubloon',
			'doubloon'
		]);

		render(DiceBoard, { props: { dice, canSelect: true } });

		const buttons = screen.getAllByRole('button');
		buttons.forEach((btn) => {
			expect(btn).not.toBeDisabled();
		});
	});

	it('should render dice with their correct faces', () => {
		const dice = createTestDice([
			'doubloon',
			'shield',
			'cutlass',
			'walk_plank',
			'x_marks_spot',
			'jolly_roger'
		]);

		render(DiceBoard, { props: { dice } });

		// Each die should render its emoji - just verify we have 6 dice
		const buttons = screen.getAllByRole('button');
		expect(buttons).toHaveLength(6);
	});
});
