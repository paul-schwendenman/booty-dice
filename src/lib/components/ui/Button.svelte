<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		variant?: 'primary' | 'secondary' | 'danger';
		disabled?: boolean;
		onclick?: () => void;
		children: Snippet;
	}

	let { variant = 'primary', disabled = false, onclick, children }: Props = $props();
</script>

<button class="btn btn-{variant}" {disabled} {onclick}>
	{@render children()}
</button>

<style>
	.btn {
		padding: 0.75rem 1.5rem;
		border: none;
		border-radius: 8px;
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
	}

	.btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.btn-primary {
		background: #d4a574;
		color: #1a1a1a;
	}

	.btn-primary:hover:not(:disabled) {
		background: #c49464;
		transform: translateY(-2px);
	}

	.btn-secondary {
		background: #444;
		color: #fff;
	}

	.btn-secondary:hover:not(:disabled) {
		background: #555;
	}

	.btn-danger {
		background: #c44;
		color: #fff;
	}

	.btn-danger:hover:not(:disabled) {
		background: #a33;
	}
</style>
