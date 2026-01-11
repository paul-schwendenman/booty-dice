<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		show: boolean;
		title?: string;
		children: Snippet;
	}

	let { show, title, children }: Props = $props();
</script>

{#if show}
	<div class="modal-backdrop">
		<div class="modal">
			{#if title}
				<h2 class="modal-title">{title}</h2>
			{/if}
			<div class="modal-content">
				{@render children()}
			</div>
		</div>
	</div>
{/if}

<style>
	.modal-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.8);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
	}

	.modal {
		background: #2a2a2a;
		border-radius: 12px;
		padding: 2rem;
		max-width: 500px;
		width: 90%;
		box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
	}

	.modal-title {
		margin: 0 0 1rem;
		text-align: center;
		color: #d4a574;
	}

	.modal-content {
		color: #eee;
	}
</style>
