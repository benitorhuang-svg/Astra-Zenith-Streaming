import { z } from 'zod';
import type { AgentPath, AZAgentEvent, MissionMessage, MissionRequest, SessionSnapshot, TelemetrySnapshot } from './types';
import { normalizeAgentPath } from './types';

// --- ATOMIC SCHEMAS ---

export const MissionRequestSchema = z.object({
    topic: z.string().min(1, 'topic is required'),
    agents: z.array(z.string()),
    rounds: z.number().int().positive('rounds must be a positive integer'),
    tracePath: z.any().optional(),
    mode: z.enum(['analysis', 'final_summary', 'workflow']).optional(),
    apiKey: z.string().optional()
});

export const MissionMessageSchema = z.object({
    agentCode: z.string().min(1, 'agentCode is required'),
    agentName: z.string().min(1, 'agentName is required'),
    agentColor: z.string().min(1, 'agentColor is required'),
    agentImg: z.string().min(1, 'agentImg is required'),
    content: z.string(),
    round: z.number().min(0, 'round must be a non-negative number'),
    isStreaming: z.boolean().optional(),
    isImage: z.boolean().optional(),
    imageUrl: z.string().optional(),
    path: z.array(z.string()).optional(),
    reasoning: z.string().optional(),
    summary: z.string().optional(),
    nodeName: z.string().optional()
});

export const AgentEventSchema = z.object({
    id: z.string().min(1, 'id is required'),
    type: z.enum(['text', 'reasoning', 'tool-call', 'status', 'telemetry', 'system', 'error'] as const),
    path: z.array(z.string()),
    timestamp: z.number(),
    payload: z.any().optional(),
    agentCode: z.string().optional(),
    round: z.number().optional(),
    meta: z.record(z.string(), z.any()).optional()
});

export const SessionSnapshotSchema = z.object({
    id: z.string().min(1, 'id is required'),
    title: z.string().min(1, 'title is required'),
    messageCount: z.number(),
    tokenCount: z.number(),
    compacted: z.boolean().default(false),
    updatedAt: z.number()
});

export const TelemetrySnapshotSchema = z.object({
    activeAgentCode: z.string().nullable().default(null),
    activeAgentCount: z.number(),
    currentView: z.string().default('chat'),
    currentPasses: z.number(),
    pollingCycles: z.number(),
    queueDepth: z.number().default(0),
    tokenCount: z.number().default(0),
    tokenBudget: z.number().default(0),
    isCompacting: z.boolean().default(false),
    lastPath: z.array(z.string()).default([]),
    logCount: z.number().default(0)
});

// --- VALIDATION WRAPPERS ---

export function validateMissionRequest(input: unknown): MissionRequest {
    try {
        const data = MissionRequestSchema.parse(input);
        return {
            ...data,
            topic: data.topic.trim(),
            apiKey: data.apiKey?.trim(),
            tracePath: normalizeAgentPath(data.tracePath as AgentPath | string | undefined)
        } as MissionRequest;
    } catch (err: any) {
        throw new Error(`INVALID_MISSION_REQUEST: ${err.errors?.[0]?.message || 'Validation failed'}`, { cause: err });
    }
}

export function validateMissionMessage(input: unknown): MissionMessage {
    try {
        return MissionMessageSchema.parse(input) as MissionMessage;
    } catch (err: any) {
        throw new Error(`INVALID_MISSION_MESSAGE: ${err.errors?.[0]?.message || 'Validation failed'}`, { cause: err });
    }
}

export function validateAgentEvent(input: unknown): AZAgentEvent {
    try {
        return AgentEventSchema.parse(input) as AZAgentEvent;
    } catch (err: any) {
        throw new Error(`INVALID_AGENT_EVENT: ${err.errors?.[0]?.message || 'Validation failed'}`, { cause: err });
    }
}

export function validateSessionSnapshot(input: unknown): SessionSnapshot {
    try {
        return SessionSnapshotSchema.parse(input) as SessionSnapshot;
    } catch (err: any) {
        throw new Error(`INVALID_SESSION_SNAPSHOT: ${err.errors?.[0]?.message || 'Validation failed'}`, { cause: err });
    }
}

export function validateTelemetrySnapshot(input: unknown): TelemetrySnapshot {
    try {
        return TelemetrySnapshotSchema.parse(input) as TelemetrySnapshot;
    } catch (err: any) {
        throw new Error(`INVALID_TELEMETRY_SNAPSHOT: ${err.errors?.[0]?.message || 'Validation failed'}`, { cause: err });
    }
}

