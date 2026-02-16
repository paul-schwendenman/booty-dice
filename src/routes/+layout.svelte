<script lang="ts">
	import type { Snippet } from 'svelte';
	import { browser } from '$app/environment';
	import ConnectionStatus from '$lib/components/ui/ConnectionStatus.svelte';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();
</script>

<div class="app">
	{#if browser}
		<ConnectionStatus />
	{/if}
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
