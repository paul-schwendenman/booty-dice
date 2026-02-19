<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { getSocket, attemptReconnect } from '$lib/socket/client.js';
	import { lobbyStore, myLobbyPlayer } from '$lib/stores/lobbyStore.js';
	import { playerStore } from '$lib/stores/playerStore.js';
	import { gameStore } from '$lib/stores/gameStore.js';
	import { loadSession } from '$lib/utils/session.js';
	import Button from '$lib/components/ui/Button.svelte';
	import type { Player } from '$lib/types/index.js';

	let roomCode = $derived($page.params.roomCode);
	let lobby = $derived($lobbyStore);
	let myPlayer = $derived($myLobbyPlayer);
	let player = $derived($playerStore);

	// For joining from URL
	let playerName = $state('');
	let joinError = $state('');
	let isConnected = $state(false);
	let isJoining = $state(false);
	let shareButtonText = $state('Share Link');

	// Check if user needs to join (not in the room yet)
	let needsToJoin = $derived(!myPlayer && lobby.players.length === 0 && !isJoining);

	onMount(() => {
		const socket = getSocket();

		// Track connection state
		if (socket.connected) {
			isConnected = true;
		}

		socket.on('connect', () => {
			isConnected = true;
		});

		socket.on('disconnect', () => {
			isConnected = false;
		});

		// If we don't have a room code set, we need to redirect
		if (!lobby.roomCode && roomCode) {
			lobbyStore.setRoom(roomCode, false);
		}

		socket.on('lobby:state', (players: Player[], canStart: boolean) => {
			lobbyStore.updatePlayers(players, canStart);
			isJoining = false;
			// Update player ID with new socket ID after reconnection
			const session = loadSession();
			if (session && socket.id) {
				playerStore.setPlayer(socket.id, session.playerName, session.roomCode);
				// Check if we're the host (first human player)
				const humanPlayers = players.filter((p) => !p.isAI);
				const isHost = humanPlayers.length > 0 && humanPlayers[0].id === socket.id;
				lobbyStore.setRoom(session.roomCode, isHost);
			}
		});

		socket.on('lobby:playerJoined', () => {
			// State will be updated via lobby:state
		});

		socket.on('lobby:playerLeft', (playerId: string) => {
			lobbyStore.removePlayer(playerId);
		});

		socket.on('lobby:hostChanged', (newHostId: string) => {
			const isNewHost = newHostId === socket.id;
			if (roomCode) {
				lobbyStore.setRoom(roomCode, isNewHost);
			}
		});

		socket.on('lobby:gameStarting', () => {
			// Game is starting
		});

		socket.on('game:state', (state) => {
			gameStore.set(state);
			goto(`/game/${roomCode}`);
		});

		// If we have a session but no players, try to reconnect
		if (lobby.players.length === 0) {
			const session = loadSession();
			if (roomCode && session?.roomCode === roomCode.toUpperCase() && session?.playerId) {
				attemptReconnect();
			}
		}

		return () => {
			socket.off('connect');
			socket.off('disconnect');
			socket.off('lobby:state');
			socket.off('lobby:playerJoined');
			socket.off('lobby:playerLeft');
			socket.off('lobby:hostChanged');
			socket.off('lobby:gameStarting');
			socket.off('game:state');
		};
	});

	function joinRoom() {
		if (!playerName.trim()) {
			joinError = 'Enter your pirate name!';
			return;
		}
		if (!roomCode) {
			joinError = 'Invalid room code';
			return;
		}

		const socket = getSocket();
		const normalizedCode = roomCode.toUpperCase();
		isJoining = true;
		joinError = '';

		socket.emit('lobby:join', normalizedCode, playerName, (success, errorMsg) => {
			if (success) {
				playerStore.setPlayer(socket.id ?? '', playerName, normalizedCode);
				lobbyStore.setRoom(normalizedCode, false);
			} else {
				isJoining = false;
				joinError = errorMsg || 'Failed to join room';
			}
		});
	}

	function toggleReady() {
		const socket = getSocket();
		const newReady = !myPlayer?.isReady;
		socket.emit('lobby:ready', newReady);
	}

	function addAI() {
		const socket = getSocket();
		socket.emit('lobby:addAI');
	}

	function removeAI(aiId: string) {
		const socket = getSocket();
		socket.emit('lobby:removeAI', aiId);
	}

	function startGame() {
		const socket = getSocket();
		socket.emit('lobby:startGame');
	}

	function shareLink() {
		const url = window.location.href;
		navigator.clipboard.writeText(url);
		shareButtonText = 'Copied!';
		setTimeout(() => {
			shareButtonText = 'Share Link';
		}, 2000);
	}

	function copyRoomCode() {
		if (roomCode) {
			navigator.clipboard.writeText(roomCode);
		}
	}
