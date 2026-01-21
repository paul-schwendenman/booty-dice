<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();
</script>

<div class="app">
	{@render children()}
</div>

<style>
	:global(*) {
		box-sizing: border-box;
		margin: 0;
		padding: 0;
	}

	:global(body) {
		font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
		background: #1a1a1a;
		color: #eee;
		min-height: 100vh;
	}

	.app {
		min-height: 100vh;
	}
</style>
