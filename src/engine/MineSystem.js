// MineSystem — mine fields, proximity detonation, minesweeper sweeping
// GDD Section 7.2.4

import { COMBAT, MAP } from '../data/constants.js';
import { distance, lerpPoint } from '../utils/geometry.js';

const NM_TO_WORLD = MAP.NM_TO_WORLD;

export default class MineSystem {
  constructor() {
    this.mines = [];
    this.sweepQueue = []; // { mine, revealedAt }
  }

  /**
   * Initialize mines from mine layer entity placements.
   * Each mine layer produces MINES_PER_LAYER mines distributed along a segment.
   */
  initMines(mineLayerEntities) {
    for (const ml of mineLayerEntities) {
      // Distribute mines in a line segment around the mine layer position
      // Create a ~3nm segment centered on the mine layer
      const segHalf = 1.5 * NM_TO_WORLD;
      const start = { x: ml.position.x - segHalf, y: ml.position.y };
      const end = { x: ml.position.x + segHalf, y: ml.position.y };

      for (let i = 0; i < COMBAT.MINES_PER_LAYER; i++) {
        const t = (i + 0.5) / COMBAT.MINES_PER_LAYER;
        this.mines.push({
          id: `mine_${this.mines.length}`,
          position: lerpPoint(start, end, t),
          isDetonated: false,
          isRevealed: false,
          damage: COMBAT.MINE_DAMAGE,
          layerId: ml.id,
        });
      }
    }
  }

  /**
   * Check proximity detonation of all active mines against all entities.
   * Mines do NOT discriminate by faction — can hit friendly units.
   * Aircraft are immune.
   */
  checkDetonations(entities) {
    const events = [];
    const triggerRadius = COMBAT.MINE_TRIGGER_RADIUS * NM_TO_WORLD;

    for (const mine of this.mines) {
      if (mine.isDetonated) continue;

      for (const entity of entities) {
        if (entity.isDestroyed) continue;
        if (entity.type === 'AIR') continue; // Aircraft don't trigger mines
        if (entity.type === 'MINE') continue;

        const dist = distance(mine.position, entity.position);
        if (dist <= triggerRadius) {
          mine.isDetonated = true;
          entity.hp -= mine.damage;

          const destroyed = entity.hp <= 0;
          if (destroyed) {
            entity.hp = 0;
            entity.isDestroyed = true;
          }

          events.push({
            type: 'MINE_DETONATION',
            mineId: mine.id,
            entityId: entity.id,
            entityName: entity.name,
            damage: mine.damage,
            destroyed,
          });
          break; // Mine is consumed after first detonation
        }
      }
    }
    return events;
  }

  /**
   * Minesweeper sweeping — reveal mines within sweep radius.
   * Revealed mines are queued for safe detonation at MINESWEEPER_CLEAR_RATE.
   */
  sweepMines(entities, gameTime) {
    const sweepRadius = COMBAT.MINESWEEPER_SONAR_RANGE * NM_TO_WORLD;
    const events = [];

    // Find all minesweepers
    const sweepers = entities.filter(e => !e.isDestroyed && e.isMinesweeper);

    for (const sweeper of sweepers) {
      for (const mine of this.mines) {
        if (mine.isDetonated || mine.isRevealed) continue;
        if (distance(sweeper.position, mine.position) <= sweepRadius) {
          mine.isRevealed = true;
          this.sweepQueue.push({ mine, revealedAt: gameTime });
          events.push({
            type: 'MINE_REVEALED',
            mineId: mine.id,
            sweeperId: sweeper.id,
            sweeperName: sweeper.name,
            position: { ...mine.position },
          });
        }
      }
    }

    // Process safe detonation queue
    const clearRate = COMBAT.MINESWEEPER_CLEAR_RATE;
    this.sweepQueue = this.sweepQueue.filter(entry => {
      if (entry.mine.isDetonated) return false;
      if (gameTime - entry.revealedAt >= clearRate) {
        entry.mine.isDetonated = true;
        events.push({
          type: 'MINE_CLEARED',
          mineId: entry.mine.id,
        });
        return false;
      }
      return true;
    });

    return events;
  }

  /**
   * Get all active (non-detonated) mines for rendering.
   */
  getActiveMines() {
    return this.mines.filter(m => !m.isDetonated);
  }

  /**
   * Get revealed but not yet cleared mines.
   */
  getRevealedMines() {
    return this.mines.filter(m => m.isRevealed && !m.isDetonated);
  }
}
