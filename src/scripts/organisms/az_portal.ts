import { renderSidebar } from './portal/views/SidebarView';
import { renderChatView } from './portal/views/ChatView';
import { renderDecisionTreeView } from './portal/views/DecisionTreeView';
import { renderArchiveView } from './portal/views/ArchiveView';
import { renderWelcomeView } from './portal/views/WelcomeView';
import { renderLogsView } from './portal/views/LogsView';
import { renderSeatsView } from './portal/views/SeatsView';
import { renderN8NView } from './portal/views/N8NView';
import { AZPortalInteractionHandler } from './portal/logic/PortalInteractionHandler';
import { AZPortalWorkflowHandler } from './portal/logic/PortalWorkflowHandler';
import { handlePointerMove, handlePointerUp, DragState } from './portal/logic/PortalDragHandler';
import { AGENT_POOL, type Agent } from '../core/agents';
import { TelemetryMonitor } from './portal/state/TelemetryMonitor';
import type { ChatMessage, PortalArchive, PortalAuditRecord, PortalExecutionTask, PortalTelemetry, PortalView, PortalWorkflowController } from './portal/PortalTypes';

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
    agentPool: Agent[];
    executionQueue: PortalExecutionTask[];
    apiKey: string;
    pollingCycles: number;
    scheduleRender: (mask: number) => void;
    pushInternalLog: (msg: string, type?: string) => void;
    setWelcomeError: (error: string) => void;
    workflow: PortalWorkflowController | null;
    stopRequested: boolean;
    stopFlow: () => void;
    updateStreamingChunk: (agent: unknown, chunk: string) => void;
    _p: AZPortal;
    n8nFlow?: any;
    telemetryState?: any;
    activeDrag: DragState | null;
}

export class AZPortal extends HTMLElement {
    public currentView: 'welcome' | PortalView = 'welcome';
    public messages: ChatMessage[] = [];
    public archives: PortalArchive[] = [];
    public tableParticipants: (string | null)[] = [null, 'A1', null, 'A3', null, null];
    public executionQueue: PortalExecutionTask[] = [];
    public activePrompt = '';
    public currentPasses = 0;
    public currentTopology: 'linear' | 'orbital' | 'custom' = 'linear';
    public isStreaming = false;
    public apiKey = '';
    public pollingCycles = 1;
    public logs: PortalAuditRecord[] = [];
    public serverAuthorized = false;
    public selectedArchiveId: string | null = null;
    public welcomeError = '';
    public telemetryState: PortalTelemetry = {} as any;

    private interactionHandler: AZPortalInteractionHandler;
    private workflowHandler: AZPortalWorkflowHandler;
    private telemetry: TelemetryMonitor;
    private context: PortalContext;
    private renderMask = 0;

    constructor() {
        super();
        this.context = {
            messages: this.messages, archives: this.archives, currentView: 'chat',
            activePrompt: this.activePrompt, currentPasses: this.currentPasses,
            currentTopology: this.currentTopology, tableParticipants: this.tableParticipants,
            isStreaming: this.isStreaming, agentPool: AGENT_POOL, executionQueue: this.executionQueue,
            apiKey: this.apiKey, pollingCycles: this.pollingCycles,
            scheduleRender: (m) => this.scheduleRender(m),
            pushInternalLog: (m, t) => this.pushInternalLog(m, t),
            setWelcomeError: (e) => this.setWelcomeError(e),
            workflow: null, stopRequested: false, stopFlow: () => this.stopFlow(),
            updateStreamingChunk: (a, c) => this.updateStreamingChunk(a, c),
            _p: this,
            activeDrag: null
        };
        this.interactionHandler = new AZPortalInteractionHandler(this.context);
        this.workflowHandler = new AZPortalWorkflowHandler(this.context);
        this.context.workflow = this.workflowHandler;
        this.telemetry = new TelemetryMonitor(this.context);
    }

