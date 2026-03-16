// ScoringEngine — War Score calculation
// GDD Sections 8.2 through 8.4

import { SCORING, GRADES } from '../data/constants.js';
import { defenderEquipment } from '../data/defenderEquipment.js';
import { attackerEquipment } from '../data/attackerEquipment.js';

// Equipment lookup
const EQUIPMENT_BY_ID = {};
for (const e of defenderEquipment) EQUIPMENT_BY_ID[e.id] = e;
for (const e of attackerEquipment) EQUIPMENT_BY_ID[e.id] = e;

// Tanker cargo values — GDD 8.2.1
const TANKER_DATA = [
  { name: 'VLCC Pacific Glory',  type: 'VLCC',    cargoValue: 180, barrels: 2000000 },
  { name: 'VLCC Arabian Star',   type: 'VLCC',    cargoValue: 180, barrels: 2000000 },
  { name: 'VLCC Gulf Meridian',  type: 'VLCC',    cargoValue: 180, barrels: 2000000 },
  { name: 'VLCC Coral Dawn',     type: 'VLCC',    cargoValue: 180, barrels: 2000000 },
  { name: 'VLCC Jade Horizon',   type: 'VLCC',    cargoValue: 180, barrels: 2000000 },
];

/**
 * Calculate the complete War Score from simulation results.
 *
 * @param {Object} result - Simulation result data
 * @returns {Object} Full war score breakdown
 */
export function calculateWarScore(result) {
  const { entities, destroyedEntities, events, playerFaction, difficulty } = result;

  // ── 8.2.1 Tanker Status ──
  const tankers = entities.filter(e => e.type === 'TANKER');
  const tankerStatus = tankers.map((t, i) => {
    const data = TANKER_DATA[i] || TANKER_DATA[0];
    let status = 'IN TRANSIT';
    if (t.isDestroyed) status = 'DESTROYED';
    else if (t.hasEscaped) status = 'ESCAPED';

    return {
      name: data.name,
      status,
      cargoValue: data.cargoValue,
      barrels: data.barrels,
      hp: t.hp,
      maxHp: t.maxHp,
    };
  });

  const tankersEscaped = tankerStatus.filter(t => t.status === 'ESCAPED').length;
  const tankersDestroyed = tankerStatus.filter(t => t.status === 'DESTROYED').length;
  const totalBarrels = TANKER_DATA.reduce((s, t) => s + t.barrels, 0);
  const deliveredBarrels = tankerStatus
    .filter(t => t.status === 'ESCAPED')
    .reduce((s, t) => s + t.barrels, 0);
  const destroyedBarrels = tankerStatus
    .filter(t => t.status === 'DESTROYED')
    .reduce((s, t) => s + t.barrels, 0);
  const deliveredValue = tankerStatus
    .filter(t => t.status === 'ESCAPED')
    .reduce((s, t) => s + t.cargoValue, 0);
  const destroyedValue = tankerStatus
    .filter(t => t.status === 'DESTROYED')
    .reduce((s, t) => s + t.cargoValue, 0);
  const passageRate = tankersEscaped / 5;

  const tankerSummary = {
    escaped: tankersEscaped,
    destroyed: tankersDestroyed,
    inTransit: 5 - tankersEscaped - tankersDestroyed,
    deliveredBarrels,
    destroyedBarrels,
    deliveredValue,
    destroyedValue,
    passageRate,
  };

  // ── 8.2.2 Military Losses ──
  const defenderLosses = computeLosses(entities, destroyedEntities, 'DEFENDER');
  const attackerLosses = computeLosses(entities, destroyedEntities, 'ATTACKER');

  // ── 8.2.3 Budget Utilization ──
  const defenderBudgetInfo = computeBudgetUtilization(entities, 'DEFENDER');
  const attackerBudgetInfo = computeBudgetUtilization(entities, 'ATTACKER');

  // ── 8.2.4 Ammo Expenditure ──
  const defenderAmmo = computeAmmoExpenditure(events, 'DEFENDER');
  const attackerAmmo = computeAmmoExpenditure(events, 'ATTACKER');

  // ── 8.2.5 & 8.2.6 Effectiveness Assessment ──
  const defenderEffectiveness = computeDefenderEffectiveness(
    destroyedBarrels, totalBarrels,
    defenderBudgetInfo.spent, attackerLosses.totalCost, defenderLosses.totalCost,
    entities, 'DEFENDER'
  );

  const attackerEffectiveness = computeAttackerEffectiveness(
    deliveredBarrels, totalBarrels,
    attackerBudgetInfo.spent, defenderLosses.totalCost, attackerLosses.totalCost,
    entities, 'ATTACKER'
  );

  // ── 8.4 Tactical Summary ──
  const tacticalSummary = generateTacticalSummary(
    tankerSummary, defenderLosses, attackerLosses, events, entities, result
  );

  return {
    tankerStatus,
    tankerSummary,
    defenderLosses,
    attackerLosses,
    defenderBudget: defenderBudgetInfo,
    attackerBudget: attackerBudgetInfo,
    defenderAmmo,
    attackerAmmo,
    defenderEffectiveness,
    attackerEffectiveness,
    tacticalSummary,
    winner: result.winner,
    winReason: result.winReason,
    gameTime: result.gameTime,
    playerFaction,
    difficulty,
  };
}

