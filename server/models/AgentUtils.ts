import { MODEL_FALLBACKS } from '../core/config';

/**
 * 🚀 FALLBACK TARGETS (2026 Fleet)
 */
const LEADER_FALLBACK_MODELS = [
    'gemini-3.1-pro-preview',
    'gemini-3-flash-preview',
    'gemma-4-31b-it'
];

const WORKER_FALLBACK_MODELS = [
    'gemini-3.1-flash-lite-preview',
    'gemini-3-flash-preview',
    'gemma-4-26b-a4b-it'
];

/**
 * 🛠️ AGENT UTILITIES
 * Logic for error handling, fallback detection, and status parsing.
 */

export function dedupeModels(models: Array<string | undefined | null>): string[] {
    return Array.from(new Set(models.filter((model): model is string => typeof model === 'string' && model.length > 0)));
}

export function errorText(error: unknown): string {
    if (error instanceof Error) return error.message;
    if (typeof error === 'object' && error !== null) {
        const maybeError = error as { message?: unknown; error?: { message?: unknown } };
        if (typeof maybeError.message === 'string') return maybeError.message;
        if (maybeError.error && typeof maybeError.error.message === 'string') return maybeError.error.message;
        try {
            return JSON.stringify(error);
        } catch {
            return String(error);
        }
    }
    return String(error);
}

export function extractStatusCode(message: string): number | undefined {
    const patterns = [
        /"code"\s*:\s*(\d{3})/i,
        /\bHTTP_STATUS_(\d{3})\b/i,
        /\bSTATUS_(\d{3})\b/i,
        /\bcode\s*[:=]\s*(\d{3})\b/i,
    ];

    for (const pattern of patterns) {
        const match = message.match(pattern);
        if (match) return Number(match[1]);
    }

    return undefined;
}

export function shouldFallback(message: string): boolean {
    const status = extractStatusCode(message);
    if (status === 400 || status === 401) return false;
    if (status && [403, 404, 408, 409, 429, 500, 502, 503, 504].includes(status)) return true;
    return /quota|resource_exhausted|not found|not supported|unavailable|deadline exceeded|too many requests|rate limit|permission denied|temporarily unavailable/i.test(message);
}

export function isRetryable(message: string): boolean {
    const status = extractStatusCode(message);
    // Transient server errors (500, 502, 503, 504) and rate limits (429) are retryable
    if (status && [429, 500, 502, 503, 504].includes(status)) return true;
    return /quota|resource_exhausted|unavailable|deadline exceeded|too many requests|rate limit|temporarily unavailable/i.test(message);
}

export function buildCandidateModels(agentId: string, primaryModel: string): string[] {
    const roleFallbacks = agentId === 'A1' || agentId === 'A6' ? LEADER_FALLBACK_MODELS : WORKER_FALLBACK_MODELS;
    return dedupeModels([primaryModel, ...roleFallbacks, ...MODEL_FALLBACKS]);
}

