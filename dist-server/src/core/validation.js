"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TelemetrySnapshotSchema = exports.SessionSnapshotSchema = exports.AgentEventSchema = exports.MissionMessageSchema = exports.MissionRequestSchema = void 0;
exports.validateMissionRequest = validateMissionRequest;
exports.validateMissionMessage = validateMissionMessage;
exports.validateAgentEvent = validateAgentEvent;
exports.validateSessionSnapshot = validateSessionSnapshot;
exports.validateTelemetrySnapshot = validateTelemetrySnapshot;
const zod_1 = require("zod");
const types_1 = require("./types");
// --- ATOMIC SCHEMAS ---
exports.MissionRequestSchema = zod_1.z.object({
    topic: zod_1.z.string().min(1, 'topic is required'),
    agents: zod_1.z.array(zod_1.z.string()),
    rounds: zod_1.z.number().int().positive('rounds must be a positive integer'),
    tracePath: zod_1.z.any().optional(),
    mode: zod_1.z.enum(['analysis', 'final_summary', 'workflow']).optional(),
    apiKey: zod_1.z.string().optional()
});
exports.MissionMessageSchema = zod_1.z.object({
    agentCode: zod_1.z.string().min(1, 'agentCode is required'),
    agentName: zod_1.z.string().min(1, 'agentName is required'),
    agentColor: zod_1.z.string().min(1, 'agentColor is required'),
    agentImg: zod_1.z.string().min(1, 'agentImg is required'),
    content: zod_1.z.string(),
    round: zod_1.z.number().min(0, 'round must be a non-negative number'),
    isStreaming: zod_1.z.boolean().optional(),
    isImage: zod_1.z.boolean().optional(),
    imageUrl: zod_1.z.string().optional(),
    path: zod_1.z.array(zod_1.z.string()).optional(),
    reasoning: zod_1.z.string().optional(),
    summary: zod_1.z.string().optional(),
    nodeName: zod_1.z.string().optional()
});
exports.AgentEventSchema = zod_1.z.object({
    id: zod_1.z.string().min(1, 'id is required'),
    type: zod_1.z.enum(['text', 'reasoning', 'tool-call', 'status', 'telemetry', 'system', 'error']),
    path: zod_1.z.array(zod_1.z.string()),
    timestamp: zod_1.z.number(),
    payload: zod_1.z.any().optional(),
    agentCode: zod_1.z.string().optional(),
    round: zod_1.z.number().optional(),
    meta: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).optional()
});
exports.SessionSnapshotSchema = zod_1.z.object({
    id: zod_1.z.string().min(1, 'id is required'),
    title: zod_1.z.string().min(1, 'title is required'),
    messageCount: zod_1.z.number(),
    tokenCount: zod_1.z.number(),
    compacted: zod_1.z.boolean().default(false),
    updatedAt: zod_1.z.number()
});
exports.TelemetrySnapshotSchema = zod_1.z.object({
    activeAgentCode: zod_1.z.string().nullable().default(null),
    activeAgentCount: zod_1.z.number(),
    currentView: zod_1.z.string().default('chat'),
    currentPasses: zod_1.z.number(),
    pollingCycles: zod_1.z.number(),
    queueDepth: zod_1.z.number().default(0),
    tokenCount: zod_1.z.number().default(0),
    tokenBudget: zod_1.z.number().default(0),
    isCompacting: zod_1.z.boolean().default(false),
    lastPath: zod_1.z.array(zod_1.z.string()).default([]),
    logCount: zod_1.z.number().default(0)
});
// --- VALIDATION WRAPPERS ---
function validateMissionRequest(input) {
    try {
        const data = exports.MissionRequestSchema.parse(input);
        return {
            ...data,
            topic: data.topic.trim(),
            apiKey: data.apiKey?.trim(),
            tracePath: (0, types_1.normalizeAgentPath)(data.tracePath)
        };
    }
    catch (err) {
        throw new Error(`INVALID_MISSION_REQUEST: ${err.errors?.[0]?.message || 'Validation failed'}`, { cause: err });
    }
}
function validateMissionMessage(input) {
    try {
        return exports.MissionMessageSchema.parse(input);
    }
    catch (err) {
        throw new Error(`INVALID_MISSION_MESSAGE: ${err.errors?.[0]?.message || 'Validation failed'}`, { cause: err });
    }
}
function validateAgentEvent(input) {
    try {
        return exports.AgentEventSchema.parse(input);
    }
    catch (err) {
        throw new Error(`INVALID_AGENT_EVENT: ${err.errors?.[0]?.message || 'Validation failed'}`, { cause: err });
    }
}
function validateSessionSnapshot(input) {
    try {
        return exports.SessionSnapshotSchema.parse(input);
    }
    catch (err) {
        throw new Error(`INVALID_SESSION_SNAPSHOT: ${err.errors?.[0]?.message || 'Validation failed'}`, { cause: err });
    }
}
function validateTelemetrySnapshot(input) {
    try {
        return exports.TelemetrySnapshotSchema.parse(input);
    }
    catch (err) {
        throw new Error(`INVALID_TELEMETRY_SNAPSHOT: ${err.errors?.[0]?.message || 'Validation failed'}`, { cause: err });
    }
}
