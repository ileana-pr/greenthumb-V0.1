/**
 * GreenThumb Chat Edge Function
 * Handles chat messages for the GreenThumb AI gardening assistant
 */

import { agentRuntime } from "./lib/agent-runtime.ts";
import type {
  SendMessageRequest,
  SendMessageResponse,
  GetMessagesResponse,
  HealthCheckResponse,
  ErrorResponse,
} from "./lib/types.ts";

// ============================================================================
// CORS Configuration
// ============================================================================

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-client-info, apikey",
  "Access-Control-Max-Age": "86400",
};

// ============================================================================
// Response Helpers
// ============================================================================

function jsonResponse<T>(data: T, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function errorResponse(message: string, status = 400, code?: string): Response {
  const error: ErrorResponse = {
    success: false,
    error: message,
    code,
  };
  return jsonResponse(error, status);
}

// ============================================================================
// Request Handlers
// ============================================================================

/**
 * Handle POST request - Send a message
 */
async function handleSendMessage(req: Request): Promise<Response> {
  try {
    const body = (await req.json()) as SendMessageRequest;

    // Validate required fields
    if (!body.roomId) {
      return errorResponse("roomId is required", 400, "MISSING_ROOM_ID");
    }
    if (!body.entityId) {
      return errorResponse("entityId is required", 400, "MISSING_ENTITY_ID");
    }
    if (!body.text || body.text.trim() === "") {
      return errorResponse("text is required", 400, "MISSING_TEXT");
    }

    console.log(`[GreenThumb] Processing message from ${body.entityId} in room ${body.roomId}`);

    // Process message through the agent runtime
    const message = await agentRuntime.handleMessage(body.roomId, body.entityId, {
      text: body.text,
      attachments: body.attachments,
    });

    const response: SendMessageResponse = {
      success: true,
      message: {
        id: message.id,
        roomId: message.roomId,
        entityId: message.entityId,
        agentId: message.agentId,
        content: message.content,
        createdAt: message.createdAt,
      },
      // Include polling hints for the client
      pollForResponse: false, // Response is synchronous now
      pollDuration: 30000,
      pollInterval: 1000,
    };

    console.log(`[GreenThumb] Message processed successfully`);

    return jsonResponse(response);
  } catch (error) {
    console.error("[GreenThumb] Error processing message:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return errorResponse(`Failed to process message: ${errorMessage}`, 500, "PROCESSING_ERROR");
  }
}

/**
 * Handle GET request - Get messages (for polling)
 */
async function handleGetMessages(req: Request): Promise<Response> {
  try {
    const url = new URL(req.url);
    const roomId = url.searchParams.get("roomId");
    const afterTimestamp = url.searchParams.get("afterTimestamp");
    const limitParam = url.searchParams.get("limit");

    // Validate required fields
    if (!roomId) {
      return errorResponse("roomId query parameter is required", 400, "MISSING_ROOM_ID");
    }

    const limit = limitParam ? parseInt(limitParam, 10) : 100;
    const timestamp = afterTimestamp ? parseInt(afterTimestamp, 10) : undefined;

    console.log(`[GreenThumb] Fetching messages for room ${roomId}, after ${timestamp || "all"}`);

    // Get messages from the agent runtime
    const messages = await agentRuntime.getMessages(roomId, timestamp, limit);

    // Get agent ID for determining if message is from agent
    const runtime = agentRuntime.getInstance();
    const agentId = runtime.getAgentId();

    const response: GetMessagesResponse = {
      success: true,
      messages: messages.map((msg) => ({
        id: msg.id!,
        entityId: msg.entityId,
        agentId: msg.agentId,
        content: msg.content,
        createdAt: msg.createdAt!,
        isAgent: msg.entityId === agentId,
      })),
      hasMore: messages.length === limit,
      lastTimestamp: messages.length > 0 ? messages[messages.length - 1].createdAt! : Date.now(),
    };

    return jsonResponse(response, 200);
  } catch (error) {
    console.error("[GreenThumb] Error fetching messages:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return errorResponse(`Failed to fetch messages: ${errorMessage}`, 500, "FETCH_ERROR");
  }
}

/**
 * Handle health check
 */
async function handleHealthCheck(): Promise<Response> {
  try {
    const health = await agentRuntime.healthCheck();

    const response: HealthCheckResponse = {
      status: "ok",
      agent: health.agent,
      timestamp: new Date().toISOString(),
      initialized: health.initialized,
    };

    return jsonResponse(response);
  } catch (error) {
    console.error("[GreenThumb] Health check failed:", error);

    const response: HealthCheckResponse = {
      status: "error",
      agent: "GreenThumb",
      timestamp: new Date().toISOString(),
      initialized: false,
    };

    return jsonResponse(response, 503);
  }
}

// ============================================================================
// Main Handler
// ============================================================================

Deno.serve(async (req: Request): Promise<Response> => {
  const url = new URL(req.url);
  const method = req.method;

  console.log(`[GreenThumb] ${method} ${url.pathname}`);

  // Handle CORS preflight
  if (method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  // Route requests
  try {
    // Health check endpoint
    if (url.pathname.endsWith("/health") && method === "GET") {
      return await handleHealthCheck();
    }

    // Main chat endpoint
    if (method === "POST") {
      return await handleSendMessage(req);
    }

    if (method === "GET") {
      return await handleGetMessages(req);
    }

    // Method not allowed
    return errorResponse(`Method ${method} not allowed`, 405, "METHOD_NOT_ALLOWED");
  } catch (error) {
    console.error("[GreenThumb] Unhandled error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return errorResponse(`Internal server error: ${errorMessage}`, 500, "INTERNAL_ERROR");
  }
});
