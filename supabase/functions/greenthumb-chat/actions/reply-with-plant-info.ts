/**
 * Reply With Plant Info Action (Deno-compatible)
 * Provides detailed plant care information when triggered by user requests.
 */

import {
  getTrefleClient,
  isClientInitialized,
  extractPlantMentions,
  conversationRegistry,
  formatPlantCareGuide,
  formatSearchResults,
  formatPlantForData,
  isPlantRelatedQuery,
} from "../trefle/index.ts";
import type { ProcessedPlantData, PlantMention } from "../trefle/types.ts";

// ============================================================================
// Constants
// ============================================================================

const MAX_PLANTS_PER_REQUEST = 3;

/**
 * Keywords that indicate user wants plant information
 */
const PLANT_INFO_TRIGGERS = [
  "tell me about",
  "what is",
  "what are",
  "how do i care for",
  "how to care for",
  "how to grow",
  "how do i grow",
  "care guide",
  "care instructions",
  "growing guide",
  "plant info",
  "plant information",
  "about my",
  "information on",
  "details about",
  "facts about",
  "learn about",
  "help with my",
  "advice for my",
  "tips for",
];

// ============================================================================
// Types
// ============================================================================

export interface PlantInfoResult {
  text: string;
  plants: Array<Record<string, unknown>>;
  notFound: string[];
  triggered: boolean;
}

// ============================================================================
// Action Functions
// ============================================================================

/**
 * Check if the action should be triggered for this message
 */
export function shouldTriggerPlantInfo(messageText: string): boolean {
  if (!isClientInitialized()) {
    return false;
  }

  if (!messageText) {
    return false;
  }

  // Check if message is plant-related
  if (!isPlantRelatedQuery(messageText)) {
    return false;
  }

  // Check for explicit plant information request triggers
  const normalizedText = messageText.toLowerCase();
  const hasInfoTrigger = PLANT_INFO_TRIGGERS.some((trigger) =>
    normalizedText.includes(trigger)
  );

  // Check for plant mentions
  const mentions = extractPlantMentions(messageText);
  const hasPlantMention = mentions.length > 0 || conversationRegistry.size > 0;

  // Also check if plants are already in context
  const hasContextPlants = conversationRegistry.getRecentPlants(1).length > 0;

  return hasPlantMention && (hasInfoTrigger || hasContextPlants);
}

/**
 * Process a message and get plant information
 */
export async function getPlantInfo(messageText: string): Promise<PlantInfoResult> {
  if (!isClientInitialized()) {
    return {
      text: "",
      plants: [],
      notFound: [],
      triggered: false,
    };
  }

  const client = getTrefleClient();

  // Extract plant mentions from the message
  const mentions = extractPlantMentions(messageText);

  // If no direct mentions, check for plants in conversation context
  let plantsToProcess: Array<PlantMention | ProcessedPlantData> = mentions;

  if (mentions.length === 0) {
    // Fall back to recent conversation plants
    const recentPlants = conversationRegistry.getRecentPlants(MAX_PLANTS_PER_REQUEST);
    if (recentPlants.length > 0) {
      console.log(`[PlantInfo] No direct mentions, using ${recentPlants.length} plants from context`);
      plantsToProcess = recentPlants;
    } else {
      // No plants found at all
      return {
        text: "I'd be happy to help with plant care information! Could you tell me which plant you'd like to learn about?",
        plants: [],
        notFound: [],
        triggered: true,
      };
    }
  }

  // Process each plant (limited to MAX_PLANTS_PER_REQUEST)
  const plantsToFetch = plantsToProcess.slice(0, MAX_PLANTS_PER_REQUEST);
  const fetchedPlants: ProcessedPlantData[] = [];
  const notFoundPlants: string[] = [];

  for (const item of plantsToFetch) {
    // Check if this is already a ProcessedPlantData
    if ("scientificName" in item) {
      fetchedPlants.push(item as ProcessedPlantData);
      continue;
    }

    // It's a PlantMention - fetch the data
    const mention = item as PlantMention;

    // Check registry first
    const existingPlant = conversationRegistry.findPlant(mention.normalizedName);
    if (existingPlant) {
      fetchedPlants.push(existingPlant);
      continue;
    }

    // Fetch from API
    console.log(`[PlantInfo] Fetching data for "${mention.normalizedName}"`);
    try {
      const plant = await client.findPlantByName(mention.normalizedName);

      if (plant) {
        fetchedPlants.push(plant);
        console.log(`[PlantInfo] Found: ${plant.scientificName}`);
      } else {
        notFoundPlants.push(mention.originalText);
        console.log(`[PlantInfo] Not found: "${mention.originalText}"`);
      }
    } catch (error) {
      console.error(`[PlantInfo] Error fetching "${mention.normalizedName}":`, error);
      notFoundPlants.push(mention.originalText);
    }
  }

  // Generate response
  if (fetchedPlants.length === 0 && notFoundPlants.length > 0) {
    // No plants found - try to search and offer suggestions
    const searchQuery = notFoundPlants[0];
    try {
      const searchResults = await client.searchPlants(searchQuery, 5);

      let responseText: string;
      if (searchResults.length > 0) {
        responseText = `I couldn't find an exact match for "${searchQuery}", but here are some similar plants:\n\n`;
        responseText += formatSearchResults(searchResults, searchQuery);
        responseText += "\n\nWould you like information about any of these?";
      } else {
        responseText = `I couldn't find any plants matching "${searchQuery}" in my botanical database. Could you check the spelling or try a different name?`;
      }

      return {
        text: responseText,
        plants: [],
        notFound: notFoundPlants,
        triggered: true,
      };
    } catch (error) {
      console.error(`[PlantInfo] Error searching for "${searchQuery}":`, error);
      return {
        text: `I couldn't find any plants matching "${searchQuery}" in my botanical database. Could you check the spelling or try a different name?`,
        plants: [],
        notFound: notFoundPlants,
        triggered: true,
      };
    }
  }

  // Format response for found plants
  const plantGuides = fetchedPlants.map((plant) => formatPlantCareGuide(plant));

  let responseText: string;
  if (fetchedPlants.length === 1) {
    responseText = plantGuides[0];
  } else {
    responseText = fetchedPlants
      .map((plant, index) => {
        const header = `## ${index + 1}. ${plant.commonName ?? plant.scientificName}\n\n`;
        return header + plantGuides[index];
      })
      .join("\n\n---\n\n");
  }

  // Add note about plants not found
  if (notFoundPlants.length > 0) {
    responseText += `\n\n*Note: I couldn't find information for: ${notFoundPlants.join(", ")}*`;
  }

  return {
    text: responseText,
    plants: fetchedPlants.map(formatPlantForData),
    notFound: notFoundPlants,
    triggered: true,
  };
}

export default {
  shouldTriggerPlantInfo,
  getPlantInfo,
};
