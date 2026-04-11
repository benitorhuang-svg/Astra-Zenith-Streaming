"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.estimateTokenCount = estimateTokenCount;
exports.normalizeAgentPath = normalizeAgentPath;
exports.joinAgentPath = joinAgentPath;
exports.createRequestId = createRequestId;
exports.createAgentEvent = createAgentEvent;
function estimateTokenCount(input) {
    const trimmed = input.trim();
    if (!trimmed)
        return 0;
    return Math.max(1, Math.ceil(trimmed.length / 4));
}
function normalizeAgentPath(path) {
    if (Array.isArray(path)) {
        return path
            .map(part => (part === null || part === undefined ? '' : String(part).trim()))
            .filter(Boolean);
    }
    if (typeof path === 'string') {
        return path
            .split('/')
            .map(part => part.trim())
            .filter(Boolean);
    }
    return [];
}
function joinAgentPath(path, separator = ' › ') {
    return path.filter(Boolean).join(separator);
}
function createRequestId(prefix = 'AZ') {
    const randomSuffix = typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    return `${prefix}-${randomSuffix}`.toUpperCase();
}
function createAgentEvent(type, payload, path, options = {}) {
    return {
        id: createRequestId(options.idPrefix ?? 'EVT'),
        type,
        path: normalizeAgentPath(path),
        payload,
        timestamp: Date.now(),
        agentCode: options.agentCode,
        round: options.round,
        meta: options.meta
    };
}
