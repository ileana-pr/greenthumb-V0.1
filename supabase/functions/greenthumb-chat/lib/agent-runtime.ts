/**
 * Serverless AgentRuntime Manager for Supabase Edge Functions
 * Adapted from Next.js pattern for Deno runtime
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { UUID } from "./types.ts";
import { character } from "./character.ts";

// Import Trefle integration
import { initializeTrefleClient, isClientInitialized } from "../trefle/index.ts";
import { getPlantContext } from "../providers/plant-context.ts";
import { shouldTriggerPlantInfo, getPlantInfo } from "../actions/reply-with-plant-info.ts";

// ============================================================================
// Types
// ============================================================================

interface MessageContent {
  text?: string;
  attachments?: Array<{
    type: string;
    url?: string;
    data?: string;
  }>;
}

interface Memory {
  id?: UUID;
  roomId: UUID;
  entityId: UUID;
  agentId: UUID;
  content: MessageContent;
  createdAt?: number;
}

interface RuntimeConfig {
  agentId: UUID;
  character: typeof character;
  supabaseUrl: string;
  supabaseKey: string;
  openaiApiKey: string;
  trefleToken?: string;
}

// ============================================================================
// Global State for Serverless Warm Container Reuse
// ============================================================================

interface GlobalRuntimeState {
  __greenthumbRuntime?: AgentRuntimeManager | null;
  __runtimeInitialized?: boolean;
}

// Deno global state
const globalState = globalThis as unknown as GlobalRuntimeState;
if (typeof globalState.__runtimeInitialized === "undefined") {
  globalState.__runtimeInitialized = false;
}

// ============================================================================
// Logger
// ============================================================================

const logger = {
  info: (message: string, ...args: unknown[]) => console.log(`[GreenThumb] ${message}`, ...args),
  warn: (message: string, ...args: unknown[]) => console.warn(`[GreenThumb] ${message}`, ...args),
  error: (message: string, ...args: unknown[]) => console.error(`[GreenThumb] ${message}`, ...args),
  debug: (message: string, ...args: unknown[]) => console.debug(`[GreenThumb] ${message}`, ...args),
};

// ============================================================================
// AgentRuntime Manager
// ============================================================================

export class AgentRuntimeManager {
  private static instance: AgentRuntimeManager;

  public agentId: UUID;
  private supabase: SupabaseClient;
  private openaiApiKey: string;
  private trefleToken?: string;
  private characterConfig: typeof character;
  private initializationPromise: Promise<void> | null = null;
  private isInitialized = false;

  private constructor(config: RuntimeConfig) {
    this.agentId = config.agentId;
    this.characterConfig = config.character;
    this.openaiApiKey = config.openaiApiKey;
    this.trefleToken = config.trefleToken;

    // Initialize Supabase client
    this.supabase = createClient(config.supabaseUrl, config.supabaseKey);

    logger.info("AgentRuntimeManager instance created");
  }

  /**
   * Get or create the singleton instance
   */
  public static getInstance(): AgentRuntimeManager {
    // Check global state first (warm container reuse)
    if (globalState.__greenthumbRuntime) {
      return globalState.__greenthumbRuntime;
    }

    if (!AgentRuntimeManager.instance) {
      const config = AgentRuntimeManager.getConfigFromEnv();
      AgentRuntimeManager.instance = new AgentRuntimeManager(config);
      globalState.__greenthumbRuntime = AgentRuntimeManager.instance;
    }

    return AgentRuntimeManager.instance;
  }

  /**
   * Get configuration from environment variables
   */
  private static getConfigFromEnv(): RuntimeConfig {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY");
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    const trefleToken = Deno.env.get("TREFLE_TOKEN");

    if (!supabaseUrl) {
      throw new Error("SUPABASE_URL environment variable is required");
    }
    if (!supabaseKey) {
      throw new Error("SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY environment variable is required");
    }
    if (!openaiApiKey) {
      throw new Error("OPENAI_API_KEY environment variable is required");
    }

    // Use a fixed agent ID for consistency
    const agentId = "7b13fa42-026d-06c3-9a41-891fe15757f9" as UUID;

    return {
      agentId,
      character,
      supabaseUrl,
      supabaseKey,
      openaiApiKey,
      trefleToken,
    };
  }

  /**
   * Initialize the runtime (ensures database tables exist, etc.)
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this.doInitialize();

    try {
      await this.initializationPromise;
      this.isInitialized = true;
      globalState.__runtimeInitialized = true;
    } catch (error) {
      this.initializationPromise = null;
      throw error;
    }
  }

  private async doInitialize(): Promise<void> {
    logger.info("Initializing runtime...");

    // Initialize Trefle client if token is available
    if (this.trefleToken) {
      try {
        initializeTrefleClient(this.trefleToken);
        logger.info("Trefle API client initialized successfully");
      } catch (error) {
        logger.warn("Failed to initialize Trefle client:", error);
      }
    } else {
      logger.warn("TREFLE_TOKEN not provided - plant lookup features will be disabled");
    }

    // Ensure agent exists in database
    await this.ensureAgentExists();

    logger.info("Runtime initialized successfully");
  }

  /**
   * Ensure the agent record exists in the database
   */
  private async ensureAgentExists(): Promise<void> {
    const { data: existingAgent, error: selectError } = await this.supabase
      .from("agents")
      .select("id")
      .eq("id", this.agentId)
      .single();

    if (selectError && selectError.code !== "PGRST116") {
      // PGRST116 = no rows returned
      logger.error("Error checking for agent:", selectError);
    }

    if (!existingAgent) {
      const { error: insertError } = await this.supabase.from("agents").insert({
        id: this.agentId,
        name: this.characterConfig.name,
        system_prompt: this.characterConfig.system,
        bio: this.characterConfig.bio,
        created_at: new Date().toISOString(),
      });

      if (insertError) {
        // Ignore duplicate key errors (race condition)
        if (!insertError.message.includes("duplicate")) {
          logger.error("Error creating agent:", insertError);
        }
      } else {
        logger.info("Created agent record:", this.agentId);
      }
    }
  }

  /**
   * Handle an incoming message and generate a response
   */
  public async handleMessage(
    roomId: string,
    entityId: string,
    content: MessageContent
  ): Promise<Memory> {
    await this.initialize();

    const roomUuid = roomId as UUID;
    const entityUuid = entityId as UUID;
    const messageText = content.text || "";

    logger.info(`Processing message from ${entityId} in room ${roomId}`);

    // Save user message to database
    const userMessage: Memory = {
      roomId: roomUuid,
      entityId: entityUuid,
      agentId: this.agentId,
      content: {
        text: messageText,
        attachments: content.attachments,
      },
      createdAt: Date.now(),
    };

    await this.saveMemory(userMessage);

    // Generate agent response using OpenAI
    const agentResponse = await this.generateResponse(messageText, roomUuid);

    // Save agent response to database
    const agentMessage: Memory = {
      roomId: roomUuid,
      entityId: this.agentId, // Agent is the sender
      agentId: this.agentId,
      content: {
        text: agentResponse,
      },
      createdAt: Date.now(),
    };

    await this.saveMemory(agentMessage);

    return agentMessage;
  }

  /**
   * Generate a response using OpenAI
   */
  private async generateResponse(userMessage: string, roomId: UUID): Promise<string> {
    // Check if this is a plant info request that should use the action
    if (isClientInitialized() && shouldTriggerPlantInfo(userMessage)) {
      logger.info("Plant info trigger detected, using plant info action");
      try {
        const plantInfoResult = await getPlantInfo(userMessage);
        if (plantInfoResult.triggered && plantInfoResult.text) {
          // Return the plant info directly if we got a good result
          return plantInfoResult.text;
        }
      } catch (error) {
        logger.warn("Plant info action failed, falling back to regular response:", error);
      }
    }

    // Get conversation history
    const history = await this.getConversationHistory(roomId, 10);

    // Get relevant knowledge from database
    const knowledge = await this.searchKnowledge(userMessage);

    // Get plant context from Trefle API
    let plantContext = "";
    if (isClientInitialized()) {
      try {
        const historyTexts = history.map((m) => ({ text: m.content.text || "" }));
        const plantContextResult = await getPlantContext(userMessage, historyTexts);
        if (plantContextResult.text) {
          plantContext = plantContextResult.text;
          logger.info(`Plant context provided for ${plantContextResult.plantCount} plants`);
        }
      } catch (error) {
        logger.warn("Failed to get plant context:", error);
      }
    }

    // Build messages for OpenAI
    const messages = this.buildOpenAIMessages(userMessage, history, knowledge, plantContext);

    // Call OpenAI API
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.openaiApiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-5-nano",
        messages,
        max_tokens: 1024,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error("OpenAI API error:", errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || "I apologize, I couldn't generate a response.";
  }

  /**
   * Build messages array for OpenAI API
   */
  private buildOpenAIMessages(
    userMessage: string,
    history: Memory[],
    knowledge: string,
    plantContext: string = ""
  ): Array<{ role: string; content: string }> {
    const messages: Array<{ role: string; content: string }> = [];

    // System message with character, knowledge, and plant context
    let systemPrompt = this.characterConfig.system || "";

    if (knowledge) {
      systemPrompt += `\n\n## Relevant Knowledge\n${knowledge}`;
    }

    if (plantContext) {
      systemPrompt += `\n\n## Plant Information from Trefle Botanical Database\n${plantContext}`;
    }

    messages.push({
      role: "system",
      content: systemPrompt,
    });

    // Add conversation history
    for (const mem of history) {
      const role = mem.entityId === this.agentId ? "assistant" : "user";
      messages.push({
        role,
        content: mem.content.text || "",
      });
    }

    // Add current user message
    messages.push({
      role: "user",
      content: userMessage,
    });

    return messages;
  }

  /**
   * Search knowledge base for relevant context
   */
  private async searchKnowledge(query: string): Promise<string> {
    // First, generate embedding for the query
    const embedding = await this.generateEmbedding(query);

    if (!embedding) {
      return "";
    }

    // Search knowledge table using vector similarity
    const { data: results, error } = await this.supabase.rpc("match_knowledge", {
      query_embedding: embedding,
      match_threshold: 0.7,
      match_count: 3,
    });

    if (error) {
      logger.warn("Knowledge search error:", error);
      return "";
    }

    if (!results || results.length === 0) {
      return "";
    }

    // Format results as context
    return results
      .map((r: { content: string; title?: string }) => {
        const title = r.title ? `### ${r.title}\n` : "";
        return `${title}${r.content}`;
      })
      .join("\n\n---\n\n");
  }

  /**
   * Generate embedding using OpenAI
   */
  private async generateEmbedding(text: string): Promise<number[] | null> {
    try {
      const response = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.openaiApiKey}`,
        },
        body: JSON.stringify({
          model: "text-embedding-ada-002",
          input: text,
        }),
      });

      if (!response.ok) {
        logger.error("Embedding API error:", response.status);
        return null;
      }

      const data = await response.json();
      return data.data[0]?.embedding || null;
    } catch (error) {
      logger.error("Embedding generation error:", error);
      return null;
    }
  }

  /**
   * Get conversation history for a room
   */
  private async getConversationHistory(roomId: UUID, limit: number): Promise<Memory[]> {
    const { data, error } = await this.supabase
      .from("memories")
      .select("*")
      .eq("room_id", roomId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      logger.warn("Error fetching conversation history:", error);
      return [];
    }

    // Map database format to Memory format and reverse to chronological order
    return (data || [])
      .map((row) => ({
        id: row.id,
        roomId: row.room_id,
        entityId: row.entity_id,
        agentId: row.agent_id,
        content: row.content,
        createdAt: new Date(row.created_at).getTime(),
      }))
      .reverse();
  }

  /**
   * Save a memory to the database
   */
  private async saveMemory(memory: Memory): Promise<void> {
    const { error } = await this.supabase.from("memories").insert({
      room_id: memory.roomId,
      entity_id: memory.entityId,
      agent_id: memory.agentId,
      content: memory.content,
      created_at: new Date(memory.createdAt || Date.now()).toISOString(),
    });

    if (error) {
      logger.error("Error saving memory:", error);
      throw error;
    }
  }

  /**
   * Get messages for a room (for polling)
   */
  public async getMessages(roomId: string, afterTimestamp?: number, limit = 100): Promise<Memory[]> {
    await this.initialize();

    let query = this.supabase
      .from("memories")
      .select("*")
      .eq("room_id", roomId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (afterTimestamp) {
      const afterDate = new Date(afterTimestamp).toISOString();
      query = query.gt("created_at", afterDate);
    }

    const { data, error } = await query;

    if (error) {
      logger.error("Error fetching messages:", error);
      return [];
    }

    return (data || []).map((row) => ({
      id: row.id,
      roomId: row.room_id,
      entityId: row.entity_id,
      agentId: row.agent_id,
      content: row.content,
      createdAt: new Date(row.created_at).getTime(),
    }));
  }

  /**
   * Health check
   */
  public async healthCheck(): Promise<{ status: string; agent: string; initialized: boolean }> {
    return {
      status: "ok",
      agent: this.characterConfig.name,
      initialized: this.isInitialized,
    };
  }

  /**
   * Get the Supabase client (for advanced operations)
   */
  public getSupabaseClient(): SupabaseClient {
    return this.supabase;
  }

  /**
   * Get the agent ID
   */
  public getAgentId(): UUID {
    return this.agentId;
  }
}

// Export singleton getter
export const agentRuntime = {
  getInstance: () => AgentRuntimeManager.getInstance(),
  handleMessage: async (roomId: string, entityId: string, content: MessageContent) =>
    AgentRuntimeManager.getInstance().handleMessage(roomId, entityId, content),
  getMessages: async (roomId: string, afterTimestamp?: number, limit?: number) =>
    AgentRuntimeManager.getInstance().getMessages(roomId, afterTimestamp, limit),
  healthCheck: async () => AgentRuntimeManager.getInstance().healthCheck(),
};

export default agentRuntime;
