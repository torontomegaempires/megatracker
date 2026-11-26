// Special buildings from Mega Empires: The Special Buildings (rulesheet 2.0, 2024), an
// expansion for The West and The East. Hand-written: the original calculator has none.

export interface SpecialBuilding {
  /** The civilization's id, which also names its building: one building per civilization. */
  id: string;
  /** The civilization the building is historically associated with. */
  civ: string;
  name: string;
}

export const SPECIAL_BUILDINGS: SpecialBuilding[] = [
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

const BY_ID = new Map(SPECIAL_BUILDINGS.map((b) => [b.id, b]));

export function buildingById(id: string): SpecialBuilding | undefined {
  return BY_ID.get(id);
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
