/**
 * ASTRA ZENITH PORTAL — Modern industrial multi-agent interface
 */

import { renderSidebar } from './az_portal_sidebar';
import { renderChatView } from './az_portal_chat_view';
import { renderDecisionTreeView } from './az_portal_decision_view';
import { renderArchiveView } from './az_portal_archive_view';
import { renderWelcomeView } from './az_portal_welcome_view';
import { renderLogsView } from './az_portal_logs_view';
import { renderSeatsView } from './az_portal_seats_view';
import { renderN8NView } from './az_portal_n8n_view';
import { AZPortalInteractionHandler } from './az_portal_handlers';
import { AZPortalWorkflowHandler } from './az_portal_workflow';
import type { Agent } from '../core/agents';
import { handlePointerMove, handlePointerUp } from './az_portal_drag';
import type { DragState } from './az_portal_drag';
import { AGENT_POOL } from '../core/agents';
import type { N8NWorkflow } from '../integrations/n8n/n8n_data_types';
import { estimateApproximateTokens } from '../core/utils';
import type {
    ChatMessage,
    PortalArchive,
    PortalAuditRecord,
    PortalExecutionTask,
    PortalTelemetry,
    PortalView,
    PortalWorkflowController
} from './az_portal_types';

// Constants for targeted re-renders (Bitmasking for performance)
export const DIRTY_SIDEBAR = 1 << 0;
export const DIRTY_CONTENT = 1 << 1;
export const DIRTY_ALL = DIRTY_SIDEBAR | DIRTY_CONTENT;


export interface PortalContext {
    messages: ChatMessage[];
    archives: PortalArchive[];
    currentView: PortalView | 'welcome';
    activePrompt: string;
    currentPasses: number;
    currentTopology: 'linear' | 'orbital' | 'custom';
    tableParticipants: (string | null)[];
    isStreaming: boolean;
    isVisualMode: boolean;
    justLandedIndex: number | null;
    activeDrag: DragState | null;
    agentPool: Agent[];
    executionQueue: PortalExecutionTask[]; // NEW: For sequential tasking
    isProcessingQueue: boolean;
    apiKey: string;
    accessMode: string;
    pollingCycles: number;
    scheduleRender: (mask: number) => void;
    pushInternalLog: (msg: string, type?: string) => void;
    setWelcomeError: (error: string) => void;
    workflow: PortalWorkflowController | null;
    n8nFlow?: N8NWorkflow;
    telemetryState?: PortalTelemetry;
    DIRTY_SIDEBAR: number;
    DIRTY_CONTENT: number;
    DIRTY_ALL: number;
    stopRequested: boolean;
    stopFlow: () => void;
    updateStreamingChunk: (agent: unknown, chunk: string) => void;
    DIRTY_LOGS: number;
    _p: AZPortal;
}

export class AZPortal extends HTMLElement {
    private isInitialized = false;
    private renderMask = 0;
    private currentAbortController: AbortController | null = null;
    
    // Core State
    public currentView: 'welcome' | PortalView = 'welcome';
    public messages: ChatMessage[] = [];
    public archives: PortalArchive[] = [];
    public tableParticipants: (string | null)[] = [null, 'A1', null, 'A3', null, null];
    public executionQueue: PortalExecutionTask[] = []; // NEW
    public isProcessingQueue = false; // NEW
    public activePrompt = '';
    public currentPasses = 0;
    public currentTopology: 'linear' | 'orbital' | 'custom' = 'linear';
    public isStreaming = false;
    public isVisualMode = false;
    public justLandedIndex: number | null = null;
    public activeDrag: DragState | null = null;
    public apiKey = '';
    public accessMode = 'RAM';
    public pollingCycles = 1; // Default to 1 to prevent empty HUD filters
    
    // NEW: Tactical Config State
    public availableModels: string[] = [];
    public agentConfigs: any[] = [];
    
    // Internal Telemetry
    public logs: PortalAuditRecord[] = [];
    public serverAuthorized = false;
    public selectedArchiveId: string | null = null;
    public welcomeError = '';
    public telemetryState: PortalTelemetry = {
        activeAgentCode: null,
        activeAgentCount: 0,
        currentView: 'welcome',
        currentPasses: 0,
        pollingCycles: 1,
        queueDepth: 0,
        tokenCount: 0,
        tokenBudget: 12000,
        isCompacting: false,
        lastPath: [],
        logCount: 0
    };

    private interactionHandler: AZPortalInteractionHandler;
    private workflowHandler: AZPortalWorkflowHandler;
    private context: PortalContext;
    public agentPool: Agent[] = AGENT_POOL;

