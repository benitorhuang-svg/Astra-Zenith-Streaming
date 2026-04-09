/**
 * AZ PORTAL TYPES — Shared Communication Contracts
 */

import type { AgentPath, AZAgentEvent, MissionMessage, TelemetrySnapshot } from '../core/types';
import type { N8NWorkflow } from '../integrations/n8n/n8n_data_types';

export type PortalMessage = MissionMessage;

export type ChatMessage = PortalMessage;

export interface PortalArchive {
    id: string;
    time: string;
    mission: string;
    title: string;
    status: string;
    size?: string;
    messages?: PortalMessage[];
    isGenerating?: boolean;
    isImage?: boolean;
    imageUrl?: string | null;
    error?: string;
}

export interface PortalExecutionTask {
    agentCode: string;
    round: number;
    focus: string;
    nodeName?: string;
}

export interface PortalWorkflowController {
    n8nFlow: N8NWorkflow | null;
    handleRunFlow(): Promise<void>;
    handleAddNode(): void;
    addSuccessorNode(fromNodeName: string): void;
    importFlow(json: string): Promise<void>;
    handleVisualize(prompt: string): Promise<void>;
}

export interface LogEntry {
    timestamp: string;
    type: string;
    message: string;
    path?: AgentPath;
    agentCode?: string;
}

export type MissionStreamEvent = AZAgentEvent<string>;

export interface PortalTelemetry extends TelemetrySnapshot {
    cacheHitRate?: number;
    searchCalls?: number;
    estimatedSavings?: number;
}

export type PortalView =
    | 'welcome'
    | 'chat'
    | 'decision-tree'
    | 'archive'
    | 'logs'
    | 'table';

export interface PortalAuditRecord {
    timestamp: string;
    type: string;
    message: string;
    path?: AgentPath;
}
