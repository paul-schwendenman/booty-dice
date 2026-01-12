import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import RulesDrawer from '$lib/components/ui/RulesDrawer.svelte';

describe('RulesDrawer', () => {
	describe('visibility', () => {
		it('should not render when closed', () => {
			const onclose = vi.fn();
			render(RulesDrawer, { props: { open: false, onclose } });

			expect(screen.queryByText('Game Rules')).not.toBeInTheDocument();
		});

		it('should render when open', () => {
			const onclose = vi.fn();
			render(RulesDrawer, { props: { open: true, onclose } });

			expect(screen.getByText('Game Rules')).toBeInTheDocument();
		});
	});

	describe('content sections', () => {
		it('should display objective section', () => {
			const onclose = vi.fn();
			render(RulesDrawer, { props: { open: true, onclose } });

			expect(screen.getByText('Objective')).toBeInTheDocument();
			expect(screen.getByText(/25 doubloons/)).toBeInTheDocument();
		});

		it('should display setup section', () => {
			const onclose = vi.fn();
			render(RulesDrawer, { props: { open: true, onclose } });

			expect(screen.getByText('Setup')).toBeInTheDocument();
			expect(screen.getByText('2-6 players')).toBeInTheDocument();
		});

		it('should display dice faces section', () => {
			const onclose = vi.fn();
			render(RulesDrawer, { props: { open: true, onclose } });

			expect(screen.getByText('Dice Faces')).toBeInTheDocument();
			expect(screen.getByText('Doubloon')).toBeInTheDocument();
			expect(screen.getByText('Cutlass')).toBeInTheDocument();
			expect(screen.getByText('Shield')).toBeInTheDocument();
		});

		it('should display combos section', () => {
			const onclose = vi.fn();
			render(RulesDrawer, { props: { open: true, onclose } });

			expect(screen.getByText('Combos')).toBeInTheDocument();
			expect(screen.getByText(/Mutiny/)).toBeInTheDocument();
			expect(screen.getByText(/Shipwreck/)).toBeInTheDocument();
			expect(screen.getByText(/Blackbeard's Curse/)).toBeInTheDocument();
		});
	});

	describe('close interactions', () => {
		it('should call onclose when close button is clicked', async () => {
			const onclose = vi.fn();
			render(RulesDrawer, { props: { open: true, onclose } });

			const closeButton = screen.getByLabelText('Close rules');
			await fireEvent.click(closeButton);

			expect(onclose).toHaveBeenCalledTimes(1);
		});

		it('should call onclose when Escape key is pressed', async () => {
			const onclose = vi.fn();
			render(RulesDrawer, { props: { open: true, onclose } });

			await fireEvent.keyDown(window, { key: 'Escape' });

			expect(onclose).toHaveBeenCalledTimes(1);
		});

		it('should call onclose when backdrop is clicked', async () => {
			const onclose = vi.fn();
			const { container } = render(RulesDrawer, { props: { open: true, onclose } });

			const backdrop = container.querySelector('.drawer-backdrop');
			await fireEvent.click(backdrop!);

			expect(onclose).toHaveBeenCalledTimes(1);
		});

		it('should not call onclose when drawer content is clicked', async () => {
			const onclose = vi.fn();
			const { container } = render(RulesDrawer, { props: { open: true, onclose } });

			const drawer = container.querySelector('.drawer');
			await fireEvent.click(drawer!);

			expect(onclose).not.toHaveBeenCalled();
		});
	});
});
