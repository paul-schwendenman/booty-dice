<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { getSocket } from '$lib/socket/client.js';
	import { browseStore } from '$lib/stores/browseStore.js';
	import { playerStore } from '$lib/stores/playerStore.js';
	import { lobbyStore } from '$lib/stores/lobbyStore.js';
	import Button from '$lib/components/ui/Button.svelte';
	import type { LobbyInfo } from '$lib/types/index.js';

	let browse = $derived($browseStore);
	let isConnected = $state(false);

	// Join modal state
	let selectedLobby = $state<LobbyInfo | null>(null);
	let playerName = $state('');
	let joinError = $state('');
	let isJoining = $state(false);

	onMount(() => {
		const socket = getSocket();

		if (socket.connected) {
			isConnected = true;
		}

		socket.on('connect', () => {
			isConnected = true;
			socket.emit('browse:subscribe');
		});

		socket.on('disconnect', () => {
			isConnected = false;
		});

		socket.on('browse:lobbies', (lobbies) => {
			browseStore.setLobbies(lobbies);
		});

		// Subscribe to browse updates
		if (socket.connected) {
			socket.emit('browse:subscribe');
		}

		return () => {
			socket.emit('browse:unsubscribe');
			socket.off('connect');
			socket.off('disconnect');
			socket.off('browse:lobbies');
			browseStore.reset();
		};
	});

	function openJoinModal(lobby: LobbyInfo) {
		selectedLobby = lobby;
		joinError = '';
		playerName = '';
	}

	function closeModal() {
		selectedLobby = null;
		joinError = '';
		playerName = '';
		isJoining = false;
	}

	function joinLobby() {
		if (!playerName.trim()) {
			joinError = 'Enter your pirate name!';
			return;
		}
		if (!selectedLobby) return;

		const socket = getSocket();
		const roomCode = selectedLobby.code;
		isJoining = true;
		joinError = '';

		socket.emit('lobby:join', roomCode, playerName, (success, errorMsg) => {
			if (success) {
				playerStore.setPlayer(socket.id ?? '', playerName, roomCode);
				lobbyStore.setRoom(roomCode, false);
				goto(`/lobby/${roomCode}`);
			} else {
				isJoining = false;
				joinError = errorMsg || 'Failed to join room';
			}
		});
	}

	function formatTime(timestamp: number): string {
		const diff = Date.now() - timestamp;
		const minutes = Math.floor(diff / 60000);
		if (minutes < 1) return 'Just now';
		if (minutes === 1) return '1 min ago';
		if (minutes < 60) return `${minutes} mins ago`;
		const hours = Math.floor(minutes / 60);
		if (hours === 1) return '1 hour ago';
		return `${hours} hours ago`;
	}
</script>

