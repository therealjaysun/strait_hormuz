// Phase 7 Integration Tests — AI Placement, AI Abilities, Scoring Engine
// Run: node test_phase7.js

import { generateAIPlacement } from './src/engine/AIPlacement.js';
import { calculateWarScore } from './src/engine/ScoringEngine.js';
import AIAbilities from './src/engine/AIAbilities.js';
import SimulationEngine from './src/engine/SimulationEngine.js';
import { createRNG } from './src/utils/random.js';
import { defenderEquipment } from './src/data/defenderEquipment.js';
import { attackerEquipment } from './src/data/attackerEquipment.js';
import { BUDGETS } from './src/data/constants.js';

const EQUIPMENT_BY_ID = {};
for (const e of defenderEquipment) EQUIPMENT_BY_ID[e.id] = e;
for (const e of attackerEquipment) EQUIPMENT_BY_ID[e.id] = e;

let passed = 0;
let failed = 0;

function assert(condition, msg) {
  if (condition) {
    console.log(`  ✓ ${msg}`);
    passed++;
  } else {
    console.log(`  ✗ ${msg}`);
    failed++;
  }
}

function totalCost(placements) {
  return placements.reduce((s, p) => {
    const eq = EQUIPMENT_BY_ID[p.assetId];
    return s + (eq ? eq.cost : 0);
  }, 0);
}

function hasAsset(placements, assetId) {
  return placements.some(p => p.assetId === assetId);
}

// ── Test 1: AI Placement — ADVISORY ──
console.log('\n=== Test 1: AI Placement — ADVISORY ===');
{
  const rng = createRNG(42);
  const result = generateAIPlacement('DEFENDER', 'ADVISORY', 1500, rng);
  const cost = totalCost(result.placements);
  assert(result.placements.length > 0, `ADVISORY defender placed ${result.placements.length} assets`);
  assert(cost <= 1500, `Spent ${cost} <= 1500 budget`);
  assert(cost < 1500 * 0.85, `ADVISORY leaves budget unspent (spent ${cost}, <85% of 1500)`);
  assert(result.route === null, 'Defender has no route');
}

// ── Test 2: AI Placement — ADVISORY Attacker ──
console.log('\n=== Test 2: AI Placement — ADVISORY Attacker ===');
{
  const rng = createRNG(123);
  const result = generateAIPlacement('ATTACKER', 'ADVISORY', 2000, rng);
  const cost = totalCost(result.placements);
  assert(result.placements.length > 0, `ADVISORY attacker placed ${result.placements.length} assets`);
  assert(cost <= 2000, `Spent ${cost} <= 2000 budget`);
  assert(['ALPHA', 'BRAVO', 'CHARLIE'].includes(result.route), `Route selected: ${result.route}`);
}

// ── Test 3: AI Placement — ELEVATED Defender ──
console.log('\n=== Test 3: AI Placement — ELEVATED ===');
{
  const rng = createRNG(99);
  const result = generateAIPlacement('DEFENDER', 'ELEVATED', 1800, rng);
  const cost = totalCost(result.placements);
  assert(cost > 1800 * 0.7, `ELEVATED spends >70% budget (spent ${cost})`);
  assert(hasAsset(result.placements, 'coastal_radar'), 'ELEVATED defender places at least 1 radar');
}

// ── Test 4: AI Placement — SEVERE Defender ──
console.log('\n=== Test 4: AI Placement — SEVERE Defender ===');
{
  const rng = createRNG(55);
  const result = generateAIPlacement('DEFENDER', 'SEVERE', 2000, rng);
  const cost = totalCost(result.placements);
  assert(cost > 2000 * 0.90, `SEVERE spends >90% budget (spent ${cost})`);
  assert(hasAsset(result.placements, 'coastal_radar'), 'SEVERE has radar');
  // Check for missile batteries
  const hasMissiles = hasAsset(result.placements, 'noor_ashm') ||
    hasAsset(result.placements, 'ghader_cruise') ||
    hasAsset(result.placements, 'khalij_fars_asbm');
  assert(hasMissiles, 'SEVERE has missile batteries');
}

