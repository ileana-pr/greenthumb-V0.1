/**
 * Knowledge Types for GreenThumb Agent
 */

/**
 * Represents a knowledge document that can be embedded and searched
 */
export interface KnowledgeDocument {
  /** Unique identifier for the document */
  id: string;
  /** Human-readable title */
  title: string;
  /** Primary category for organization */
  category: string;
  /** Searchable tags */
  tags: string[];
  /** Full text content for embedding and retrieval */
  content: string;
  /** Additional metadata */
  metadata: Record<string, string | number | boolean | string[]>;
}

/**
 * Represents a soil amendment ingredient
 */
export interface SoilAmendment {
  /** Name of the amendment */
  name: string;
  /** Approximate cost in USD */
  cost?: number;
  /** NPK ratio (e.g., "4-3-0") */
  npk?: string;
  /** Nutrient content description */
  nutrient?: string;
  /** Benefits to plants */
  plantBenefits?: string;
  /** Category: base, cold-soil, hot-soil, top-dressing */
  category: "base" | "cold-soil" | "hot-soil" | "top-dressing";
  /** Application instructions */
  application?: string;
}

/**
 * Knowledge chunk after processing for embedding
 */
export interface KnowledgeChunk {
  /** Reference to parent document */
  documentId: string;
  /** Chunk index within document */
  chunkIndex: number;
  /** Text content of this chunk */
  content: string;
  /** Embedding vector (OpenAI ada-002 = 1536 dimensions) */
  embedding?: number[];
  /** Metadata inherited from document plus chunk-specific */
  metadata: Record<string, string | number | boolean | string[]>;
}

/**
 * Search result from knowledge retrieval
 */
export interface KnowledgeSearchResult {
  /** The matched chunk */
  chunk: KnowledgeChunk;
  /** Similarity score (0-1, higher is better) */
  score: number;
  /** Parent document info */
  document: {
    id: string;
    title: string;
    category: string;
  };
}
