/**
 * Trefle Module Exports (Deno-compatible)
 */

// Types
export type {
  TrefleMeasurement,
  TrefleImage,
  TrefleLinks,
  TrefleSynonym,
  TrefleSource,
  TrefleDistributionZone,
  TrefleImages,
  TrefleDistributions,
  TrefleFlower,
  TrefleFoliage,
  TrefleFruitOrSeed,
  TrefleSpecifications,
  TrefleGrowth,
  TrefleSpeciesLight,
  TrefleSpeciesFull,
  TreflePaginationLinks,
  TrefleMeta,
  TrefleListResponse,
  TrefleSingleResponse,
  TrefleErrorResponse,
  ProcessedPlantData,
  CacheEntry,
  PlantMention,
  ConversationPlant,
  TreflePluginConfig,
} from "./types.ts";

// Client
export {
  TrefleClient,
  TrefleNotFoundError,
  TrefleAuthError,
  TrefleRateLimitError,
  getTrefleClient,
  initializeTrefleClient,
  isClientInitialized,
} from "./client.ts";

// Cache
export {
  searchResultsCache,
  speciesCache,
  commonNameCache,
  conversationRegistry,
  normalizeSearchKey,
  createSpeciesKey,
  clearAllCaches,
  cleanupAllCaches,
  getCacheStats,
} from "./cache.ts";

// Extractors
export {
  extractPlantMentions,
  extractPlantMentionsFromHistory,
  normalizePlantName,
  isPlantRelatedQuery,
} from "./extractors.ts";

// Formatters
export {
  formatPlantCareGuide,
  formatPlantSummary,
  formatPlantsForContext,
  formatSearchResults,
  formatPlantForData,
  formatPlantOneLiner,
  createPlantContextForPrompt,
} from "./formatters.ts";
