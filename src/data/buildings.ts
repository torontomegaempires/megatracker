// Special buildings from Mega Empires: The Special Buildings (rulesheet 2.0, 2024), an
// expansion for The West and The East, offered here for The Far East too, whose buildings
// are from Ares Games' Kickstarter update for The Far East. Hand-written: the original
// calculator has none.

export interface SpecialBuilding {
  /** The civilization's id, which also names its building: one building per civilization. */
  id: string;
  /** The civilization the building is historically associated with. */
  civ: string;
  name: string;
  /** The nation's token color, sampled from the empire pictures on mega-empires.com. */
  color: string;
  /** The rules the civilization is played under: West/East, or The Far East. */
  rules: 'we' | 'fe';
  /** The nation's number on the Archaeological Succession Table: its place in the turn order. */
  ast: number;
}

type Row = Omit<SpecialBuilding, 'rules'>;

/** Nations in AST order, for choosing yours. */
export function nationsByAst(list: SpecialBuilding[]): SpecialBuilding[] {
  return [...list].sort((a, b) => a.ast - b.ast);
}

const WEST_EAST: Row[] = [
  { id: 'assyria', civ: 'Assyria', name: 'Ziggurat of Dur-Sharrukin', color: '#1ccbf2', ast: 3 },
  { id: 'babylon', civ: 'Babylon', name: 'Giant Ziggurat', color: '#808182', ast: 6 },
  { id: 'carthage', civ: 'Carthage', name: 'Great Harbor', color: '#fb9036', ast: 7 },
  { id: 'celt', civ: 'Celt', name: 'Stonehenge', color: '#35b659', ast: 5 },
  { id: 'dravidia', civ: 'Dravidia', name: 'Shore Temple of Mamallapuram', color: '#2e3591', ast: 8 },
  { id: 'egypt', civ: 'Egypt', name: 'Great Sphinx of Giza', color: '#fddec2', ast: 17 },
  { id: 'hatti', civ: 'Hatti', name: 'Hattusan City Walls', color: '#f586b6', ast: 9 },
  { id: 'hellas', civ: 'Hellas', name: 'Parthenon', color: '#f9ed45', ast: 15 },
  { id: 'iberia', civ: 'Iberia', name: 'Mausoleum of Pozo Moro', color: '#d5d5d6', ast: 13 },
  { id: 'indus', civ: 'Indus', name: 'Giant Stupa', color: '#008f48', ast: 16 },
  { id: 'kushan', civ: 'Kushan', name: 'Bhamala Stupa', color: '#5b0c10', ast: 10 },
  { id: 'maurya', civ: 'Maurya', name: 'Ashokan Pillar', color: '#eb212b', ast: 4 },
  { id: 'minoa', civ: 'Minoa', name: 'Great Palace', color: '#a8cf55', ast: 1 },
  { id: 'nubia', civ: 'Nubia', name: 'Nubian Pyramid', color: '#00a69b', ast: 14 },
  { id: 'parthia', civ: 'Parthia', name: 'Archway of Ctesiphon', color: '#575622', ast: 18 },
  { id: 'persia', civ: 'Persia', name: 'Apadana Palace', color: '#912d91', ast: 12 },
  { id: 'rome', civ: 'Rome', name: 'Colosseum', color: '#eb0585', ast: 11 },
  { id: 'saba', civ: 'Saba', name: 'Mahram Bilqis', color: '#f36a2d', ast: 2 },
];

/** The Far East nations (North and South boxes) and their buildings. */
const FAR_EAST: Row[] = [
  { id: 'daiviet', civ: 'Đại Việt', name: 'One Pillar Pagoda of Thang Long', color: '#ecaa54', ast: 7 },
  { id: 'heian', civ: 'Heian', name: 'Palace of Heian-kyō', color: '#81588f', ast: 5 },
  { id: 'khmer', civ: 'Khmer', name: 'Bayon Temple of Angkor Thom', color: '#f6e4ad', ast: 15 },
  { id: 'majapahit', civ: 'Majapahit', name: 'Candi Panataran Temple Complex', color: '#dea9bf', ast: 3 },
  { id: 'ming', civ: 'Ming', name: 'Forbidden City of Beijing', color: '#e8cb53', ast: 9 },
  { id: 'mongol', civ: 'Mongol', name: 'Palace of Myriad Peace of Karakorum', color: '#498852', ast: 1 },
  { id: 'song', civ: 'Song', name: 'Leifeng Pagoda in Hangzhou', color: '#5da3d8', ast: 17 },
  { id: 'srivijaya', civ: 'Srivijaya', name: 'Muara Takus Temple Complex', color: '#9dcbd7', ast: 11 },
  { id: 'sulawesi', civ: 'Sulawesi', name: 'Tongkonan Ancestral Houses', color: '#a7c07c', ast: 19 },
  { id: 'tang', civ: 'Tang', name: 'Daming Palace of Chang’an', color: '#d74987', ast: 13 },
  { id: 'tibet', civ: 'Tibet', name: 'Jokhang Temple in Lhasa', color: '#828385', ast: 21 },
  { id: 'zhangzhung', civ: 'Zhangzhung', name: 'Khyunglung Palace', color: '#346f92', ast: 20 },
];

export const SPECIAL_BUILDINGS: SpecialBuilding[] = [
  ...WEST_EAST.map((b) => ({ ...b, rules: 'we' as const })),
  ...FAR_EAST.map((b) => ({ ...b, rules: 'fe' as const })),
];

const BY_ID = new Map(SPECIAL_BUILDINGS.map((b) => [b.id, b]));

export function buildingById(id: string): SpecialBuilding | undefined {
  return BY_ID.get(id);
}

const fold = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/^the\s+/, '')
    .replace(/[^a-z]/g, '');
const BY_CIV = new Map(SPECIAL_BUILDINGS.map((b) => [fold(b.civ), b]));

/** A nation typed by a player ("Rome", "dai viet"), matched ignoring case, accents and spaces. */
export function nationByName(name: string): SpecialBuilding | undefined {
  return BY_CIV.get(fold(name));
}

/** The buildings in a game played under these rules. */
export function buildingsFor(rules: 'we' | 'fe'): SpecialBuilding[] {
  return SPECIAL_BUILDINGS.filter((b) => b.rules === rules);
}

/** How far your succession marker has got on the A.S.T. Bronze and Iron Age buildings cost the same in each half. */
export type Era = 'eba' | 'mba' | 'lba' | 'eia' | 'lia';

export const ERAS: { id: Era; abbr: string; name: string; cost: number }[] = [
  { id: 'eba', abbr: 'EBA', name: 'Early Bronze Age', cost: 30 },
  { id: 'mba', abbr: 'MBA', name: 'Middle Bronze Age', cost: 30 },
  { id: 'lba', abbr: 'LBA', name: 'Late Bronze Age', cost: 40 },
  { id: 'eia', abbr: 'EIA', name: 'Early Iron Age', cost: 50 },
  { id: 'lia', abbr: 'LIA', name: 'Late Iron Age', cost: 50 },
];

export function buildingCost(era: Era): number {
  return ERAS.find((e) => e.id === era)!.cost;
}

/** What a Special Building is worth in the Advances list: 3 VP, or 5 with your own nation's building. Sorting uses the 5. */
export const SPECIAL_BUILDING_VP = { low: 3, high: 5 };

/** WCAG contrast ratio between two #rrggbb colors. */
export function contrastRatio(a: string, b: string): number {
  const lum = (hex: string) => {
    const [r, g, bl] = [1, 3, 5].map((i) => {
      const c = parseInt(hex.slice(i, i + 2), 16) / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
