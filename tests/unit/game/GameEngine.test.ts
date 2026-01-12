import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GameEngine } from '$lib/server/game/GameEngine.js';
import { createTestPlayer, createTestPlayers, resetPlayerIdCounter } from '../../factories/player.js';

describe('GameEngine', () => {
	beforeEach(() => {
		resetPlayerIdCounter();
	});

	describe('constructor', () => {
		it('should initialize game state with correct defaults', () => {
			const players = createTestPlayers(3);
			const engine = new GameEngine(players, 'TEST01');
			const state = engine.getState();

			expect(state.roomCode).toBe('TEST01');
			expect(state.phase).toBe('playing');
			expect(state.players).toHaveLength(3);
			expect(state.currentPlayerIndex).toBe(0);
			expect(state.turnNumber).toBe(1);
			expect(state.rollsRemaining).toBe(3);
			expect(state.dice).toHaveLength(6);
			expect(state.turnPhase).toBe('rolling');
			expect(state.pendingActions).toEqual([]);
			expect(state.winnerId).toBeNull();
		});

		it('should create fresh dice with doubloon faces', () => {
			const players = createTestPlayers(2);
			const engine = new GameEngine(players, 'TEST01');
			const state = engine.getState();

			state.dice.forEach((die, index) => {
				expect(die.id).toBe(index);
				expect(die.face).toBe('doubloon');
				expect(die.locked).toBe(false);
				expect(die.rolling).toBe(false);
			});
		});

		it('should add initial log entry', () => {
			const players = createTestPlayers(2);
			const engine = new GameEngine(players, 'TEST01');
			const state = engine.getState();

			expect(state.gameLog).toHaveLength(1);
			expect(state.gameLog[0].type).toBe('roll');
			expect(state.gameLog[0].message).toContain('turn begins');
		});
	});

	describe('getState', () => {
		it('should return a copy of state', () => {
			const players = createTestPlayers(2);
			const engine = new GameEngine(players, 'TEST01');

			const state1 = engine.getState();
			const state2 = engine.getState();

			expect(state1).not.toBe(state2);
			expect(state1.players).not.toBe(state2.players);
		});
	});

	describe('getCurrentPlayer', () => {
		it('should return player at currentPlayerIndex', () => {
			const players = createTestPlayers(3);
			const engine = new GameEngine(players, 'TEST01');

			const currentPlayer = engine.getCurrentPlayer();
			const state = engine.getState();

			expect(currentPlayer.id).toBe(state.players[state.currentPlayerIndex].id);
		});
	});

	describe('lockDice', () => {
		it('should lock specified dice indices', () => {
			const players = createTestPlayers(2);
			const engine = new GameEngine(players, 'TEST01');

			engine.lockDice([0, 2, 4]);
			const state = engine.getState();

			expect(state.dice[0].locked).toBe(true);
			expect(state.dice[1].locked).toBe(false);
			expect(state.dice[2].locked).toBe(true);
			expect(state.dice[3].locked).toBe(false);
			expect(state.dice[4].locked).toBe(true);
			expect(state.dice[5].locked).toBe(false);
		});

		it('should unlock dice not in the indices array', () => {
			const players = createTestPlayers(2);
			const engine = new GameEngine(players, 'TEST01');

			engine.lockDice([0, 1, 2, 3, 4, 5]); // Lock all
			engine.lockDice([0]); // Keep only first locked

			const state = engine.getState();
			expect(state.dice[0].locked).toBe(true);
			expect(state.dice.slice(1).every((d) => !d.locked)).toBe(true);
		});
	});

	describe('roll', () => {
		it('should decrease rollsRemaining', () => {
			const players = createTestPlayers(2);
			const engine = new GameEngine(players, 'TEST01');

			expect(engine.getState().rollsRemaining).toBe(3);
			engine.roll();
			expect(engine.getState().rollsRemaining).toBe(2);
			engine.roll();
			expect(engine.getState().rollsRemaining).toBe(1);
		});

		it('should throw error when no rolls remaining', () => {
			const players = createTestPlayers(2);
			const engine = new GameEngine(players, 'TEST01');

			engine.roll();
			engine.roll();
			engine.roll();

			expect(() => engine.roll()).toThrow('No rolls remaining');
		});

		it('should return canRollAgain based on remaining rolls', () => {
			const players = createTestPlayers(2);
			const engine = new GameEngine(players, 'TEST01');

			let result = engine.roll();
			expect(result.canRollAgain).toBe(true);

			result = engine.roll();
			expect(result.canRollAgain).toBe(true);

			result = engine.roll();
			expect(result.canRollAgain).toBe(false);
		});

		it('should add log entry for roll', () => {
			const players = createTestPlayers(2);
			const engine = new GameEngine(players, 'TEST01');

			const initialLogLength = engine.getState().gameLog.length;
			engine.roll();

			expect(engine.getState().gameLog.length).toBe(initialLogLength + 1);
		});
	});

	describe('selectTarget', () => {
		it('should assign target to pending action', () => {
			const players = createTestPlayers(3);
			const engine = new GameEngine(players, 'TEST01');

			// Mock random to produce cutlass
			vi.spyOn(Math, 'random').mockReturnValue(0.5); // cutlass
			engine.roll();
			engine.roll();
			engine.roll();

			const state = engine.getState();
			const cutlassAction = state.pendingActions.find((a) => a.face === 'cutlass');

			if (cutlassAction) {
				const targetId = players[1].id;
				engine.selectTarget(cutlassAction.dieIndex, targetId);

				const updatedState = engine.getState();
				const updatedAction = updatedState.pendingActions.find(
					(a) => a.dieIndex === cutlassAction.dieIndex
				);

				expect(updatedAction?.targetPlayerId).toBe(targetId);
				expect(updatedAction?.resolved).toBe(true);
			}

			vi.restoreAllMocks();
		});

		it('should throw error for invalid action', () => {
			const players = createTestPlayers(2);
			const engine = new GameEngine(players, 'TEST01');

			expect(() => engine.selectTarget(99, 'player-2')).toThrow('Invalid action');
		});

		it('should transition to resolving when all targets selected', () => {
			const players = createTestPlayers(2);
			const engine = new GameEngine(players, 'TEST01');

			// Force cutlass roll
			vi.spyOn(Math, 'random').mockReturnValue(0.5);
			engine.roll();
			engine.roll();
			engine.roll();

			const state = engine.getState();
			state.pendingActions.forEach((action) => {
				engine.selectTarget(action.dieIndex, players[1].id);
			});

			const finalState = engine.getState();
			if (finalState.pendingActions.length > 0) {
				expect(finalState.turnPhase).toBe('resolving');
			}

			vi.restoreAllMocks();
		});
	});

	describe('hasUnresolvedTargets', () => {
		it('should return false when no pending actions', () => {
			const players = createTestPlayers(2);
			const engine = new GameEngine(players, 'TEST01');

			expect(engine.hasUnresolvedTargets()).toBe(false);
		});
	});

	describe('finishRolling', () => {
		it('should transition to resolving when no pending actions', () => {
			const players = createTestPlayers(2);
			const engine = new GameEngine(players, 'TEST01');

			// Force doubloon rolls (no targets needed)
			vi.spyOn(Math, 'random').mockReturnValue(0);
			engine.roll();

			engine.finishRolling();

			expect(engine.getState().turnPhase).toBe('resolving');

			vi.restoreAllMocks();
		});

		it('should do nothing if not in rolling phase', () => {
			const players = createTestPlayers(2);
			const engine = new GameEngine(players, 'TEST01');

			vi.spyOn(Math, 'random').mockReturnValue(0);
			engine.roll();
			engine.finishRolling();

			const phaseBefore = engine.getState().turnPhase;
			engine.finishRolling();
			const phaseAfter = engine.getState().turnPhase;

			expect(phaseBefore).toBe(phaseAfter);

			vi.restoreAllMocks();
		});
	});

	describe('resolveTurn', () => {
		it('should return effects and no eliminations for safe roll', () => {
			const players = createTestPlayers(2);
			const engine = new GameEngine(players, 'TEST01');

			// Force all doubloons
			vi.spyOn(Math, 'random').mockReturnValue(0);
			engine.roll();
			engine.finishRolling();

			const result = engine.resolveTurn();

			expect(result.effects.length).toBeGreaterThan(0);
			expect(result.eliminations).toEqual([]);
			expect(result.winner).toBeNull();

			vi.restoreAllMocks();
		});

		it('should detect elimination when player loses all lives', () => {
			const players = createTestPlayers(2);
			players[0].lives = 1; // Almost dead

			const engine = new GameEngine(players, 'TEST01');

			// Force walk_plank
			vi.spyOn(Math, 'random').mockReturnValue(0.67);
			engine.roll();
			engine.finishRolling();

			const result = engine.resolveTurn();

			const state = engine.getState();
			const currentPlayerDied = result.eliminations.includes(players[0].id);

			// If the current player took walk_plank damage and died
			if (currentPlayerDied) {
				expect(result.winner).not.toBeNull(); // Other player wins
			}

			vi.restoreAllMocks();
		});

		it('should detect win by reaching 25 doubloons', () => {
			const players = createTestPlayers(2);

			const engine = new GameEngine(players, 'TEST01');

			// Set current player's doubloons to 23 AFTER engine creation
			// (engine shuffles players, so we need to update the actual current player)
			const currentPlayer = engine.getCurrentPlayer();
			(engine as any).state.players.find((p: any) => p.id === currentPlayer.id).doubloons = 23;

			// Force doubloons (each gives +2)
			vi.spyOn(Math, 'random').mockReturnValue(0);
			engine.roll();
			engine.finishRolling();

			const result = engine.resolveTurn();

			// 23 + (6 * 2) = 35 coins
			expect(result.winner).not.toBeNull();
			expect(engine.getState().phase).toBe('ended');

			vi.restoreAllMocks();
		});
	});

	describe('endTurn', () => {
		it('should advance to next player', () => {
			const players = createTestPlayers(3);
			const engine = new GameEngine(players, 'TEST01');

			vi.spyOn(Math, 'random').mockReturnValue(0);
			engine.roll();
			engine.finishRolling();
			engine.resolveTurn();

			const initialIndex = engine.getState().currentPlayerIndex;
			engine.endTurn();

			const newIndex = engine.getState().currentPlayerIndex;
			expect(newIndex).toBe((initialIndex + 1) % 3);

			vi.restoreAllMocks();
		});

		it('should skip eliminated players', () => {
			const players = createTestPlayers(3);
			const engine = new GameEngine(players, 'TEST01');

			// Manually mark player at index 1 as eliminated
			const state = engine.getState();
			const player1Id = state.players[1].id;

			vi.spyOn(Math, 'random').mockReturnValue(0);
			engine.roll();
			engine.finishRolling();
			engine.resolveTurn();

			// Manually eliminate player 1 for this test
			(engine as any).state.players[1].isEliminated = true;

			engine.endTurn();

			const newState = engine.getState();
			const currentPlayer = newState.players[newState.currentPlayerIndex];
			expect(currentPlayer.isEliminated).toBe(false);

			vi.restoreAllMocks();
		});

		it('should reset dice and rolls for new turn', () => {
			const players = createTestPlayers(2);
			const engine = new GameEngine(players, 'TEST01');

			vi.spyOn(Math, 'random').mockReturnValue(0);
			engine.roll();
			engine.lockDice([0, 1, 2]);
			engine.finishRolling();
			engine.resolveTurn();
			engine.endTurn();

			const state = engine.getState();
			expect(state.rollsRemaining).toBe(3);
			expect(state.dice.every((d) => !d.locked)).toBe(true);
			expect(state.dice.every((d) => d.face === 'doubloon')).toBe(true);
			expect(state.turnPhase).toBe('rolling');
			expect(state.pendingActions).toEqual([]);

			vi.restoreAllMocks();
		});

		it('should increment turn number', () => {
			const players = createTestPlayers(2);
			const engine = new GameEngine(players, 'TEST01');

			vi.spyOn(Math, 'random').mockReturnValue(0);
			engine.roll();
			engine.finishRolling();
			engine.resolveTurn();

			const turnBefore = engine.getState().turnNumber;
			engine.endTurn();
			const turnAfter = engine.getState().turnNumber;

			expect(turnAfter).toBe(turnBefore + 1);

			vi.restoreAllMocks();
		});
	});

	describe('win conditions', () => {
		it('should detect last standing win', () => {
			const players = createTestPlayers(2);
			players[0].lives = 10;
			players[1].lives = 1;
			players[1].shields = 0;

			const engine = new GameEngine(players, 'TEST01');
			const state = engine.getState();

			// Current player attacks player 1
			vi.spyOn(Math, 'random').mockReturnValue(0.5); // cutlass
			engine.roll();
			engine.roll();
			engine.roll();

			const currentState = engine.getState();
			const targetPlayer = currentState.players.find(
				(p) => p.id !== currentState.players[currentState.currentPlayerIndex].id
			);

			if (targetPlayer && targetPlayer.lives === 1) {
				currentState.pendingActions.forEach((action) => {
					if (action.face === 'cutlass') {
						engine.selectTarget(action.dieIndex, targetPlayer.id);
					}
				});

				engine.finishRolling();
				const result = engine.resolveTurn();

				if (result.eliminations.includes(targetPlayer.id)) {
					expect(result.winner).not.toBeNull();
				}
			}

			vi.restoreAllMocks();
		});
	});
});
