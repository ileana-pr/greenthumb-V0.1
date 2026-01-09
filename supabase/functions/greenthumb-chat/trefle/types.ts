/**
 * Trefle API Type Definitions (Deno-compatible)
 * Based on https://docs.trefle.io/docs/advanced/plants-fields
 */

// ============================================================================
// Core Types
// ============================================================================

export interface TrefleMeasurement {
  cm?: number;
  ft?: number;
  m?: number;
  mm?: number;
  deg_c?: number;
  deg_f?: number;
}

export interface TrefleImage {
  id: number;
  image_url: string;
  copyright?: string;
}

export interface TrefleLinks {
  self: string;
  genus: string;
  plant: string;
}

export interface TrefleSynonym {
  id: number;
  name: string;
  author?: string;
}

export interface TrefleSource {
  id: string;
  name: string;
  citation?: string;
  url?: string;
  last_update?: string;
}

export interface TrefleDistributionZone {
  id: number;
  name: string;
  slug: string;
  tdwg_code: string;
  tdwg_level: number;
  species_count: number;
  links: {
    self: string;
    plants: string;
    species: string;
  };
}

// ============================================================================
// Nested Species Objects
// ============================================================================

export interface TrefleImages {
  flower?: TrefleImage[];
  leaf?: TrefleImage[];
  habit?: TrefleImage[];
  fruit?: TrefleImage[];
  bark?: TrefleImage[];
  other?: TrefleImage[];
}

export interface TrefleDistributions {
  native?: TrefleDistributionZone[];
  introduced?: TrefleDistributionZone[];
  doubtful?: TrefleDistributionZone[];
  absent?: TrefleDistributionZone[];
  extinct?: TrefleDistributionZone[];
}

export interface TrefleFlower {
  color?: string[];
  conspicuous?: boolean;
}

export interface TrefleFoliage {
  texture?: "fine" | "medium" | "coarse";
  color?: string[];
  leaf_retention?: boolean;
}

export interface TrefleFruitOrSeed {
  conspicuous?: boolean;
  color?: string[];
  shape?: string;
  seed_persistence?: boolean;
}

export interface TrefleSpecifications {
  ligneous_type?: "liana" | "subshrub" | "shrub" | "tree" | "parasite";
  growth_form?: string;
  growth_habit?: string;
  growth_rate?: string;
  average_height?: TrefleMeasurement;
  maximum_height?: TrefleMeasurement;
  nitrogen_fixation?: string;
  shape_and_orientation?: string;
  toxicity?: "none" | "low" | "medium" | "high";
}

export interface TrefleGrowth {
  days_to_harvest?: number;
  description?: string;
  sowing?: string;
  ph_maximum?: number;
  ph_minimum?: number;
  light?: number;
  atmospheric_humidity?: number;
  growth_months?: string[];
  bloom_months?: string[];
  fruit_months?: string[];
  row_spacing?: TrefleMeasurement;
  spread?: TrefleMeasurement;
  minimum_precipitation?: TrefleMeasurement;
  maximum_precipitation?: TrefleMeasurement;
  minimum_root_depth?: TrefleMeasurement;
  minimum_temperature?: TrefleMeasurement;
  maximum_temperature?: TrefleMeasurement;
  soil_nutriments?: number;
  soil_salinity?: number;
  soil_texture?: number;
  soil_humidity?: number;
}

// ============================================================================
// Main Species/Plant Types
// ============================================================================

export interface TrefleSpeciesLight {
  id: number;
  common_name: string | null;
  slug: string;
  scientific_name: string;
  year?: number;
  bibliography?: string;
  author?: string;
  status: "accepted" | "unknown";
  rank: "species" | "ssp" | "var" | "form" | "hybrid" | "subvar";
  family_common_name?: string | null;
  family: string;
  genus_id: number;
  genus: string;
  image_url?: string | null;
  synonyms?: string[];
  links: TrefleLinks;
}

export interface TrefleSpeciesFull extends TrefleSpeciesLight {
  main_species_id?: number;
  vegetable: boolean;
  observations?: string;
  edible: boolean;
  edible_part?: string[] | null;
  duration?: ("annual" | "biennial" | "perennial")[] | null;
  common_names?: Record<string, string[]>;
  distribution?: Record<string, string[]>;
  distributions?: TrefleDistributions;
  flower?: TrefleFlower;
  foliage?: TrefleFoliage;
  fruit_or_seed?: TrefleFruitOrSeed;
  specifications?: TrefleSpecifications;
  growth?: TrefleGrowth;
  images?: TrefleImages;
  sources?: TrefleSource[];
  synonyms_full?: TrefleSynonym[];
}

// ============================================================================
// API Response Wrappers
// ============================================================================

export interface TreflePaginationLinks {
  self: string;
  first: string;
  last: string;
  next?: string;
  prev?: string;
}

export interface TrefleMeta {
  total: number;
}

export interface TrefleListResponse<T> {
  data: T[];
  links: TreflePaginationLinks;
  meta: TrefleMeta;
}

export interface TrefleSingleResponse<T> {
  data: T;
  meta: TrefleMeta;
}

export interface TrefleErrorResponse {
  error: boolean;
  message: string;
}

// ============================================================================
// Plugin-Specific Types
// ============================================================================

export interface ProcessedPlantData {
  id: number;
  slug: string;
  scientificName: string;
  commonName: string | null;
  family: string;
  genus: string;
  rank: string;
  duration: string[] | null;
  edible: boolean;
  edibleParts: string[] | null;
  vegetable: boolean;
  toxicity: string | null;
  ligneousType: string | null;
  growthRate: string | null;
  averageHeightCm: number | null;
  maximumHeightCm: number | null;
  lightRequirement: number | null;
  lightDescription: string | null;
  humidityRequirement: number | null;
  humidityDescription: string | null;
  phRange: { min: number; max: number } | null;
  soilHumidity: number | null;
  soilHumidityDescription: string | null;
  soilNutriments: number | null;
  temperatureRange: { minC: number; maxC: number } | null;
  precipitationRange: { minMm: number; maxMm: number } | null;
  daysToHarvest: number | null;
  sowingInstructions: string | null;
  growthDescription: string | null;
  bloomMonths: string[] | null;
  growthMonths: string[] | null;
  fruitMonths: string[] | null;
  flowerColors: string[] | null;
  foliageColors: string[] | null;
  fruitColors: string[] | null;
  imageUrl: string | null;
  images: {
    flower: string[];
    leaf: string[];
    habit: string[];
    fruit: string[];
  };
  raw: TrefleSpeciesFull;
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

export interface PlantMention {
  originalText: string;
  normalizedName: string;
  confidence: "high" | "medium" | "low";
  source: "exact_match" | "common_name" | "pattern" | "context";
}

export interface ConversationPlant {
  mention: PlantMention;
  species: ProcessedPlantData | null;
  searchResults: TrefleSpeciesLight[];
  lastUpdated: number;
  fetchAttempts: number;
}

export interface TreflePluginConfig {
  TREFLE_TOKEN: string;
}
