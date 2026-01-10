/**
 * Plant Data Formatters (Deno-compatible)
 */

import type { ProcessedPlantData, TrefleSpeciesLight } from "./types.ts";

// ============================================================================
// Main Formatting Functions
// ============================================================================

export function formatPlantCareGuide(plant: ProcessedPlantData): string {
  const sections: string[] = [];

  sections.push(formatPlantHeader(plant));

  const quickFacts = formatQuickFacts(plant);
  if (quickFacts) sections.push(quickFacts);

  const lightInfo = formatLightRequirements(plant);
  if (lightInfo) sections.push(lightInfo);

  const waterInfo = formatWaterRequirements(plant);
  if (waterInfo) sections.push(waterInfo);

  const soilInfo = formatSoilRequirements(plant);
  if (soilInfo) sections.push(soilInfo);

  const tempInfo = formatTemperatureRequirements(plant);
  if (tempInfo) sections.push(tempInfo);

  const growthInfo = formatGrowthInfo(plant);
  if (growthInfo) sections.push(growthInfo);

  if (plant.sowingInstructions) {
    sections.push(`**Sowing Instructions:**\n${plant.sowingInstructions}`);
  }

  const safetyInfo = formatSafetyInfo(plant);
  if (safetyInfo) sections.push(safetyInfo);

  return sections.join("\n\n");
}

export function formatPlantSummary(plant: ProcessedPlantData): string {
  const name = plant.commonName
    ? `${plant.commonName} (${plant.scientificName})`
    : plant.scientificName;

  const traits: string[] = [];

  if (plant.duration) traits.push(plant.duration.join("/"));
  if (plant.ligneousType) traits.push(plant.ligneousType);
  if (plant.edible) traits.push("edible");
  if (plant.toxicity && plant.toxicity !== "none") traits.push(`toxicity: ${plant.toxicity}`);

  const traitStr = traits.length > 0 ? ` [${traits.join(", ")}]` : "";

  const requirements: string[] = [];
  if (plant.lightDescription) requirements.push(`Light: ${plant.lightDescription}`);
  if (plant.soilHumidityDescription) requirements.push(`Water: ${plant.soilHumidityDescription}`);
  if (plant.temperatureRange) {
    const minF = celsiusToFahrenheit(plant.temperatureRange.minC);
    const maxF = celsiusToFahrenheit(plant.temperatureRange.maxC);
    requirements.push(`Temp: ${plant.temperatureRange.minC}°C-${plant.temperatureRange.maxC}°C (${minF}°F-${maxF}°F)`);
  }

  const reqStr = requirements.length > 0 ? `\nCare: ${requirements.join(" | ")}` : "";

  return `${name}${traitStr}${reqStr}`;
}

export function formatPlantsForContext(plants: ProcessedPlantData[]): string {
  if (plants.length === 0) return "";

  const plantSummaries = plants.map((plant, index) => {
    return `${index + 1}. ${formatPlantSummary(plant)}`;
  });

  return `**Plants in conversation:**\n${plantSummaries.join("\n")}`;
}

export function formatSearchResults(results: TrefleSpeciesLight[], query: string): string {
  if (results.length === 0) return `No plants found matching "${query}".`;

  const header = `Found ${results.length} plant${results.length > 1 ? "s" : ""} matching "${query}":\n`;

  const formattedResults = results.map((plant, index) => {
    const name = plant.common_name
      ? `${plant.common_name} (${plant.scientific_name})`
      : plant.scientific_name;
    const family = plant.family ? ` - Family: ${plant.family}` : "";
    return `${index + 1}. ${name}${family}`;
  });

  return header + formattedResults.join("\n");
}

// ============================================================================
// Section Formatters
// ============================================================================

function formatPlantHeader(plant: ProcessedPlantData): string {
  const commonName = plant.commonName ?? "Unknown common name";
  const header = `**${commonName}** (*${plant.scientificName}*)`;

  const taxonomyParts: string[] = [];
  if (plant.family) taxonomyParts.push(`Family: ${plant.family}`);
  if (plant.genus) taxonomyParts.push(`Genus: ${plant.genus}`);

  const taxonomy = taxonomyParts.length > 0 ? `\n${taxonomyParts.join(" | ")}` : "";

  return header + taxonomy;
}

