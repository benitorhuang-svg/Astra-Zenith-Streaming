import { renderSidebar } from './portal/views/SidebarView';
import { renderChatView } from './portal/views/ChatView';
import { renderDecisionTreeView } from './portal/views/DecisionTreeView';
import { renderArchiveView } from './portal/views/ArchiveView';
import { renderLogsView } from './portal/views/LogsView';
import { renderWelcomeView } from './portal/views/WelcomeView';
import { renderSeatsView } from './portal/views/SeatsView';
import { renderPortalShell, patchDecisionTreeDOM } from './portal/views/PortalShell';
import { AZPortalInteractionHandler } from './portal/logic/PortalInteractionHandler';
import { AZPortalWorkflowHandler } from './portal/logic/PortalWorkflowHandler';
import { TelemetryMonitor } from './portal/state/TelemetryMonitor';
import { PortalState } from './portal/state/PortalState';
import { PromptService } from './portal/logic/PromptService';
import { PortalEvents } from './portal/logic/PortalEvents';
import { AGENT_POOL } from '../core/agents';
import { renderAgentInfoBubble } from '../molecules/m_agent_info_bubble';
import { 
    PortalView, PortalTopology,
    DIRTY_ALL, DIRTY_SIDEBAR, DIRTY_CONTENT, DIRTY_WELCOME
} from './portal/PortalTypes';

/**
 * ORGANISM: Command Portal
 * Main workspace orchestrator for Astra Zenith.
 */
export class AZPortal extends HTMLElement {
    public state: PortalState;
    private interactionHandler: AZPortalInteractionHandler;
    private workflowHandler: AZPortalWorkflowHandler;
    private telemetry: TelemetryMonitor;
    private promptService: PromptService;
    private events: PortalEvents;
    public context: any;
    private renderMask = 0;

    constructor() {
        super();
        this.state = new PortalState();
        (window as any).AGENT_POOL = AGENT_POOL;
        this.context = this.state.createContext(this);

        this.promptService = new PromptService(this.state, (m) => this.scheduleRender(m));
        this.promptService.initAgentModels();

        this.interactionHandler = new AZPortalInteractionHandler(this.context);
        this.workflowHandler = new AZPortalWorkflowHandler(this.context);
        this.context.workflow = this.workflowHandler;
        this.telemetry = new TelemetryMonitor(this.context);
        this.events = new PortalEvents(this);
        
        void this.promptService.loadCoreProtocol();
    }

    connectedCallback() {
        this.events.setup();
        this.telemetry.start();
        this.scheduleRender(DIRTY_ALL);
    }

    public scheduleRender(mask: number) {
        this.renderMask |= mask;
        requestAnimationFrame(() => this.performRender());
    }

    public performRender() {
        if (this.renderMask === 0) return;
        const mask = this.renderMask;
        this.renderMask = 0;

        if (this.state.currentView === 'welcome') {
            if (mask & DIRTY_WELCOME || !this.querySelector('#u-welcome-overlay')) {
                this.innerHTML = renderWelcomeView(this.state.welcomeError, this.state.serverAuthorized);
                if (window.lucide) setTimeout(() => (window as any).lucide.createIcons(), 0);
            }
            return;
        }

        if (!this.querySelector('.u-portal-wrapper')) this.innerHTML = renderPortalShell();

        const sidebarCont = this.querySelector('#u-portal-sidebar');
        const mainCont = this.querySelector('#u-portal-main');

        if (mask & DIRTY_SIDEBAR && sidebarCont) sidebarCont.innerHTML = renderSidebar(AGENT_POOL, this.state.currentTopology, this.state.executionQueue, this.state.tableParticipants);
        if (mask & DIRTY_CONTENT && mainCont) this.renderMainContent(mainCont as HTMLElement);

        const bubbleCont = this.querySelector('#u-portal-bubble-container');
        if (bubbleCont) {
            bubbleCont.innerHTML = this.state.selectedAgentInfo 
                ? renderAgentInfoBubble(this.state.selectedAgentInfo, this.state.activePrompt, this.state.selectedAgentPromptContent, this.state.apiKey, this.state.agentModels[this.state.selectedAgentInfo] || '') 
                : '';
        }
        if (window.lucide) window.lucide.createIcons();
    }

    private renderMainContent(mainCont: HTMLElement) {
        const views: Record<string, () => string> = {
            chat: () => renderChatView(this.state.messages, this.state.pollingCycles, this.state.currentPasses, this.state.filterRound, this.state.isStreaming, this.state.activePrompt),
            'decision-tree': () => renderDecisionTreeView(this.state.messages, this.state.isStreaming),
            archive: () => renderArchiveView(this.state.archives, this.state.selectedArchiveId, this.state.billingTier) as string,
            logs: () => renderLogsView(this.state.logs as any, 'ALL', this.state.telemetryState),
            table: () => renderSeatsView(this.state.tableParticipants, AGENT_POOL, this.state.currentTopology, this.state.n8nFlow, null, Object.entries(this.state.agentModels).map(([id, model]) => ({ id, model })), this.state.isEditingTask, this.state.activePrompt)
        };
        
        const html = (views[this.state.currentView] || views.chat)();
        if (this.state.currentView === 'decision-tree' && mainCont.querySelector('az-semantic-graph')) {
            patchDecisionTreeDOM(mainCont, html);
        } else {
            mainCont.innerHTML = html;
        }
    }

    public handleModeSwitch(view: PortalView | 'welcome') { 
        this.state.currentView = view; 
        this.state.selectedAgentInfo = null;
        this.state.selectedAgentPromptContent = null;
        window.dispatchEvent(new CustomEvent('az-view-updated', { detail: { view } }));
        if (view === 'chat' && (window as any).ZENITH_PREVIEW_MODE && this.state.messages.length === 0) {
            this.state.activePrompt = "分析 Google Gemma 4 模型的技術優勢與邊緣計算場景";
            setTimeout(() => this.workflowHandler && void (this.workflowHandler as any).handleRunFlow(), 800);
        }
        this.scheduleRender(DIRTY_ALL); 
    }
    public handleTopologySwitch(type: PortalTopology) { this.state.currentTopology = type; this.scheduleRender(DIRTY_ALL); }
    public pushInternalLog(msg: string, type: string = 'INFO') { this.state.logs.unshift({ message: msg, type, timestamp: new Date().toLocaleTimeString() } as any); if (this.state.currentView !== 'welcome') this.scheduleRender(DIRTY_SIDEBAR); }
    public setWelcomeError(error: string) { this.state.welcomeError = error; this.scheduleRender(DIRTY_WELCOME); }
    public updateStreamingChunk(agent: { code: string, round: number }, chunk: string) {
        const el = document.getElementById(`u-stream-${agent.code}-${agent.round}`);
        const scrollEl = document.getElementById('u-chat-scroll');
        if (el) { 
            if (el.querySelector('.animate-pulse')) el.innerHTML = '';
            el.appendChild(document.createTextNode(chunk)); 
            if (scrollEl) scrollEl.scrollTop = scrollEl.scrollHeight;
        }
    }
    public async loadAgentPrompt(agentCode: string) { await this.promptService.loadAgentPrompt(agentCode); }
}

customElements.define('az-portal', AZPortal);
