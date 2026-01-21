<script lang="ts">
	import type { Player } from '$lib/types/index.js';

	interface Props {
		player: Player;
		isCurrentTurn?: boolean;
		isTargetable?: boolean;
		isMe?: boolean;
		onSelect?: () => void;
	}

	let {
		player,
		isCurrentTurn = false,
		isTargetable = false,
		isMe = false,
		onSelect
	}: Props = $props();
</script>

<button
	class="player-card"
	class:current-turn={isCurrentTurn}
	class:eliminated={player.isEliminated}
	class:targetable={isTargetable}
	class:is-me={isMe}
	class:ai={player.isAI}
	onclick={() => isTargetable && onSelect?.()}
	disabled={!isTargetable}
>
	<div class="header">
		<span class="name">{player.name}</span>
		{#if player.isAI}
			<span class="badge ai-badge">AI</span>
		{/if}
		{#if isMe}
			<span class="badge me-badge">You</span>
		{/if}
		{#if !player.isConnected}
			<span class="badge disconnected">Offline</span>
		{/if}
	</div>

	<div class="stats">
		<div class="stat">
			<span class="icon">🪙</span>
			<span class="value">{player.doubloons}</span>
		</div>
		<div class="stat">
			<span class="icon">❤️</span>
			<span class="value">{player.lives}</span>
		</div>
		<div class="stat">
			<span class="icon">🛡️</span>
			<span class="value">{player.shields}</span>
		</div>
	</div>

	{#if player.isEliminated}
		<div class="eliminated-overlay">ELIMINATED</div>
	{/if}
</button>

<style>
	.player-card {
		padding: 1rem;
		background: #2a2a2a;
		border-radius: 10px;
		border: 3px solid transparent;
		position: relative;
		text-align: left;
		width: 100%;
		cursor: default;
		transition: all 0.2s;
	}

	.player-card.current-turn {
		border-color: #d4a574;
		box-shadow: 0 0 15px rgba(212, 165, 116, 0.4);
	}

	.player-card.is-me {
		background: #2d3a2d;
	}

	.player-card.targetable {
		cursor: pointer;
		border-color: #c44;
	}

	.player-card.targetable:hover {
		background: #3a2a2a;
		transform: scale(1.02);
	}

	.player-card.eliminated {
		opacity: 0.5;
	}

	.eliminated-overlay {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(0, 0, 0, 0.7);
		color: #c44;
		font-weight: bold;
		font-size: 1.1rem;
		border-radius: 8px;
		letter-spacing: 2px;
	}

	.header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 0.75rem;
	}

	.name {
		font-weight: 600;
		color: #eee;
		font-size: 1.1rem;
	}

	.badge {
		font-size: 0.65rem;
		padding: 2px 6px;
		border-radius: 4px;
		font-weight: 600;
		text-transform: uppercase;
	}

	.ai-badge {
		background: #555;
		color: #ccc;
	}

	.me-badge {
		background: #4a7c4a;
		color: #fff;
	}

	.disconnected {
		background: #c44;
		color: #fff;
	}

	.stats {
		display: flex;
		gap: 1.25rem;
	}

	.stat {
		display: flex;
		align-items: center;
		gap: 0.35rem;
	}

	.icon {
		font-size: 1.1rem;
	}

	.value {
		font-weight: 600;
		font-size: 1.1rem;
		color: #eee;
	}
</style>