// ── Loss computation ──

function computeLosses(allEntities, destroyedEntities, faction) {
  const destroyed = destroyedEntities.filter(e =>
    e.faction === faction && e.type !== 'TANKER' && e.type !== 'MINE' && !e.isDecoy && !e.isDrone
  );

  // Group by assetId
  const byAsset = {};
  for (const e of destroyed) {
    const key = e.assetId;
    if (!byAsset[key]) {
      const equipData = EQUIPMENT_BY_ID[key];
      byAsset[key] = {
        name: equipData ? equipData.name : key,
        count: 0,
        unitCost: e.cost || (equipData ? equipData.cost : 0),
        totalCost: 0,
      };
    }
    byAsset[key].count++;
    byAsset[key].totalCost += e.cost || byAsset[key].unitCost;
  }

  const items = Object.values(byAsset);
  const totalCost = items.reduce((s, i) => s + i.totalCost, 0);

  return { items, totalCost };
}

function computeBudgetUtilization(allEntities, faction) {
  // Sum cost of all placed assets (excluding tankers, mines, decoys, reserve FACs)
  const placed = allEntities.filter(e =>
    e.faction === faction && e.type !== 'TANKER' && e.type !== 'MINE' &&
    !e.isDecoy && !e.isDrone && e.cost > 0 &&
    !e.id.startsWith('reserve_')
  );
  const spent = placed.reduce((s, e) => s + e.cost, 0);
  return { spent };
}

function computeAmmoExpenditure(events, faction) {
  const fired = events.filter(e =>
    (e.type === 'COMBAT_HIT' || e.type === 'COMBAT_MISS') &&
    e.data.attackerFaction === faction
  );
  const hits = fired.filter(e => e.type === 'COMBAT_HIT');

  return {
    totalFired: fired.length,
    hits: hits.length,
    hitRate: fired.length > 0 ? hits.length / fired.length : 0,
  };
}

// ── Effectiveness (GDD 8.2.5 & 8.2.6) ──

function computeDefenderEffectiveness(
  destroyedBarrels, totalBarrels, budgetSpent,
  enemyLossCost, ownLossCost, entities, faction
) {
  const oilRate = totalBarrels > 0 ? destroyedBarrels / totalBarrels : 0;

  // Cost efficiency: destroyed barrels per budget point spent
  const rawCostEfficiency = budgetSpent > 0 ? destroyedBarrels / budgetSpent : 0;
  const costEfficiency = Math.min(rawCostEfficiency / 2000, 1.0); // Normalize: 2000 barrels/pt = 1.0

  // Exchange rate: enemy losses / own losses (by cost)
  const rawExchangeRate = ownLossCost > 0 ? enemyLossCost / ownLossCost : (enemyLossCost > 0 ? 3.0 : 0);
  const exchangeRate = Math.min(rawExchangeRate / 3.0, 1.0);

  // Survival rate
  const survivalRate = computeSurvivalRate(entities, faction);

  const score = (
    SCORING.OIL_OBJECTIVE_WEIGHT * oilRate +
    SCORING.COST_EFFICIENCY_WEIGHT * costEfficiency +
    SCORING.EXCHANGE_RATE_WEIGHT * exchangeRate +
    SCORING.SURVIVAL_WEIGHT * survivalRate
  ) * 100;

  const clampedScore = Math.max(0, Math.min(100, Math.round(score)));

  return {
    score: clampedScore,
    grade: getGrade(clampedScore),
    components: {
      oilRate: Math.round(oilRate * 1000) / 10,
      costEfficiency: Math.round(costEfficiency * 1000) / 10,
      exchangeRate: Math.round(rawExchangeRate * 100) / 100,
      survivalRate: Math.round(survivalRate * 1000) / 10,
    },
  };
}

