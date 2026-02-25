import type { CommodityType } from '../types/game.js';

export interface CommodityDef {
	type: CommodityType;
	/** Face value (f); a set of n identical commodities is worth f × n² */
	faceValue: number;
}

export const COMMODITIES: readonly CommodityDef[] = [
	{ type: 'Ochre', faceValue: 1 },
	{ type: 'Hides', faceValue: 1 },
	{ type: 'Iron', faceValue: 2 },
	{ type: 'Papyrus', faceValue: 2 },
	{ type: 'Salt', faceValue: 3 },
	{ type: 'Timber', faceValue: 3 },
	{ type: 'Grain', faceValue: 4 },
	{ type: 'Oil', faceValue: 4 },
	{ type: 'Cloth', faceValue: 5 },
	{ type: 'Wine', faceValue: 5 },
	{ type: 'Bronze', faceValue: 6 },
	{ type: 'Silver', faceValue: 6 },
	{ type: 'Spices', faceValue: 7 },
	{ type: 'Resin', faceValue: 7 },
	{ type: 'Dye', faceValue: 8 },
	{ type: 'Gold', faceValue: 8 },
	{ type: 'Ivory', faceValue: 9 },
	{ type: 'Gems', faceValue: 9 }
] as const;

export const COMMODITY_MAP: ReadonlyMap<CommodityType, CommodityDef> = new Map(
	COMMODITIES.map((c) => [c.type, c])
);

/**
 * Calculate the trade value of a set of n identical commodities with face value f.
 * Value = f × n²
 */
export function calcCommoditySetValue(faceValue: number, count: number): number {
	return faceValue * count * count;
}

/**
 * Calculate total commodity hand value for a player.
 * Each commodity type is scored independently: faceValue × count²
 */
export function calcHandValue(hand: Record<CommodityType, number>): number {
	let total = 0;
	for (const [type, count] of Object.entries(hand) as [CommodityType, number][]) {
		if (count > 0) {
			const def = COMMODITY_MAP.get(type);
			if (def) total += calcCommoditySetValue(def.faceValue, count);
		}
	}
	return total;
}
