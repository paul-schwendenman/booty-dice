<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { getSocket } from '$lib/socket/client.js';
	import { lobbyStore } from '$lib/stores/lobbyStore.js';
	import { playerStore } from '$lib/stores/playerStore.js';
	import { gameStore } from '$lib/stores/gameStore.js';
	import { loadSession } from '$lib/utils/session.js';
	import Button from '$lib/components/ui/Button.svelte';

	let playerName = $state('');
	let joinCode = $state('');
	let error = $state('');
	let isConnected = $state(false);

	onMount(() => {
		const socket = getSocket();

		// Handle reconnection responses - navigate to the right place
		socket.on('game:state', (state) => {
			const session = loadSession();
			if (session?.roomCode) {
				gameStore.set(state);
				goto(`/game/${session.roomCode}`);
			}
		});

		socket.on('lobby:state', (players, canStart) => {
			const session = loadSession();
			if (session?.roomCode) {
				lobbyStore.updatePlayers(players, canStart);
				lobbyStore.setRoom(session.roomCode, players[0]?.id === socket.id);
				goto(`/lobby/${session.roomCode}`);
			}
		});

		socket.on('connect', () => {
			isConnected = true;
		});

		socket.on('disconnect', () => {
			isConnected = false;
		});

		if (socket.connected) {
			isConnected = true;
		}

		return () => {
			socket.off('connect');
			socket.off('disconnect');
			socket.off('game:state');
			socket.off('lobby:state');
		};
	});

	function createRoom() {
		if (!playerName.trim()) {
			error = 'Enter your pirate name!';
			return;
		}

		const socket = getSocket();

		socket.emit('lobby:create', playerName, (roomCode) => {
			playerStore.setPlayer(socket.id ?? '', playerName, roomCode);
			lobbyStore.setRoom(roomCode, true);
			goto(`/lobby/${roomCode}`);
		});
	}

	function joinRoom() {
		if (!playerName.trim()) {
			error = 'Enter your pirate name!';
			return;
		}
		if (!joinCode.trim()) {
			error = 'Enter a room code!';
			return;
		}

		const socket = getSocket();
		const normalizedCode = joinCode.toUpperCase();

		socket.emit('lobby:join', normalizedCode, playerName, (success, errorMsg) => {
			if (success) {
				playerStore.setPlayer(socket.id ?? '', playerName, normalizedCode);
				lobbyStore.setRoom(normalizedCode, false);
				goto(`/lobby/${normalizedCode}`);
			} else {
				error = errorMsg || 'Failed to join room';
			}
		});
	}
</script>

<main class="container">
	<div class="hero">
		<h1>🏴‍☠️ Booty Dice</h1>
		<p class="tagline">Roll for the gold or die trying!</p>
	</div>

	<div class="form-section">
		<input
			type="text"
			bind:value={playerName}
			placeholder="Your Pirate Name"
			maxlength="20"
			class="input"
		/>

		{#if error}
			<p class="error">{error}</p>
		{/if}

		<Button onclick={createRoom} disabled={!isConnected}>Create Room</Button>

		<div class="divider">
			<span>or join existing</span>
		</div>

		<div class="join-section">
			<input
				type="text"
				bind:value={joinCode}
				placeholder="Room Code"
				maxlength="6"
				class="input input-code"
			/>
			<Button onclick={joinRoom} variant="secondary" disabled={!isConnected}>Join</Button>
		</div>

		<a href="/browse" class="browse-link">Browse Active Lobbies</a>
	</div>

	{#if !isConnected}
		<p class="connecting">Connecting to server...</p>
	{/if}
</main>

<style>
	.container {
		max-width: 400px;
		margin: 0 auto;
		padding: 2rem;
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		justify-content: center;
	}

	.hero {
		text-align: center;
		margin-bottom: 3rem;
	}

	h1 {
		font-size: 2.5rem;
		margin-bottom: 0.5rem;
		color: #d4a574;
	}

	.tagline {
		color: #888;
		font-style: italic;
	}

	.form-section {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.input {
		width: 100%;
		padding: 1rem;
		border: 2px solid #333;
		border-radius: 8px;
		background: #2a2a2a;
		color: #eee;
		font-size: 1rem;
	}

	.input:focus {
		outline: none;
		border-color: #d4a574;
	}

	.input::placeholder {
		color: #666;
	}

	.input-code {
		text-transform: uppercase;
		letter-spacing: 2px;
		text-align: center;
	}

	.divider {
		display: flex;
		align-items: center;
		gap: 1rem;
		margin: 0.5rem 0;
	}

	.divider::before,
	.divider::after {
		content: '';
		flex: 1;
		height: 1px;
		background: #333;
	}

	.divider span {
		color: #666;
		font-size: 0.9rem;
	}

	.join-section {
		display: flex;
		gap: 0.75rem;
	}

	.join-section .input {
		flex: 1;
	}

	.error {
		color: #e77;
		text-align: center;
		font-size: 0.9rem;
	}

	.connecting {
		text-align: center;
		color: #888;
		margin-top: 2rem;
	}

	.browse-link {
		display: block;
		text-align: center;
		color: #888;
		text-decoration: none;
		margin-top: 1.5rem;
		font-size: 0.9rem;
	}

	.browse-link:hover {
		color: #d4a574;
		text-decoration: underline;
	}
</style>
