import type { GameState, Die, PendingAction } from '$lib/types/index.js';
import { AIStrategy } from './AIStrategy.js';

interface AICallbacks {
	onLockDice: (indices: number[]) => void;
	onRoll: () => Promise<Die[]>;
	onFinishRolling: () => void;
	onSelectTarget: (dieIndex: number, targetId: string) => void;
	onEndTurn: () => void;
}

export class AIPlayer {
	private strategy: AIStrategy;
	private thinkDelay: number = 1500;

	constructor() {
		this.strategy = new AIStrategy();
	}

	async takeTurn(state: GameState, callbacks: AICallbacks): Promise<void> {
		const player = state.players[state.currentPlayerIndex];
		let rollsRemaining = state.rollsRemaining;
		let currentDice = state.dice;

		console.log(`[AIPlayer.takeTurn] Starting turn for ${player.name}, rollsRemaining: ${rollsRemaining}`);
		console.log(`[AIPlayer.takeTurn] Initial dice: ${currentDice.map(d => d.face).join(', ')}`);

		// First roll is mandatory - dice start as placeholders
		console.log(`[AIPlayer.takeTurn] Waiting ${this.thinkDelay}ms before first roll...`);
		await this.delay(this.thinkDelay);
		console.log(`[AIPlayer.takeTurn] Performing mandatory first roll`);
		currentDice = await callbacks.onRoll();
		console.log(`[AIPlayer.takeTurn] First roll complete: ${currentDice.map(d => d.face).join(', ')}`);
		rollsRemaining--;

		// Subsequent rolls are optional
		let rollIteration = 1;
		while (rollsRemaining > 0) {
			rollIteration++;
			console.log(`[AIPlayer.takeTurn] Roll iteration ${rollIteration}, rollsRemaining: ${rollsRemaining}`);

			console.log(`[AIPlayer.takeTurn] Waiting ${this.thinkDelay}ms before deciding...`);
			await this.delay(this.thinkDelay);
			console.log(`[AIPlayer.takeTurn] Think delay complete`);

			// Decide which dice to keep
			const keepIndices = this.strategy.decideDiceToKeep(currentDice, player, state);
			console.log(`[AIPlayer.takeTurn] Decided to keep dice at indices: ${JSON.stringify(keepIndices)}`);
			callbacks.onLockDice(keepIndices);

			// Decide whether to roll again
			const shouldRoll = this.strategy.shouldRollAgain(currentDice, rollsRemaining, player, state);
			console.log(`[AIPlayer.takeTurn] Should roll again: ${shouldRoll}`);
			if (!shouldRoll) {
				console.log(`[AIPlayer.takeTurn] Breaking out of roll loop`);
				break;
			}

			console.log(`[AIPlayer.takeTurn] Waiting 800ms before rolling...`);
			await this.delay(800);
			console.log(`[AIPlayer.takeTurn] Calling onRoll callback`);
			currentDice = await callbacks.onRoll();
			console.log(`[AIPlayer.takeTurn] Roll complete, new dice: ${currentDice.map(d => d.face).join(', ')}`);
			rollsRemaining--;
		}

		console.log(`[AIPlayer.takeTurn] Rolling phase complete, calling onFinishRolling`);
		// Finish rolling phase
		callbacks.onFinishRolling();

		// Target selection phase
		console.log(`[AIPlayer.takeTurn] Waiting ${this.thinkDelay}ms before target selection...`);
		await this.delay(this.thinkDelay);
		const pendingActions = this.detectPendingActions(currentDice);
		console.log(`[AIPlayer.takeTurn] Detected ${pendingActions.length} pending actions: ${JSON.stringify(pendingActions)}`);

		for (const action of pendingActions) {
			console.log(`[AIPlayer.takeTurn] Selecting target for action: ${action.face} at index ${action.dieIndex}`);
			const target = this.strategy.selectTarget(action.face, player, state);
			if (target) {
				console.log(`[AIPlayer.takeTurn] Selected target: ${target.name} (${target.id})`);
				callbacks.onSelectTarget(action.dieIndex, target.id);
				await this.delay(500);
			} else {
				console.log(`[AIPlayer.takeTurn] No valid target found for action`);
			}
		}

		// End turn
		console.log(`[AIPlayer.takeTurn] Waiting 1000ms before ending turn...`);
		await this.delay(1000);
		console.log(`[AIPlayer.takeTurn] Calling onEndTurn callback`);
		callbacks.onEndTurn();
		console.log(`[AIPlayer.takeTurn] Turn complete`);
	}

	private detectPendingActions(dice: Die[]): PendingAction[] {
		return dice
			.map((die, index) => ({ die, index }))
			.filter(({ die }) => die.face === 'cutlass' || die.face === 'jolly_roger')
			.map(({ die, index }) => ({
				dieIndex: index,
				face: die.face as 'cutlass' | 'jolly_roger',
				resolved: false
			}));
	}

	private delay(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}
}