<main class="container">
	<div class="header">
		<h1>Browse Lobbies</h1>
		<p class="subtitle">Find a crew to join</p>
	</div>

	{#if browse.isLoading}
		<div class="loading">
			<p>Loading lobbies...</p>
		</div>
	{:else if browse.lobbies.length === 0}
		<div class="empty">
			<p>No active lobbies found</p>
			<p class="hint">Create your own room or check back later!</p>
		</div>
	{:else}
		<div class="lobbies-list">
			{#each browse.lobbies as lobby (lobby.code)}
				<button class="lobby-card" onclick={() => openJoinModal(lobby)}>
					<div class="lobby-header">
						<span class="room-code">{lobby.code}</span>
						<span class="player-count">{lobby.playerCount}/{lobby.maxPlayers}</span>
					</div>
					<div class="lobby-info">
						<span class="host">Host: {lobby.hostName}</span>
						<span class="created">{formatTime(lobby.createdAt)}</span>
					</div>
					<div class="players-preview">
						{#each lobby.players as player}
							<span class="player-tag" class:ai={player.isAI}>
								{player.name}
								{#if player.isAI}<span class="ai-badge">AI</span>{/if}
							</span>
						{/each}
					</div>
				</button>
			{/each}
		</div>
	{/if}

	<div class="footer">
		<a href="/" class="back-link">Back to Home</a>
	</div>

	{#if !isConnected}
		<p class="connecting">Connecting to server...</p>
	{/if}
</main>

<!-- Join Modal -->
{#if selectedLobby}
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<div
		class="modal-overlay"
		onclick={closeModal}
		onkeydown={(e) => e.key === 'Escape' && closeModal()}
		role="dialog"
		aria-modal="true"
		tabindex="-1"
	>
		<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_noninteractive_element_interactions -->
		<div class="modal" onclick={(e) => e.stopPropagation()} role="document">
			<h2>Join {selectedLobby.hostName}'s Crew</h2>
			<p class="modal-code">Room: {selectedLobby.code}</p>

			<div class="modal-players">
				<span class="label">Current crew:</span>
				{#each selectedLobby.players as player}
					<span class="player-tag" class:ai={player.isAI}>
						{player.name}
						{#if player.isAI}<span class="ai-badge">AI</span>{/if}
					</span>
				{/each}
			</div>

			<input
				type="text"
				bind:value={playerName}
				placeholder="Your Pirate Name"
				maxlength="20"
				class="input"
				onkeydown={(e) => e.key === 'Enter' && joinLobby()}
			/>

			{#if joinError}
				<p class="error">{joinError}</p>
			{/if}

			<div class="modal-actions">
				<Button onclick={joinLobby} disabled={!isConnected || isJoining}>
					{isJoining ? 'Joining...' : 'Join Crew'}
				</Button>
				<Button onclick={closeModal} variant="secondary">Cancel</Button>
			</div>
		</div>
	</div>
{/if}

<style>
	.container {
		max-width: 600px;
		margin: 0 auto;
		padding: 2rem;
		min-height: 100vh;
	}

	.header {
		text-align: center;
		margin-bottom: 2rem;
	}

	h1 {
		font-size: 2rem;
		color: #d4a574;
		margin-bottom: 0.5rem;
	}

	.subtitle {
		color: #888;
		font-style: italic;
	}

	.loading,
	.empty {
		text-align: center;
		padding: 3rem 1rem;
		color: #888;
	}

	.empty .hint {
		font-size: 0.9rem;
		margin-top: 0.5rem;
	}

	.lobbies-list {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.lobby-card {
		background: #2a2a2a;
		border: 2px solid #333;
		border-radius: 12px;
		padding: 1rem;
		cursor: pointer;
		transition: all 0.2s;
		text-align: left;
		width: 100%;
	}

	.lobby-card:hover {
		border-color: #d4a574;
		background: #333;
	}

	.lobby-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.5rem;
	}

	.room-code {
		font-size: 1.25rem;
		font-weight: bold;
		color: #d4a574;
		letter-spacing: 2px;
	}

	.player-count {
		background: #444;
		padding: 0.25rem 0.75rem;
		border-radius: 12px;
		font-size: 0.9rem;
		color: #ccc;
	}

	.lobby-info {
		display: flex;
		justify-content: space-between;
		font-size: 0.85rem;
		color: #888;
		margin-bottom: 0.75rem;
	}

	.players-preview {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.player-tag {
		background: #3a3a3a;
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		font-size: 0.8rem;
		color: #ccc;
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}

	.player-tag.ai {
		background: #444;
	}

	.ai-badge {
		font-size: 0.65rem;
		background: #555;
		padding: 1px 4px;
		border-radius: 2px;
		color: #aaa;
	}

	.footer {
		margin-top: 2rem;
		text-align: center;
	}

	.back-link {
		color: #888;
		text-decoration: none;
		font-size: 0.9rem;
	}

	.back-link:hover {
		color: #d4a574;
		text-decoration: underline;
	}

	.connecting {
		text-align: center;
		color: #888;
		margin-top: 2rem;
	}

	/* Modal styles */
	.modal-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.8);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 100;
		padding: 1rem;
	}

	.modal {
		background: #1e1e1e;
		border: 2px solid #333;
		border-radius: 12px;
		padding: 2rem;
		max-width: 400px;
		width: 100%;
	}

	.modal h2 {
		font-size: 1.25rem;
		color: #d4a574;
		margin-bottom: 0.5rem;
	}

	.modal-code {
		color: #888;
		font-size: 0.9rem;
		margin-bottom: 1rem;
	}

	.modal-players {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		align-items: center;
		margin-bottom: 1.5rem;
	}

	.modal-players .label {
		color: #888;
		font-size: 0.85rem;
		margin-right: 0.25rem;
	}

	.input {
		width: 100%;
		padding: 1rem;
		border: 2px solid #333;
		border-radius: 8px;
		background: #2a2a2a;
		color: #eee;
		font-size: 1rem;
		box-sizing: border-box;
		margin-bottom: 1rem;
	}

	.input:focus {
		outline: none;
		border-color: #d4a574;
	}

	.input::placeholder {
		color: #666;
	}

	.error {
		color: #e77;
		text-align: center;
		font-size: 0.9rem;
		margin-bottom: 1rem;
	}

	.modal-actions {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}
</style>
