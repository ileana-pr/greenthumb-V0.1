/**
 * GreenThumb API Client
 * Communicates with the Supabase Edge Function for chat functionality
 */

import type { UUID } from "@elizaos/core";

// ============================================================================
// Types
// ============================================================================

export interface MessageContent {
  text?: string;
  attachments?: Array<{
    type: string;
    url?: string;
    data?: string;
  }>;
}

export interface Message {
  id: UUID;
  entityId: UUID;
  agentId: UUID;
  content: MessageContent;
  createdAt: number;
  isAgent: boolean;
}

export interface SendMessageResponse {
  success: boolean;
  message?: {
    id: UUID;
    roomId: UUID;
    entityId: UUID;
    agentId: UUID;
    content: MessageContent;
    createdAt: number;
  };
  error?: string;
  pollForResponse?: boolean;
  pollDuration?: number;
  pollInterval?: number;
}

export interface GetMessagesResponse {
  success: boolean;
  messages: Message[];
  hasMore: boolean;
  lastTimestamp: number;
}

export interface HealthCheckResponse {
  status: "ok" | "error";
  agent: string;
  timestamp: string;
  initialized: boolean;
}

// ============================================================================
// Configuration
// ============================================================================

const DEFAULT_CONFIG = {
  pollInterval: 1000, // 1 second
  pollDuration: 30000, // 30 seconds max
  requestTimeout: 30000, // 30 seconds
};

// ============================================================================
// Helper Functions
// ============================================================================

function generateUUID(): UUID {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  }) as UUID;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================================
// GreenThumb API Client
// ============================================================================

export class GreenthumbAPI {
  private baseUrl: string;
  private roomId: UUID;
  private entityId: UUID;

  constructor(baseUrl?: string) {
    // Get the base URL from environment or use default
    this.baseUrl = baseUrl || import.meta.env.VITE_SUPABASE_EDGE_URL || "";

    if (!this.baseUrl) {
      console.warn(
        "[GreenthumbAPI] No VITE_SUPABASE_EDGE_URL configured, using fallback URL"
      );
      // Fallback for local development
      this.baseUrl = "http://127.0.0.1:54321/functions/v1";
    }

    // Generate consistent IDs for this session
    this.roomId = this.getOrCreateSessionId("greenthumb_room_id");
    this.entityId = this.getOrCreateSessionId("greenthumb_entity_id");

    console.log("[GreenthumbAPI] Initialized", {
      baseUrl: this.baseUrl,
      roomId: this.roomId,
      entityId: this.entityId,
    });
  }

  /**
   * Get or create a session ID stored in sessionStorage
   */
  private getOrCreateSessionId(key: string): UUID {
    const stored = sessionStorage.getItem(key);
    if (stored) {
      return stored as UUID;
    }

    const newId = generateUUID();
    sessionStorage.setItem(key, newId);
    return newId;
  }

  /**
   * Get the current room ID
   */
  public getRoomId(): UUID {
    return this.roomId;
  }

  /**
   * Get the current entity ID
   */
  public getEntityId(): UUID {
    return this.entityId;
  }

