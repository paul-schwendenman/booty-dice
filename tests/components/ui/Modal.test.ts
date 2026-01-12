import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import Modal from '$lib/components/ui/Modal.svelte';

function createTextSnippet(text: string) {
	return createRawSnippet(() => ({
		render: () => `<span>${text}</span>`
	}));
}

describe('Modal', () => {
	describe('visibility', () => {
		it('should not render when show is false', () => {
			render(Modal, {
				props: {
					show: false,
					children: createTextSnippet('Content')
				}
			});

			expect(screen.queryByText('Content')).not.toBeInTheDocument();
		});

		it('should render when show is true', () => {
			render(Modal, {
				props: {
					show: true,
					children: createTextSnippet('Content')
				}
			});

			expect(screen.getByText('Content')).toBeInTheDocument();
		});
	});

	describe('title', () => {
		it('should not render title when not provided', () => {
			const { container } = render(Modal, {
				props: {
					show: true,
					children: createTextSnippet('Content')
				}
			});

			expect(container.querySelector('.modal-title')).not.toBeInTheDocument();
		});

		it('should render title when provided', () => {
			render(Modal, {
				props: {
					show: true,
					title: 'Modal Title',
					children: createTextSnippet('Content')
				}
			});

			expect(screen.getByText('Modal Title')).toBeInTheDocument();
		});
	});

	describe('structure', () => {
		it('should have modal backdrop', () => {
			const { container } = render(Modal, {
				props: {
					show: true,
					children: createTextSnippet('Content')
				}
			});

			expect(container.querySelector('.modal-backdrop')).toBeInTheDocument();
		});

		it('should have modal container', () => {
			const { container } = render(Modal, {
				props: {
					show: true,
					children: createTextSnippet('Content')
				}
			});

			expect(container.querySelector('.modal')).toBeInTheDocument();
		});

		it('should have modal content area', () => {
			const { container } = render(Modal, {
				props: {
					show: true,
					children: createTextSnippet('Content')
				}
			});

			expect(container.querySelector('.modal-content')).toBeInTheDocument();
		});
	});
});
