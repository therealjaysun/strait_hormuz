// Placement zone definitions — from GDD Section 3.3
// Positions in normalized coordinates (0-1000 x 0-600)

export const PLACEMENT_ZONES = {
  defender: {
    coastal: {
      count: 6,
      types: ['COASTAL_MISSILE', 'RADAR'],
      label: 'Iranian Coastline Emplacements',
      slots: [
        { id: 'coastal_0', position: { x: 112, y: 58 }, label: 'Charak Sector' },
        { id: 'coastal_1', position: { x: 284, y: 84 }, label: 'Bandar-e Lengeh Sector' },
        { id: 'coastal_2', position: { x: 468, y: 66 }, label: 'Qeshm Channel Sector' },
        { id: 'coastal_3', position: { x: 636, y: 14 }, label: 'Bandar Abbas Sector' },
        { id: 'coastal_4', position: { x: 810, y: 48 }, label: 'Hormuz Approach Sector' },
        { id: 'coastal_5', position: { x: 930, y: 104 }, label: 'Jask Sector' },
      ],
    },
    island: {
      count: 6,
      types: ['COASTAL_MISSILE', 'RADAR', 'NAVAL', 'AERIAL', 'MINE_LAYER', 'SUBMARINE', 'DRONE'],
      label: 'Island Forward Bases',
      slots: [
        { id: 'island_tunb', position: { x: 432, y: 286 }, label: 'Greater Tunb' },
        { id: 'island_abu_musa', position: { x: 342, y: 424 }, label: 'Abu Musa' },
        { id: 'island_qeshm', position: { x: 542, y: 106 }, label: 'Qeshm Island' },
        { id: 'island_hormuz', position: { x: 694, y: 74 }, label: 'Hormuz Island' },
        { id: 'island_larak', position: { x: 776, y: 106 }, label: 'Larak Island' },
        { id: 'island_hengam', position: { x: 658, y: 144 }, label: 'Hengam Island' },
      ],
    },
    naval: {
      count: 6,
      types: ['NAVAL', 'MINE_LAYER', 'SUBMARINE'],
      label: 'Naval Staging Areas',
      slots: [
        { id: 'naval_0', position: { x: 320, y: 200 }, label: 'Western Staging Area', capacity: 4 },
        { id: 'naval_1', position: { x: 540, y: 180 }, label: 'Central Staging Area', capacity: 4 },
        { id: 'naval_2', position: { x: 750, y: 170 }, label: 'Eastern Staging Area', capacity: 4 },
        { id: 'naval_alpha', position: { x: 480, y: 156 }, label: 'Alpha Route Intercept', capacity: 3 },
        { id: 'naval_bravo', position: { x: 610, y: 192 }, label: 'Bravo Route Intercept', capacity: 3 },
        { id: 'naval_charlie', position: { x: 580, y: 240 }, label: 'Charlie Route Intercept', capacity: 3 },
      ],
    },
    aerial: {
      count: 4,
      types: ['AERIAL', 'DRONE'],
      label: 'Aerial Patrol Stations',
      slots: [
        { id: 'aerial_0', position: { x: 400, y: 180 }, label: 'Western Patrol Station', capacity: 2 },
        { id: 'aerial_1', position: { x: 630, y: 170 }, label: 'Strait Patrol Station', capacity: 2 },
        { id: 'aerial_2', position: { x: 520, y: 260 }, label: 'Southern Patrol Station', capacity: 2 },
        { id: 'aerial_3', position: { x: 830, y: 190 }, label: 'East Exit Patrol Station', capacity: 2 },
      ],
    },
  },
  attacker: {
    convoy: {
      count: 5,
      types: ['ESCORT'],
      label: 'Convoy Formation',
      positions: ['lead', 'port', 'starboard', 'rear', 'center'],
      slots: [
        { id: 'convoy_lead', position: { x: 0, y: 0 }, label: 'Lead Position', relative: true },
        { id: 'convoy_port', position: { x: 0, y: 0 }, label: 'Port Flank', relative: true },
        { id: 'convoy_starboard', position: { x: 0, y: 0 }, label: 'Starboard Flank', relative: true },
        { id: 'convoy_rear', position: { x: 0, y: 0 }, label: 'Rear Position', relative: true },
        { id: 'convoy_center', position: { x: 0, y: 0 }, label: 'Center Position', relative: true },
      ],
    },
    forwardScreen: {
      count: 4,
      types: ['ESCORT', 'MCM'],
      label: 'Forward Screen',
      slots: [
        { id: 'fwd_0', position: { x: 0, y: 0 }, label: 'Forward Picket 1', relative: true },
        { id: 'fwd_1', position: { x: 0, y: 0 }, label: 'Forward Picket 2', relative: true },
        { id: 'fwd_2', position: { x: 0, y: 0 }, label: 'Forward Picket 3', relative: true },
        { id: 'fwd_3', position: { x: 0, y: 0 }, label: 'Forward Picket 4', relative: true },
      ],
    },
    omanCoast: {
      count: 4,
      types: ['ESCORT', 'MCM', 'SUBMARINE'],
      label: 'Oman Coast Stations',
      slots: [
        { id: 'oman_0', position: { x: 616, y: 236 }, label: 'Khasab Station', capacity: 2 },
        { id: 'oman_1', position: { x: 644, y: 378 }, label: 'Musandam Station', capacity: 2 },
        { id: 'oman_2', position: { x: 692, y: 446 }, label: 'Fujairah Station', capacity: 2 },
        { id: 'oman_3', position: { x: 914, y: 390 }, label: 'East Oman Station', capacity: 2 },
      ],
    },
    aerial: {
      count: 4,
      types: ['AERIAL', 'EW'],
      label: 'CAP Stations',
      slots: [
        { id: 'cap_0', position: { x: 0, y: 0 }, label: 'CAP Station 1', relative: true, capacity: 2 },
        { id: 'cap_1', position: { x: 0, y: 0 }, label: 'CAP Station 2', relative: true, capacity: 2 },
        { id: 'cap_2', position: { x: 0, y: 0 }, label: 'CAP Station 3', relative: true, capacity: 2 },
        { id: 'cap_3', position: { x: 0, y: 0 }, label: 'CAP Station 4', relative: true, capacity: 2 },
      ],
    },
    submarine: {
      count: 3,
      types: ['SUBMARINE'],
      label: 'Submarine Patrol Zones',
      slots: [
        { id: 'sub_0', position: { x: 0, y: 0 }, label: 'Sub Patrol Zone 1', relative: true },
        { id: 'sub_1', position: { x: 0, y: 0 }, label: 'Sub Patrol Zone 2', relative: true },
        { id: 'sub_2', position: { x: 0, y: 0 }, label: 'Sub Patrol Zone 3', relative: true },
      ],
    },
  },
};
