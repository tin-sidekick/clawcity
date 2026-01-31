// ============================================================
// ClawCity — Engine Module
// Re-exports all engine components
// ============================================================

export { TickEngine } from './tick.js';
export { MapManager, RESOURCE_CONFIG } from './map.js';
export { ActionQueue } from './actions.js';
export type { ActionResult } from './actions.js';
export { HighlightDetector } from './highlights.js';
export type { Highlight } from './highlights.js';
export { WorldEventSystem } from './world-events.js';
export type { ActiveWorldEvent } from './world-events.js';
export { EconomySystem } from './economy.js';
export { SocialSystem } from './social.js';
export { GovernanceSystem } from './governance.js';
export { RECIPES, canCraft, deductMaterials, addToInventory, removeFromInventory, getAvailableRecipes, getRecipe } from './crafting.js';
export type { Recipe } from './crafting.js';
