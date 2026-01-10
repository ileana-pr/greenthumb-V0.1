/**
 * Trefle API Client (Deno-compatible)
 */

import type {
  TrefleSpeciesLight,
  TrefleSpeciesFull,
  TrefleListResponse,
  TrefleSingleResponse,
  ProcessedPlantData,
  TrefleGrowth,
  TrefleMeasurement,
} from "./types.ts";
import {
  searchResultsCache,
  speciesCache,
  commonNameCache,
  conversationRegistry,
  normalizeSearchKey,
  createSpeciesKey,
} from "./cache.ts";

const TREFLE_BASE_URL = "https://trefle.io/api/v1";
const REQUEST_TIMEOUT_MS = 10000;
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;

const logger = {
  debug: (msg: string) => console.debug(`[TrefleClient] ${msg}`),
  info: (msg: string) => console.log(`[TrefleClient] ${msg}`),
  warn: (msg: string) => console.warn(`[TrefleClient] ${msg}`),
  error: (msg: string) => console.error(`[TrefleClient] ${msg}`),
};

// Rate Limiter
class RateLimiter {
  private requestTimes: number[] = [];
  private readonly windowMs: number = 60000;
  private readonly maxRequests: number = 100;

  canMakeRequest(): boolean {
    this.cleanup();
    return this.requestTimes.length < this.maxRequests;
  }

  recordRequest(): void {
    this.requestTimes.push(Date.now());
  }

  private cleanup(): void {
    const cutoff = Date.now() - this.windowMs;
    this.requestTimes = this.requestTimes.filter((time) => time > cutoff);
  }
}

const rateLimiter = new RateLimiter();

// ============================================================================
// API Client Class
// ============================================================================

export class TrefleClient {
  private readonly token: string;

  constructor(token: string) {
    if (!token || token.trim() === "") {
      throw new Error("Trefle API token is required");
    }
    this.token = token.trim();
  }

  private async request<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
    if (!rateLimiter.canMakeRequest()) {
      throw new Error("Rate limit exceeded. Please wait before making more requests.");
    }

