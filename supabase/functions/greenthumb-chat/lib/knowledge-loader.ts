/**
 * Knowledge Loader
 * Loads pre-processed knowledge documents into the database with embeddings
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { allKnowledgeDocuments, type KnowledgeDocument } from "../knowledge/index.ts";

const logger = {
  info: (message: string, ...args: unknown[]) => console.log(`[KnowledgeLoader] ${message}`, ...args),
  warn: (message: string, ...args: unknown[]) => console.warn(`[KnowledgeLoader] ${message}`, ...args),
  error: (message: string, ...args: unknown[]) => console.error(`[KnowledgeLoader] ${message}`, ...args),
};

/**
 * Chunk text into smaller pieces for embedding
 * OpenAI recommends chunks of ~500-1000 tokens for retrieval
 */
function chunkText(text: string, maxChunkSize = 1500): string[] {
  const chunks: string[] = [];
  const paragraphs = text.split(/\n\n+/);

  let currentChunk = "";

  for (const paragraph of paragraphs) {
    // If adding this paragraph would exceed max size, save current chunk and start new one
    if (currentChunk.length + paragraph.length > maxChunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = "";
    }

    // If a single paragraph is too long, split it by sentences
    if (paragraph.length > maxChunkSize) {
      const sentences = paragraph.split(/(?<=[.!?])\s+/);
      for (const sentence of sentences) {
        if (currentChunk.length + sentence.length > maxChunkSize && currentChunk.length > 0) {
          chunks.push(currentChunk.trim());
          currentChunk = "";
        }
        currentChunk += sentence + " ";
      }
    } else {
      currentChunk += paragraph + "\n\n";
    }
  }

  // Don't forget the last chunk
  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

/**
 * Generate embedding using OpenAI API
 */
async function generateEmbedding(text: string, openaiApiKey: string): Promise<number[] | null> {
  try {
    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: "text-embedding-ada-002",
        input: text,
      }),
    });

    if (!response.ok) {
      logger.error("OpenAI API error:", response.status, await response.text());
      return null;
    }

    const data = await response.json();
    return data.data[0]?.embedding || null;
  } catch (error) {
    logger.error("Error generating embedding:", error);
    return null;
  }
}

/**
 * Check if a knowledge document is already loaded
 */
async function isDocumentLoaded(supabase: SupabaseClient, documentId: string): Promise<boolean> {
  const { count, error } = await supabase
    .from("knowledge")
    .select("id", { count: "exact", head: true })
    .eq("document_id", documentId);

  if (error) {
    logger.warn("Error checking document:", error);
    return false;
  }

  return (count || 0) > 0;
}

/**
 * Load a single knowledge document into the database
 */
async function loadDocument(
  supabase: SupabaseClient,
  document: KnowledgeDocument,
  agentId: string,
  openaiApiKey: string
): Promise<void> {
  logger.info(`Loading document: ${document.title}`);

  // Check if already loaded
  if (await isDocumentLoaded(supabase, document.id)) {
    logger.info(`Document already loaded: ${document.id}`);
    return;
  }

  // Chunk the content
  const chunks = chunkText(document.content);
  logger.info(`Split into ${chunks.length} chunks`);

  // Process each chunk
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];

    // Generate embedding
    const embedding = await generateEmbedding(chunk, openaiApiKey);

    if (!embedding) {
      logger.warn(`Failed to generate embedding for chunk ${i + 1}/${chunks.length}`);
      continue;
    }

    // Insert into database
    const { error } = await supabase.from("knowledge").insert({
      agent_id: agentId,
      document_id: document.id,
      title: document.title,
      content: chunk,
      embedding,
      chunk_index: i,
      category: document.category,
      tags: document.tags,
      metadata: document.metadata,
    });

    if (error) {
      logger.error(`Error inserting chunk ${i + 1}:`, error);
    } else {
      logger.info(`Inserted chunk ${i + 1}/${chunks.length}`);
    }

    // Rate limiting - avoid hitting OpenAI rate limits
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  logger.info(`Finished loading document: ${document.title}`);
}

/**
 * Load all knowledge documents into the database
 */
export async function loadAllKnowledge(
  supabaseUrl: string,
  supabaseKey: string,
  agentId: string,
  openaiApiKey: string
): Promise<void> {
  const supabase = createClient(supabaseUrl, supabaseKey);

  logger.info(`Loading ${allKnowledgeDocuments.length} knowledge documents`);

  for (const document of allKnowledgeDocuments) {
    try {
      await loadDocument(supabase, document, agentId, openaiApiKey);
    } catch (error) {
      logger.error(`Error loading document ${document.id}:`, error);
    }
  }

  logger.info("Finished loading all knowledge documents");
}

/**
 * Clear all knowledge for an agent (useful for reloading)
 */
export async function clearKnowledge(
  supabaseUrl: string,
  supabaseKey: string,
  agentId: string
): Promise<void> {
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { error } = await supabase.from("knowledge").delete().eq("agent_id", agentId);

  if (error) {
    logger.error("Error clearing knowledge:", error);
    throw error;
  }

  logger.info("Cleared all knowledge for agent");
}

/**
 * Get knowledge statistics
 */
export async function getKnowledgeStats(
  supabaseUrl: string,
  supabaseKey: string,
  agentId: string
): Promise<{
  totalDocuments: number;
  totalChunks: number;
  categories: string[];
}> {
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Get total chunks
  const { count: totalChunks } = await supabase
    .from("knowledge")
    .select("id", { count: "exact", head: true })
    .eq("agent_id", agentId);

  // Get unique documents
  const { data: documents } = await supabase
    .from("knowledge")
    .select("document_id, category")
    .eq("agent_id", agentId);

  const uniqueDocuments = new Set(documents?.map((d) => d.document_id) || []);
  const categories = [...new Set(documents?.map((d) => d.category).filter(Boolean) || [])];

  return {
    totalDocuments: uniqueDocuments.size,
    totalChunks: totalChunks || 0,
    categories,
  };
}

export default {
  loadAllKnowledge,
  clearKnowledge,
  getKnowledgeStats,
};
