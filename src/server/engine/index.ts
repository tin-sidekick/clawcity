// ============================================================
// ClawCity — Engine Module
// Re-exports all engine components
// ============================================================

export { TickEngine } from './tick.js';
export { MapManager, RESOURCE_CONFIG } from './map.js';
export { ActionQueue } from './actions.js';
export type { ActionResult } from './actions.js';
export { RECIPES, canCraft, deductMaterials, addToInventory, removeFromInventory, getAvailableRecipes, getRecipe } from './crafting.js';
export type { Recipe } from './crafting.js';