// ── Test 5: AI Placement — CRITICAL Defender ──
console.log('\n=== Test 5: AI Placement — CRITICAL Defender ===');
{
  const rng = createRNG(77);
  const result = generateAIPlacement('DEFENDER', 'CRITICAL', 2200, rng);
  const cost = totalCost(result.placements);
  assert(cost > 2200 * 0.95, `CRITICAL spends >95% budget (spent ${cost})`);
  assert(result.placements.length >= 8, `CRITICAL places many assets (${result.placements.length})`);
  // Should have mine layers
  assert(hasAsset(result.placements, 'mine_layer'), 'CRITICAL has mine layers');
  // Should have subs
  assert(hasAsset(result.placements, 'ghadir_sub'), 'CRITICAL has submarines');
}

// ── Test 6: AI Placement — CRITICAL Attacker ──
console.log('\n=== Test 6: AI Placement — CRITICAL Attacker ===');
{
  const rng = createRNG(33);
  const result = generateAIPlacement('ATTACKER', 'CRITICAL', 1400, rng);
  const cost = totalCost(result.placements);
  assert(cost > 1400 * 0.90, `CRITICAL attacker spends >90% (spent ${cost})`);
  assert(hasAsset(result.placements, 'ea18g_growler'), 'CRITICAL attacker has Growler');
  assert(hasAsset(result.placements, 'arleigh_burke_ddg'), 'CRITICAL attacker has DDG');
}

// ── Test 7: AI Placement — zone constraints ──
console.log('\n=== Test 7: AI Placement — Zone Constraints ===');
{
  const rng = createRNG(42);
  const result = generateAIPlacement('DEFENDER', 'CRITICAL', 2200, rng);
  // All placements should have valid zoneIds
  const allHaveZone = result.placements.every(p => p.zoneId && p.zoneId.length > 0);
  assert(allHaveZone, 'All placements have valid zone IDs');
  // All placements should have positions
  const allHavePos = result.placements.every(p => p.position && typeof p.position.x === 'number');
  assert(allHavePos, 'All placements have valid positions');
}

// ── Test 8: AI Abilities — ADVISORY does nothing ──
console.log('\n=== Test 8: AI Abilities — ADVISORY ===');
{
  const aiAb = new AIAbilities('DEFENDER', 'ADVISORY');
  assert(!aiAb.enabled, 'ADVISORY AI abilities disabled');
}

// ── Test 9: AI Abilities — ELEVATED is reactive ──
console.log('\n=== Test 9: AI Abilities — ELEVATED ===');
{
  const aiAb = new AIAbilities('DEFENDER', 'ELEVATED');
  assert(aiAb.enabled, 'ELEVATED AI abilities enabled');
  assert(aiAb.abilitySystem.abilities.length === 3, 'Has 3 defender abilities');
}

// ── Test 10: AI Abilities — SEVERE/CRITICAL enabled ──
console.log('\n=== Test 10: AI Abilities — SEVERE/CRITICAL ===');
{
  const severe = new AIAbilities('ATTACKER', 'SEVERE');
  assert(severe.enabled, 'SEVERE AI abilities enabled');
  assert(severe.abilitySystem.abilities.length === 3, 'Has 3 attacker abilities');

  const critical = new AIAbilities('DEFENDER', 'CRITICAL');
  assert(critical.enabled, 'CRITICAL AI abilities enabled');
}

