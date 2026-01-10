/**
 * Neem Oil Mixture for Integrated Pest Management (IPM)
 * Pre-processed knowledge document for the GreenThumb agent
 */

import type { KnowledgeDocument } from "./types.ts";

export const neemOilGuide: KnowledgeDocument = {
  id: "neem-oil-ipm-guide",
  title: "Neem Oil Mixture for IPM",
  category: "pest-management",
  tags: ["neem", "ipm", "organic", "pest-control", "aphids", "mites", "thrips"],
  content: `# Neem Oil Mixture for Integrated Pest Management (IPM)

## Overview
This neem oil mixture is used once per week to keep soft-bodied insects (aphids, thrips, mites, etc.) away from plants. For active infestations, use an organic pesticide like Lost Coast Plant Therapy, Venerate, or Trifecta 3x/week for 1 week, then 2x/week for 1 week, then return to the neem oil mixture for maintenance.

## Important Warnings
- DO NOT spray plants after week 2 of flowering
- DO NOT use neem oil on outdoor gardens - it kills beneficial soft-bodied insects like bees and butterflies that are in danger of extinction
- Avoid spraying new seedlings with neem - they could burn

## Recipe

### Step 1: Mix Soap and Water
Oil and water don't mix, so you need an emulsifier:
- Mix 1 teaspoon of dish soap per 1 gallon of warm water
- Diluted liquid soap works as a homemade garden pesticide
- It kills aphids and other soft bugs on contact

### Step 2: Add Neem Oil
- Add 1 to 2 tablespoons of neem oil
- Mix thoroughly until well combined

### Step 3: Prepare Lighting
- Turn lights down or off for at least 4 hours
- Best to spray right before lights out
- If you spray under hot lights, the oil and water droplets will burn the leaves

### Step 4: Application
- Spray the bottoms of all leaves first
- Then spray stems
- Finally spray the tops of leaves
- Make sure plants are thoroughly soaked
- The mixture won't hurt the soil

## Pro Tips
1. Avoid spraying new seedlings - they could burn
2. Make small batches and use up the spray within a week (mixture degrades)
3. Bugs hate peppermint - use peppermint liquid soap as your emulsifier, or add a few drops of peppermint essential oil for extra pest deterrence

## Target Pests
- Aphids
- Thrips
- Spider mites
- Whiteflies
- Other soft-bodied insects`,
  metadata: {
    source: "sinsemillagardenclub",
    type: "guide",
    difficulty: "beginner",
    timeToApply: "15-30 minutes",
    frequency: "weekly for prevention",
  },
};

export default neemOilGuide;