    constructor() {
        super();
        
        // Initialize Context Prototype
        this.context = {
            messages: this.messages,
            archives: this.archives,
            currentView: 'chat',
            activePrompt: this.activePrompt,
            currentPasses: this.currentPasses,
            currentTopology: this.currentTopology,
            tableParticipants: this.tableParticipants,
            isStreaming: this.isStreaming,
            isVisualMode: this.isVisualMode,
            justLandedIndex: this.justLandedIndex,
            activeDrag: this.activeDrag,
            apiKey: this.apiKey,
            accessMode: this.accessMode,
            pollingCycles: this.pollingCycles,
            agentPool: this.agentPool,
            executionQueue: this.executionQueue,
            isProcessingQueue: this.isProcessingQueue,
            scheduleRender: (mask: number) => this.scheduleRender(mask),
            pushInternalLog: (msg: string, type?: string) => this.pushInternalLog(msg, type),
            setWelcomeError: (error: string) => this.setWelcomeError(error),
            workflow: null,
            telemetryState: this.telemetryState,
            DIRTY_SIDEBAR,
            DIRTY_CONTENT,
            DIRTY_ALL,
            stopRequested: false,
            stopFlow: () => this.stopFlow(),
            updateStreamingChunk: (agent: unknown, chunk: string) => this.updateStreamingChunk(agent, chunk),
            DIRTY_LOGS: 1 << 3,
            _p: this
        };

        this.interactionHandler = new AZPortalInteractionHandler(this.context);
        this.workflowHandler = new AZPortalWorkflowHandler(this.context);
        this.context.workflow = this.workflowHandler;
    }

    connectedCallback() {
        if (this.isInitialized) return;
        this.isInitialized = true;

        // AUTH_RECOVERY: Silent auto-registration if session exists but RAM is cold
        fetch('/api/auth/status')
            .then(r => r.json())
            .then(data => {
                this.serverAuthorized = !!data.api;
                if (this.serverAuthorized) this.welcomeError = ''; 
                
                const session = sessionStorage.getItem('AZ_IDENTITY');
                if (session && !this.serverAuthorized) {
                    try {
                        const ident = JSON.parse(session);
                        if (ident.apiKey) {
                            this.currentAbortController = new AbortController();
                            fetch('/api/auth/register', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(ident),
                                signal: this.currentAbortController?.signal
                            }).then(res => {
                                if (res.ok) {
                                    this.serverAuthorized = true;
                                    this.apiKey = ident.apiKey;
                                    this.accessMode = ident.mode || 'API';
                                    this.pushInternalLog('⚡ 身份識別已由緩存自動恢復。', 'SUCCESS');
                                    this.scheduleRender(DIRTY_ALL);
                                }
                            });
                        }
                    } catch { /* silent recovery fail */ }
                }
            })
            .catch(() => {
                this.serverAuthorized = false;
            });

        // Atomic Event Delegation
        this.addEventListener('click', (e) => this.interactionHandler.onDelegatedClick(e));
        this.addEventListener('pointerdown', (e) => this.interactionHandler.onDelegatedPointerDown(e));
        this.addEventListener('input', (e) => this.interactionHandler.onDelegatedInput(e));
        this.addEventListener('keydown', (e) => this.interactionHandler.onDelegatedKeyDown(e));

        // Drag specialized listeners
        window.addEventListener('pointermove', (e) => {
            if (this.context.activeDrag) {
                handlePointerMove(e, this.context.activeDrag);
            }
        });

        window.addEventListener('pointerup', () => {
            if (this.context.activeDrag) {
                handlePointerUp(
                    this.context.activeDrag, 
                    this.tableParticipants,
                    (idx: number, code: string) => {
                        this.tableParticipants[idx] = code;
                        this.scheduleRender(DIRTY_ALL);
                    },
                    (idx: number) => {
                        this.tableParticipants[idx] = null;
                        this.scheduleRender(DIRTY_ALL);
                    },
                    () => this.scheduleRender(DIRTY_ALL)
                );
                this.context.activeDrag = null;
            }
        });

        this.scheduleRender(DIRTY_ALL);

        // GLOBAL EVENT SYNC: Listen to Header actions
        window.addEventListener('az-toggle-chat', () => this.handleModeSwitch('chat'));
        window.addEventListener('az-toggle-config', () => this.handleConfigSwitch());
        window.addEventListener('az-toggle-logs', () => this.handleModeSwitch('logs'));
        window.addEventListener('az-toggle-pathway', () => this.handleModeSwitch('decision-tree'));
        window.addEventListener('az-toggle-archive', () => this.handleModeSwitch('archive'));
        window.addEventListener('az-toggle-custom-workflow', () => this.handleModeSwitch('table'));

