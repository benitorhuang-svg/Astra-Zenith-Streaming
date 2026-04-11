export type AgentCode = string;

export type AgentStatus =
    | 'NORMAL'
    | 'WARNING'
    | 'OFFLINE'
    | 'ACTIVE'
    | 'RUNNING'
    | 'IDLE'
    | 'SUCCESS'
    | 'WAIT'
    | 'BUSY'
    | 'ERROR';

export type AgentPath = string[];

export type AgentEventType =
    | 'text'
    | 'reasoning'
    | 'tool-call'
    | 'status'
    | 'telemetry'
    | 'system'
    | 'error';

export interface MissionMessage {
    agentCode: AgentCode;
    agentName: string;
    agentColor: string;
    agentImg: string;
    content: string;
    round: number;
    isStreaming?: boolean;
    isImage?: boolean;
    imageUrl?: string;
    path?: AgentPath;
    reasoning?: string;
    summary?: string;
    nodeName?: string;
}

export interface AZAgentEvent<TPayload = unknown> {
    id: string;
    type: AgentEventType;
    path: AgentPath;
    payload: TPayload;
    timestamp: number;
    agentCode?: AgentCode;
    round?: number;
    meta?: Record<string, unknown>;
}

export interface MissionRequest {
    topic: string;
    agents: AgentCode[];
    rounds: number;
    apiKey?: string;
    mode?: 'analysis' | 'final_summary' | 'workflow';
    tracePath?: AgentPath;
}

export interface SessionSnapshot {
    id: string;
    title: string;
    messageCount: number;
    tokenCount: number;
    compacted: boolean;
    updatedAt: number;
}

export interface TelemetrySnapshot {
    activeAgentCode: AgentCode | null;
    activeAgentCount: number;
    currentView: string;
    currentPasses: number;
    pollingCycles: number;
    queueDepth: number;
    tokenCount: number;
    tokenBudget: number;
    isCompacting: boolean;
    lastPath: AgentPath;
    logCount: number;
}

export interface MissionRuntime {
    requestId: string;
    mission: MissionRequest;
    session: SessionSnapshot;
    path: AgentPath;
    messages: MissionMessage[];
    events: AZAgentEvent[];
    auditTrail: string[];
    tokenEstimate: number;
    maxTokens: number;
    turnCount: number;
    maxTurns: number;
    retryCount: number;
    isCompacting: boolean;
}

export interface PipelineContext extends MissionRuntime {
    telemetry?: Partial<TelemetrySnapshot>;
    recordLog?: (message: string, type?: string) => void;
    recordTelemetry?: (key: string, value: unknown) => void;
    persistAuditTrail?: (trail: string[]) => void;
    abortSignal?: AbortSignal;
}

export function estimateTokenCount(input: string): number {
    const trimmed = input.trim();
    if (!trimmed) return 0;
    return Math.max(1, Math.ceil(trimmed.length / 4));
}

export function normalizeAgentPath(path?: Array<string | number | null | undefined> | string | null): AgentPath {
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

export function joinAgentPath(path: AgentPath, separator = ' › '): string {
    return path.filter(Boolean).join(separator);
}

export function createRequestId(prefix = 'AZ'): string {
    const randomSuffix =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
            ? crypto.randomUUID()
            : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

    return `${prefix}-${randomSuffix}`.toUpperCase();
}

export function createAgentEvent<TPayload = unknown>(
    type: AgentEventType,
    payload: TPayload,
    path: AgentPath,
    options: {
        agentCode?: AgentCode;
        round?: number;
        meta?: Record<string, unknown>;
        idPrefix?: string;
    } = {}
): AZAgentEvent<TPayload> {
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

