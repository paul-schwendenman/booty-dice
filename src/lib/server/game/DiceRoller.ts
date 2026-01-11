import type { Die, DiceFace, ComboType, DiceResult } from '$lib/types/index.js';
import { DICE_FACES } from '$lib/types/index.js';

export class DiceRoller {
	createFreshDice(): Die[] {
		return Array.from({ length: 6 }, (_, i) => ({
			id: i,
			face: 'doubloon' as DiceFace,
			locked: false,
			rolling: false
		}));
	}

	roll(dice: Die[]): DiceResult {
		const newDice = dice.map((die) => {
			if (die.locked) return { ...die, rolling: false };
			return {
				...die,
				face: DICE_FACES[Math.floor(Math.random() * DICE_FACES.length)],
				rolling: false
			};
		});

		const combo = this.detectCombo(newDice);
		const bonusCount = this.countBonus(newDice, combo);

		return { dice: newDice, combo, bonusCount };
	}

	private detectCombo(dice: Die[]): ComboType {
		const faces = dice.map((d) => d.face);

		// Blackbeard's Curse: must have all 5 specific faces
		const curseRequired: DiceFace[] = [
			'x_marks_spot',
			'jolly_roger',
			'walk_plank',
			'cutlass',
			'shield'
		];
		const hasCurse = curseRequired.every((required) => faces.includes(required));
		if (hasCurse) return 'blackbeards_curse';

		// Mutiny: 3+ Walk the Planks
		const plankCount = faces.filter((f) => f === 'walk_plank').length;
		if (plankCount >= 3) return 'mutiny';

		// Shipwreck: 3+ X Marks the Spot
		const xCount = faces.filter((f) => f === 'x_marks_spot').length;
		if (xCount >= 3) return 'shipwreck';

		return null;
	}

	private countBonus(dice: Die[], combo: ComboType): number {
		if (!combo) return 0;

		const faces = dice.map((d) => d.face);

		if (combo === 'mutiny') {
			return faces.filter((f) => f === 'walk_plank').length - 3;
		}
		if (combo === 'shipwreck') {
			return faces.filter((f) => f === 'x_marks_spot').length - 3;
		}
		return 0;
	}
}