function computeAttackerEffectiveness(
  deliveredBarrels, totalBarrels, budgetSpent,
  enemyLossCost, ownLossCost, entities, faction
) {
  const oilRate = totalBarrels > 0 ? deliveredBarrels / totalBarrels : 0;

  const rawCostEfficiency = budgetSpent > 0 ? deliveredBarrels / budgetSpent : 0;
  const costEfficiency = Math.min(rawCostEfficiency / 2000, 1.0);

  const rawExchangeRate = ownLossCost > 0 ? enemyLossCost / ownLossCost : (enemyLossCost > 0 ? 3.0 : 0);
  const exchangeRate = Math.min(rawExchangeRate / 3.0, 1.0);

  const survivalRate = computeSurvivalRate(entities, faction);

  const score = (
    SCORING.OIL_OBJECTIVE_WEIGHT * oilRate +
    SCORING.COST_EFFICIENCY_WEIGHT * costEfficiency +
    SCORING.EXCHANGE_RATE_WEIGHT * exchangeRate +
    SCORING.SURVIVAL_WEIGHT * survivalRate
  ) * 100;

  const clampedScore = Math.max(0, Math.min(100, Math.round(score)));

  return {
    score: clampedScore,
    grade: getGrade(clampedScore),
    components: {
      oilRate: Math.round(oilRate * 1000) / 10,
      costEfficiency: Math.round(costEfficiency * 1000) / 10,
      exchangeRate: Math.round(rawExchangeRate * 100) / 100,
      survivalRate: Math.round(survivalRate * 1000) / 10,
    },
  };
}

function computeSurvivalRate(entities, faction) {
  const assets = entities.filter(e =>
    e.faction === faction && e.type !== 'TANKER' && e.type !== 'MINE' &&
    !e.isDecoy && !e.isDrone && e.maxHp > 0
  );
  if (assets.length === 0) return 1;

  const totalHp = assets.reduce((s, e) => s + e.maxHp, 0);
  const survivingHp = assets.filter(e => !e.isDestroyed).reduce((s, e) => s + e.hp, 0);
  return totalHp > 0 ? survivingHp / totalHp : 1;
}

function getGrade(score) {
  for (const { min, grade } of GRADES) {
    if (score >= min) return grade;
  }
  return 'F';
}

// ── Tactical Summary (GDD 8.4) ──

