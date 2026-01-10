/**
 * Super Soil Mix Recipe and Amendments Guide
 * Pre-processed knowledge document for the GreenThumb agent
 */

import type { KnowledgeDocument, SoilAmendment } from "./types.ts";

/**
 * Base soil ingredients for the super soil mix
 */
export const baseSoilIngredients: SoilAmendment[] = [
  {
    name: "Peat Moss",
    cost: 12.0,
    category: "base",
  },
  {
    name: "Bark",
    cost: 3.5,
    category: "base",
  },
  {
    name: "Compost",
    cost: 5.3,
    category: "base",
  },
  {
    name: "Rice Hulls",
    cost: 24.0,
    category: "base",
  },
  {
    name: "Worm Castings",
    cost: 50.0,
    category: "base",
  },
  {
    name: "Bio Char",
    cost: 90.0,
    category: "base",
  },
  {
    name: "Pumice Rock",
    cost: 17.0,
    category: "base",
  },
  {
    name: "Lava Rock",
    cost: 36.0,
    category: "base",
  },
];

/**
 * Cold soil amendments for vegetative stage
 */
export const coldSoilAmendments: SoilAmendment[] = [
  {
    name: "Oyster Shells",
    cost: 27.0,
    nutrient: "Calcium 35%",
    category: "cold-soil",
    application:
      "Amending: 1-2 tbsp per gallon of soil and mix thoroughly OR add 0.5-1 lb per cubic yard. Feeding: 1-2 tbsp per gallon into the soil surface every other month",
  },
  {
    name: "Crab Meal",
    cost: 11.0,
    npk: "4-3-0",
    nutrient: "Chitin adds microorganisms; soil tilth; compost activator; calcium 14%",
    category: "cold-soil",
    application:
      "Amending: 1-2 tbsp per gallon of soil and mix thoroughly OR add 5 lbs per cubic yard. Feeding: 1-2 tbsp per gallon into the soil surface once each month during the growing season.",
  },
  {
    name: "Beetle Juice (Insect Frass)",
    cost: 25.0,
    nutrient: "Insect frass/mealworm castings",
    plantBenefits: "Builds pest/stress resistance",
    category: "cold-soil",
    application: "Amending or Compost Tea Only. Amending: mix into soil at 1-2 tsp per gallon. Tea: 1 cup/5 gals of tea",
  },
  {
    name: "Bio Live",
    cost: 17.0,
    npk: "5-4-2",
    nutrient: "Fishbone meal; fish meal; crab meal; alfalfa meal; shrimp meal; langbeinite; kelp meal",
    category: "cold-soil",
    application:
      "For planting or amending only; 1/4-1/2 cup per gallon; 2.5-25 lbs per cubic yard; 2-4 tbsp per gallon of soil when transplanting",
  },
  {
    name: "Rock Phosphate",
    cost: 9.2,
    npk: "0-3-0",
    nutrient: "Colloidal phosphate; untreated phosphorous; calcium",
    category: "cold-soil",
    application: "Amending: 1/4 cup per gallon; 5-10 lbs/cubic yard; Feeding: 1 tbs/gal top dress bi-monthly.",
  },
  {
    name: "Azomite",
    cost: 9.0,
    npk: "0-0-0.2",
    nutrient: "Trace elements",
    plantBenefits: "Adds trace minerals to soil",
    category: "cold-soil",
    application:
      "Amending: 1-2 tbsp per gallon of soil and mix thoroughly OR add 0.5-1 lb per cubic yard. Feeding: 1-2 tsp per gallon into the soil surface every other month.",
  },
  {
    name: "Red Wigglers",
    cost: 40.0,
    nutrient: "Living composters",
    category: "cold-soil",
    application: "Can be found in nature - look under rocks in damp areas",
  },
  {
    name: "MYKOS",
    cost: 35.0,
    nutrient: "Rhizophagus intraradices (mycorrhizae)",
    plantBenefits:
      'Beneficial soil fungi that creates a "sponge-like" mass which collects and stores nutrients and water, increasing the uptake of both.',
    category: "cold-soil",
    application: "Add to the hole, directly around the plant roots. Mykos must come in contact with the roots. Set plant and backfill. Remember to water.",
  },
  {
    name: "Ferrous Sulfate",
    cost: 22.0,
    nutrient: "Soluble iron 20%; sulfur 12%; PH stabilizer",
    plantBenefits: "Treats chlorosis; helps balance PH",
    category: "cold-soil",
  },
  {
    name: "Kelp Meal",
    cost: 20.0,
    npk: "1-0.1-2",
    nutrient: "Ascophyllum nodosum North Atlantic seaweed; Nitrogen, Phosphate, Soluble Potash",
    plantBenefits:
      "Over 60 trace elements or micronutrients, including calcium, magnesium, sulphur, manganese, copper, iron and zinc; helps promote overall plant health, vigor, and tolerance to stress, pests, and disease.",
    category: "cold-soil",
    application:
      "Amending: 1-2 tbsp per gallon of soil and mix thoroughly OR add 2.5 lbs per cubic yard. Feeding: 1-2 tsp per gallon into the soil surface once each month",
  },
  {
    name: "Alfalfa Meal",
    cost: 9.0,
    npk: "2-0-1",
    nutrient: "Nitrogen; soluble potash",
    category: "cold-soil",
    application: "Amending: 2-4 tbsp per gallon; 5 lbs per cubic yard; Feeding: 1-2 tbsp per gallon into the soil surface once each month",
  },
  {
    name: "Insect Frass",
    cost: 19.0,
    npk: "3-1-1",
    nutrient: "Nitrogen 2%, Soluble Nitrogen 1%, Phosphate, Potash",
    category: "cold-soil",
    application:
      "Amending: 1-2 tbsp per gallon of soil and mix thoroughly OR add 1 cup per cubic foot. Feeding: 1-2 tbsp per gallon into the soil surface once each month",
  },
  {
    name: "Humic Acid",
    cost: 19.0,
    nutrient: "50% Humic Acids Derived From Leonardite",
    plantBenefits: "Chelation, bonds to micro nutrients for better absorption.",
    category: "cold-soil",
    application:
      "Amending: 1-2 tsp per gallon of soil and mix thoroughly OR add 1-2 lbs per cubic yard. Feeding: 1-2 tsp per gallon into the soil surface every other month",
  },
  {
    name: "Feather Meal",
    cost: 15.0,
    npk: "12-0-0",
    nutrient: "Slow release nitrogen",
    category: "cold-soil",
    application:
      "Amending: 1-2 tbsp per gallon of soil and mix thoroughly OR add 5-10 lbs per cubic yard. Feed: 1-2 tbsp per gallon into the soil surface once each month",
  },
  {
    name: "Neem Seed Meal",
    cost: 16.0,
    npk: "6-1-2",
    nutrient: "Slow release nitrogen, phosphate, potash",
    category: "cold-soil",
    application:
      "Amending: 1/8-1/4 cup per gallon of soil and mix thoroughly OR add 5-10 lbs per cubic yard. Feeding: 2-4 tablespoons per gallon into the soil surface once each month",
  },
  {
    name: "High Nitrogen Bat Guano",
    cost: 12.0,
    npk: "9-3-1",
    nutrient: "Fast-acting soluble nitrogen",
    category: "cold-soil",
    application:
      "Amending: 1/8-1/4 cup per gallon of soil and mix thoroughly OR add 5-10 lbs per cubic yard. Feeding: 2-4 tablespoons per gallon. Tea: Add 2 tsp (10 ml) per gallon. Mix for 24 to 48 hours and water in direct.",
  },
  {
    name: "Blood Meal",
    cost: 21.0,
    npk: "12-0-0",
    nutrient: "Nitrogen",
    category: "cold-soil",
    application: "Amending: 1-2 tsp per gallon of soil. Feeding: 1 tsp per gallon into the soil surface once each month",
  },
  {
    name: "Bio Fish",
    cost: 11.0,
    npk: "7-7-2",
    nutrient:
      "Nitrogen, phosphate, potash, calcium 7%, sulfur 1%, Humic acid 2.5%. Derived from: Fish Bone Meal, Fish Meal, Feather Meal, Sulfate of Potash, Alfalfa Meal and Kelp Meal",
    category: "cold-soil",
    application:
      "Amending: 2 tbsp per gallon of soil and mix thoroughly OR add 5-10 lbs per cubic yard. Feeding: 1-2 tbsp per gallon into the soil surface twice each month",
  },
  {
    name: "Epsom Salts",
    cost: 5.0,
    nutrient: "Magnesium Sulfate",
    category: "cold-soil",
    application: "Amending: One teaspoon per foot plant height every 2 weeks. Feeding: 1 teaspoon per gallon of water every 1 to 4 weeks.",
  },
  {
    name: "Dolomite Lime",
    cost: 9.0,
    nutrient: "Calcium; Magnesium; increases soil PH",
    category: "cold-soil",
    application: "Amending: 1 tbsp per 10 gallons every 2 months.",
  },
  {
    name: "Greensand",
    cost: 16.0,
    category: "cold-soil",
  },
  {
    name: "Bone Meal",
    cost: 15.0,
    npk: "3-15-0",
    nutrient: "Nitrogen, Phosphate, Calcium 18%",
    category: "cold-soil",
    application:
      "Amending: 1-2 tbsp per gallon of soil and mix thoroughly OR add 2.5-5 lbs per cubic yard. Feeding: 1-2 tbsp per gallon into the soil surface once each month.",
  },
  {
    name: "Gypsum",
    nutrient: "Calcium 21%, Sulfur 17%, Calcium sulfate dyhidrate 89%",
    category: "cold-soil",
    application: "Amending & Feeding: 1 tbsp per 4 gallons of soil",
  },
];

