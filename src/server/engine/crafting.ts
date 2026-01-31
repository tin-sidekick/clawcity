// ============================================================
// ClawCity — Crafting System
// Recipes for items and buildings
// ============================================================

export interface Recipe {
  materials: Record<string, number>;
  description: string;
  isBuilding?: boolean;
  width?: number;   // Building footprint
  height?: number;
}

export const RECIPES: Record<string, Recipe> = {
  // --- Tools ---
  axe:         { materials: { wood: 3, stone: 2 },   description: 'Faster wood gathering' },
  pickaxe:     { materials: { wood: 2, stone: 3 },   description: 'Access stone/ore' },
  fishing_rod: { materials: { wood: 3, shells: 1 },  description: 'Catch fish' },

  // --- Furniture ---
  table:       { materials: { wood: 5 },              description: 'Furniture' },
  chair:       { materials: { wood: 3 },              description: 'Furniture' },
  torch:       { materials: { wood: 2 },              description: 'Light source' },

  // --- Misc ---
  gift_box:    { materials: { wood: 2, shells: 1 },   description: 'Wrap items' },

  // --- Buildings ---
  shelter:      { materials: { wood: 10 },                description: 'Basic home',        isBuilding: true, width: 2, height: 2 },
  house:        { materials: { wood: 20, stone: 10 },     description: 'Upgraded home',     isBuilding: true, width: 3, height: 3 },
  workshop:     { materials: { wood: 15, stone: 15 },     description: 'Crafting bonus',    isBuilding: true, width: 3, height: 3 },
  market_stall: { materials: { wood: 10, stone: 5 },      description: 'Sell items',        isBuilding: true, width: 2, height: 2 },
  campfire:     { materials: { wood: 5 },                  description: 'Social gathering',  isBuilding: true, width: 1, height: 1 },
};

/**
 * Check if an inventory has enough materials for a recipe
 */
export function canCraft(inventory: Record<string, number>, recipeName: string): { canCraft: boolean; missing?: Record<string, number> } {
  const recipe = RECIPES[recipeName];
  if (!recipe) return { canCraft: false, missing: { [recipeName]: 1 } };

  const missing: Record<string, number> = {};
  let hasAll = true;

  for (const [material, needed] of Object.entries(recipe.materials)) {
    const have = inventory[material] || 0;
    if (have < needed) {
      missing[material] = needed - have;
      hasAll = false;
    }
  }

  return hasAll ? { canCraft: true } : { canCraft: false, missing };
}

/**
 * Deduct materials from inventory. Returns new inventory.
 */
export function deductMaterials(inventory: Record<string, number>, recipeName: string): Record<string, number> {
  const recipe = RECIPES[recipeName];
  if (!recipe) return inventory;

  const newInventory = { ...inventory };
  for (const [material, needed] of Object.entries(recipe.materials)) {
    newInventory[material] = (newInventory[material] || 0) - needed;
    if (newInventory[material] <= 0) delete newInventory[material];
  }

  return newInventory;
}

/**
 * Add an item to inventory. Returns new inventory.
 */
export function addToInventory(inventory: Record<string, number>, item: string, amount: number = 1): Record<string, number> {
  const newInventory = { ...inventory };
  newInventory[item] = (newInventory[item] || 0) + amount;
  return newInventory;
}

/**
 * Remove an item from inventory. Returns new inventory or null if insufficient.
 */
export function removeFromInventory(inventory: Record<string, number>, item: string, amount: number = 1): Record<string, number> | null {
  const have = inventory[item] || 0;
  if (have < amount) return null;

  const newInventory = { ...inventory };
  newInventory[item] = have - amount;
  if (newInventory[item] <= 0) delete newInventory[item];
  return newInventory;
}

/**
 * Get all recipes an agent can currently craft
 */
export function getAvailableRecipes(inventory: Record<string, number>): string[] {
  return Object.keys(RECIPES).filter(name => canCraft(inventory, name).canCraft);
}

/**
 * Get recipe by name
 */
export function getRecipe(name: string): Recipe | undefined {
  return RECIPES[name];
}
