/**
 * Core Types for GreenThumb Edge Function
 */

/**
 * UUID type alias for clarity
 */
export type UUID = string;

/**
 * Message content structure
 */
export interface MessageContent {
  text?: string;
  attachments?: MessageAttachment[];
  source?: string;
  data?: Record<string, unknown>;
}

/**
 * Message attachment
 */
export interface MessageAttachment {
  type: string;
  url?: string;
  data?: string;
  mimeType?: string;
  name?: string;
}

/**
 * Memory (message) record
 */
export interface Memory {
  id?: UUID;
  roomId: UUID;
  entityId: UUID;
  agentId: UUID;
  content: MessageContent;
  createdAt?: number;
}

/**
 * API Request for sending a message
 */
export interface SendMessageRequest {
  roomId: string;
  entityId: string;
  text: string;
  attachments?: MessageAttachment[];
}

/**
 * API Response for sending a message
 */
export interface SendMessageResponse {
  success: boolean;
  message?: Memory;
  error?: string;
  pollForResponse?: boolean;
  pollDuration?: number;
  pollInterval?: number;
}

/**
 * API Response for getting messages
 */
export interface GetMessagesResponse {
  success: boolean;
  messages: Array<{
    id: UUID;
    entityId: UUID;
    agentId: UUID;
    content: MessageContent;
    createdAt: number;
    isAgent: boolean;
  }>;
  hasMore: boolean;
  lastTimestamp: number;
}

/**
 * Health check response
 */
export interface HealthCheckResponse {
  status: "ok" | "error";
  agent: string;
  timestamp: string;
  initialized: boolean;
}

/**
 * Error response
 */
export interface ErrorResponse {
  success: false;
  error: string;
  code?: string;
}
