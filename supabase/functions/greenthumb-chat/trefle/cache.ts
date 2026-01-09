/**
 * In-memory cache implementation with TTL support (Deno-compatible)
 */

import type { CacheEntry, ProcessedPlantData, TrefleSpeciesLight } from "./types.ts";

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 500;

const logger = {
  debug: (msg: string) => console.debug(`[TrefleCache] ${msg}`),
  info: (msg: string) => console.log(`[TrefleCache] ${msg}`),
};

/**
 * Generic cache with TTL and size limits
 */
class TrefleCache<T> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private readonly ttlMs: number;
  private readonly maxSize: number;
  private readonly name: string;

  constructor(name: string, ttlMs: number = CACHE_TTL_MS, maxSize: number = MAX_CACHE_SIZE) {
    this.name = name;
    this.ttlMs = ttlMs;
    this.maxSize = maxSize;
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  set(key: string, data: T): void {
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }

  cleanup(): number {
    const now = Date.now();
    let removed = 0;
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.ttlMs) {
        this.cache.delete(key);
        removed++;
      }
    }
    return removed;
  }

  private evictOldest(): void {
    const entriesToRemove = Math.max(1, Math.floor(this.maxSize * 0.1));
    const oldestKeys = [...this.cache.entries()]
      .sort((a, b) => a[1].timestamp - b[1].timestamp)
      .slice(0, entriesToRemove)
      .map(([key]) => key);

    oldestKeys.forEach((key) => this.cache.delete(key));
  }

  keys(): string[] {
    return [...this.cache.keys()];
  }

  getStats(): { size: number; oldestAge: number | null; newestAge: number | null } {
    if (this.cache.size === 0) {
      return { size: 0, oldestAge: null, newestAge: null };
    }

    const now = Date.now();
    let oldest = now;
    let newest = 0;

    for (const entry of this.cache.values()) {
      if (entry.timestamp < oldest) oldest = entry.timestamp;
      if (entry.timestamp > newest) newest = entry.timestamp;
    }

    return {
      size: this.cache.size,
      oldestAge: now - oldest,
      newestAge: now - newest,
    };
  }
}

// ============================================================================
// Specialized Cache Instances
// ============================================================================

export const searchResultsCache = new TrefleCache<TrefleSpeciesLight[]>("TrefleSearchResults", CACHE_TTL_MS, 200);
export const speciesCache = new TrefleCache<ProcessedPlantData>("TrefleSpecies", CACHE_TTL_MS, 300);
export const commonNameCache = new TrefleCache<ProcessedPlantData>("TrefleCommonName", CACHE_TTL_MS, 300);

// ============================================================================
// Conversation Plant Registry
// ============================================================================

class ConversationPlantRegistry {
  private plants: Map<string, ProcessedPlantData> = new Map();
  private mentionOrder: string[] = [];
  private readonly maxPlants: number = 20;

  addPlant(key: string, plant: ProcessedPlantData): void {
    const normalizedKey = key.toLowerCase().trim();

    if (!this.plants.has(normalizedKey)) {
      if (this.mentionOrder.length >= this.maxPlants) {
        const oldestKey = this.mentionOrder.shift();
        if (oldestKey) {
          this.plants.delete(oldestKey);
        }
      }
      this.mentionOrder.push(normalizedKey);
    }

    this.plants.set(normalizedKey, plant);
  }

  getPlant(key: string): ProcessedPlantData | null {
    return this.plants.get(key.toLowerCase().trim()) ?? null;
  }

  findPlant(query: string): ProcessedPlantData | null {
    const normalizedQuery = query.toLowerCase().trim();

    if (this.plants.has(normalizedQuery)) {
      return this.plants.get(normalizedQuery)!;
    }

    for (const plant of this.plants.values()) {
      if (plant.scientificName.toLowerCase().includes(normalizedQuery)) {
        return plant;
      }
      if (plant.commonName?.toLowerCase().includes(normalizedQuery)) {
        return plant;
      }
      if (plant.slug.includes(normalizedQuery)) {
        return plant;
      }
    }

    return null;
  }

  getAllPlants(): ProcessedPlantData[] {
    return [...this.plants.values()];
  }

  getRecentPlants(count: number = 5): ProcessedPlantData[] {
    const recentKeys = this.mentionOrder.slice(-count);
    return recentKeys
      .map((key) => this.plants.get(key))
      .filter((plant): plant is ProcessedPlantData => plant !== undefined)
      .reverse();
  }

  hasPlant(key: string): boolean {
    return this.plants.has(key.toLowerCase().trim());
  }

  clear(): void {
    this.plants.clear();
    this.mentionOrder = [];
  }

  get size(): number {
    return this.plants.size;
  }

  getPlantNames(): string[] {
    return this.getAllPlants().map((p) => p.commonName ?? p.scientificName);
  }
}

export const conversationRegistry = new ConversationPlantRegistry();

// ============================================================================
// Cache Management Functions
// ============================================================================

export function normalizeSearchKey(query: string): string {
  return query.toLowerCase().trim().replace(/\s+/g, " ");
}

export function createSpeciesKey(idOrSlug: string | number): string {
  return String(idOrSlug).toLowerCase();
}

export function clearAllCaches(): void {
  searchResultsCache.clear();
  speciesCache.clear();
  commonNameCache.clear();
  conversationRegistry.clear();
  logger.info("All caches cleared");
}

export function cleanupAllCaches(): void {
  searchResultsCache.cleanup();
  speciesCache.cleanup();
  commonNameCache.cleanup();
}

export function getCacheStats(): Record<string, { size: number; oldestAge: number | null; newestAge: number | null }> {
  return {
    searchResults: searchResultsCache.getStats(),
    species: speciesCache.getStats(),
    commonName: commonNameCache.getStats(),
    conversationRegistry: {
      size: conversationRegistry.size,
      oldestAge: null,
      newestAge: null,
    },
  };
}
