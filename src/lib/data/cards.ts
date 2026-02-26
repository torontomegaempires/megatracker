import type { CivilizationCard } from '../types/game.js';

/**
 * Full Mega Empires civilization advance card database.
 *
 * NOTE: Credit amounts and calamity mitigation details should be verified
 * against physical cards — this data is based on available knowledge of the
 * game rules and may require correction for your specific edition.
 *
 * Required card IDs (referenced by calamities.ts mitigatingCardIds):
 * medicine, democracy, law, agriculture, granary, engineer, military,
 * irrigation, banking, coinage, philosophy, theology, naval-power, education
 */

export const CARDS: CivilizationCard[] = [
	// ═══════════════════════════════════════════════════════════════════════════
	// WESTERN DECK
	// ═══════════════════════════════════════════════════════════════════════════

	// ─── Crafts (Western) ────────────────────────────────────────────────────

	{
		cardId: 'pottery',
		name: 'Pottery',
		deck: 'Western',
		group: 'Crafts',
		baseCost: 40,
		vpTier: 1,
		description: 'Development of clay vessel production techniques.',
		specialAbilityDescription: 'You may store 1 additional commodity card (max hand size +1).',
		credits: [
			{ targetCardId: 'weaving', creditAmount: 5 },
			{ targetCardId: 'mining', creditAmount: 5 }
		],
		calamityModifiers: []
	},
	{
		cardId: 'weaving',
		name: 'Weaving',
		deck: 'Western',
		group: 'Crafts',
		baseCost: 60,
		vpTier: 1,
		description: 'Mastery of loom-based cloth production.',
		specialAbilityDescription: 'Reduce the cost of each commodity set you sell by 5 treasury (minimum 0) when calculating trade losses.',
		credits: [
			{ targetCardId: 'metalworking', creditAmount: 5 },
			{ targetCardId: 'coinage', creditAmount: 5 }
		],
		calamityModifiers: []
	},
	{
		cardId: 'coinage',
		name: 'Coinage',
		deck: 'Western',
		group: 'Crafts',
		baseCost: 60,
		vpTier: 1,
		description: 'Introduction of standardised currency.',
		specialAbilityDescription: 'You may pay for any single advance at a 10 treasury discount (once per phase 12 turn).',
		credits: [
			{ targetCardId: 'mining', creditAmount: 5 },
			{ targetCardId: 'banking', creditAmount: 5 }
		],
		calamityModifiers: [
			{ calamityId: 'squandered-wealth', description: 'Reduces treasury loss from Squandered Wealth by 2.' }
		]
	},
	{
		cardId: 'mining',
		name: 'Mining',
		deck: 'Western',
		group: 'Crafts',
		baseCost: 100,
		vpTier: 3,
		description: 'Organised extraction of ores and minerals.',
		specialAbilityDescription: 'You may collect 1 additional treasury token when you construct a city.',
		credits: [
			{ targetCardId: 'metalworking', creditAmount: 10 },
			{ targetCardId: 'engineer', creditAmount: 5 }
		],
		calamityModifiers: []
	},
	{
		cardId: 'metalworking',
		name: 'Metalworking',
		deck: 'Western',
		group: 'Crafts',
		baseCost: 100,
		vpTier: 3,
		description: 'Advanced techniques for shaping iron, bronze and copper.',
		specialAbilityDescription: 'Each of your tokens on the board counts as 2 in conflict resolution (does not apply to city attacks).',
		credits: [
			{ targetCardId: 'engineer', creditAmount: 10 }
		],
		calamityModifiers: []
	},
	{
		cardId: 'roadbuilding',
		name: 'Road Building',
		deck: 'Western',
		group: 'Crafts',
		baseCost: 120,
		vpTier: 3,
		description: 'Construction of paved roads connecting major settlements.',
		specialAbilityDescription: 'You may move population tokens through two additional areas per turn.',
		credits: [
			{ targetCardId: 'trade-empire', creditAmount: 10 },
			{ targetCardId: 'engineer', creditAmount: 5 }
		],
		calamityModifiers: []
	},
	{
		cardId: 'engineer',
		name: 'Engineering',
		deck: 'Western',
		group: 'Crafts',
		baseCost: 180,
		vpTier: 3,
		description: 'Mastery of construction, siege works, and civil engineering.',
		specialAbilityDescription: 'You may build up to 2 cities per turn instead of 1. Each city construction still requires sufficient tokens.',
		credits: [
			{ targetCardId: 'architecture', creditAmount: 10 },
			{ targetCardId: 'roadbuilding', creditAmount: 5 }
		],
		calamityModifiers: [
			{ calamityId: 'flood', description: 'Reduces token loss from Flood by 2.' },
			{ calamityId: 'earthquake', description: 'Reduces city loss from Earthquake by 1 (minimum 1).' },
			{ calamityId: 'volcanic-eruption', description: 'Reduces treasury loss from Volcanic Eruption by 3.' },
			{ calamityId: 'tempest', description: 'You lose only half your ships (round down) from Tempest.' }
		]
	},

	// ─── Sciences (Western) ──────────────────────────────────────────────────

	{
		cardId: 'agriculture',
		name: 'Agriculture',
		deck: 'Western',
		group: 'Sciences',
		baseCost: 40,
		vpTier: 1,
		description: 'Systematic cultivation of crops for food and trade.',
		specialAbilityDescription: 'You may expand population by up to 2 extra tokens beyond the normal limit in areas you control.',
		credits: [
			{ targetCardId: 'irrigation', creditAmount: 5 },
			{ targetCardId: 'granary', creditAmount: 5 }
		],
		calamityModifiers: [
			{ calamityId: 'famine', description: 'Reduces population loss from Famine by 2.' },
			{ calamityId: 'drought', description: 'Reduces token loss from Drought by 2.' }
		]
	},
	{
		cardId: 'irrigation',
		name: 'Irrigation',
		deck: 'Western',
		group: 'Sciences',
		baseCost: 60,
		vpTier: 1,
		description: 'Canal and water-management systems to improve crop yields.',
		specialAbilityDescription: 'Famine and Drought calamities affect you at half severity (round down losses).',
		credits: [
			{ targetCardId: 'calendar', creditAmount: 5 },
			{ targetCardId: 'agriculture', creditAmount: 5 }
		],
		calamityModifiers: [
			{ calamityId: 'famine', description: 'Halves the population loss from Famine.' },
			{ calamityId: 'drought', description: 'Halves the token loss from Drought.' }
		]
	},
	{
		cardId: 'mathematics',
		name: 'Mathematics',
		deck: 'Western',
		group: 'Sciences',
		baseCost: 40,
		vpTier: 1,
		description: 'Formal systems of counting, geometry, and calculation.',
		specialAbilityDescription: 'Once per turn you may calculate the exact commodity set value before deciding which set to trade.',
		credits: [
			{ targetCardId: 'astronomy', creditAmount: 5 },
			{ targetCardId: 'calendar', creditAmount: 5 },
			{ targetCardId: 'engineer', creditAmount: 5 }
		],
		calamityModifiers: []
	},
	{
		cardId: 'medicine',
		name: 'Medicine',
		deck: 'Western',
		group: 'Sciences',
		baseCost: 150,
		vpTier: 3,
		description: 'Knowledge of healing, disease treatment, and public health.',
		specialAbilityDescription: 'Epidemics affect you at half severity. You lose half the normal population (round down).',
		credits: [
			{ targetCardId: 'astronomy', creditAmount: 10 }
		],
		calamityModifiers: [
			{ calamityId: 'epidemic', description: 'Halves population loss from Epidemic (round down).' }
		]
	},
	{
		cardId: 'astronomy',
		name: 'Astronomy',
		deck: 'Western',
		group: 'Sciences',
		baseCost: 160,
		vpTier: 3,
		description: 'Study of celestial bodies for navigation and timekeeping.',
		specialAbilityDescription: 'Your ships may move 1 additional sea area per turn.',
		credits: [
			{ targetCardId: 'calendar', creditAmount: 10 },
			{ targetCardId: 'navigation', creditAmount: 10 }
		],
		calamityModifiers: []
	},
	{
		cardId: 'calendar',
		name: 'Calendar',
		deck: 'Western',
		group: 'Sciences',
		baseCost: 200,
		vpTier: 6,
		description: 'A systematic method of organising time into regular cycles.',
		specialAbilityDescription: 'At the start of each turn, you may look at the top calamity card before it is dealt.',
		credits: [],
		calamityModifiers: []
	},

	// ─── Arts (Western) ──────────────────────────────────────────────────────

	{
		cardId: 'music',
		name: 'Music',
		deck: 'Western',
		group: 'Arts',
		baseCost: 60,
		vpTier: 1,
		description: 'Development of instruments, compositions, and performance.',
		specialAbilityDescription: 'You may re-draw one trade card per turn during Phase 6.',
		credits: [
			{ targetCardId: 'drama-poetry', creditAmount: 5 },
			{ targetCardId: 'fine-arts', creditAmount: 5 }
		],
		calamityModifiers: []
	},
	{
		cardId: 'architecture',
		name: 'Architecture',
		deck: 'Western',
		group: 'Arts',
		baseCost: 120,
		vpTier: 3,
		description: 'Monumental construction — temples, palaces, and public buildings.',
		specialAbilityDescription: 'Cities you construct can withstand 1 additional conflict loss before being destroyed.',
		credits: [
			{ targetCardId: 'fine-arts', creditAmount: 10 },
			{ targetCardId: 'drama-poetry', creditAmount: 5 }
		],
		calamityModifiers: []
	},
	{
		cardId: 'drama-poetry',
		name: 'Drama & Poetry',
		deck: 'Western',
		group: 'Arts',
		baseCost: 240,
		vpTier: 6,
		description: 'The high arts of theatrical performance and literary verse.',
		specialAbilityDescription: 'Reduce the severity of all tradeable calamities you receive by 1 (minimum 0 losses).',
		credits: [],
		calamityModifiers: []
	},
	{
		cardId: 'fine-arts',
		name: 'Fine Arts',
		deck: 'Western',
		group: 'Arts',
		baseCost: 240,
		vpTier: 6,
		description: 'Mastery of painting, sculpture, and decorative craft.',
		specialAbilityDescription: 'Gain 1 bonus VP for each group of 3 or more civilization advance cards you own.',
		credits: [],
		calamityModifiers: []
	},

	// ─── Religion (Western) ──────────────────────────────────────────────────

	{
		cardId: 'mysticism',
		name: 'Mysticism',
		deck: 'Western',
		group: 'Religion',
		baseCost: 40,
		vpTier: 1,
		description: 'Belief in hidden spiritual forces and magical practices.',
		specialAbilityDescription: 'You may trade one calamity card per turn with any willing player at no cost.',
		credits: [
			{ targetCardId: 'philosophy', creditAmount: 5 },
			{ targetCardId: 'theology', creditAmount: 5 }
		],
		calamityModifiers: []
	},
	{
		cardId: 'fundamentalism',
		name: 'Fundamentalism',
		deck: 'Western',
		group: 'Religion',
		baseCost: 80,
		vpTier: 1,
		description: 'Strict adherence to traditional religious doctrine.',
		specialAbilityDescription: 'Once per turn, you may force any player to keep a tradeable calamity they hold.',
		credits: [
			{ targetCardId: 'theology', creditAmount: 5 },
			{ targetCardId: 'monotheism', creditAmount: 5 }
		],
		calamityModifiers: []
	},
	{
		cardId: 'philosophy',
		name: 'Philosophy',
		deck: 'Western',
		group: 'Religion',
		baseCost: 100,
		vpTier: 3,
		description: 'Rational inquiry into ethics, knowledge, and existence.',
		specialAbilityDescription: 'Superstition and Regression calamities do not prevent you from purchasing advances.',
		credits: [
			{ targetCardId: 'theology', creditAmount: 10 },
			{ targetCardId: 'monotheism', creditAmount: 5 }
		],
		calamityModifiers: [
			{ calamityId: 'superstition', description: 'You may still purchase advances despite Superstition.' },
			{ calamityId: 'regression', description: 'You do not lose purchased advances from Regression.' }
		]
	},
	{
		cardId: 'theology',
		name: 'Theology',
		deck: 'Western',
		group: 'Religion',
		baseCost: 200,
		vpTier: 6,
		description: 'Systematic study and organisation of religious doctrine.',
		specialAbilityDescription: 'Reduce all calamity population and treasury losses by 1 (minimum 0) each.',
		credits: [
			{ targetCardId: 'monotheism', creditAmount: 10 }
		],
		calamityModifiers: [
			{ calamityId: 'superstition', description: 'Nullifies Superstition — you lose no cities or treasury.' }
		]
	},
	{
		cardId: 'monotheism',
		name: 'Monotheism',
		deck: 'Western',
		group: 'Religion',
		baseCost: 300,
		vpTier: 6,
		description: 'Belief in a single, all-powerful deity.',
		specialAbilityDescription: 'Convert one contested area per turn — replace up to 2 opposing tokens with your own (tokens go to opponent\'s stock).',
		credits: [],
		calamityModifiers: []
	},

	// ─── Civics (Western) ────────────────────────────────────────────────────

	{
		cardId: 'military',
		name: 'Military',
		deck: 'Western',
		group: 'Civics',
		baseCost: 60,
		vpTier: 1,
		description: 'Organised armed forces and tactical doctrine.',
		specialAbilityDescription: 'You may attack with up to 2 additional tokens per conflict engagement.',
		credits: [
			{ targetCardId: 'republic', creditAmount: 5 },
			{ targetCardId: 'democracy', creditAmount: 5 }
		],
		calamityModifiers: [
			{ calamityId: 'barbarian-hordes', description: 'Reduces losses from Barbarian Hordes by 2.' },
			{ calamityId: 'tribal-conflict', description: 'Reduces losses from Tribal Conflict by 2.' }
		]
	},
	{
		cardId: 'naval-power',
		name: 'Naval Power',
		deck: 'Western',
		group: 'Civics',
		baseCost: 60,
		vpTier: 1,
		description: 'Warships and naval tactics for sea control and coastal raiding.',
		specialAbilityDescription: 'Your ships may carry 1 additional population token each when moving.',
		credits: [
			{ targetCardId: 'trade-empire', creditAmount: 5 },
			{ targetCardId: 'democracy', creditAmount: 5 }
		],
		calamityModifiers: [
			{ calamityId: 'piracy', description: 'Negates Piracy — you lose no treasury or ships.' }
		]
	},
	{
		cardId: 'diplomacy',
		name: 'Diplomacy',
		deck: 'Western',
		group: 'Civics',
		baseCost: 25,
		vpTier: 1,
		description: 'The art of negotiation and peaceful conflict resolution.',
		specialAbilityDescription: 'Once per turn, declare a non-aggression pact with one player — neither may attack the other that turn.',
		credits: [
			{ targetCardId: 'law', creditAmount: 5 }
		],
		calamityModifiers: []
	},
	{
		cardId: 'law',
		name: 'Law',
		deck: 'Western',
		group: 'Civics',
		baseCost: 160,
		vpTier: 3,
		description: 'Written legal codes and a judiciary system.',
		specialAbilityDescription: 'Civil War and Slave Revolt calamities are reduced by half severity.',
		credits: [
			{ targetCardId: 'democracy', creditAmount: 10 },
			{ targetCardId: 'republic', creditAmount: 10 }
		],
		calamityModifiers: [
			{ calamityId: 'civil-war', description: 'Reduces treasury loss from Civil War by half.' },
			{ calamityId: 'slave-revolt', description: 'Reduces losses from Slave Revolt by half.' },
			{ calamityId: 'city-revolt', description: 'You may keep a city that would otherwise be lost to City Revolt.' }
		]
	},
	{
		cardId: 'republic',
		name: 'Republic',
		deck: 'Western',
		group: 'Civics',
		baseCost: 180,
		vpTier: 3,
		description: 'Government by elected representatives of the citizenry.',
		specialAbilityDescription: 'You may re-use 1 treasury token that would be lost to any calamity (once per calamity event).',
		credits: [
			{ targetCardId: 'democracy', creditAmount: 10 },
			{ targetCardId: 'trade-empire', creditAmount: 5 }
		],
		calamityModifiers: []
	},
	{
		cardId: 'democracy',
		name: 'Democracy',
		deck: 'Western',
		group: 'Civics',
		baseCost: 250,
		vpTier: 6,
		description: 'Rule of the many — political power vested in all citizens.',
		specialAbilityDescription: 'Immune to Civil War and Slave Revolt calamity effects.',
		credits: [],
		calamityModifiers: [
			{ calamityId: 'civil-war', description: 'Immune to Civil War.' },
			{ calamityId: 'slave-revolt', description: 'Immune to Slave Revolt.' },
			{ calamityId: 'city-revolt', description: 'Immune to City Revolt.' }
		]
	},
	{
		cardId: 'trade-empire',
		name: 'Trade Empire',
		deck: 'Western',
		group: 'Civics',
		baseCost: 300,
		vpTier: 6,
		description: 'Dominance of long-distance trade routes across the known world.',
		specialAbilityDescription: 'You deal first in trade phase regardless of city count or AST ranking.',
		credits: [],
		calamityModifiers: []
	},

	// ═══════════════════════════════════════════════════════════════════════════
	// EASTERN DECK
	// ═══════════════════════════════════════════════════════════════════════════

	// ─── Crafts (Eastern) ────────────────────────────────────────────────────

	{
		cardId: 'granary',
		name: 'Granary',
		deck: 'Eastern',
		group: 'Crafts',
		baseCost: 40,
		vpTier: 1,
		description: 'Large storage facilities for grain and food reserves.',
		specialAbilityDescription: 'You may carry over up to 5 surplus stock tokens between turns without losing them.',
		credits: [
			{ targetCardId: 'irrigation', creditAmount: 5 },
			{ targetCardId: 'hydraulics', creditAmount: 5 }
		],
		calamityModifiers: [
			{ calamityId: 'famine', description: 'Negates Famine — you lose no population or cities.' }
		]
	},
	{
		cardId: 'wine-making',
		name: 'Wine Making',
		deck: 'Eastern',
		group: 'Crafts',
		baseCost: 60,
		vpTier: 1,
		description: 'Fermentation and aging of grape-based beverages for trade.',
		specialAbilityDescription: 'Your Wine commodity sets are worth an extra 5 treasury each when traded.',
		credits: [
			{ targetCardId: 'coinage', creditAmount: 5 },
			{ targetCardId: 'trade-routes', creditAmount: 5 }
		],
		calamityModifiers: []
	},
	{
		cardId: 'silk',
		name: 'Silk',
		deck: 'Eastern',
		group: 'Crafts',
		baseCost: 100,
		vpTier: 3,
		description: 'Production of fine silk textiles for domestic use and export.',
		specialAbilityDescription: 'You may hold 2 additional commodity cards beyond the normal hand limit.',
		credits: [
			{ targetCardId: 'weaving', creditAmount: 5 },
			{ targetCardId: 'fine-arts', creditAmount: 10 }
		],
		calamityModifiers: []
	},
	{
		cardId: 'ceramics',
		name: 'Ceramics',
		deck: 'Eastern',
		group: 'Crafts',
		baseCost: 100,
		vpTier: 3,
		description: 'High-quality kiln-fired pottery and decorative ceramics.',
		specialAbilityDescription: 'Your Crafts-group advances each cost 5 less treasury during Phase 12.',
		credits: [
			{ targetCardId: 'architecture', creditAmount: 5 },
			{ targetCardId: 'pottery', creditAmount: 5 }
		],
		calamityModifiers: []
	},
	{
		cardId: 'hydraulics',
		name: 'Hydraulics',
		deck: 'Eastern',
		group: 'Crafts',
		baseCost: 120,
		vpTier: 3,
		description: 'Advanced water management — aqueducts, dams, and cisterns.',
		specialAbilityDescription: 'You may build a city in any area you occupy with at least 3 tokens, ignoring normal terrain restrictions.',
		credits: [
			{ targetCardId: 'irrigation', creditAmount: 10 },
			{ targetCardId: 'engineer', creditAmount: 5 }
		],
		calamityModifiers: [
			{ calamityId: 'drought', description: 'Negates Drought — you lose no population or treasury.' }
		]
	},
	{
		cardId: 'metallurgy',
		name: 'Metallurgy',
		deck: 'Eastern',
		group: 'Crafts',
		baseCost: 180,
		vpTier: 3,
		description: 'Advanced techniques for alloying, casting, and tempering metals.',
		specialAbilityDescription: 'Your population tokens count as 3 in conflict (instead of 1) when defending cities.',
		credits: [
			{ targetCardId: 'metalworking', creditAmount: 10 },
			{ targetCardId: 'mining', creditAmount: 5 }
		],
		calamityModifiers: []
	},
	{
		cardId: 'lacquerware',
		name: 'Lacquerware',
		deck: 'Eastern',
		group: 'Crafts',
		baseCost: 60,
		vpTier: 1,
		description: 'Decorative lacquer-coated goods prized throughout the ancient world.',
		specialAbilityDescription: 'Gain 3 treasury whenever another player purchases one of your offered trade cards.',
		credits: [
			{ targetCardId: 'fine-arts', creditAmount: 5 },
			{ targetCardId: 'silk', creditAmount: 5 }
		],
		calamityModifiers: []
	},

	// ─── Sciences (Eastern) ──────────────────────────────────────────────────

	{
		cardId: 'literacy',
		name: 'Literacy',
		deck: 'Eastern',
		group: 'Sciences',
		baseCost: 40,
		vpTier: 1,
		description: 'Widespread ability to read and write among the population.',
		specialAbilityDescription: 'You may read the text of any advance card in the market before deciding to purchase.',
		credits: [
			{ targetCardId: 'education', creditAmount: 5 },
			{ targetCardId: 'astronomy', creditAmount: 5 }
		],
		calamityModifiers: []
	},
	{
		cardId: 'alchemy',
		name: 'Alchemy',
		deck: 'Eastern',
		group: 'Sciences',
		baseCost: 80,
		vpTier: 1,
		description: 'Proto-scientific study of materials, transformation, and medicine.',
		specialAbilityDescription: 'Once per turn you may convert up to 5 population stock tokens to 1 treasury token (5:1 ratio).',
		credits: [
			{ targetCardId: 'mathematics', creditAmount: 5 },
			{ targetCardId: 'medicine', creditAmount: 5 }
		],
		calamityModifiers: []
	},
	{
		cardId: 'optics',
		name: 'Optics',
		deck: 'Eastern',
		group: 'Sciences',
		baseCost: 100,
		vpTier: 3,
		description: 'Study of light, lenses, and vision.',
		specialAbilityDescription: 'Your ships may scout 2 sea areas ahead before committing to a route.',
		credits: [
			{ targetCardId: 'astronomy', creditAmount: 10 },
			{ targetCardId: 'medicine', creditAmount: 5 }
		],
		calamityModifiers: []
	},
	{
		cardId: 'navigation',
		name: 'Navigation',
		deck: 'Eastern',
		group: 'Sciences',
		baseCost: 160,
		vpTier: 3,
		description: 'Celestial and coastal navigation enabling long-distance sea travel.',
		specialAbilityDescription: 'Your ships may move through any sea area regardless of weather conditions.',
		credits: [
			{ targetCardId: 'naval-power', creditAmount: 10 },
			{ targetCardId: 'calendar', creditAmount: 5 }
		],
		calamityModifiers: []
	},
	{
		cardId: 'printing',
		name: 'Printing',
		deck: 'Eastern',
		group: 'Sciences',
		baseCost: 200,
		vpTier: 6,
		description: 'Mass reproduction of texts enabling rapid spread of knowledge.',
		specialAbilityDescription: 'Once per turn, you may give one advance card you own to another player at half its base cost (treasury paid to you).',
		credits: [
			{ targetCardId: 'education', creditAmount: 10 },
			{ targetCardId: 'law', creditAmount: 5 }
		],
		calamityModifiers: []
	},
	{
		cardId: 'chemistry',
		name: 'Chemistry',
		deck: 'Eastern',
		group: 'Sciences',
		baseCost: 180,
		vpTier: 3,
		description: 'Systematic study of substances, reactions, and material properties.',
		specialAbilityDescription: 'You may treat one non-tradeable calamity per turn as tradeable.',
		credits: [
			{ targetCardId: 'metalworking', creditAmount: 5 },
			{ targetCardId: 'alchemy', creditAmount: 10 }
		],
		calamityModifiers: []
	},
	{
		cardId: 'education',
		name: 'Education',
		deck: 'Eastern',
		group: 'Sciences',
		baseCost: 200,
		vpTier: 6,
		description: 'Formalised systems for teaching knowledge across generations.',
		specialAbilityDescription: 'You may purchase one extra advance during Phase 12 (requires sufficient treasury).',
		credits: [
			{ targetCardId: 'philosophy', creditAmount: 10 },
			{ targetCardId: 'literacy', creditAmount: 10 }
		],
		calamityModifiers: [
			{ calamityId: 'regression', description: 'Negates Regression — you do not move back on the AST.' }
		]
	},

	// ─── Arts (Eastern) ──────────────────────────────────────────────────────

	{
		cardId: 'theatre',
		name: 'Theatre',
		deck: 'Eastern',
		group: 'Arts',
		baseCost: 60,
		vpTier: 1,
		description: 'Organised theatrical performance for public entertainment.',
		specialAbilityDescription: 'Reduce the severity of one calamity you receive per turn by 1 (your choice).',
		credits: [
			{ targetCardId: 'drama-poetry', creditAmount: 5 },
			{ targetCardId: 'music', creditAmount: 5 }
		],
		calamityModifiers: []
	},
	{
		cardId: 'sculpture',
		name: 'Sculpture',
		deck: 'Eastern',
		group: 'Arts',
		baseCost: 100,
		vpTier: 3,
		description: 'Three-dimensional artistic works in stone, metal, or clay.',
		specialAbilityDescription: 'Each city you build grants you 1 bonus VP at the end of the game.',
		credits: [
			{ targetCardId: 'architecture', creditAmount: 10 },
			{ targetCardId: 'fine-arts', creditAmount: 5 }
		],
		calamityModifiers: []
	},
	{
		cardId: 'literature',
		name: 'Literature',
		deck: 'Eastern',
		group: 'Arts',
		baseCost: 120,
		vpTier: 3,
		description: 'Written narratives, histories, and epics of civilization.',
		specialAbilityDescription: 'You may look at the top 3 cards of the calamity deck at the start of each turn.',
		credits: [
			{ targetCardId: 'drama-poetry', creditAmount: 10 },
			{ targetCardId: 'education', creditAmount: 5 }
		],
		calamityModifiers: []
	},
	{
		cardId: 'dance',
		name: 'Dance',
		deck: 'Eastern',
		group: 'Arts',
		baseCost: 40,
		vpTier: 1,
		description: 'Ceremonial and social dance traditions.',
		specialAbilityDescription: 'Tradeable calamities you hold may be traded at no cost during Phase 7.',
		credits: [
			{ targetCardId: 'music', creditAmount: 5 },
			{ targetCardId: 'theatre', creditAmount: 5 }
		],
		calamityModifiers: []
	},
	{
		cardId: 'calligraphy',
		name: 'Calligraphy',
		deck: 'Eastern',
		group: 'Arts',
		baseCost: 100,
		vpTier: 3,
		description: 'The art of beautiful, decorative writing.',
		specialAbilityDescription: 'Your Sciences-group advances each cost 5 less treasury during Phase 12.',
		credits: [
			{ targetCardId: 'fine-arts', creditAmount: 5 },
			{ targetCardId: 'literature', creditAmount: 5 }
		],
		calamityModifiers: []
	},
	{
		cardId: 'garden-art',
		name: 'Garden Art',
		deck: 'Eastern',
		group: 'Arts',
		baseCost: 120,
		vpTier: 3,
		description: 'Ornamental landscape design and botanical cultivation.',
		specialAbilityDescription: 'Cities you own are immune to the first calamity that targets them each turn.',
		credits: [
			{ targetCardId: 'architecture', creditAmount: 5 },
			{ targetCardId: 'fine-arts', creditAmount: 10 }
		],
		calamityModifiers: []
	},

	// ─── Religion (Eastern) ──────────────────────────────────────────────────

	{
		cardId: 'shamanism',
		name: 'Shamanism',
		deck: 'Eastern',
		group: 'Religion',
		baseCost: 40,
		vpTier: 1,
		description: 'Spiritual mediation through trance, ritual, and ancestral contact.',
		specialAbilityDescription: 'Once per turn, draw one extra calamity card — you may discard it or pass it to another player.',
		credits: [
			{ targetCardId: 'mysticism', creditAmount: 5 },
			{ targetCardId: 'theology', creditAmount: 5 }
		],
		calamityModifiers: []
	},
	{
		cardId: 'animism',
		name: 'Animism',
		deck: 'Eastern',
		group: 'Religion',
		baseCost: 40,
		vpTier: 1,
		description: 'Belief in spiritual forces inhabiting animals, plants, and objects.',
		specialAbilityDescription: 'You may declare any of your occupied areas sacred — opponents lose 1 token if they attack there.',
		credits: [
			{ targetCardId: 'mysticism', creditAmount: 5 },
			{ targetCardId: 'philosophy', creditAmount: 5 }
		],
		calamityModifiers: []
	},
	{
		cardId: 'buddhism',
		name: 'Buddhism',
		deck: 'Eastern',
		group: 'Religion',
		baseCost: 200,
		vpTier: 6,
		description: 'The path of the Buddha — enlightenment, compassion, and non-violence.',
		specialAbilityDescription: 'You may not be the target of Slave Revolt, Civil War, or Barbarian Hordes calamities.',
		credits: [
			{ targetCardId: 'philosophy', creditAmount: 10 },
			{ targetCardId: 'monotheism', creditAmount: 10 }
		],
		calamityModifiers: [
			{ calamityId: 'slave-revolt', description: 'Immune to Slave Revolt.' },
			{ calamityId: 'civil-war', description: 'Immune to Civil War.' },
			{ calamityId: 'barbarian-hordes', description: 'Immune to Barbarian Hordes.' }
		]
	},
	{
		cardId: 'hinduism',
		name: 'Hinduism',
		deck: 'Eastern',
		group: 'Religion',
		baseCost: 200,
		vpTier: 6,
		description: 'A complex of dharmic traditions centred on cosmic order and duty.',
		specialAbilityDescription: 'Once per turn, reduce one incoming calamity\'s severity by 2 (minimum 0 losses).',
		credits: [
			{ targetCardId: 'theology', creditAmount: 10 },
			{ targetCardId: 'mysticism', creditAmount: 5 }
		],
		calamityModifiers: []
	},
	{
		cardId: 'zoroastrianism',
		name: 'Zoroastrianism',
		deck: 'Eastern',
		group: 'Religion',
		baseCost: 150,
		vpTier: 3,
		description: 'Dualistic faith centred on the cosmic battle of light versus darkness.',
		specialAbilityDescription: 'You may pass up to 2 tradeable calamities to opponents who share a land border with you.',
		credits: [
			{ targetCardId: 'theology', creditAmount: 10 },
			{ targetCardId: 'philosophy', creditAmount: 5 }
		],
		calamityModifiers: []
	},
	{
		cardId: 'ancestor-worship',
		name: 'Ancestor Worship',
		deck: 'Eastern',
		group: 'Religion',
		baseCost: 60,
		vpTier: 1,
		description: 'Reverence for deceased forebears as spiritual guardians.',
		specialAbilityDescription: 'At the end of each turn, return 1 population token from your treasury to your stock.',
		credits: [
			{ targetCardId: 'philosophy', creditAmount: 5 },
			{ targetCardId: 'mysticism', creditAmount: 5 }
		],
		calamityModifiers: []
	},
	{
		cardId: 'oracle',
		name: 'Oracle',
		deck: 'Eastern',
		group: 'Religion',
		baseCost: 100,
		vpTier: 3,
		description: 'Divine prophecy through augury, vision, or sacred rites.',
		specialAbilityDescription: 'Once per game, choose any one player — for the next turn they must give you any one calamity they hold.',
		credits: [
			{ targetCardId: 'theology', creditAmount: 5 },
			{ targetCardId: 'calendar', creditAmount: 5 }
		],
		calamityModifiers: []
	},
	{
		cardId: 'asceticism',
		name: 'Asceticism',
		deck: 'Eastern',
		group: 'Religion',
		baseCost: 120,
		vpTier: 3,
		description: 'Spiritual discipline through self-denial and contemplation.',
		specialAbilityDescription: 'Calamities that cause treasury loss are reduced by 3 for you (minimum 0).',
		credits: [
			{ targetCardId: 'philosophy', creditAmount: 10 },
			{ targetCardId: 'medicine', creditAmount: 5 }
		],
		calamityModifiers: []
	},

	// ─── Civics (Eastern) ────────────────────────────────────────────────────

	{
		cardId: 'bureaucracy',
		name: 'Bureaucracy',
		deck: 'Eastern',
		group: 'Civics',
		baseCost: 120,
		vpTier: 3,
		description: 'Administrative systems and record-keeping for state functions.',
		specialAbilityDescription: 'You may collect tax on the turn you first build a city in a new area.',
		credits: [
			{ targetCardId: 'law', creditAmount: 10 },
			{ targetCardId: 'republic', creditAmount: 5 }
		],
		calamityModifiers: []
	},
	{
		cardId: 'monarchy',
		name: 'Monarchy',
		deck: 'Eastern',
		group: 'Civics',
		baseCost: 100,
		vpTier: 3,
		description: 'Hereditary rule by a single sovereign.',
		specialAbilityDescription: 'You collect 3 tax tokens per city instead of 2 in Phase 1.',
		credits: [
			{ targetCardId: 'republic', creditAmount: 5 },
			{ targetCardId: 'military', creditAmount: 5 }
		],
		calamityModifiers: []
	},
	{
		cardId: 'tribute',
		name: 'Tribute',
		deck: 'Eastern',
		group: 'Civics',
		baseCost: 60,
		vpTier: 1,
		description: 'Exaction of payments from conquered or client peoples.',
		specialAbilityDescription: 'Whenever you win a city conflict, take 5 additional treasury from the defeated player.',
		credits: [
			{ targetCardId: 'trade-empire', creditAmount: 5 },
			{ targetCardId: 'coinage', creditAmount: 5 }
		],
		calamityModifiers: []
	},
	{
		cardId: 'trade-routes',
		name: 'Trade Routes',
		deck: 'Eastern',
		group: 'Civics',
		baseCost: 120,
		vpTier: 3,
		description: 'Established overland and maritime trade corridors.',
		specialAbilityDescription: 'Your commodity sets each gain +5 treasury value when traded during Phase 7.',
		credits: [
			{ targetCardId: 'trade-empire', creditAmount: 10 },
			{ targetCardId: 'naval-power', creditAmount: 5 }
		],
		calamityModifiers: []
	},
	{
		cardId: 'banking',
		name: 'Banking',
		deck: 'Eastern',
		group: 'Civics',
		baseCost: 160,
		vpTier: 3,
		description: 'Institutions for lending, storing, and exchanging treasury.',
		specialAbilityDescription: 'You may carry over up to 10 surplus treasury tokens between turns.',
		credits: [
			{ targetCardId: 'coinage', creditAmount: 10 },
			{ targetCardId: 'trade-empire', creditAmount: 10 }
		],
		calamityModifiers: [
			{ calamityId: 'squandered-wealth', description: 'Negates Squandered Wealth — you lose no treasury.' }
		]
	},
	{
		cardId: 'taxation',
		name: 'Taxation',
		deck: 'Eastern',
		group: 'Civics',
		baseCost: 100,
		vpTier: 3,
		description: 'Formal systems for collecting revenue from citizens and trade.',
		specialAbilityDescription: 'Gain 1 bonus treasury token per turn for each city you own beyond 3.',
		credits: [
			{ targetCardId: 'law', creditAmount: 5 },
			{ targetCardId: 'democracy', creditAmount: 5 }
		],
		calamityModifiers: []
	},
	{
		cardId: 'postal-service',
		name: 'Postal Service',
		deck: 'Eastern',
		group: 'Civics',
		baseCost: 80,
		vpTier: 1,
		description: 'Organised relay system for messages and goods across the empire.',
		specialAbilityDescription: 'You may send one message (1 treasury) to any player between phases, forcing them to respond to a trade offer.',
		credits: [
			{ targetCardId: 'trade-routes', creditAmount: 5 },
			{ targetCardId: 'law', creditAmount: 5 }
		],
		calamityModifiers: []
	},
	{
		cardId: 'guilds',
		name: 'Guilds',
		deck: 'Eastern',
		group: 'Civics',
		baseCost: 100,
		vpTier: 3,
		description: 'Professional associations of craftsmen and merchants.',
		specialAbilityDescription: 'Your Crafts-group advance purchases cost 10 less treasury each.',
		credits: [
			{ targetCardId: 'trade-empire', creditAmount: 5 },
			{ targetCardId: 'metalworking', creditAmount: 5 }
		],
		calamityModifiers: []
	}
] as const;

export const CARD_MAP: Map<string, CivilizationCard> = new Map(
	CARDS.map((c) => [c.cardId, c as CivilizationCard])
);