/**
 * Hot soil amendments for flowering stage
 */
export const hotSoilAmendments: SoilAmendment[] = [
  {
    name: "High Phos Bat Guano",
    cost: 10.0,
    npk: "0-7-0",
    nutrient: "Soluble phosphorous, calcium; use during fruiting/flowering stage.",
    category: "hot-soil",
    application:
      "Amending: Add 1 tsp (5 ml) per 1 gallon of soil. Add 2 tsp (10 ml) per 5 gallons of soil. Add 1 TBS (15 ml) per 10 gallons of soil. Feeding: Add 1 TBS (15 ml) per gallon. Mix for 24 to 48 hours and water in direct.",
  },
  {
    name: "Fishbone Meal",
    cost: 10.0,
    npk: "4-12-0",
    nutrient: "Nitrogen, phosphate, calcium 14%",
    category: "hot-soil",
    application:
      "Amending: 1-2 tbsp per gallon of soil and mix thoroughly OR add 2.5-5 lbs per cubic yard. Feeding: 1-2 tbsp per gallon into the soil surface once each month",
  },
  {
    name: "Langbeinite",
    cost: 11.0,
    npk: "0-0-22",
    nutrient: "Soluble potash, Magnesium 10%, sulfur 22%, chlorine 3%",
    category: "hot-soil",
    application:
      "Amending: 1 tablespoon per gallon of soil and mix thoroughly OR add 1-2 lbs per cubic yard. Feeding: 1-2 teaspoons per gallon into the soil surface once each month during the growing season.",
  },
  {
    name: "Seabird Guano",
    cost: 10.0,
    npk: "0-11-0",
    nutrient: "Phosphate, calcium 20%",
    category: "hot-soil",
    application:
      "Amending: 1-2 tbsp per gallon of soil and mix thoroughly OR add 2.5-5 lbs per cubic yard. Feeding: 1 tbsp per gallon into the soil surface once each month.",
  },
];

