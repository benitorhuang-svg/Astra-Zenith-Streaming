import type { AgentPath } from '../../core/types';

/**
 * PortalTypes — Architectural Decoupling
 * Breaks circular dependencies between Portal, Logic Handlers, and UI Fragments.
 */

export type PortalView = 'chat' | 'decision-tree' | 'archive' | 'logs' | 'table';
export type PortalTopology = 'linear' | 'orbital' | 'custom';

export const DIRTY_SIDEBAR = 1 << 0;
export const DIRTY_CONTENT = 1 << 1;
export const DIRTY_WELCOME = 1 << 2;
export const DIRTY_ALL = DIRTY_SIDEBAR | DIRTY_CONTENT | DIRTY_WELCOME;

export interface LogEntry {
    message: string;
    type: string;
    timestamp: string;
    path?: string[];
}

export interface ChatMessage {
    agentCode: string;
    agentName: string;
    agentColor: string;
    agentImg: string;
    content: string;
    round: number;
    isStreaming: boolean; // Keep required for UI stability
    nodeName?: string;
    path?: AgentPath;
    reasoning?: string;
    summary?: string;
    isImage?: boolean;
    imageUrl?: string;
}

export interface PortalExecutionTask {
    agentCode: string;
    round: number;
    focus: string;
    nodeName?: string;
}

export interface PortalWorkflowController {
    n8nFlow: any | null;
    handleRunFlow: () => Promise<void>;
    handleAddNode: () => void;
    addSuccessorNode: (fromNodeName: string) => void;
    importFlow: (json: string) => Promise<void>;
    handleVisualize: (prompt: string) => Promise<void>;
}

export interface PortalAuditRecord {
    id: string;
    timestamp: string;
    system: string;
    module: string;
    event: 'SYNC' | 'INFO' | 'WARNING' | 'ERROR' | 'TRACE' | 'ACCESS' | 'USER';
    message: string;
    status: 'success' | 'fail' | 'warn' | 'wait';
}

export interface PortalArchive {
    id: string;
    title: string;
    date?: string;
    time?: string;
    type?: string;
    mission?: string;
    status?: string;
    size?: string;
    tags?: string[];
    isImage?: boolean;
    isGenerating?: boolean;
    content?: string;
    previewUrl?: string;
    imageUrl?: string | null;
    messages?: ChatMessage[];
}

export interface PortalTelemetry {
    peakThroughput: string;
    activeNodes: number;
    latency: string;
    uptime: string;
    cacheHitRate?: number;
    searchCalls?: number;
    estimatedSavings?: string;
    tokenCount: number;
    activeAgentCode?: string | null;
    activeAgentCount?: number;
    currentView: string;
    currentPasses?: number;
    pollingCycles?: number;
    logCount: number;
    lastPath: string[];
    tokenBudget: number;
    queueDepth?: number;
    isCompacting?: boolean;
}

export interface PortalContext {
    messages: ChatMessage[];
    archives: PortalArchive[];
    currentView: PortalView | 'welcome';
    activePrompt: string;
    currentPasses: number;
    currentTopology: PortalTopology;
    tableParticipants: (string | null)[];
    isStreaming: boolean;
    agentPool: any[];
    executionQueue: PortalExecutionTask[];
    apiKey: string;
    billingTier: 'FREE' | 'PAID' | 'OFFLINE';
    pollingCycles: number;
    harnessState?: any;
    missionPoints?: any[];
    blackboardScaffold?: string;
    scheduleRender: (mask: number) => void;
    pushInternalLog: (msg: string, type?: string) => void;
    setWelcomeError: (error: string) => void;
    workflow: PortalWorkflowController | null;
    stopRequested: boolean;
    stopFlow: () => void;
    updateStreamingChunk: (agent: any, chunk: string) => void;
    handleModeSwitch: (view: PortalView | 'welcome') => void;
    handleTopologySwitch: (type: PortalTopology) => void;
    _p: any;
    activeDrag?: any | null;
    serverMode?: string;
    n8nFlow?: any;
    telemetryState?: PortalTelemetry;
}
