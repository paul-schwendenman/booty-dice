export type DiceFace =
	| 'doubloon'
	| 'x_marks_spot'
	| 'jolly_roger'
	| 'cutlass'
	| 'walk_plank'
	| 'shield';

export interface Die {
	id: number;
	face: DiceFace;
	locked: boolean;
	rolling: boolean;
}

export type ComboType = 'mutiny' | 'shipwreck' | 'blackbeards_curse' | null;

export interface DiceResult {
	dice: Die[];
	combo: ComboType;
	bonusCount: number;
}

export const DICE_FACES: DiceFace[] = [
	'doubloon',
	'x_marks_spot',
	'jolly_roger',
	'cutlass',
	'walk_plank',
	'shield'
];

export const FACE_NAMES: Record<DiceFace, string> = {
	doubloon: 'Doubloon',
	x_marks_spot: 'X Marks the Spot',
	jolly_roger: 'Jolly Roger',
	cutlass: 'Cutlass',
	walk_plank: 'Walk the Plank',
	shield: 'Shield'
};

export const FACE_EMOJI: Record<DiceFace, string> = {
	doubloon: '\u{1FA99}',
	x_marks_spot: '\u274C',
	jolly_roger: '\u2620\uFE0F',
	cutlass: '\u2694\uFE0F',
	walk_plank: '\u{1F30A}',
	shield: '\u{1F6E1}\uFE0F'
};