    const url = new URL(`${TREFLE_BASE_URL}${endpoint}`);
    url.searchParams.set("token", this.token);

    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      if (attempt > 0) {
        await this.delay(RETRY_DELAY_MS * attempt);
        logger.debug(`Retry attempt ${attempt} for ${endpoint}`);
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      rateLimiter.recordRequest();

      try {
        const response = await fetch(url.toString(), {
          method: "GET",
          headers: { Accept: "application/json" },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const data = (await response.json()) as T;
          logger.debug(`Success: ${endpoint}`);
          return data;
        }

        if (response.status === 404) {
          throw new TrefleNotFoundError(`Resource not found: ${endpoint}`);
        }

        if (response.status === 401) {
          throw new TrefleAuthError("Invalid or expired API token");
        }

        if (response.status === 429) {
          throw new TrefleRateLimitError("API rate limit exceeded");
        }

        if (response.status >= 500) {
          lastError = new Error(`Server error: ${response.status} ${response.statusText}`);
          continue;
        }

        throw new Error(`API error: ${response.status} ${response.statusText}`);
      } catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof TrefleNotFoundError || error instanceof TrefleAuthError || error instanceof TrefleRateLimitError) {
          throw error;
        }
        lastError = error instanceof Error ? error : new Error(String(error));
      }
    }

    throw lastError ?? new Error("Request failed after retries");
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Public API Methods
  async searchPlants(query: string, limit: number = 10): Promise<TrefleSpeciesLight[]> {
    const normalizedQuery = normalizeSearchKey(query);

    const cached = searchResultsCache.get(normalizedQuery);
    if (cached) return cached;

    const response = await this.request<TrefleListResponse<TrefleSpeciesLight>>("/species/search", { q: query });
    const results = response.data.slice(0, limit);

    searchResultsCache.set(normalizedQuery, results);
    logger.info(`Search for "${query}" returned ${results.length} results`);

    return results;
  }

  async getSpeciesById(id: number): Promise<ProcessedPlantData> {
    const cacheKey = createSpeciesKey(id);

    const cached = speciesCache.get(cacheKey);
    if (cached) return cached;

    const response = await this.request<TrefleSingleResponse<TrefleSpeciesFull>>(`/species/${id}`);
    const processed = this.processSpeciesData(response.data);

    speciesCache.set(cacheKey, processed);
    speciesCache.set(createSpeciesKey(processed.slug), processed);
    if (processed.commonName) {
      commonNameCache.set(processed.commonName.toLowerCase(), processed);
    }

    conversationRegistry.addPlant(processed.slug, processed);
    if (processed.commonName) {
      conversationRegistry.addPlant(processed.commonName, processed);
    }

    return processed;
  }

  async getSpeciesBySlug(slug: string): Promise<ProcessedPlantData> {
    const cacheKey = createSpeciesKey(slug);

    const cached = speciesCache.get(cacheKey);
    if (cached) return cached;

    const response = await this.request<TrefleSingleResponse<TrefleSpeciesFull>>(`/species/${slug}`);
    const processed = this.processSpeciesData(response.data);

    speciesCache.set(cacheKey, processed);
    speciesCache.set(createSpeciesKey(processed.id), processed);
    if (processed.commonName) {
      commonNameCache.set(processed.commonName.toLowerCase(), processed);
    }

    conversationRegistry.addPlant(processed.slug, processed);
    if (processed.commonName) {
      conversationRegistry.addPlant(processed.commonName, processed);
    }

    return processed;
  }

  async findPlantByName(name: string): Promise<ProcessedPlantData | null> {
    const existingPlant = conversationRegistry.findPlant(name);
    if (existingPlant) {
      logger.debug(`Found "${name}" in conversation registry`);
      return existingPlant;
    }

    const cachedByName = commonNameCache.get(name.toLowerCase());
    if (cachedByName) return cachedByName;

    const searchResults = await this.searchPlants(name, 5);
    if (searchResults.length === 0) {
      logger.info(`No results found for "${name}"`);
      return null;
    }

    const bestMatch = this.findBestMatch(name, searchResults);
    return this.getSpeciesById(bestMatch.id);
  }

  // Data Processing
  private processSpeciesData(raw: TrefleSpeciesFull): ProcessedPlantData {
    const growth = raw.growth ?? {};
    const specs = raw.specifications ?? {};

    return {
      id: raw.id,
      slug: raw.slug,
      scientificName: raw.scientific_name,
      commonName: raw.common_name,
      family: raw.family,
      genus: raw.genus,
      rank: raw.rank,
      duration: raw.duration ?? null,
      edible: raw.edible ?? false,
      edibleParts: raw.edible_part ?? null,
      vegetable: raw.vegetable ?? false,
      toxicity: specs.toxicity ?? null,
      ligneousType: specs.ligneous_type ?? null,
      growthRate: specs.growth_rate ?? null,
      averageHeightCm: this.extractCm(specs.average_height),
      maximumHeightCm: this.extractCm(specs.maximum_height),
      lightRequirement: growth.light ?? null,
      lightDescription: this.describeLightLevel(growth.light),
      humidityRequirement: growth.atmospheric_humidity ?? null,
      humidityDescription: this.describeHumidityLevel(growth.atmospheric_humidity),
      phRange: this.extractPhRange(growth),
      soilHumidity: growth.soil_humidity ?? null,
      soilHumidityDescription: this.describeSoilHumidity(growth.soil_humidity),
      soilNutriments: growth.soil_nutriments ?? null,
      temperatureRange: this.extractTemperatureRange(growth),
      precipitationRange: this.extractPrecipitationRange(growth),
      daysToHarvest: growth.days_to_harvest ?? null,
      sowingInstructions: growth.sowing ?? null,
      growthDescription: growth.description ?? null,
      bloomMonths: growth.bloom_months ?? null,
      growthMonths: growth.growth_months ?? null,
      fruitMonths: growth.fruit_months ?? null,
      flowerColors: raw.flower?.color ?? null,
      foliageColors: raw.foliage?.color ?? null,
      fruitColors: raw.fruit_or_seed?.color ?? null,
      imageUrl: raw.image_url ?? null,
      images: {
        flower: raw.images?.flower?.map((img) => img.image_url) ?? [],
        leaf: raw.images?.leaf?.map((img) => img.image_url) ?? [],
        habit: raw.images?.habit?.map((img) => img.image_url) ?? [],
        fruit: raw.images?.fruit?.map((img) => img.image_url) ?? [],
      },
      raw,
    };
  }

  private findBestMatch(query: string, results: TrefleSpeciesLight[]): TrefleSpeciesLight {
    const q = query.toLowerCase().trim();

    const matchers: Array<(r: TrefleSpeciesLight) => boolean> = [
      (r) => r.common_name?.toLowerCase() === q,
      (r) => r.scientific_name.toLowerCase() === q,
      (r) => r.common_name?.toLowerCase().startsWith(q) ?? false,
      (r) => r.scientific_name.toLowerCase().startsWith(q),
      (r) => r.common_name?.toLowerCase().includes(q) ?? false,
    ];

    for (const matches of matchers) {
      const found = results.find(matches);
      if (found) return found;
    }

    return results[0];
  }

  // Helper Methods
  private extractCm(measurement: TrefleMeasurement | undefined): number | null {
    if (!measurement) return null;
    return measurement.cm ?? null;
  }

  private extractPhRange(growth: TrefleGrowth): { min: number; max: number } | null {
    if (growth.ph_minimum === undefined && growth.ph_maximum === undefined) return null;
    return { min: growth.ph_minimum ?? 5.5, max: growth.ph_maximum ?? 7.5 };
  }

  private extractTemperatureRange(growth: TrefleGrowth): { minC: number; maxC: number } | null {
    const minTemp = growth.minimum_temperature;
    const maxTemp = growth.maximum_temperature;
    if (!minTemp && !maxTemp) return null;
    return { minC: minTemp?.deg_c ?? -10, maxC: maxTemp?.deg_c ?? 35 };
  }

  private extractPrecipitationRange(growth: TrefleGrowth): { minMm: number; maxMm: number } | null {
    const minPrecip = growth.minimum_precipitation;
    const maxPrecip = growth.maximum_precipitation;
    if (!minPrecip && !maxPrecip) return null;
    return { minMm: minPrecip?.mm ?? 0, maxMm: maxPrecip?.mm ?? 2000 };
  }

  private describeLightLevel(level: number | undefined): string | null {
    if (level === undefined || level === null) return null;
    if (level <= 2) return "Low light (shade tolerant)";
    if (level <= 4) return "Partial shade";
    if (level <= 6) return "Partial sun";
    if (level <= 8) return "Full sun";
    return "Very high light (full sun required)";
  }

  private describeHumidityLevel(level: number | undefined): string | null {
    if (level === undefined || level === null) return null;
    if (level <= 2) return "Very dry (drought tolerant)";
    if (level <= 4) return "Low humidity";
    if (level <= 6) return "Moderate humidity";
    if (level <= 8) return "High humidity";
    return "Very high humidity (tropical)";
  }

  private describeSoilHumidity(level: number | undefined): string | null {
    if (level === undefined || level === null) return null;
    if (level <= 2) return "Dry soil (xerophyte)";
    if (level <= 4) return "Well-drained soil";
    if (level <= 6) return "Moist soil";
    if (level <= 8) return "Wet soil";
    return "Waterlogged/aquatic";
  }
}

// ============================================================================
// Custom Error Classes
// ============================================================================

export class TrefleNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TrefleNotFoundError";
  }
}

export class TrefleAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TrefleAuthError";
  }
}

export class TrefleRateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TrefleRateLimitError";
  }
}

// ============================================================================
// Singleton Client Factory
// ============================================================================

let clientInstance: TrefleClient | null = null;

export function getTrefleClient(token?: string): TrefleClient {
  if (!clientInstance && token) {
    clientInstance = new TrefleClient(token);
    logger.info("Client initialized");
  }

  if (!clientInstance) {
    throw new Error("Trefle client not initialized. Provide a token on first call.");
  }

  return clientInstance;
}

export function initializeTrefleClient(token: string): TrefleClient {
  clientInstance = new TrefleClient(token);
  logger.info("Client initialized");
  return clientInstance;
}

export function isClientInitialized(): boolean {
  return clientInstance !== null;
}
