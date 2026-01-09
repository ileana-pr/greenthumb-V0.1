/**
 * Plant Context Provider (Deno-compatible)
 * A dynamic provider that fetches plant information from Trefle API
 * and injects it into the agent's context for informed responses.
 */

import {
  getTrefleClient,
  isClientInitialized,
  extractPlantMentions,
  conversationRegistry,
  createPlantContextForPrompt,
  formatPlantsForContext,
  formatPlantForData,
} from "../trefle/index.ts";
import type { ProcessedPlantData, PlantMention } from "../trefle/types.ts";

// ============================================================================
// Constants
// ============================================================================

const MAX_PLANTS_TO_FETCH = 5;

// ============================================================================
// Types
// ============================================================================

export interface PlantContextResult {
  text: string;
  plantNames: string[];
  plantScientificNames: string[];
  plantCount: number;
  plantSummary: string;
  plants: Array<Record<string, unknown>>;
  rawPlants: ProcessedPlantData[];
}

// ============================================================================
// Provider Functions
// ============================================================================

/**
 * Get plant context for a message and conversation history
 */
export async function getPlantContext(
  currentMessageText: string,
  historyMessages: Array<{ text: string }> = []
): Promise<PlantContextResult> {
  const emptyResult: PlantContextResult = {
    text: "",
    plantNames: [],
    plantScientificNames: [],
    plantCount: 0,
    plantSummary: "",
    plants: [],
    rawPlants: [],
  };

  // Check if the Trefle client is initialized
  if (!isClientInitialized()) {
    console.warn("[PlantContext] Trefle client not initialized - skipping plant context");
    return emptyResult;
  }

  const client = getTrefleClient();

  // Extract plant mentions from the current message
  const currentMentions = extractPlantMentions(currentMessageText);

  // Get mentions from history
  const historyMentions = extractMentionsFromHistory(historyMessages);

  // Combine and deduplicate mentions (current message takes priority)
  const allMentions = deduplicateMentions([...currentMentions, ...historyMentions]);

  console.log(`[PlantContext] Found ${allMentions.length} plant mentions`);

  if (allMentions.length === 0) {
    // No plants mentioned, but return existing registry plants for context
    const existingPlants = conversationRegistry.getRecentPlants(MAX_PLANTS_TO_FETCH);
    if (existingPlants.length > 0) {
      console.log(`[PlantContext] Returning ${existingPlants.length} plants from registry`);
      return createResultFromPlants(existingPlants);
    }
    return emptyResult;
  }

  // Fetch plant data for each mention (limited to MAX_PLANTS_TO_FETCH)
  const mentionsToFetch = allMentions.slice(0, MAX_PLANTS_TO_FETCH);
  const plants: ProcessedPlantData[] = [];

  for (const mention of mentionsToFetch) {
    // Check registry first
    const existingPlant = conversationRegistry.findPlant(mention.normalizedName);
    if (existingPlant) {
      plants.push(existingPlant);
      console.log(`[PlantContext] Found "${mention.normalizedName}" in registry`);
      continue;
    }

    // Fetch from API for high/medium confidence mentions
    if (mention.confidence !== "low") {
      const plant = await fetchPlantSafely(client, mention);
      if (plant) {
        plants.push(plant);
      }
    }
  }

  // Also include any existing registry plants not in current mentions
  const existingPlants = conversationRegistry.getRecentPlants(MAX_PLANTS_TO_FETCH);
  for (const plant of existingPlants) {
    const alreadyIncluded = plants.some((p) => p.id === plant.id);
    if (!alreadyIncluded && plants.length < MAX_PLANTS_TO_FETCH) {
      plants.push(plant);
    }
  }

  console.log(`[PlantContext] Providing context for ${plants.length} plants`);

  return createResultFromPlants(plants);
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Extract mentions from message history
 */
function extractMentionsFromHistory(messages: Array<{ text: string }>): PlantMention[] {
  const allMentions: PlantMention[] = [];
  const seenNames = new Set<string>();

  for (const msg of messages) {
    const mentions = extractPlantMentions(msg.text);
    for (const mention of mentions) {
      if (!seenNames.has(mention.normalizedName)) {
        allMentions.push(mention);
        seenNames.add(mention.normalizedName);
      }
    }
  }

  return allMentions;
}

/**
 * Deduplicate mentions, keeping the highest confidence version
 */
function deduplicateMentions(mentions: PlantMention[]): PlantMention[] {
  const mentionMap = new Map<string, PlantMention>();
  const confidenceOrder = { high: 0, medium: 1, low: 2 };

  for (const mention of mentions) {
    const existing = mentionMap.get(mention.normalizedName);
    if (
      !existing ||
      confidenceOrder[mention.confidence] < confidenceOrder[existing.confidence]
    ) {
      mentionMap.set(mention.normalizedName, mention);
    }
  }

  return [...mentionMap.values()];
}

/**
 * Safely fetch plant data, handling errors gracefully
 */
async function fetchPlantSafely(
  client: ReturnType<typeof getTrefleClient>,
  mention: PlantMention
): Promise<ProcessedPlantData | null> {
  console.log(`[PlantContext] Fetching data for "${mention.normalizedName}"`);

  try {
    const plant = await client.findPlantByName(mention.normalizedName);

    if (plant) {
      console.log(`[PlantContext] Successfully fetched: ${plant.scientificName}`);
      return plant;
    }

    console.log(`[PlantContext] No results for "${mention.normalizedName}"`);
    return null;
  } catch (error) {
    console.error(`[PlantContext] Error fetching "${mention.normalizedName}":`, error);
    return null;
  }
}

/**
 * Create a provider result from plant data
 */
function createResultFromPlants(plants: ProcessedPlantData[]): PlantContextResult {
  if (plants.length === 0) {
    return {
      text: "",
      plantNames: [],
      plantScientificNames: [],
      plantCount: 0,
      plantSummary: "",
      plants: [],
      rawPlants: [],
    };
  }

  // Create human-readable context for prompt injection
  const contextText = createPlantContextForPrompt(plants);

  // Create summary for quick reference
  const summaryText = formatPlantsForContext(plants);

  // Create structured data for programmatic access
  const plantData = plants.map(formatPlantForData);

  // Create values map with plant names for easy access
  const plantNames = plants.map((p) => p.commonName ?? p.scientificName);
  const plantScientificNames = plants.map((p) => p.scientificName);

  return {
    text: contextText,
    plantNames,
    plantScientificNames,
    plantCount: plants.length,
    plantSummary: summaryText,
    plants: plantData,
    rawPlants: plants,
  };
}

export default {
  getPlantContext,
};
