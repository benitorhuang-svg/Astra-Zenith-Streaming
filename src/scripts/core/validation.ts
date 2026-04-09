import type { AgentPath, AZAgentEvent, MissionMessage, MissionRequest, SessionSnapshot, TelemetrySnapshot } from './types';
import { normalizeAgentPath } from './types';

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
    return typeof value === 'string';
}

function isNumber(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value);
}

function isStringArray(value: unknown): value is string[] {
    return Array.isArray(value) && value.every(item => typeof item === 'string');
}

export function validateMissionRequest(input: unknown): MissionRequest {
    if (!isRecord(input)) {
        throw new Error('INVALID_MISSION_REQUEST: payload must be an object');
    }

    const topic = input.topic;
    const agents = input.agents;
    const rounds = isNumber(input.rounds) ? input.rounds : 0;

    if (!isString(topic) || !topic.trim()) {
        throw new Error('INVALID_MISSION_REQUEST: topic is required');
    }

    if (!Array.isArray(agents) || !agents.every(isString)) {
        throw new Error('INVALID_MISSION_REQUEST: agents must be a string array');
    }

    if (!rounds || rounds <= 0) {
        throw new Error('INVALID_MISSION_REQUEST: rounds must be a positive integer');
    }

    const tracePath = input.tracePath;
    const mode = input.mode;
    const apiKey = input.apiKey;

    if (mode !== undefined && mode !== 'analysis' && mode !== 'final_summary' && mode !== 'workflow') {
        throw new Error('INVALID_MISSION_REQUEST: invalid mode');
    }

    if (apiKey !== undefined && !isString(apiKey)) {
        throw new Error('INVALID_MISSION_REQUEST: apiKey must be a string');
    }

    return {
        topic: topic.trim(),
        agents,
        rounds: rounds as number,
        apiKey: apiKey?.trim() || undefined,
        mode: mode as any,
        tracePath: normalizeAgentPath(tracePath as AgentPath | string | undefined)
    };
}

export function validateMissionMessage(input: unknown): MissionMessage {
    if (!isRecord(input)) {
        throw new Error('INVALID_MISSION_MESSAGE: payload must be an object');
    }

    if (!isString(input.agentCode) || !input.agentCode.trim()) {
        throw new Error('INVALID_MISSION_MESSAGE: agentCode is required');
    }

    if (!isString(input.agentName) || !input.agentName.trim()) {
        throw new Error('INVALID_MISSION_MESSAGE: agentName is required');
    }

    if (!isString(input.agentColor) || !input.agentColor.trim()) {
        throw new Error('INVALID_MISSION_MESSAGE: agentColor is required');
    }

    if (!isString(input.agentImg) || !input.agentImg.trim()) {
        throw new Error('INVALID_MISSION_MESSAGE: agentImg is required');
    }

    if (!isString(input.content)) {
        throw new Error('INVALID_MISSION_MESSAGE: content must be a string');
    }

    if (!isNumber(input.round) || input.round < 0) {
        throw new Error('INVALID_MISSION_MESSAGE: round must be a non-negative number');
    }

    return {
        agentCode: input.agentCode,
        agentName: input.agentName,
        agentColor: input.agentColor,
        agentImg: input.agentImg,
        content: input.content,
        round: input.round,
        isStreaming: typeof input.isStreaming === 'boolean' ? input.isStreaming : undefined,
        isImage: typeof input.isImage === 'boolean' ? input.isImage : undefined,
        imageUrl: isString(input.imageUrl) ? input.imageUrl : undefined,
        path: isStringArray(input.path) ? input.path : undefined,
        reasoning: isString(input.reasoning) ? input.reasoning : undefined,
        summary: isString(input.summary) ? input.summary : undefined,
        nodeName: isString(input.nodeName) ? input.nodeName : undefined
    };
}

export function validateAgentEvent(input: unknown): AZAgentEvent {
    if (!isRecord(input)) {
        throw new Error('INVALID_AGENT_EVENT: payload must be an object');
    }

    if (!isString(input.id) || !input.id.trim()) {
        throw new Error('INVALID_AGENT_EVENT: id is required');
    }

    if (!isString(input.type) || !input.type.trim()) {
        throw new Error('INVALID_AGENT_EVENT: type is required');
    }

    if (!Array.isArray(input.path) || !input.path.every(isString)) {
        throw new Error('INVALID_AGENT_EVENT: path must be a string array');
    }

    if (!isNumber(input.timestamp)) {
        throw new Error('INVALID_AGENT_EVENT: timestamp is required');
    }

    return {
        id: input.id,
        type: input.type as AZAgentEvent['type'],
        path: input.path,
        payload: input.payload,
        timestamp: input.timestamp,
        agentCode: isString(input.agentCode) ? input.agentCode : undefined,
        round: isNumber(input.round) ? input.round : undefined,
        meta: isRecord(input.meta) ? input.meta : undefined
    };
}

export function validateSessionSnapshot(input: unknown): SessionSnapshot {
    if (!isRecord(input)) {
        throw new Error('INVALID_SESSION_SNAPSHOT: payload must be an object');
    }

    if (!isString(input.id) || !input.id.trim()) {
        throw new Error('INVALID_SESSION_SNAPSHOT: id is required');
    }

    if (!isString(input.title) || !input.title.trim()) {
        throw new Error('INVALID_SESSION_SNAPSHOT: title is required');
    }

    if (!isNumber(input.messageCount) || !isNumber(input.tokenCount) || !isNumber(input.updatedAt)) {
        throw new Error('INVALID_SESSION_SNAPSHOT: numeric fields missing');
    }

    return {
        id: input.id,
        title: input.title,
        messageCount: input.messageCount,
        tokenCount: input.tokenCount,
        compacted: Boolean(input.compacted),
        updatedAt: input.updatedAt
    };
}

export function validateTelemetrySnapshot(input: unknown): TelemetrySnapshot {
    if (!isRecord(input)) {
        throw new Error('INVALID_TELEMETRY_SNAPSHOT: payload must be an object');
    }

    if (!isNumber(input.activeAgentCount) || !isNumber(input.currentPasses) || !isNumber(input.pollingCycles)) {
        throw new Error('INVALID_TELEMETRY_SNAPSHOT: count fields missing');
    }

    return {
        activeAgentCode: isString(input.activeAgentCode) ? input.activeAgentCode : null,
        activeAgentCount: input.activeAgentCount,
        currentView: isString(input.currentView) ? input.currentView : 'chat',
        currentPasses: input.currentPasses,
        pollingCycles: input.pollingCycles,
        queueDepth: isNumber(input.queueDepth) ? input.queueDepth : 0,
        tokenCount: isNumber(input.tokenCount) ? input.tokenCount : 0,
        tokenBudget: isNumber(input.tokenBudget) ? input.tokenBudget : 0,
        isCompacting: Boolean(input.isCompacting),
        lastPath: Array.isArray(input.lastPath) ? input.lastPath.filter(isString) : [],
        logCount: isNumber(input.logCount) ? input.logCount : 0
    };
}

