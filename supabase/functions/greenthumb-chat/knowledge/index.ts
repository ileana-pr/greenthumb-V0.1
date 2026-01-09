/**
 * Knowledge Index
 * Exports all pre-processed knowledge documents for the GreenThumb agent
 */

export type { KnowledgeDocument, SoilAmendment, KnowledgeChunk, KnowledgeSearchResult } from "./types.ts";

export { neemOilGuide } from "./neem-oil-guide.ts";
export {
  superSoilMix,
  baseSoilIngredients,
  coldSoilAmendments,
  hotSoilAmendments,
  topDressingAmendments,
  allAmendments,
} from "./super-soil-mix.ts";

import { neemOilGuide } from "./neem-oil-guide.ts";
import { superSoilMix } from "./super-soil-mix.ts";
import type { KnowledgeDocument } from "./types.ts";

/**
 * All knowledge documents for loading into the agent
 */
export const allKnowledgeDocuments: KnowledgeDocument[] = [
  neemOilGuide,
  superSoilMix,
];

/**
 * Get knowledge document by ID
 */
export function getKnowledgeById(id: string): KnowledgeDocument | undefined {
  return allKnowledgeDocuments.find((doc) => doc.id === id);
}

/**
 * Get knowledge documents by category
 */
export function getKnowledgeByCategory(category: string): KnowledgeDocument[] {
  return allKnowledgeDocuments.filter((doc) => doc.category === category);
}

/**
 * Get knowledge documents by tag
 */
export function getKnowledgeByTag(tag: string): KnowledgeDocument[] {
  return allKnowledgeDocuments.filter((doc) => doc.tags.includes(tag));
}

/**
 * Get all unique categories
 */
export function getAllCategories(): string[] {
  return [...new Set(allKnowledgeDocuments.map((doc) => doc.category))];
}

/**
 * Get all unique tags
 */
export function getAllTags(): string[] {
  const allTags = allKnowledgeDocuments.flatMap((doc) => doc.tags);
  return [...new Set(allTags)];
}

export default allKnowledgeDocuments;