function generateTacticalSummary(tankerSummary, defLosses, atkLosses, events, entities, result) {
  const winner = result.winner;
  const isDefenderWin = winner === 'DEFENDER';

  // Determine decisive factor
  const factors = [];

  // Mine warfare: mines caused >30% of tanker damage
  const mineEvents = events.filter(e => e.type === 'MINE_DETONATION');
  const mineDamageToTankers = mineEvents.filter(e => {
    const target = entities.find(ent => ent.id === e.data.entityId);
    return target && target.type === 'TANKER';
  }).length;
  if (mineDamageToTankers > 0 && tankerSummary.destroyed > 0) {
    const mineRatio = mineDamageToTankers / Math.max(1, tankerSummary.destroyed);
    if (mineRatio >= 0.3) factors.push({ type: 'mine_warfare', weight: mineRatio });
  }

  // Submarine ambush
  const subKills = events.filter(e =>
    e.type === 'ASSET_DESTROYED' && e.data.destroyedBy &&
    (e.data.destroyedBy.includes('Ghadir') || e.data.destroyedBy.includes('Los Angeles'))
  );
  if (subKills.length > 0) factors.push({ type: 'submarine_ambush', weight: subKills.length * 0.2 });

  // Air superiority
  const airKills = events.filter(e =>
    e.type === 'COMBAT_HIT' && e.data.destroyed
  ).filter(e => {
    const attacker = entities.find(ent => ent.id === e.data.attackerId);
    return attacker && (attacker.type === 'AIR' || attacker.isDrone);
  });
  if (airKills.length >= 2) factors.push({ type: 'air_superiority', weight: airKills.length * 0.15 });

  // Missile saturation (coastal batteries)
  const coastalHits = events.filter(e =>
    e.type === 'COMBAT_HIT' && (() => {
      const attacker = entities.find(ent => ent.id === e.data.attackerId);
      return attacker && attacker.isCoastalMissile;
    })()
  );
  if (coastalHits.length >= 3) factors.push({ type: 'missile_saturation', weight: coastalHits.length * 0.1 });

  // Swarm tactics (FACs)
  const facHits = events.filter(e => {
    if (e.type !== 'COMBAT_HIT') return false;
    const attacker = entities.find(ent => ent.id === e.data.attackerId);
    return attacker && attacker.assetId === 'thondar_fac';
  });
  if (facHits.length >= 3) factors.push({ type: 'swarm_tactics', weight: facHits.length * 0.12 });

  // EW (Growler active)
  const growlerActive = entities.find(e => e.assetId === 'ea18g_growler' && !e.isDestroyed);
  if (growlerActive) factors.push({ type: 'electronic_warfare', weight: 0.3 });

  // Convoy defense (most defenders destroyed before engaging)
  if (!isDefenderWin && defLosses.totalCost > atkLosses.totalCost * 1.5) {
    factors.push({ type: 'convoy_defense', weight: 0.4 });
  }

  // Sort factors by weight
  factors.sort((a, b) => b.weight - a.weight);
  const decisive = factors.length > 0 ? factors[0].type : 'general_engagement';

  // Build summary
  const openingSentence = isDefenderWin
    ? 'Iranian Coastal Command successfully denied passage through the Strait of Hormuz.'
    : 'Coalition escort successfully delivered the majority of crude oil cargo through the strait.';

  const factorSentences = {
    mine_warfare: `Mine warfare proved devastating, accounting for significant tanker losses.`,
    submarine_ambush: `Submarine ambush operations were a decisive factor in the engagement.`,
    air_superiority: `Air superiority was the decisive factor, with aerial assets dominating the battlespace.`,
    missile_saturation: `Coastal missile batteries provided overwhelming fire superiority.`,
    swarm_tactics: `Fast attack craft swarm tactics overwhelmed defensive positions.`,
    electronic_warfare: `Electronic warfare disrupted enemy targeting throughout the engagement.`,
    convoy_defense: `Strong convoy escort defense neutralized the majority of threats before they could engage.`,
    general_engagement: `The engagement was decided through combined arms coordination.`,
  };

  const notableSentences = [];
  if (tankerSummary.escaped === 5) notableSentences.push('All five tankers completed passage safely.');
  else if (tankerSummary.destroyed === 5) notableSentences.push('All five tankers were destroyed before reaching open waters.');
  else if (tankerSummary.escaped > 0 && tankerSummary.destroyed > 0) {
    notableSentences.push(`${tankerSummary.escaped} of 5 tankers escaped; ${tankerSummary.destroyed} were lost.`);
  }

  if (defLosses.totalCost === 0 && atkLosses.totalCost > 0) {
    notableSentences.push('Defender forces suffered no losses.');
  } else if (atkLosses.totalCost === 0 && defLosses.totalCost > 0) {
    notableSentences.push('Coalition forces suffered no losses.');
  }

  const notable = notableSentences.length > 0 ? ' ' + notableSentences[0] : '';

  return `${openingSentence} ${factorSentences[decisive]}${notable}`;
}