// ── Test 11: Scoring Engine — all tankers escaped ──
console.log('\n=== Test 11: Scoring — All Tankers Escaped ===');
{
  const mockResult = createMockResult({ escaped: 5, destroyed: 0 });
  const score = calculateWarScore(mockResult);

  assert(score.tankerSummary.escaped === 5, 'All 5 escaped');
  assert(score.tankerSummary.passageRate === 1.0, 'Passage rate 100%');
  assert(score.attackerEffectiveness.score >= 30, `Attacker effectiveness >= 30 (got ${score.attackerEffectiveness.score})`);
  assert(score.defenderEffectiveness.components.oilRate === 0, 'Defender oil denial 0%');
  assert(score.tacticalSummary.length > 0, 'Tactical summary generated');
}

// ── Test 12: Scoring Engine — all tankers destroyed ──
console.log('\n=== Test 12: Scoring — All Tankers Destroyed ===');
{
  const mockResult = createMockResult({ escaped: 0, destroyed: 5 });
  const score = calculateWarScore(mockResult);

  assert(score.tankerSummary.destroyed === 5, 'All 5 destroyed');
  assert(score.tankerSummary.passageRate === 0, 'Passage rate 0%');
  assert(score.defenderEffectiveness.components.oilRate === 100, 'Defender oil denial 100%');
  assert(score.attackerEffectiveness.components.oilRate === 0, 'Attacker oil delivery 0%');
}

// ── Test 13: Scoring Engine — mixed result ──
console.log('\n=== Test 13: Scoring — Mixed Result ===');
{
  const mockResult = createMockResult({ escaped: 3, destroyed: 2 });
  const score = calculateWarScore(mockResult);

  assert(score.tankerSummary.escaped === 3, '3 escaped');
  assert(score.tankerSummary.destroyed === 2, '2 destroyed');
  assert(score.tankerSummary.passageRate === 0.6, 'Passage rate 60%');
  assert(score.winner === 'ATTACKER', 'Attacker wins');
}

// ── Test 14: Scoring Engine — letter grades ──
console.log('\n=== Test 14: Scoring — Letter Grades ===');
{
  const mock100 = createMockResult({ escaped: 5, destroyed: 0, defLossCost: 1000, atkLossCost: 0 });
  const s1 = calculateWarScore(mock100);
  assert(['S', 'A'].includes(s1.attackerEffectiveness.grade), `High score grade is S or A (got ${s1.attackerEffectiveness.grade})`);

  const mock0 = createMockResult({ escaped: 0, destroyed: 5, defLossCost: 0, atkLossCost: 1000 });
  const s2 = calculateWarScore(mock0);
  assert(['D', 'F'].includes(s2.attackerEffectiveness.grade), `Low score grade is D or F (got ${s2.attackerEffectiveness.grade})`);
}

// ── Test 15: Scoring Engine — no military losses (division by zero) ──
console.log('\n=== Test 15: Scoring — No Losses Edge Case ===');
{
  const mockResult = createMockResult({ escaped: 3, destroyed: 2, defLossCost: 0, atkLossCost: 0 });
  const score = calculateWarScore(mockResult);
  assert(!isNaN(score.defenderEffectiveness.score), 'Defender score is not NaN');
  assert(!isNaN(score.attackerEffectiveness.score), 'Attacker score is not NaN');
}

// ── Test 16: Scoring Engine — tactical summary ──
console.log('\n=== Test 16: Tactical Summary ===');
{
  const mockResult = createMockResult({ escaped: 0, destroyed: 5 });
  const score = calculateWarScore(mockResult);
  assert(score.tacticalSummary.includes('Strait of Hormuz') || score.tacticalSummary.includes('strait'),
    'Summary mentions strait');
  assert(score.tacticalSummary.length > 50, `Summary is substantial (${score.tacticalSummary.length} chars)`);
}