  /**
   * Send a message to the GreenThumb agent
   */
  async sendMessage(text: string): Promise<{ text: string; success: boolean }> {
    console.log("[GreenthumbAPI] Sending message:", text);

    try {
      const response = await fetch(`${this.baseUrl}/greenthumb-chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          roomId: this.roomId,
          entityId: this.entityId,
          text,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("[GreenthumbAPI] Error response:", errorData);
        throw new Error(errorData.error || `HTTP error ${response.status}`);
      }

      const data = (await response.json()) as SendMessageResponse;

      if (!data.success) {
        throw new Error(data.error || "Unknown error");
      }

      // The response now includes the agent's message directly
      const agentText =
        data.message?.content?.text ||
        "I apologize, I couldn't generate a response.";

      console.log("[GreenthumbAPI] Received response:", agentText);

      return {
        text: agentText,
        success: true,
      };
    } catch (error) {
      console.error("[GreenthumbAPI] Send message error:", error);
      return {
        text: "I'm having trouble connecting right now. Please try again.",
        success: false,
      };
    }
  }

  /**
   * Poll for messages (used if polling is needed for async responses)
   */
  async pollMessages(afterTimestamp: number): Promise<Message[]> {
    try {
      const url = new URL(`${this.baseUrl}/greenthumb-chat`);
      url.searchParams.set("roomId", this.roomId);
      url.searchParams.set("afterTimestamp", afterTimestamp.toString());
      url.searchParams.set("limit", "50");

      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        console.error("[GreenthumbAPI] Poll error:", response.status);
        return [];
      }

      const data = (await response.json()) as GetMessagesResponse;

      if (!data.success) {
        return [];
      }

      return data.messages;
    } catch (error) {
      console.error("[GreenthumbAPI] Poll messages error:", error);
      return [];
    }
  }

  /**
   * Poll for agent response after sending a message
   */
  async pollForResponse(
    startTime: number,
    options?: { pollInterval?: number; pollDuration?: number }
  ): Promise<Message | null> {
    const pollInterval = options?.pollInterval || DEFAULT_CONFIG.pollInterval;
    const pollDuration = options?.pollDuration || DEFAULT_CONFIG.pollDuration;

    console.log("[GreenthumbAPI] Starting poll for response", {
      startTime,
      pollInterval,
      pollDuration,
    });

    const endTime = startTime + pollDuration;

    while (Date.now() < endTime) {
      const messages = await this.pollMessages(startTime);

      // Find an agent message
      const agentMessage = messages.find((m) => m.isAgent);

      if (agentMessage) {
        console.log("[GreenthumbAPI] Found agent response:", agentMessage);
        return agentMessage;
      }

      // Wait before next poll
      await sleep(pollInterval);
    }

    console.log("[GreenthumbAPI] Poll timeout - no agent response found");
    return null;
  }

  /**
   * Check if the edge function is healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/greenthumb-chat/health`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        console.warn("[GreenthumbAPI] Health check failed:", response.status);
        return false;
      }

      const data = (await response.json()) as HealthCheckResponse;
      console.log("[GreenthumbAPI] Health check result:", data);

      return data.status === "ok";
    } catch (error) {
      console.error("[GreenthumbAPI] Health check error:", error);
      return false;
    }
  }

  /**
   * Get all messages for the current room
   */
  async getMessages(limit: number = 100): Promise<Message[]> {
    try {
      const url = new URL(`${this.baseUrl}/greenthumb-chat`);
      url.searchParams.set("roomId", this.roomId);
      url.searchParams.set("limit", limit.toString());

      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        console.error("[GreenthumbAPI] Get messages error:", response.status);
        return [];
      }

      const data = (await response.json()) as GetMessagesResponse;

      if (!data.success) {
        return [];
      }

      return data.messages;
    } catch (error) {
      console.error("[GreenthumbAPI] Get messages error:", error);
      return [];
    }
  }

  /**
   * Reset the session (new room and entity IDs)
   */
  resetSession(): void {
    sessionStorage.removeItem("greenthumb_room_id");
    sessionStorage.removeItem("greenthumb_entity_id");
    this.roomId = this.getOrCreateSessionId("greenthumb_room_id");
    this.entityId = this.getOrCreateSessionId("greenthumb_entity_id");
    console.log("[GreenthumbAPI] Session reset", {
      roomId: this.roomId,
      entityId: this.entityId,
    });
  }
}

// Export a singleton instance creator
let apiInstance: GreenthumbAPI | null = null;

export function getGreenthumbAPI(): GreenthumbAPI {
  if (!apiInstance) {
    apiInstance = new GreenthumbAPI();
  }
  return apiInstance;
}

export default GreenthumbAPI;
