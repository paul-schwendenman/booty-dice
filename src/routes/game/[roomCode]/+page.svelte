<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { getSocket, attemptReconnect } from '$lib/socket/client.js';
	import {
		gameStore,
		currentPlayer,
		myPlayer,
		isMyTurn,
		otherAlivePlayers
	} from '$lib/stores/gameStore.js';
	import { playerStore } from '$lib/stores/playerStore.js';
	import { loadSession } from '$lib/utils/session.js';
	import Button from '$lib/components/ui/Button.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import RulesDrawer from '$lib/components/ui/RulesDrawer.svelte';
	import DiceBoard from '$lib/components/game/DiceBoard.svelte';
	import PlayerCard from '$lib/components/game/PlayerCard.svelte';
	import GameLog from '$lib/components/game/GameLog.svelte';
	import type { Die, ComboType, PendingAction } from '$lib/types/index.js';
	import { FACE_EMOJI } from '$lib/types/index.js';

	let roomCode = $derived($page.params.roomCode);
	let game = $derived($gameStore);
	let current = $derived($currentPlayer);
	let me = $derived($myPlayer);
	let myTurn = $derived($isMyTurn);
	let targets = $derived($otherAlivePlayers);
	let player = $derived($playerStore);

	let showWinner = $state(false);
	let winnerName = $state('');
	let winReason = $state('');
	let isReconnecting = $state(false);
	let showRules = $state(false);

	// Target selection state
	let selectingTargetFor = $state<PendingAction | null>(null);

	$effect(() => {
		if (game?.phase === 'ended' && game.winnerId) {
			const winner = game.players.find((p) => p.id === game.winnerId);
			winnerName = winner?.name ?? 'Unknown';
			winReason = winner && winner.doubloons >= 25 ? 'riches' : 'being the last pirate standing';
			showWinner = true;
		}
	});

	onMount(() => {
		const socket = getSocket();

		socket.on('game:state', (state) => {
			console.log('[Client] Received game:state:', {
				currentPlayerIndex: state.currentPlayerIndex,
				currentPlayerName: state.players[state.currentPlayerIndex]?.name,
				turnPhase: state.turnPhase,
				rollsRemaining: state.rollsRemaining,
				socketId: socket.id
			});
			isReconnecting = false;
			gameStore.set(state);
			// Update player ID with new socket ID after reconnection
			const session = loadSession();
			if (session && socket.id) {
				console.log('[Client] Updating playerStore:', { socketId: socket.id, playerName: session.playerName });
				playerStore.setPlayer(socket.id, session.playerName, session.roomCode);
			}
		});

		socket.on('game:diceRolled', (dice: Die[], combo: ComboType) => {
			// State update will come through game:state
		});

		socket.on('game:playerEliminated', (playerId, eliminatorId) => {
			// Handled in game:state
		});

		socket.on('game:ended', (winnerId, reason) => {
			// Handled in game:state effect
		});

		socket.on('error', (message) => {
			console.error('Game error:', message);
		});

		// If no game state, try to reconnect or redirect
		if (!game) {
			const session = loadSession();
			if (roomCode && session?.roomCode === roomCode.toUpperCase() && session?.playerId) {
				isReconnecting = true;
				attemptReconnect();
				// Give reconnection some time, then redirect if still no state
				setTimeout(() => {
					if (!$gameStore) {
						goto(`/lobby/${roomCode}`);
					}
				}, 2000);
			} else {
				goto(`/lobby/${roomCode}`);
			}
		}

		return () => {
			socket.off('game:state');
			socket.off('game:diceRolled');
			socket.off('game:playerEliminated');
			socket.off('game:ended');
			socket.off('error');
		};
	});

	function toggleDiceLock(index: number) {
		if (!game || !myTurn || game.turnPhase !== 'rolling') return;

		const socket = getSocket();
		const currentLocked = game.dice.filter((d) => d.locked).map((d) => d.id);

		let newLocked: number[];
		if (currentLocked.includes(index)) {
			newLocked = currentLocked.filter((i) => i !== index);
		} else {
			newLocked = [...currentLocked, index];
		}

		socket.emit('game:lockDice', newLocked);
	}

	function roll() {
		const socket = getSocket();
		socket.emit('game:roll');
	}

	function selectTarget(targetId: string) {
		if (!selectingTargetFor) return;

		const socket = getSocket();
		socket.emit('game:selectTarget', selectingTargetFor.dieIndex, targetId);
		selectingTargetFor = null;
	}

	function finishRolling() {
		const socket = getSocket();
		socket.emit('game:finishRolling');
	}

	function endTurn() {
		const socket = getSocket();
		socket.emit('game:endTurn');
	}

	function getUnresolvedActions(): PendingAction[] {
		if (!game) return [];
		return game.pendingActions.filter((a) => !a.resolved);
	}

	function startTargetSelection(action: PendingAction) {
		selectingTargetFor = action;
	}

	function backToLobby() {
		goto('/');
	}

	let unresolvedActions = $derived(getUnresolvedActions());
	let canRoll = $derived(myTurn && game && game.rollsRemaining > 0 && game.turnPhase === 'rolling');
	let hasRolled = $derived(game && game.rollsRemaining < 3);
	let canFinishRolling = $derived(myTurn && game && game.turnPhase === 'rolling' && hasRolled);
	let needsTargetSelection = $derived(myTurn && game && game.turnPhase === 'selecting_targets' && unresolvedActions.length > 0);
	let canEndTurn = $derived(myTurn && game && hasRolled && unresolvedActions.length === 0 && game.turnPhase !== 'rolling');

	// Debug logging
	$effect(() => {
		if (game) {
			console.log('[Client Debug] Game state updated:', {
				currentPlayerIndex: game.currentPlayerIndex,
				currentPlayerId: game.players[game.currentPlayerIndex]?.id,
				currentPlayerName: game.players[game.currentPlayerIndex]?.name,
				myPlayerId: player.id,
				myPlayerName: player.name,
				isMyTurn: myTurn,
				turnPhase: game.turnPhase,
				rollsRemaining: game.rollsRemaining,
				canRoll,
				allPlayerIds: game.players.map(p => ({ id: p.id, name: p.name, isAI: p.isAI }))
			});
		}
	});
