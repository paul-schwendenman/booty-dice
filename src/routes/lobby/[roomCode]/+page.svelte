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
		<h1>🏴‍☠️ {needsToJoin ? 'Join Game' : 'Crew Assembly'}</h1>
		<div class="room-code">
			<span class="label">Room Code:</span>
			<button class="code" onclick={copyRoomCode} title="Click to copy">
				{roomCode}
			</button>
		</div>
	</div>

	{#if needsToJoin}
		<!-- Join form for users visiting via shared link -->
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

			<a href="/" class="back-link">Back to Home</a>
		</div>
	{:else}
		<!-- Share button -->
		<div class="share-section">
			<Button onclick={shareLink} variant="secondary">
				{shareButtonText}
			</Button>
		</div>

		<div class="players-section">
			<h2>Pirates ({lobby.players.length}/6)</h2>
			<div class="players-list">
				{#each lobby.players as lobbyPlayer (lobbyPlayer.id)}
					<div class="player-row">
						<div class="player-info">
							<span class="name">{lobbyPlayer.name}</span>
							{#if lobbyPlayer.isAI}
								<span class="badge ai">AI</span>
							{/if}
							{#if lobbyPlayer.id === player.id}
								<span class="badge you">You</span>
							{/if}
						</div>
						<div class="player-status">
							{#if lobbyPlayer.isReady || lobbyPlayer.isAI}
								<span class="ready">Ready ✓</span>
							{:else}
								<span class="waiting">Waiting...</span>
							{/if}
							{#if lobby.isHost && lobbyPlayer.isAI}
								<button class="remove-btn" onclick={() => removeAI(lobbyPlayer.id)}>✕</button>
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
				<Button onclick={addAI} variant="secondary" disabled={lobby.players.length >= 6}>
					Add AI Pirate
				</Button>

				<Button onclick={startGame} disabled={!lobby.canStart}>
					Start Game
				</Button>
			{/if}
		</div>

		{#if !lobby.canStart && lobby.players.length >= 2}
			<p class="hint">Waiting for all pirates to ready up...</p>
		{:else if lobby.players.length < 2}
			<p class="hint">Need at least 2 pirates to start</p>
		{/if}
	{/if}
</main>

<style>
	.container {
		max-width: 500px;
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
		margin-bottom: 1rem;
	}

	.room-code {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
	}

	.label {
		color: #888;
	}

	.code {
		background: #2a2a2a;
		border: 2px solid #d4a574;
		border-radius: 6px;
		padding: 0.5rem 1rem;
		font-size: 1.5rem;
		font-weight: bold;
		letter-spacing: 3px;
		color: #d4a574;
		cursor: pointer;
		transition: all 0.2s;
	}

	.code:hover {
		background: #3a3a3a;
	}

	.players-section {
		margin-bottom: 2rem;
	}

	h2 {
		font-size: 1rem;
		color: #888;
		text-transform: uppercase;
		letter-spacing: 1px;
		margin-bottom: 1rem;
	}

	.players-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.player-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem;
		background: #2a2a2a;
		border-radius: 8px;
	}

	.player-info {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.name {
		font-weight: 600;
		color: #eee;
	}

	.badge {
		font-size: 0.65rem;
		padding: 2px 6px;
		border-radius: 4px;
		text-transform: uppercase;
		font-weight: 600;
	}

	.badge.ai {
		background: #555;
		color: #ccc;
	}

	.badge.you {
		background: #4a7c4a;
		color: #fff;
	}

	.player-status {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.ready {
		color: #7c7;
		font-weight: 600;
	}

	.waiting {
		color: #888;
	}

	.remove-btn {
		background: #c44;
		border: none;
		color: white;
		width: 24px;
		height: 24px;
		border-radius: 4px;
		cursor: pointer;
		font-size: 0.8rem;
	}

	.remove-btn:hover {
		background: #a33;
	}

	.actions {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.hint {
		text-align: center;
		color: #888;
		margin-top: 1.5rem;
		font-size: 0.9rem;
	}

	.join-section {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		margin-top: 1rem;
	}

	.join-prompt {
		text-align: center;
		color: #ccc;
		font-size: 1.1rem;
		margin-bottom: 0.5rem;
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
	}

	.share-section {
		margin-bottom: 1.5rem;
	}

	.back-link {
		display: block;
		text-align: center;
		color: #888;
		text-decoration: none;
		margin-top: 1rem;
		font-size: 0.9rem;
	}

	.back-link:hover {
		color: #d4a574;
		text-decoration: underline;
	}
</style>