    connectedCallback() {
        this.addEventListener('click', (e) => this.interactionHandler.onDelegatedClick(e));
        this.addEventListener('pointerdown', (e) => this.interactionHandler.onDelegatedPointerDown(e));
        this.addEventListener('input', (e) => this.interactionHandler.onDelegatedInput(e));
        this.addEventListener('keydown', (e) => this.interactionHandler.onDelegatedKeyDown(e));
        
        window.addEventListener('pointermove', (e) => this.context.activeDrag && handlePointerMove(e, this.context.activeDrag as any));
        window.addEventListener('pointerup', () => this.context.activeDrag && (handlePointerUp(this.context.activeDrag as any, this.tableParticipants, (i, c) => { this.tableParticipants[i] = c; this.scheduleRender(DIRTY_ALL); }, (i) => { this.tableParticipants[i] = null; this.scheduleRender(DIRTY_ALL); }, () => this.scheduleRender(DIRTY_ALL)), (this.context.activeDrag = null)));

        this.telemetry.start();
        this.scheduleRender(DIRTY_ALL);
    }

    public scheduleRender(mask: number) {
        this.telemetry.syncLocalState();
        this.renderMask |= mask;
        requestAnimationFrame(() => this.performRender());
    }

    private performRender() {
        if (this.renderMask === 0) return;
        const mask = this.renderMask;
        this.renderMask = 0;

        if (this.currentView === 'welcome') {
            this.innerHTML = renderWelcomeView(this.welcomeError, this.serverAuthorized);
            return;
        }

        if (!this.querySelector('.u-portal-wrapper')) {
            this.innerHTML = `
                <az-hud></az-hud>
                <div class="u-portal-wrapper flex w-full h-full bg-[#0d0d0d] overflow-hidden px-3 pb-3 relative" style="background: url('./images/portal_bg.png') center/cover;">
                    <div id="u-portal-sidebar" class="w-[100px] h-full bg-black/40 backdrop-blur-2xl border-r border-white/5"></div>
                    <div id="u-portal-main" class="flex-1 h-full relative"></div>
                </div>`;
        }

        const sidebarCont = this.querySelector('#u-portal-sidebar');
        const mainCont = this.querySelector('#u-portal-main');

        if (mask & DIRTY_SIDEBAR && sidebarCont) sidebarCont.innerHTML = renderSidebar(AGENT_POOL, this.currentTopology, this.executionQueue, this.tableParticipants);
        if (mask & DIRTY_CONTENT && mainCont) {
            const views: Record<string, () => string> = {
                chat: () => renderChatView(this.messages, this.pollingCycles, this.currentPasses, 'all', this.isStreaming, this.activePrompt),
                'decision-tree': () => renderDecisionTreeView(this.messages, this.isStreaming),
                archive: () => renderArchiveView(this.archives, this.selectedArchiveId),
                logs: () => renderLogsView(this.logs as any, 'ALL', this.telemetryState),
                table: () => this.currentTopology === 'custom' 
                    ? renderN8NView(this.context.workflow?.n8nFlow ?? null, AGENT_POOL) 
                    : renderSeatsView(this.tableParticipants, AGENT_POOL, this.currentTopology, this.context.workflow?.n8nFlow ?? undefined, null, [])
            };
            mainCont.innerHTML = (views[this.currentView] || views.chat)();
        }
        if (window.lucide) window.lucide.createIcons();
    }

    public handleModeSwitch(view: PortalView | 'welcome') { this.currentView = view; this.context.currentView = view; this.scheduleRender(DIRTY_ALL); }
    public handleTopologySwitch(type: 'linear' | 'orbital' | 'custom') { this.currentTopology = type; this.context.currentTopology = type; this.scheduleRender(DIRTY_ALL); }
    public pushInternalLog(msg: string, type: string = 'INFO') { this.logs.unshift({ message: msg, type, timestamp: new Date().toLocaleTimeString() } as any); this.scheduleRender(DIRTY_SIDEBAR); }
    public setWelcomeError(error: string) { this.welcomeError = error; this.scheduleRender(DIRTY_ALL); }
    public stopFlow() { this.context.stopRequested = true; this.pushInternalLog('🛑 中止指令已發出', 'WARNING'); }
    public updateStreamingChunk(agent: any, chunk: string) {
        const el = document.getElementById('u-streaming-content');
        if (el) { el.appendChild(document.createTextNode(chunk)); el.scrollTop = el.scrollHeight; }
    }
}
customElements.define('az-portal', AZPortal);