        // Start High-Frequency Telemetry Sync
        this.startTelemetryPolling();

        window.addEventListener('az-logout', () => {
             this.currentView = 'welcome';
             this.context.currentView = 'welcome';
             this.serverAuthorized = false;
             this.syncTelemetryState();
             this.scheduleRender(DIRTY_ALL);
        });
    }

    public scheduleRender(mask: number) {
        this.syncTelemetryState();
        this.renderMask |= mask;
        requestAnimationFrame(() => this.performRender());
    }

    private getPortalAuraColor(): string {
        const activeAgent = this.messages.find(m => m.isStreaming) || (this.messages.length > 0 ? this.messages[this.messages.length - 1] : null);
        return activeAgent ? activeAgent.agentColor : '#4d9eff';
    }

    private performRender() {
        if (this.renderMask === 0) return;
        const mask = this.renderMask;
        this.renderMask = 0;

        if (this.currentView === 'welcome') {
            this.innerHTML = renderWelcomeView(this.welcomeError, this.serverAuthorized);
            if (window.lucide) window.lucide.createIcons();
            return;
        }

        // Apply Aura Color to Root
        const auraColor = this.getPortalAuraColor();
        this.style.setProperty('--portal-aura-color', auraColor);

        if (!this.querySelector('.u-portal-wrapper')) {
             this.innerHTML = `
                <az-hud></az-hud>
                <div class="u-portal-wrapper flex w-full h-full bg-[#0d0d0d] overflow-hidden px-3 pb-3 pt-0 origin-center animate-portal-reveal relative" 
                     style="border: 1px solid var(--portal-aura-color)44; background: linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url('./images/portal_bg.png'); background-size: cover; background-position: center;">
                    <div id="u-portal-sidebar" class="w-[100px] h-full shrink-0 u-portal-sidebar-inner overflow-hidden shadow-2xl bg-black/40 backdrop-blur-2xl relative z-10 border-r border-white/5"></div>
                    <div id="u-portal-main" class="flex-1 h-full min-w-0 u-portal-main-content relative z-10"></div>
                </div>
             `;
        }

        const sidebarCont = this.querySelector('#u-portal-sidebar');
        const mainCont = this.querySelector('#u-portal-main');

        if (mask & DIRTY_SIDEBAR && sidebarCont) {
            sidebarCont.innerHTML = renderSidebar(this.agentPool, this.currentTopology, this.executionQueue, this.tableParticipants);
        }

        if (mask & DIRTY_CONTENT && mainCont) {
            if (this.currentView === 'chat') {
                mainCont.innerHTML = renderChatView(
                    this.messages, 
                    this.pollingCycles, 
                    this.currentPasses, 
                    'all', 
                    this.isStreaming, 
                    this.activePrompt
                );
            } else if (this.currentView === 'decision-tree') {
                mainCont.innerHTML = renderDecisionTreeView(this.messages, this.isStreaming);
            } else if (this.currentView === 'archive') {
                mainCont.innerHTML = renderArchiveView(this.archives, this.selectedArchiveId);
            } else if (this.currentView === 'logs') {
                mainCont.innerHTML = renderLogsView(this.logs.map(l => ({
                    timestamp: l.timestamp,
                    type: l.type,
                    message: l.message,
                    path: l.path
                })), 'ALL', this.telemetryState);
            } else if (this.currentView === 'table') {
                if (this.currentTopology === 'custom') {
                    mainCont.innerHTML = renderN8NView(this.context.workflow?.n8nFlow || null, this.agentPool);
                } else {
                    mainCont.innerHTML = renderSeatsView(this.tableParticipants, this.agentPool, this.currentTopology, this.context.workflow?.n8nFlow || undefined, this.justLandedIndex, this.agentConfigs);
                }
            }
        }

        if (window.lucide) window.lucide.createIcons();
    }

    public handleTopologySwitch(type: 'linear' | 'orbital' | 'custom') {
        this.currentTopology = type;
        this.context.currentTopology = type;
        this.scheduleRender(DIRTY_ALL);
    }

    public handleModeSwitch(view: PortalView | 'welcome') {
        this.currentView = view;
        this.context.currentView = view;
        window.dispatchEvent(new CustomEvent('az-view-updated', { detail: { view } }));
        this.scheduleRender(DIRTY_ALL);
    }

    private async handleConfigSwitch() {
        try {
            const res = await fetch('/api/auth/models');
            const data = await res.json();
            this.availableModels = data.available;
            this.agentConfigs = data.current;
            this.handleModeSwitch('table');
        } catch {
            this.handleModeSwitch('table');
        }
    }

    public pushInternalLog(msg: string, type: string = 'INFO') {
        this.logs.unshift({ message: msg, type, timestamp: new Date().toLocaleTimeString() });
        if (this.logs.length > 50) this.logs.pop();
        this.persistLogs();
        this.syncTelemetryState();
        this.scheduleRender(this.currentView === 'logs' ? DIRTY_ALL : DIRTY_SIDEBAR);
    }

    public setWelcomeError(error: string) {
        this.welcomeError = error;
        this.scheduleRender(DIRTY_ALL);
    }

    /**
     * INDUSTRIAL SURGERY: updateStreamingChunk
     * Appends text directly to the active streaming DOM node to avoid full-tree re-render.
     */
    public updateStreamingChunk(agent: unknown, chunk: string) {
        const streamContainer = document.getElementById('u-streaming-content');
        if (!streamContainer) return;

        // For simplicity, we just append a text node.
        const textNode = document.createTextNode(chunk);
        streamContainer.appendChild(textNode);
        
        // Auto-scroll
        streamContainer.scrollTop = streamContainer.scrollHeight;

        this.telemetryState.tokenCount += estimateApproximateTokens(chunk);
        this.syncTelemetryState();
    }

    public stopFlow() {
        this.context.stopRequested = true;
        this.pushInternalLog('🛑 任務中止指令已發出...', 'WARNING');
    }

    private persistLogs(): void {
        sessionStorage.setItem('AZ_PORTAL_LOGS', JSON.stringify(this.logs));
    }

    private syncTelemetryState(): void {
        const activeMessage = this.messages.find(m => m.isStreaming) ?? this.messages[this.messages.length - 1] ?? null;
        const tokenCount = this.messages.reduce((sum, message) => sum + estimateApproximateTokens(message.content), 0);
        const compacting = this.messages.some(message => message.summary?.includes('pruned') || message.content.includes('[pruned'));

        this.telemetryState = {
            activeAgentCode: activeMessage?.agentCode ?? null,
            activeAgentCount: this.messages.filter(message => message.isStreaming).length,
            currentView: this.currentView,
            currentPasses: this.currentPasses,
            pollingCycles: this.pollingCycles,
            queueDepth: this.executionQueue.length,
            tokenCount,
            tokenBudget: 12000,
            isCompacting: compacting,
            lastPath: activeMessage?.path ?? [],
            logCount: this.logs.length,
            cacheHitRate: (this.telemetryState as any)?.cacheHitRate ?? 0,
            searchCalls: (this.telemetryState as any)?.searchCalls ?? 0,
            estimatedSavings: (this.telemetryState as any)?.estimatedSavings ?? 0
        };

        this.context.telemetryState = this.telemetryState;
    }

    private async startTelemetryPolling() {
        const poll = async (delay = 2000) => {
            // Initial/Retry delay
            await new Promise(r => setTimeout(r, delay));

            try {
                // 1. Fetch Metrics
                const res = await fetch('/api/telemetry');
                if (!res.ok) throw new Error(`HTTP_${res.status}`);
                const data = await res.json();
                
                this.telemetryState = {
                    ...this.telemetryState,
                    cacheHitRate: data.cacheHitRate,
                    searchCalls: data.searchCalls,
                    estimatedSavings: data.estimatedSavings,
                    tokenCount: data.totalTokens
                };

                // 2. Fetch Knowledge Graph
                const graphRes = await fetch('/api/analysis/graph');
                if (graphRes.ok) {
                    const graphData = await graphRes.json();
                    
                    // Update Global Window State for views to consume
                    (window as any).semanticNodes = graphData.nodes;
                    (window as any).semanticLinks = graphData.links;

                    // Direct Push to View if active
                    const mainGraph = this.querySelector('#u-pathway-graph');
                    if (mainGraph && (mainGraph as any).setData) {
                        (mainGraph as any).setData(graphData);
                    }
                }

                this.context.telemetryState = this.telemetryState;
                this.scheduleRender(DIRTY_SIDEBAR); 
                
                // Success: Regular interval
                setTimeout(() => poll(5000), 5000);
            } catch {
                // Fail: Backoff retry
                console.warn('[PORTAL_POLL] Connection pending (Backend Warmup?):', e);
                setTimeout(() => poll(Math.min(delay * 2, 10000)), 2000);
            }
        };
        poll(3000); // Allow backend warm-up before first poll
    }
}

customElements.define('az-portal', AZPortal);
