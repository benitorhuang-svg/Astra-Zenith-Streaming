import type { Content, Part } from '@google/genai';

/**
 * ASTRA ZENITH AGENT TYPES
 * Strictly aligned with @google/genai V2 Unified SDK.
 */

export type AgentStatus = 'IDLE' | 'BUSY' | 'ERROR' | 'SUCCESS' | 'WAIT';

export interface AgentPoolEntry {
    id: string;
    name: string;
    model: string;
    prompt_ref?: string;
    role?: string;
}

/**
 * 🛰️ UNIFIED_CONTENT_STRUCTURE (2026 SDK Native)
 * Extends the SDK Content type for internal tracking if needed.
 */
export interface StreamMessage {
    role?: 'user' | 'model' | 'assistant' | 'bot' | 'system';
    content?: string;
    parts?: Part[]; // Supports fileData, text, inlineData, etc.
}

export interface MissionRoutingResult {
    allowed: boolean;
    reason: string;
    sddModifier: string;
}

export { Content, Part };