</script>

<main class="container">
	{#if isReconnecting}
		<div class="reconnecting">
			<p>Reconnecting to game...</p>
		</div>
	{:else if game}
		<div class="game-header">
			<div class="header-spacer"></div>
			<div class="turn-info">
				{#if current}
					<span class="turn-label">
						{current.id === player.id ? "Your Turn" : `${current.name}'s Turn`}
					</span>
					<span class="rolls-left">Rolls left: {game.rollsRemaining}</span>
				{/if}
			</div>
			<button class="rules-btn" onclick={() => showRules = true} aria-label="Show rules">
				?
			</button>
		</div>

		<div class="game-layout">
			<div class="main-area">
				<DiceBoard
					dice={game.dice}
					canSelect={myTurn && game.turnPhase === 'rolling' && game.rollsRemaining < 3}
					onToggleLock={toggleDiceLock}
				/>

				{#if myTurn}
					<div class="action-buttons">
						{#if canRoll}
							<Button onclick={roll}>
								{game.rollsRemaining === 3 ? 'Roll Dice!' : 'Roll Again'}
							</Button>
						{/if}

						{#if canFinishRolling}
							<Button onclick={finishRolling} variant="secondary">
								Resolve Dice
							</Button>
						{/if}

						{#if needsTargetSelection}
							<div class="target-prompt">
								<p>Select targets for your attacks/steals:</p>
								{#each unresolvedActions as action}
									<Button
										onclick={() => startTargetSelection(action)}
										variant="secondary"
									>
										{action.face === 'cutlass' ? '⚔️ Attack' : '☠️ Steal'} (Die #{action.dieIndex + 1})
									</Button>
								{/each}
							</div>
						{/if}

						{#if canEndTurn}
							<Button onclick={endTurn}>End Turn</Button>
						{/if}
					</div>
				{:else if current}
					<p class="waiting-msg">Waiting for {current.name}...</p>
				{/if}
			</div>

			<div class="sidebar">
				<div class="players-section">
					<h3>Pirates</h3>
					<div class="players-list">
						{#each game.players as gamePlayer (gamePlayer.id)}
							<PlayerCard
								player={gamePlayer}
								isCurrentTurn={gamePlayer.id === current?.id}
								isMe={gamePlayer.id === player.id}
								isTargetable={selectingTargetFor !== null &&
									gamePlayer.id !== player.id &&
									!gamePlayer.isEliminated}
								onSelect={() => selectTarget(gamePlayer.id)}
							/>
						{/each}
					</div>
				</div>

				<GameLog entries={game.gameLog} />
			</div>
		</div>

		{#if selectingTargetFor}
			<div class="target-overlay">
				<div class="target-modal">
					<h3>
						Select target for {selectingTargetFor.face === 'cutlass' ? '⚔️ Cutlass Attack' : '☠️ Jolly Roger Steal'}
					</h3>
					<div class="target-list">
						{#each targets as target (target.id)}
							<button class="target-btn" onclick={() => selectTarget(target.id)}>
								<span class="target-name">{target.name}</span>
								<span class="target-stats">
									🪙{target.doubloons} ❤️{target.lives} 🛡️{target.shields}
								</span>
							</button>
						{/each}
					</div>
					<Button onclick={() => selectingTargetFor = null} variant="secondary">
						Cancel
					</Button>
				</div>
			</div>
		{/if}
	{/if}

	<Modal show={showWinner} title="🏴‍☠️ Victory!">
		<div class="winner-content">
			<p class="winner-name">{winnerName}</p>
			<p class="winner-reason">wins by {winReason}!</p>
			<Button onclick={backToLobby}>Back to Home</Button>
		</div>
	</Modal>

	<RulesDrawer open={showRules} onclose={() => showRules = false} />
</main>

<style>
	.container {
		max-width: 1000px;
		margin: 0 auto;
		padding: 1rem;
		min-height: 100vh;
	}

	.reconnecting {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 50vh;
		color: #888;
		font-style: italic;
	}

	.game-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 1.5rem;
	}

	.header-spacer {
		width: 36px;
		flex-shrink: 0;
	}

	.turn-info {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		flex: 1;
		text-align: center;
	}

	.rules-btn {
		width: 36px;
		height: 36px;
		border-radius: 50%;
		background: #333;
		border: 2px solid #444;
		color: #d4a574;
		font-size: 1.25rem;
		font-weight: bold;
		cursor: pointer;
		transition: all 0.2s;
		flex-shrink: 0;
	}

	.rules-btn:hover {
		background: #3a3a3a;
		border-color: #d4a574;
	}

	.turn-label {
		font-size: 1.5rem;
		font-weight: bold;
		color: #d4a574;
	}

	.rolls-left {
		color: #888;
	}

	.game-layout {
		display: grid;
		grid-template-columns: 1fr 320px;
		gap: 2rem;
	}

	@media (max-width: 800px) {
		.game-layout {
			grid-template-columns: 1fr;
		}
	}

	.main-area {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1.5rem;
	}

	.action-buttons {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		align-items: center;
	}

	.target-prompt {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		align-items: center;
		padding: 1rem;
		background: #2a2a2a;
		border-radius: 8px;
	}

	.target-prompt p {
		color: #888;
		margin-bottom: 0.5rem;
	}

	.waiting-msg {
		color: #888;
		font-style: italic;
	}

	.sidebar {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.players-section h3 {
		font-size: 0.9rem;
		color: #888;
		text-transform: uppercase;
		letter-spacing: 1px;
		margin-bottom: 0.75rem;
	}

	.players-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.target-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.8);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 100;
	}

	.target-modal {
		background: #2a2a2a;
		padding: 2rem;
		border-radius: 12px;
		max-width: 400px;
		width: 90%;
	}

	.target-modal h3 {
		text-align: center;
		margin-bottom: 1.5rem;
		color: #d4a574;
	}

	.target-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin-bottom: 1rem;
	}

	.target-btn {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem;
		background: #333;
		border: 2px solid #444;
		border-radius: 8px;
		color: #eee;
		cursor: pointer;
		transition: all 0.2s;
	}

	.target-btn:hover {
		border-color: #c44;
		background: #3a2a2a;
	}

	.target-name {
		font-weight: 600;
	}

	.target-stats {
		font-size: 0.9rem;
		color: #888;
	}

	.winner-content {
		text-align: center;
	}

	.winner-name {
		font-size: 2rem;
		font-weight: bold;
		color: #d4a574;
		margin-bottom: 0.5rem;
	}

	.winner-reason {
		color: #888;
		margin-bottom: 1.5rem;
	}
</style>