function formatQuickFacts(plant: ProcessedPlantData): string | null {
  const facts: string[] = [];

  if (plant.duration && plant.duration.length > 0) {
    facts.push(`**Type:** ${plant.duration.map(capitalizeFirst).join(", ")}`);
  }
  if (plant.ligneousType) {
    facts.push(`**Growth Form:** ${capitalizeFirst(plant.ligneousType)}`);
  }
  if (plant.growthRate) {
    facts.push(`**Growth Rate:** ${capitalizeFirst(plant.growthRate)}`);
  }
  if (plant.maximumHeightCm) {
    const heightM = (plant.maximumHeightCm / 100).toFixed(1);
    const heightFt = (plant.maximumHeightCm / 30.48).toFixed(1);
    facts.push(`**Max Height:** ${heightM}m (${heightFt}ft)`);
  }
  if (plant.flowerColors && plant.flowerColors.length > 0) {
    facts.push(`**Flower Colors:** ${plant.flowerColors.map(capitalizeFirst).join(", ")}`);
  }
  if (plant.foliageColors && plant.foliageColors.length > 0) {
    facts.push(`**Foliage Colors:** ${plant.foliageColors.map(capitalizeFirst).join(", ")}`);
  }

  if (facts.length === 0) return null;

  return `**Quick Facts:**\n${facts.join("\n")}`;
}

function formatLightRequirements(plant: ProcessedPlantData): string | null {
  if (!plant.lightRequirement && !plant.lightDescription) return null;

  const parts: string[] = [];
  if (plant.lightDescription) parts.push(plant.lightDescription);
  if (plant.lightRequirement !== null) parts.push(`(${plant.lightRequirement}/10 on the light scale)`);

  return `☀️ **Light Requirements:** ${parts.join(" ")}`;
}

function formatWaterRequirements(plant: ProcessedPlantData): string | null {
  const parts: string[] = [];

  if (plant.soilHumidityDescription) parts.push(`**Soil Moisture:** ${plant.soilHumidityDescription}`);
  if (plant.humidityDescription) parts.push(`**Air Humidity:** ${plant.humidityDescription}`);
  if (plant.precipitationRange) {
    const minIn = (plant.precipitationRange.minMm / 25.4).toFixed(1);
    const maxIn = (plant.precipitationRange.maxMm / 25.4).toFixed(1);
    parts.push(`**Annual Rainfall:** ${plant.precipitationRange.minMm}-${plant.precipitationRange.maxMm}mm (${minIn}-${maxIn}in)`);
  }

  if (parts.length === 0) return null;

  return `💧 **Water & Humidity:**\n${parts.join("\n")}`;
}

function formatSoilRequirements(plant: ProcessedPlantData): string | null {
  const parts: string[] = [];

  if (plant.phRange) parts.push(`**pH Range:** ${plant.phRange.min} - ${plant.phRange.max}`);
  if (plant.soilNutriments !== null) {
    const nutrientDesc = describeSoilNutrients(plant.soilNutriments);
    parts.push(`**Nutrient Needs:** ${nutrientDesc} (${plant.soilNutriments}/10)`);
  }

  if (parts.length === 0) return null;

  return `🌱 **Soil Requirements:**\n${parts.join("\n")}`;
}

function formatTemperatureRequirements(plant: ProcessedPlantData): string | null {
  if (!plant.temperatureRange) return null;

  const minC = plant.temperatureRange.minC;
  const maxC = plant.temperatureRange.maxC;
  const minF = celsiusToFahrenheit(minC);
  const maxF = celsiusToFahrenheit(maxC);

  let hardinessNote = "";
  if (minC <= -20) hardinessNote = " (very cold hardy)";
  else if (minC <= -10) hardinessNote = " (cold hardy)";
  else if (minC <= 0) hardinessNote = " (frost tolerant)";
  else if (minC > 10) hardinessNote = " (tropical, no frost)";

  return `🌡️ **Temperature Range:** ${minC}°C to ${maxC}°C (${minF}°F to ${maxF}°F)${hardinessNote}`;
}

function formatGrowthInfo(plant: ProcessedPlantData): string | null {
  const parts: string[] = [];

  if (plant.bloomMonths && plant.bloomMonths.length > 0) {
    parts.push(`**Bloom Time:** ${formatMonthList(plant.bloomMonths)}`);
  }
  if (plant.growthMonths && plant.growthMonths.length > 0) {
    parts.push(`**Active Growth:** ${formatMonthList(plant.growthMonths)}`);
  }
  if (plant.fruitMonths && plant.fruitMonths.length > 0) {
    parts.push(`**Fruiting:** ${formatMonthList(plant.fruitMonths)}`);
  }
  if (plant.daysToHarvest) {
    parts.push(`**Days to Harvest:** ${plant.daysToHarvest} days`);
  }
  if (plant.growthDescription) {
    parts.push(`**Growth Notes:** ${plant.growthDescription}`);
  }

  if (parts.length === 0) return null;

  return `📅 **Growth & Timing:**\n${parts.join("\n")}`;
}

