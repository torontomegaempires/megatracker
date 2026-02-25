export interface CivilisationDef {
	/** AST ranking 1–18; odd = Western, even = Eastern */
	astRanking: number;
	id: string;
	name: string;
	colorHex: string;
	/** CSS custom property name, e.g. '--color-minoa' */
	cssVar: string;
	deck: 'Western' | 'Eastern';
}

/** All 18 civilisations ordered by AST ranking. */
export const CIVILISATIONS: readonly CivilisationDef[] = [
	{ astRanking: 1, id: 'minoa', name: 'Minoa', colorHex: '#7CB342', cssVar: '--color-minoa', deck: 'Western' },
	{ astRanking: 2, id: 'saba', name: 'Saba', colorHex: '#E57373', cssVar: '--color-saba', deck: 'Eastern' },
	{ astRanking: 3, id: 'assyria', name: 'Assyria', colorHex: '#42A5F5', cssVar: '--color-assyria', deck: 'Western' },
	{ astRanking: 4, id: 'maurya', name: 'Maurya', colorHex: '#F44336', cssVar: '--color-maurya', deck: 'Eastern' },
	{ astRanking: 5, id: 'celt', name: 'Celt', colorHex: '#388E3C', cssVar: '--color-celt', deck: 'Western' },
	{ astRanking: 6, id: 'babylon', name: 'Babylon', colorHex: '#757575', cssVar: '--color-babylon', deck: 'Eastern' },
	{ astRanking: 7, id: 'carthage', name: 'Carthage', colorHex: '#FF9800', cssVar: '--color-carthage', deck: 'Western' },
	{ astRanking: 8, id: 'dravidia', name: 'Dravidia', colorHex: '#1A237E', cssVar: '--color-dravidia', deck: 'Eastern' },
	{ astRanking: 9, id: 'hatti', name: 'Hatti', colorHex: '#E91E63', cssVar: '--color-hatti', deck: 'Western' },
	{ astRanking: 10, id: 'kushan', name: 'Kushan', colorHex: '#8D6E63', cssVar: '--color-kushan', deck: 'Eastern' },
	{ astRanking: 11, id: 'rome', name: 'Rome', colorHex: '#E91E63', cssVar: '--color-rome', deck: 'Western' },
	{ astRanking: 12, id: 'persia', name: 'Persia', colorHex: '#673AB7', cssVar: '--color-persia', deck: 'Eastern' },
	{ astRanking: 13, id: 'iberia', name: 'Iberia', colorHex: '#757575', cssVar: '--color-iberia', deck: 'Western' },
	{ astRanking: 14, id: 'nubia', name: 'Nubia', colorHex: '#26A69A', cssVar: '--color-nubia', deck: 'Eastern' },
	{ astRanking: 15, id: 'hellas', name: 'Hellas', colorHex: '#FFEB3B', cssVar: '--color-hellas', deck: 'Western' },
	{ astRanking: 16, id: 'indus', name: 'Indus', colorHex: '#2E7D32', cssVar: '--color-indus', deck: 'Eastern' },
	{ astRanking: 17, id: 'egypt', name: 'Egypt', colorHex: '#D7CCC8', cssVar: '--color-egypt', deck: 'Western' },
	{ astRanking: 18, id: 'parthia', name: 'Parthia', colorHex: '#689F38', cssVar: '--color-parthia', deck: 'Eastern' }
] as const;

export const CIVILISATION_MAP: ReadonlyMap<string, CivilisationDef> = new Map(
	CIVILISATIONS.map((c) => [c.id, c])
);

export function getCivilisation(id: string): CivilisationDef | undefined {
	return CIVILISATION_MAP.get(id);
}
