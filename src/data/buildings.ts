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
  /** The rules the civilization is played under: West/East, or The Far East. */
  rules: 'we' | 'fe';
}

type Row = Omit<SpecialBuilding, 'rules'>;

const WEST_EAST: Row[] = [
  { id: 'assyria', civ: 'Assyria', name: 'Ziggurat of Dur-Sharrukin' },
  { id: 'babylon', civ: 'Babylon', name: 'Giant Ziggurat' },
  { id: 'carthage', civ: 'Carthage', name: 'Great Harbor' },
  { id: 'celt', civ: 'Celt', name: 'Stonehenge' },
  { id: 'dravidia', civ: 'Dravidia', name: 'Shore Temple of Mamallapuram' },
  { id: 'egypt', civ: 'Egypt', name: 'Great Sphinx of Giza' },
  { id: 'hatti', civ: 'Hatti', name: 'Hattusan City Walls' },
  { id: 'hellas', civ: 'Hellas', name: 'Parthenon' },
  { id: 'iberia', civ: 'Iberia', name: 'Mausoleum of Pozo Moro' },
  { id: 'indus', civ: 'Indus', name: 'Giant Stupa' },
  { id: 'kushan', civ: 'Kushan', name: 'Bhamala Stupa' },
  { id: 'maurya', civ: 'Maurya', name: 'Ashokan Pillar' },
  { id: 'minoa', civ: 'Minoa', name: 'Great Palace' },
  { id: 'nubia', civ: 'Nubia', name: 'Nubian Pyramid' },
  { id: 'parthia', civ: 'Parthia', name: 'Archway of Ctesiphon' },
  { id: 'persia', civ: 'Persia', name: 'Apadana Palace' },
  { id: 'rome', civ: 'Rome', name: 'Colosseum' },
  { id: 'saba', civ: 'Saba', name: 'Mahram Bilqis' },
];

/** The Far East nations (North and South boxes) and their buildings. */
const FAR_EAST: Row[] = [
  { id: 'daiviet', civ: 'Đại Việt', name: 'One Pillar Pagoda of Thang Long' },
  { id: 'heian', civ: 'Heian', name: 'Palace of Heian-kyō' },
  { id: 'khmer', civ: 'Khmer', name: 'Bayon Temple of Angkor Thom' },
  { id: 'majapahit', civ: 'Majapahit', name: 'Candi Panataran Temple Complex' },
  { id: 'ming', civ: 'Ming', name: 'Forbidden City of Beijing' },
  { id: 'mongol', civ: 'Mongol', name: 'Palace of Myriad Peace of Karakorum' },
  { id: 'song', civ: 'Song', name: 'Leifeng Pagoda in Hangzhou' },
  { id: 'srivijaya', civ: 'Srivijaya', name: 'Muara Takus Temple Complex' },
  { id: 'sulawesi', civ: 'Sulawesi', name: 'Tongkonan Ancestral Houses' },
  { id: 'tang', civ: 'Tang', name: 'Daming Palace of Chang’an' },
  { id: 'tibet', civ: 'Tibet', name: 'Jokhang Temple in Lhasa' },
  { id: 'zhangzhung', civ: 'Zhangzhung', name: 'Khyunglung Palace' },
];

export const SPECIAL_BUILDINGS: SpecialBuilding[] = [
  ...WEST_EAST.map((b) => ({ ...b, rules: 'we' as const })),
  ...FAR_EAST.map((b) => ({ ...b, rules: 'fe' as const })),
];

const BY_ID = new Map(SPECIAL_BUILDINGS.map((b) => [b.id, b]));

export function buildingById(id: string): SpecialBuilding | undefined {
  return BY_ID.get(id);
}

/** The buildings in a game played under these rules. */
export function buildingsFor(rules: 'we' | 'fe'): SpecialBuilding[] {
  return SPECIAL_BUILDINGS.filter((b) => b.rules === rules);
}

/** Where the constructing player's succession marker is on the A.S.T., which sets the price. */
export type BuildingEra = 'bronze' | 'lateBronze' | 'iron';

export const BUILDING_ERAS: { id: BuildingEra; label: string; name: string; cost: number }[] = [
  { id: 'bronze', label: 'EBA/MBA', name: 'Early/Middle Bronze Age', cost: 30 },
  { id: 'lateBronze', label: 'LBA', name: 'Late Bronze Age', cost: 40 },
  { id: 'iron', label: 'EIA/LIA', name: 'Early/Late Iron Age', cost: 50 },
];

export function buildingCost(era: BuildingEra): number {
  return BUILDING_ERAS.find((e) => e.id === era)!.cost;
}