</script>

<main class="container">
	<div class="header">
		<a href="/" class="back-link" aria-label="Back to home">&larr;</a>
		<h1>{needsToJoin ? 'Join Game' : 'Crew Assembly'}</h1>
		<div class="room-code-bar">
			<button class="code" onclick={copyRoomCode} title="Click to copy room code">
				{roomCode}
			</button>
			{#if !needsToJoin}
				<button class="share-btn" onclick={shareLink} title="Copy invite link">
					{#if shareButtonText === 'Copied!'}
						<span class="share-icon">&#10003;</span>
					{:else}
						<span class="share-icon">&#128279;</span>
					{/if}
					<span class="share-label">{shareButtonText}</span>
				</button>
			{/if}
		</div>
	</div>

	{#if needsToJoin}
		<div class="join-section">
			<p class="join-prompt">You've been invited to join a pirate crew!</p>

			<input
				type="text"
				bind:value={playerName}
				placeholder="Your Pirate Name"
				maxlength="20"
				class="input"
				onkeydown={(e) => e.key === 'Enter' && joinRoom()}
			/>

			{#if joinError}
				<p class="error">{joinError}</p>
			{/if}

			<Button onclick={joinRoom} disabled={!isConnected || isJoining}>
				{isJoining ? 'Joining...' : 'Join Crew'}
			</Button>

			{#if !isConnected}
				<p class="hint">Connecting to server...</p>
			{/if}
		</div>
	{:else}
		<div class="players-section">
			<h2>Pirates Aboard <span class="count">{lobby.players.length}/12</span></h2>
			<div class="players-list">
				{#each lobby.players as lobbyPlayer, i (lobbyPlayer.id)}
					<div
						class="player-row"
						class:is-ready={lobbyPlayer.isReady || lobbyPlayer.isAI}
						style="animation-delay: {i * 60}ms"
					>
						<div class="player-info">
							<span class="player-avatar">{lobbyPlayer.isAI ? '🤖' : '🏴‍☠️'}</span>
							<span class="name">{lobbyPlayer.name}</span>
							{#if lobbyPlayer.id === player.id}
								<span class="badge you">You</span>
							{/if}
						</div>
						<div class="player-status">
							{#if lobbyPlayer.isReady || lobbyPlayer.isAI}
								<span class="ready">Ready</span>
							{:else}
								<span class="waiting">Waiting&hellip;</span>
							{/if}
							{#if lobby.isHost && lobbyPlayer.isAI}
								<button class="remove-btn" onclick={() => removeAI(lobbyPlayer.id)} title="Remove AI">✕</button>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		</div>

		<div class="actions">
			{#if !myPlayer?.isAI}
				<Button onclick={toggleReady} variant={myPlayer?.isReady ? 'secondary' : 'primary'}>
					{myPlayer?.isReady ? 'Not Ready' : 'Ready Up!'}
				</Button>
			{/if}

			{#if lobby.isHost}
				<div class="host-actions">
					<Button onclick={addAI} variant="secondary" disabled={lobby.players.length >= 12}>
						+ AI Pirate
					</Button>

					<Button onclick={startGame} disabled={!lobby.canStart}>
						Start Game
					</Button>
				</div>
			{/if}
		</div>

		{#if !lobby.canStart && lobby.players.length >= 2}
			<p class="hint">Waiting for all pirates to ready up&hellip;</p>
		{:else if lobby.players.length < 2}
			<p class="hint">Need at least 2 pirates to start</p>
		{/if}
	{/if}
</main>

<style>
	.container {
		max-width: 520px;
		margin: 0 auto;
		padding: 1.5rem;
		min-height: 100vh;
		display: flex;
		flex-direction: column;
	}

	/* --- Header --- */
	.header {
		text-align: center;
		margin-bottom: 2rem;
		position: relative;
	}

	.back-link {
		position: absolute;
		left: 0;
		top: 0.25rem;
		color: #887766;
		text-decoration: none;
		font-size: 1.4rem;
		line-height: 1;
		transition: color 0.2s;
	}

	.back-link:hover {
		color: #d4a574;
	}

	h1 {
		font-size: 1.6rem;
		color: #d4a574;
		margin-bottom: 1rem;
		letter-spacing: 0.5px;
	}

	/* --- Room code + share bar --- */
	.room-code-bar {
		display: inline-flex;
		align-items: center;
		gap: 2px;
		background: #232323;
		border: 1px solid #3a3a3a;
		border-radius: 8px;
		overflow: hidden;
	}

	.code {
		background: transparent;
		border: none;
		padding: 0.5rem 0.9rem;
		font-size: 1.3rem;
		font-weight: 700;
		letter-spacing: 4px;
		color: #d4a574;
		cursor: pointer;
		transition: background 0.15s;
		font-family: inherit;
	}

	.code:hover {
		background: #2e2e2e;
	}

	.share-btn {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		background: transparent;
		border: none;
		border-left: 1px solid #3a3a3a;
		padding: 0.5rem 0.75rem;
		color: #887766;
		cursor: pointer;
		transition: all 0.15s;
		font-family: inherit;
		font-size: 0.8rem;
	}

	.share-btn:hover {
		background: #2e2e2e;
		color: #d4a574;
	}

	.share-icon {
		font-size: 0.95rem;
	}

	.share-label {
		font-weight: 500;
	}

	/* --- Players --- */
	.players-section {
		margin-bottom: 1.5rem;
		flex: 1;
	}

	h2 {
		font-size: 0.8rem;
		color: #665e55;
		text-transform: uppercase;
		letter-spacing: 1.5px;
		margin-bottom: 0.75rem;
		font-weight: 600;
	}

	.count {
		color: #887766;
	}

	.players-list {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.35rem;
	}

	@media (max-width: 500px) {
		.players-list {
			grid-template-columns: 1fr;
		}
	}

	.player-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.55rem 0.7rem;
		background: #222;
		border-radius: 6px;
		border-left: 3px solid #333;
		transition: border-color 0.3s, background 0.2s;
		animation: slideIn 0.25s ease-out both;
	}

	.player-row.is-ready {
		border-left-color: #5a9a5a;
		background: #1f261f;
	}

	@keyframes slideIn {
		from {
			opacity: 0;
			transform: translateX(-8px);
		}
		to {
			opacity: 1;
			transform: translateX(0);
		}
	}

	.player-info {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		min-width: 0;
	}

	.player-avatar {
		font-size: 0.9rem;
		flex-shrink: 0;
	}

	.name {
		font-weight: 600;
		color: #ddd;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		font-size: 0.9rem;
	}

	.badge {
		font-size: 0.6rem;
		padding: 1px 5px;
		border-radius: 3px;
		text-transform: uppercase;
		font-weight: 700;
		letter-spacing: 0.5px;
	}

	.badge.you {
		background: rgba(90, 154, 90, 0.3);
		color: #8cbe8c;
		border: 1px solid rgba(90, 154, 90, 0.3);
	}

	.player-status {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		flex-shrink: 0;
		white-space: nowrap;
	}

	.ready {
		color: #6ab06a;
		font-weight: 600;
		font-size: 0.78rem;
	}

	.waiting {
		color: #666;
		font-size: 0.78rem;
	}

	.remove-btn {
		background: transparent;
		border: 1px solid #553333;
		color: #c66;
		width: 22px;
		height: 22px;
		border-radius: 4px;
		cursor: pointer;
		font-size: 0.7rem;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.15s;
	}

	.remove-btn:hover {
		background: #442222;
		border-color: #c44;
		color: #fff;
	}

	/* --- Actions --- */
	.actions {
		display: flex;
		flex-direction: column;
		gap: 0.65rem;
	}

	.host-actions {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.65rem;
	}

	@media (max-width: 400px) {
		.host-actions {
			grid-template-columns: 1fr;
		}
	}

	.hint {
		text-align: center;
		color: #665e55;
		margin-top: 1.25rem;
		font-size: 0.85rem;
	}

	/* --- Join form --- */
	.join-section {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		margin-top: 0.5rem;
	}

	.join-prompt {
		text-align: center;
		color: #bbb;
		font-size: 1.05rem;
	}

	.input {
		width: 100%;
		padding: 0.85rem 1rem;
		border: 1px solid #333;
		border-radius: 8px;
		background: #222;
		color: #eee;
		font-size: 1rem;
		box-sizing: border-box;
		transition: border-color 0.2s;
		font-family: inherit;
	}

	.input:focus {
		outline: none;
		border-color: #d4a574;
	}

	.input::placeholder {
		color: #555;
	}

	.error {
		color: #e77;
		text-align: center;
		font-size: 0.9rem;
	}
</style>
