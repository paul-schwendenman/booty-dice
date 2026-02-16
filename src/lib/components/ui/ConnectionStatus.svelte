<script lang="ts">
	import { connectionStore } from '$lib/stores/connectionStore.js';

	let connection = $derived($connectionStore);
	let visible = $derived(
		connection.state === 'disconnected' ||
			connection.state === 'reconnecting' ||
			connection.state === 'error'
	);
</script>

{#if visible}
	<div class="connection-banner" class:error={connection.state === 'error'}>
		{#if connection.state === 'reconnecting'}
			Reconnecting...
		{:else if connection.state === 'disconnected'}
			Disconnected from server
		{:else if connection.state === 'error'}
			{connection.errorMessage || 'Connection error'}
		{/if}
	</div>
{/if}

<style>
	.connection-banner {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		z-index: 1000;
		padding: 0.5rem 1rem;
		text-align: center;
		font-size: 0.85rem;
		font-weight: 600;
		background: #b8860b;
		color: #fff;
	}

	.connection-banner.error {
		background: #c44;
	}
</style>
