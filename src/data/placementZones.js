// Placement zone definitions — from GDD Section 3.3
// Positions in normalized coordinates (0-1000 x 0-600)

export const PLACEMENT_ZONES = {
  defender: {
    coastal: {
      count: 6,
      types: ['COASTAL_MISSILE', 'RADAR'],
      label: 'Iranian Coastline Emplacements',
      slots: [
        { id: 'coastal_0', position: { x: 150, y: 80 }, label: 'Coastal Slot 1' },
        { id: 'coastal_1', position: { x: 280, y: 70 }, label: 'Coastal Slot 2' },
        { id: 'coastal_2', position: { x: 410, y: 55 }, label: 'Coastal Slot 3' },
        { id: 'coastal_3', position: { x: 540, y: 50 }, label: 'Coastal Slot 4' },
        { id: 'coastal_4', position: { x: 670, y: 45 }, label: 'Coastal Slot 5' },
        { id: 'coastal_5', position: { x: 800, y: 40 }, label: 'Coastal Slot 6' },
      ],
    },
    island: {
      count: 4,
      types: ['COASTAL_MISSILE', 'RADAR', 'NAVAL', 'AERIAL', 'MINE_LAYER', 'SUBMARINE', 'DRONE'],
      label: 'Island Forward Bases',
      slots: [
        { id: 'island_qeshm', position: { x: 350, y: 130 }, label: 'Qeshm Island' },
        { id: 'island_hormuz', position: { x: 480, y: 175 }, label: 'Hormuz Island' },
        { id: 'island_larak', position: { x: 580, y: 190 }, label: 'Larak Island' },
        { id: 'island_hengam', position: { x: 440, y: 210 }, label: 'Hengam Island' },
      ],
    },
    naval: {
      count: 6,
      types: ['NAVAL', 'MINE_LAYER', 'SUBMARINE'],
      label: 'Naval Staging Areas',
      slots: [
        { id: 'naval_0', position: { x: 200, y: 180 }, label: 'Western Staging Area', capacity: 4 },
        { id: 'naval_1', position: { x: 450, y: 260 }, label: 'Central Staging Area', capacity: 4 },
        { id: 'naval_2', position: { x: 700, y: 230 }, label: 'Eastern Staging Area', capacity: 4 },
        // New: positions along the three route corridors
        { id: 'naval_alpha', position: { x: 350, y: 220 }, label: 'Alpha Route Intercept', capacity: 3 },
        { id: 'naval_bravo', position: { x: 550, y: 310 }, label: 'Bravo Route Intercept', capacity: 3 },
        { id: 'naval_charlie', position: { x: 500, y: 400 }, label: 'Charlie Route Intercept', capacity: 3 },
      ],
    },
    aerial: {
      count: 4,
      types: ['AERIAL', 'DRONE'],
      label: 'Aerial Patrol Zones',
      slots: [
        { id: 'aerial_0', position: { x: 300, y: 200 }, label: 'Western Patrol Zone', capacity: 2 },
        { id: 'aerial_1', position: { x: 600, y: 240 }, label: 'Eastern Patrol Zone', capacity: 2 },
        // New: mid-strait aerial zones
        { id: 'aerial_2', position: { x: 450, y: 350 }, label: 'Central Patrol Zone', capacity: 2 },
        { id: 'aerial_3', position: { x: 750, y: 280 }, label: 'Far East Patrol Zone', capacity: 2 },
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
        { id: 'oman_0', position: { x: 550, y: 460 }, label: 'Musandam Station 1', capacity: 2 },
        { id: 'oman_1', position: { x: 650, y: 410 }, label: 'Musandam Station 2', capacity: 2 },
        { id: 'oman_2', position: { x: 750, y: 360 }, label: 'Fujairah Station', capacity: 2 },
        { id: 'oman_3', position: { x: 850, y: 310 }, label: 'East Oman Station', capacity: 2 },
      ],
    },
    aerial: {
      count: 4,
      types: ['AERIAL', 'EW'],
      label: 'CAP Zones',
      slots: [
        { id: 'cap_0', position: { x: 0, y: 0 }, label: 'CAP Zone 1', relative: true, capacity: 2 },
        { id: 'cap_1', position: { x: 0, y: 0 }, label: 'CAP Zone 2', relative: true, capacity: 2 },
        { id: 'cap_2', position: { x: 0, y: 0 }, label: 'CAP Zone 3', relative: true, capacity: 2 },
        { id: 'cap_3', position: { x: 0, y: 0 }, label: 'CAP Zone 4', relative: true, capacity: 2 },
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