// ── Test 17: Full simulation with AI at each difficulty ──
console.log('\n=== Test 17: Full Sim — AI Placement at Each Difficulty ===');
for (const diff of ['ADVISORY', 'ELEVATED', 'SEVERE', 'CRITICAL']) {
  const rng = createRNG(42);
  const budget = BUDGETS[diff];

  // Player is defender, AI is attacker
  const aiResult = generateAIPlacement('ATTACKER', diff, budget.ATTACKER, rng);
  const playerResult = generateAIPlacement('DEFENDER', diff, budget.DEFENDER, rng);

  const engine = new SimulationEngine({
    playerFaction: 'DEFENDER',
    difficulty: diff,
    playerPlacements: playerResult.placements,
    aiPlacements: aiResult.placements,
    selectedRoute: aiResult.route,
    aiRoute: aiResult.route,
    rngSeed: 42,
  });

  engine.start();

  // Run 100 ticks
  for (let i = 0; i < 100; i++) {
    engine.tick();
  }

  assert(engine.entities.length > 5, `${diff}: Entities created (${engine.entities.length})`);
  assert(engine.currentTick === 100, `${diff}: 100 ticks ran`);
}

// ── Summary ──
console.log(`\n${'='.repeat(40)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

// ── Helpers ──

function createMockResult({ escaped, destroyed, defLossCost = 200, atkLossCost = 300 }) {
  const entities = [];
  const destroyedEntities = [];

  // 5 tankers
  for (let i = 0; i < 5; i++) {
    const isEscaped = i < escaped;
    const isDestroyed = i >= escaped && i < escaped + destroyed;
    const t = {
      id: `tanker_${i}`,
      assetId: 'tanker',
      name: `VLCC Tanker ${i + 1}`,
      faction: 'ATTACKER',
      type: 'TANKER',
      position: { x: 500, y: 300 },
      hp: isDestroyed ? 0 : 100,
      maxHp: 100,
      isDestroyed,
      hasEscaped: isEscaped,
      cost: 0,
    };
    entities.push(t);
    if (isDestroyed) destroyedEntities.push(t);
  }

  // Some defender assets
  const defAsset = {
    id: 'def_1', assetId: 'noor_ashm', name: 'Noor-1',
    faction: 'DEFENDER', type: 'FIXED',
    position: { x: 200, y: 100 }, hp: 80, maxHp: 80,
    isDestroyed: defLossCost > 0, cost: 150,
    isDecoy: false, isDrone: false, isRadar: false, isCoastalMissile: true,
  };
  entities.push(defAsset);
  if (defLossCost > 0) destroyedEntities.push(defAsset);

  // Some attacker assets
  const atkAsset = {
    id: 'atk_1', assetId: 'arleigh_burke_ddg', name: 'DDG-1',
    faction: 'ATTACKER', type: 'SURFACE',
    position: { x: 600, y: 300 }, hp: 200, maxHp: 200,
    isDestroyed: atkLossCost > 0, cost: 400,
    isDecoy: false, isDrone: false,
  };
  entities.push(atkAsset);
  if (atkLossCost > 0) destroyedEntities.push(atkAsset);

  // Events
  const events = [
    { type: 'COMBAT_HIT', gameTime: 60, tick: 600, data: {
      type: 'COMBAT_HIT', attackerId: 'def_1', targetId: 'atk_1',
      attackerName: 'Noor-1', targetName: 'DDG-1',
      damage: 120, destroyed: false, attackerFaction: 'DEFENDER',
    }},
    { type: 'COMBAT_MISS', gameTime: 65, tick: 650, data: {
      type: 'COMBAT_MISS', attackerId: 'atk_1', targetId: 'def_1',
      attackerName: 'DDG-1', targetName: 'Noor-1',
      attackerFaction: 'ATTACKER',
    }},
  ];

  return {
    entities,
    destroyedEntities,
    events,
    winner: escaped > 0 ? 'ATTACKER' : 'DEFENDER',
    winReason: escaped > 0 ? 'TANKERS_ESCAPED' : 'ALL_TANKERS_DESTROYED',
    gameTime: 900,
    playerFaction: 'DEFENDER',
    difficulty: 'ELEVATED',
  };
}
