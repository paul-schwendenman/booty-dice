import type { Die, DiceFace, ComboType, Player, PendingAction, ResolvedEffect } from '$lib/types/index.js';

export class ActionResolver {
	resolve(
		dice: Die[],
		pendingActions: PendingAction[],
		currentPlayer: Player,
		allPlayers: Player[]
	): ResolvedEffect[] {
		const effects: ResolvedEffect[] = [];
		const faces = dice.map((d) => d.face);
		const otherPlayers = allPlayers.filter((p) => p.id !== currentPlayer.id && !p.isEliminated);

		const combo = this.detectCombo(faces);

		// Handle Blackbeard's Curse - overrides everything
		if (combo === 'blackbeards_curse') {
			otherPlayers.forEach((player) => {
				effects.push({
					type: 'life_lost',
					targetId: player.id,
					sourceId: currentPlayer.id,
					amount: 2,
					description: `${player.name} loses 2 lives from Blackbeard's Curse!`
				});
				effects.push({
					type: 'coins_lost',
					targetId: player.id,
					sourceId: currentPlayer.id,
					amount: 5,
					description: `${player.name} loses 5 doubloons from Blackbeard's Curse!`
				});
			});
			return effects;
		}

		// Handle Mutiny
		if (combo === 'mutiny') {
			const bonusDamage = faces.filter((f) => f === 'walk_plank').length - 3;
			otherPlayers.forEach((player) => {
				effects.push({
					type: 'life_lost',
					targetId: player.id,
					sourceId: currentPlayer.id,
					amount: 1 + bonusDamage,
					description: `${player.name} loses ${1 + bonusDamage} life from Mutiny!`
				});
			});
		}

		// Handle Shipwreck
		if (combo === 'shipwreck') {
			const bonusCoins = faces.filter((f) => f === 'x_marks_spot').length - 3;
			otherPlayers.forEach((player) => {
				effects.push({
					type: 'coins_lost',
					targetId: player.id,
					amount: 3 + bonusCoins,
					description: `${player.name} loses ${3 + bonusCoins} doubloons from Shipwreck!`
				});
			});
		}

		// Process individual dice
		dice.forEach((die, index) => {
			// Skip dice that are part of combos
			if (combo === 'mutiny' && die.face === 'walk_plank') return;
			if (combo === 'shipwreck' && die.face === 'x_marks_spot') return;

			switch (die.face) {
				case 'doubloon':
					effects.push({
						type: 'coins_gained',
						targetId: currentPlayer.id,
						amount: 2,
						description: `${currentPlayer.name} gains 2 doubloons`
					});
					break;

				case 'x_marks_spot':
					effects.push({
						type: 'coins_lost',
						targetId: currentPlayer.id,
						amount: 2,
						description: `${currentPlayer.name} loses 2 doubloons to the treasure`
					});
					break;

				case 'walk_plank':
					effects.push({
						type: 'life_lost',
						targetId: currentPlayer.id,
						amount: 1,
						description: `${currentPlayer.name} walks the plank and loses 1 life`
					});
					break;

				case 'shield':
					effects.push({
						type: 'shield_gained',
						targetId: currentPlayer.id,
						amount: 1,
						description: `${currentPlayer.name} gains a shield`
					});
					break;

				case 'cutlass': {
					const cutlassAction = pendingActions.find((a) => a.dieIndex === index);
					if (cutlassAction?.targetPlayerId) {
						effects.push({
							type: 'damage',
							targetId: cutlassAction.targetPlayerId,
							sourceId: currentPlayer.id,
							amount: 1,
							description: `${currentPlayer.name} attacks with cutlass!`
						});
					}
					break;
				}

				case 'jolly_roger': {
					const stealAction = pendingActions.find((a) => a.dieIndex === index);
					if (stealAction?.targetPlayerId) {
						const target = allPlayers.find((p) => p.id === stealAction.targetPlayerId);
						const stealAmount = Math.min(2, target?.doubloons || 0);
						if (stealAmount > 0) {
							effects.push({
								type: 'coins_lost',
								targetId: stealAction.targetPlayerId,
								sourceId: currentPlayer.id,
								amount: stealAmount,
								description: `${currentPlayer.name} steals ${stealAmount} doubloons from ${target?.name}!`
							});
							effects.push({
								type: 'coins_gained',
								targetId: currentPlayer.id,
								amount: stealAmount,
								description: ''
							});
						}
					}
					break;
				}
			}
		});

		return effects;
	}

	private detectCombo(faces: DiceFace[]): ComboType {
		// Blackbeard's Curse: all 6 different faces (one of each)
		const uniqueFaces = new Set(faces);
		if (uniqueFaces.size === 6) return 'blackbeards_curse';
		if (faces.filter((f) => f === 'walk_plank').length >= 3) return 'mutiny';
		if (faces.filter((f) => f === 'x_marks_spot').length >= 3) return 'shipwreck';
		return null;
	}
}