/**
 * Top dressing amendments
 */
export const topDressingAmendments: SoilAmendment[] = [
  {
    name: "Malted Barley",
    cost: 14.0,
    nutrient: "Bacteria; fungi; microorganisms",
    plantBenefits:
      "Indole-3-acetic acid (IAA), a vital plant growth hormone that promotes cell division and is involved in the coordination and development of plant organs.",
    category: "top-dressing",
    application:
      "Grind at home; Feeding: 1 tablespoon to the base of a 30L pot and water in; Tea: Add 7 grams of ground Malted Barley Grain per Litre of water. Bubble the water with Barley in it for 12-24 hours. (Warning: it will foam a lot)",
  },
];

/**
 * All amendments combined
 */
export const allAmendments: SoilAmendment[] = [
  ...baseSoilIngredients,
  ...coldSoilAmendments,
  ...hotSoilAmendments,
  ...topDressingAmendments,
];

/**
 * Super Soil Mix knowledge document
 */
export const superSoilMix: KnowledgeDocument = {
  id: "super-soil-mix-guide",
  title: "Super Soil Mix Recipe and Amendments Guide",
  category: "soil-preparation",
  tags: ["soil", "amendments", "organic", "nutrients", "composting", "fertilizer"],
  content: `# Super Soil Mix Recipe and Amendments Guide

## Overview
This comprehensive guide covers all the ingredients needed to create a nutrient-rich "super soil" mix for optimal plant growth. The recipe is divided into base ingredients, cold soil amendments (vegetative stage), hot soil amendments (flowering stage), and top dressing options.

## Cost Summary
- Base Soil Ingredients: ~$237.80
- Cold Soil (Vegetative) Amendments: ~$423.20
- Total Investment: ~$661.00

## Base Soil Ingredients
The foundation of super soil includes:
- **Peat Moss** ($12.00) - Moisture retention and aeration
- **Bark** ($3.50) - Drainage and structure
- **Compost** ($5.30) - Organic matter and microorganisms
- **Rice Hulls** ($24.00) - Aeration and silica
- **Worm Castings** ($50.00) - Beneficial microbes and nutrients
- **Bio Char** ($90.00) - Carbon sequestration and water retention
- **Pumice Rock** ($17.00) - Drainage and aeration
- **Lava Rock** ($36.00) - Drainage and mineral content

## Cold Soil Amendments (Vegetative Stage)
Key amendments for the vegetative growth phase:

### Calcium Sources
- **Oyster Shells** - Calcium 35%, slow release
- **Crab Meal** (4-3-0) - Calcium 14% plus chitin for soil health
- **Bone Meal** (3-15-0) - Calcium 18% plus phosphorus

### Nitrogen Sources
- **Blood Meal** (12-0-0) - Fast-acting nitrogen
- **Feather Meal** (12-0-0) - Slow release nitrogen
- **High Nitrogen Bat Guano** (9-3-1) - Fast-acting soluble nitrogen
- **Alfalfa Meal** (2-0-1) - Nitrogen plus growth hormones

### Micronutrients & Trace Elements
- **Azomite** (0-0-0.2) - 70+ trace minerals
- **Kelp Meal** (1-0.1-2) - 60+ micronutrients, stress resistance
- **Ferrous Sulfate** - Iron 20%, sulfur 12%, treats chlorosis

### Soil Biology
- **MYKOS** - Mycorrhizal fungi for nutrient uptake
- **Red Wigglers** - Living composters
- **Beetle Juice/Insect Frass** - Chitin and beneficial microbes
- **Humic Acid** - Chelation for better nutrient absorption

### Complete Blends
- **Bio Live** (5-4-2) - Comprehensive blend of meals
- **Bio Fish** (7-7-2) - Fish-based complete fertilizer

### pH Adjustment
- **Dolomite Lime** - Raises pH, adds calcium and magnesium
- **Gypsum** - Calcium and sulfur without changing pH

## Hot Soil Amendments (Flowering Stage)
Phosphorus and potassium-heavy amendments for flowering:

- **High Phos Bat Guano** (0-7-0) - Soluble phosphorus for flower development
- **Seabird Guano** (0-11-0) - High phosphate, calcium 20%
- **Fishbone Meal** (4-12-0) - Phosphorus boost plus calcium
- **Langbeinite** (0-0-22) - Potassium, magnesium, and sulfur

## Top Dressing Options
- **Malted Barley** - Contains IAA (indole-3-acetic acid) growth hormone, beneficial for cell division and plant development

## Application Guidelines

### Amending (When Building Soil)
Most amendments: 1-2 tbsp per gallon of soil, mix thoroughly
For cubic yard batches: Follow specific amendment guidelines

### Feeding (Top Dressing During Growth)
Most amendments: 1-2 tbsp per gallon into soil surface
Frequency: Monthly during growing season

### Compost Tea
Many amendments can be used in compost tea:
- Typical ratio: 1-2 tbsp per gallon of water
- Bubble for 24-48 hours
- Apply directly to soil or as foliar spray

## Pro Tips
1. Build soil 30+ days before planting to allow it to "cook"
2. Monitor pH - aim for 6.0-7.0 for most plants
3. Use mycorrhizae at transplant time for best root colonization
4. Rotate between nitrogen-heavy (veg) and phosphorus-heavy (flower) feedings
5. Epsom salts correct magnesium deficiency quickly`,
  metadata: {
    source: "sinsemillagardenclub",
    type: "recipe",
    difficulty: "intermediate",
    totalCost: 661.0,
    categories: ["base", "cold-soil", "hot-soil", "top-dressing"],
  },
};

export default superSoilMix;
