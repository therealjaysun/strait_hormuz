// Tanker Convoy — AI-Controlled, Non-Placeable
// From GDD Section 4.3

export const tankerConvoy = [
  {
    id: 'vlcc_pacific_glory',
    name: 'VLCC Pacific Glory',
    type: 'VLCC',
    hp: 300,
    speed: 15,
    signature: 'HIGH',
    cargoValue: 180_000_000,
    cargoBarrels: 2_000_000,
    entityType: 'TANKER',
  },
  {
    id: 'vlcc_arabian_star',
    name: 'VLCC Arabian Star',
    type: 'VLCC',
    hp: 300,
    speed: 15,
    signature: 'HIGH',
    cargoValue: 180_000_000,
    cargoBarrels: 2_000_000,
    entityType: 'TANKER',
  },
  {
    id: 'vlcc_gulf_meridian',
    name: 'VLCC Gulf Meridian',
    type: 'VLCC',
    hp: 300,
    speed: 15,
    signature: 'HIGH',
    cargoValue: 180_000_000,
    cargoBarrels: 2_000_000,
    entityType: 'TANKER',
  },
  {
    id: 'aframax_coral_dawn',
    name: 'Aframax Coral Dawn',
    type: 'AFRAMAX',
    hp: 200,
    speed: 16,
    signature: 'HIGH',
    cargoValue: 80_000_000,
    cargoBarrels: 750_000,
    entityType: 'TANKER',
  },
  {
    id: 'aframax_jade_horizon',
    name: 'Aframax Jade Horizon',
    type: 'AFRAMAX',
    hp: 200,
    speed: 16,
    signature: 'HIGH',
    cargoValue: 80_000_000,
    cargoBarrels: 750_000,
    entityType: 'TANKER',
  },
];

// Total convoy value: $700M
// Total barrels: 7.5M
// Convoy speed: 15 kt (limited to slowest vessel)
export const CONVOY_SPEED = 15;
export const TOTAL_CONVOY_VALUE = 700_000_000;
export const TOTAL_CONVOY_BARRELS = 7_500_000;