function formatSafetyInfo(plant: ProcessedPlantData): string | null {
  const parts: string[] = [];

  if (plant.edible) {
    const edibleParts = plant.edibleParts ? plant.edibleParts.join(", ") : "various parts";
    parts.push(`✅ **Edible:** Yes (${edibleParts})`);
    if (plant.vegetable) parts.push(`🥬 **Vegetable:** Yes`);
  }

  if (plant.toxicity) {
    const toxicityEmoji =
      plant.toxicity === "none" ? "✅" : plant.toxicity === "low" ? "⚠️" : plant.toxicity === "medium" ? "⚠️" : "☠️";
    parts.push(`${toxicityEmoji} **Toxicity:** ${capitalizeFirst(plant.toxicity)}`);
  }

  if (parts.length === 0) return null;

  return `**Safety Information:**\n${parts.join("\n")}`;
}

// ============================================================================
// Structured Data Formatters
// ============================================================================

export function formatPlantForData(plant: ProcessedPlantData): Record<string, unknown> {
  return {
    identification: {
      id: plant.id,
      slug: plant.slug,
      scientificName: plant.scientificName,
      commonName: plant.commonName,
      family: plant.family,
      genus: plant.genus,
    },
    characteristics: {
      type: plant.duration,
      ligneousType: plant.ligneousType,
      growthRate: plant.growthRate,
      maxHeightCm: plant.maximumHeightCm,
      avgHeightCm: plant.averageHeightCm,
    },
    care: {
      light: { level: plant.lightRequirement, description: plant.lightDescription },
      water: {
        soilHumidity: plant.soilHumidity,
        soilHumidityDescription: plant.soilHumidityDescription,
        atmosphericHumidity: plant.humidityRequirement,
        atmosphericHumidityDescription: plant.humidityDescription,
        annualPrecipitationMm: plant.precipitationRange,
      },
      soil: { phRange: plant.phRange, nutrientLevel: plant.soilNutriments },
      temperature: plant.temperatureRange,
    },
    timing: {
      daysToHarvest: plant.daysToHarvest,
      bloomMonths: plant.bloomMonths,
      growthMonths: plant.growthMonths,
      fruitMonths: plant.fruitMonths,
    },
    sowing: plant.sowingInstructions,
    safety: {
      edible: plant.edible,
      edibleParts: plant.edibleParts,
      vegetable: plant.vegetable,
      toxicity: plant.toxicity,
    },
    appearance: {
      flowerColors: plant.flowerColors,
      foliageColors: plant.foliageColors,
      fruitColors: plant.fruitColors,
      imageUrl: plant.imageUrl,
    },
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function celsiusToFahrenheit(celsius: number): number {
  return Math.round((celsius * 9) / 5 + 32);
}

function describeSoilNutrients(level: number): string {
  if (level <= 2) return "Very low (oligotrophic)";
  if (level <= 4) return "Low";
  if (level <= 6) return "Moderate";
  if (level <= 8) return "High";
  return "Very high (hypereutrophic)";
}

function formatMonthList(months: string[]): string {
  if (months.length === 12) return "Year-round";
  if (months.length === 0) return "Unknown";
  return months.map((m) => capitalizeFirst(m)).join(", ");
}

export function formatPlantOneLiner(plant: ProcessedPlantData): string {
  const name = plant.commonName ?? plant.scientificName;
  const traits: string[] = [];

  if (plant.duration) traits.push(plant.duration[0]);
  if (plant.edible) traits.push("edible");
  if (plant.lightDescription) traits.push(plant.lightDescription.toLowerCase());

  const traitStr = traits.length > 0 ? ` - ${traits.join(", ")}` : "";

  return `${name}${traitStr}`;
}

export function createPlantContextForPrompt(plants: ProcessedPlantData[]): string {
  if (plants.length === 0) return "";

  const header = `The following plants have been mentioned in this conversation:\n\n`;

  const plantDetails = plants.map((plant) => {
    const name = plant.commonName
      ? `${plant.commonName} (${plant.scientificName})`
      : plant.scientificName;

    const details: string[] = [`Plant: ${name}`];

    if (plant.family) details.push(`Family: ${plant.family}`);
    if (plant.duration) details.push(`Type: ${plant.duration.join("/")}`);
    if (plant.lightDescription) details.push(`Light: ${plant.lightDescription}`);
    if (plant.soilHumidityDescription) details.push(`Water: ${plant.soilHumidityDescription}`);
    if (plant.temperatureRange) {
      details.push(`Temp: ${plant.temperatureRange.minC}°C to ${plant.temperatureRange.maxC}°C`);
    }
    if (plant.phRange) details.push(`Soil pH: ${plant.phRange.min}-${plant.phRange.max}`);
    if (plant.edible) {
      const parts = plant.edibleParts?.join(", ") ?? "yes";
      details.push(`Edible: ${parts}`);
    }
    if (plant.toxicity && plant.toxicity !== "none") {
      details.push(`Toxicity: ${plant.toxicity}`);
    }
    if (plant.sowingInstructions) details.push(`Sowing: ${plant.sowingInstructions}`);

    return details.join("\n");
  });

  return header + plantDetails.join("\n\n---\n\n");
}
