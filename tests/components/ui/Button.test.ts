import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import Button from '$lib/components/ui/Button.svelte';

// Helper to create a snippet that returns a span element
function createTextSnippet(text: string) {
	return createRawSnippet(() => ({
		render: () => `<span>${text}</span>`
	}));
}

describe('Button', () => {
	describe('rendering', () => {
		it('should render button with children text', () => {
			render(Button, {
				props: {
					children: createTextSnippet('Click Me')
				}
			});

			expect(screen.getByRole('button')).toBeInTheDocument();
			expect(screen.getByText('Click Me')).toBeInTheDocument();
		});

		it('should apply primary variant class by default', () => {
			render(Button, {
				props: {
					children: createTextSnippet('Primary')
				}
			});

			const button = screen.getByRole('button');
			expect(button).toHaveClass('btn-primary');
		});

		it('should apply secondary variant class', () => {
			render(Button, {
				props: {
					variant: 'secondary',
					children: createTextSnippet('Secondary')
				}
			});

			const button = screen.getByRole('button');
			expect(button).toHaveClass('btn-secondary');
		});

		it('should apply danger variant class', () => {
			render(Button, {
				props: {
					variant: 'danger',
					children: createTextSnippet('Danger')
				}
			});

			const button = screen.getByRole('button');
			expect(button).toHaveClass('btn-danger');
		});
	});

	describe('disabled state', () => {
		it('should be enabled by default', () => {
			render(Button, {
				props: {
					children: createTextSnippet('Button')
				}
			});

			expect(screen.getByRole('button')).not.toBeDisabled();
		});

		it('should be disabled when disabled prop is true', () => {
			render(Button, {
				props: {
					disabled: true,
					children: createTextSnippet('Button')
				}
			});

			expect(screen.getByRole('button')).toBeDisabled();
		});
	});

	describe('interactions', () => {
		it('should call onclick when clicked', async () => {
			const onclick = vi.fn();
			render(Button, {
				props: {
					onclick,
					children: createTextSnippet('Click Me')
				}
			});

			await fireEvent.click(screen.getByRole('button'));
			expect(onclick).toHaveBeenCalledTimes(1);
		});

		it('should have disabled attribute when disabled', () => {
			render(Button, {
				props: {
					disabled: true,
					children: createTextSnippet('Click Me')
				}
			});

			const button = screen.getByRole('button');
			expect(button).toBeDisabled();
			expect(button).toHaveClass('btn-primary');
		});
	});
});
