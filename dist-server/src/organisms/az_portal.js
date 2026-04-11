"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AZPortal = void 0;
const SidebarView_1 = require("./portal/views/SidebarView");
const ChatView_1 = require("./portal/views/ChatView");
const DecisionTreeView_1 = require("./portal/views/DecisionTreeView");
const ArchiveView_1 = require("./portal/views/ArchiveView");
const LogsView_1 = require("./portal/views/LogsView");
const WelcomeView_1 = require("./portal/views/WelcomeView");
const SeatsView_1 = require("./portal/views/SeatsView");
const PortalInteractionHandler_1 = require("./portal/logic/PortalInteractionHandler");
const PortalWorkflowHandler_1 = require("./portal/logic/PortalWorkflowHandler");
const TelemetryMonitor_1 = require("./portal/state/TelemetryMonitor");
const agents_1 = require("../core/agents");
const m_agent_info_bubble_1 = require("../molecules/m_agent_info_bubble");
const PortalTypes_1 = require("./portal/PortalTypes");
/**
 * ORGANISM: Command Portal
 * Main workspace orchestrator for Astra Zenith.
 * Final Path Alignment Fix: 2026-04-10
 */
class AZPortal extends HTMLElement {
    currentView = 'welcome';
    messages = [];
    archives = [];
    activePrompt = '';
    currentPasses = 0;
    currentTopology = 'linear';
    tableParticipants = ['A1', 'A2', null, null, null, null, null, null];
    isStreaming = false;
    executionQueue = [];
    logs = [];
    apiKey = '';
    billingTier = 'OFFLINE';
    pollingCycles = 3;
    serverAuthorized = false;
    welcomeError = '';
    selectedArchiveId = null;
    telemetryState = {
        peakThroughput: '0 KB/s',
        activeNodes: 0,
        latency: '0ms',
        uptime: '00:00:00',
        tokenCount: 0,
        currentView: 'welcome',
        logCount: 0,
        lastPath: [],
        tokenBudget: 1000000
    };
    filterRound = 'all';
    n8nFlow = null;
    isEditingTask = false;
    selectedAgentForTask = null;
    selectedAgentInfo = null; // New state for floating box
    selectedAgentPromptContent = null; // New state for specific prompt
    agentPrompts = {}; // Tactical instructions per agent
    agentModels = {}; // Model selection per agent
    coreProtocol = ''; // System-wide Core Instructions
    interactionHandler;
    workflowHandler;
    telemetry;
    context;
    renderMask = 0;
    constructor() {
        super();
        window.AGENT_POOL = agents_1.AGENT_POOL;
        this.context = {
            get messages() { return this._p.messages; },
            set messages(v) { this._p.messages = v; },
            get archives() { return this._p.archives; },
            set archives(v) { this._p.archives = v; },
            get currentView() { return this._p.currentView; },
            set currentView(v) { this._p.currentView = v; },
            get currentTopology() { return this._p.currentTopology; },
            set currentTopology(v) { this._p.currentTopology = v; },
            get activePrompt() { return this._p.activePrompt; },
            set activePrompt(v) { this._p.activePrompt = v; },
            get currentPasses() { return this._p.currentPasses; },
            set currentPasses(v) { this._p.currentPasses = v; },
            tableParticipants: this.tableParticipants,
            get isStreaming() { return this._p.isStreaming; },
            set isStreaming(v) { this._p.isStreaming = v; },
            agentPool: agents_1.AGENT_POOL,
            get executionQueue() { return this._p.executionQueue; },
            set executionQueue(v) { this._p.executionQueue = v; },
            get apiKey() { return this._p.apiKey; },
            set apiKey(v) { this._p.apiKey = v; },
            get billingTier() { return this._p.billingTier; },
            set billingTier(v) { this._p.billingTier = v; },
            get pollingCycles() { return this._p.pollingCycles; },
            set pollingCycles(v) { this._p.pollingCycles = v; },
            scheduleRender: (m) => this.scheduleRender(m),
            pushInternalLog: (m, t) => this.pushInternalLog(m, t),
            setWelcomeError: (e) => this.setWelcomeError(e),
            handleModeSwitch: (v) => this.handleModeSwitch(v),
            handleTopologySwitch: (t) => this.handleTopologySwitch(t),
            workflow: null, stopRequested: false,
            stopFlow: () => { this.isStreaming = false; this.scheduleRender(PortalTypes_1.DIRTY_ALL); },
            updateStreamingChunk: (a, c) => this.updateStreamingChunk(a, c),
            _p: this, activeDrag: null
        };
        // Role-Specific Tactical Smart Defaults (Tier-Aware)
        const isFree = !this.apiKey || this.apiKey.toLowerCase() === 'free';
        agents_1.AGENT_POOL.forEach(a => {
            let model;
            if (isFree) {
                // FREE STRATEGY: Quota Optimization & Role Fit
                switch (a.code) {
                    case 'A1':
                        model = 'gemini-3.1-flash-lite-preview';
                        break;
                    case 'A4':
                        model = 'gemma-4-31b-it';
                        break;
                    case 'A3':
                        model = 'gemini-robotics-er-1.5-preview';
                        break;
                    case 'A6':
                        model = 'gemini-3-flash-preview';
                        break;
                    default: model = 'gemini-3.1-flash-lite-preview';
                }
            }
            else {
                // PAID STRATEGY: High-Precision & Stability
                switch (a.code) {
                    case 'A2':
                    case 'A6':
                        model = 'gemini-3.1-pro-preview';
                        break;
                    case 'A3':
                    case 'A5':
                        model = 'gemini-2.5-pro';
                        break;
                    default: model = 'gemini-3.1-pro-preview';
                }
            }
            this.agentModels[a.code] = model;
            void this.loadAgentPromptToMap(a.code);
        });
        this.interactionHandler = new PortalInteractionHandler_1.AZPortalInteractionHandler(this.context);
        this.workflowHandler = new PortalWorkflowHandler_1.AZPortalWorkflowHandler(this.context);
        this.context.workflow = this.workflowHandler;
        this.telemetry = new TelemetryMonitor_1.TelemetryMonitor(this.context);
        void this.loadCoreProtocol();
    }
    connectedCallback() {
        this.addEventListener('click', (e) => this.interactionHandler.onDelegatedClick(e));
        this.addEventListener('pointerdown', (e) => this.interactionHandler.onDelegatedPointerDown(e));
        window.addEventListener('pointermove', (e) => this.interactionHandler.onGlobalPointerMove(e));
        window.addEventListener('pointerup', (e) => this.interactionHandler.onGlobalPointerUp(e));
        this.addEventListener('input', (e) => this.interactionHandler.onDelegatedInput(e));
        this.addEventListener('keydown', (e) => this.interactionHandler.onDelegatedKeyDown(e));
        this.addEventListener('change', (e) => this.interactionHandler.onDelegatedChange(e));
        this.addEventListener('click', (e) => {
            const target = e.target;
            if (target.id === 'u-close-insight') {
                document.getElementById('u-node-insight-panel')?.classList.add('translate-y-full');
            }
            // Handle Graph Navigation from Footer
            const graph = document.getElementById('u-pathway-graph');
            if (graph) {
                if (target.closest('#z-in'))
                    graph.zoomIn();
                if (target.closest('#z-out'))
                    graph.zoomOut();
                if (target.closest('#z-reset'))
                    graph.resetView();
            }
        });
        // Global Click-Outside handling (Window level to catch Header etc.)
        window.addEventListener('mousedown', (e) => {
            const target = e.target;
            // 1. Handle Agent Info Bubble (Avatar Cards)
            if (this.selectedAgentInfo) {
                const bubble = document.getElementById('u-agent-info-bubble');
                const isSidebarItem = target.closest('.u-sidebar-agent-item');
                if (bubble && !bubble.contains(target) && !isSidebarItem) {
                    this.selectedAgentInfo = null;
                    this.selectedAgentPromptContent = null;
                    this.scheduleRender(PortalTypes_1.DIRTY_ALL);
                }
            }
            // 2. Handle Node Insight Panel (Mind Map Details)
            const panel = document.getElementById('u-node-insight-panel');
            if (panel && !panel.classList.contains('translate-y-full')) {
                const isNode = target.closest('[data-node-id]');
                const isPanel = target.closest('#u-node-insight-panel');
                if (!isNode && !isPanel) {
                    panel.classList.add('translate-y-full');
                }
            }
        });
        window.addEventListener('az-logout', () => {
            this.serverAuthorized = false;
            this.apiKey = '';
            window.ZENITH_PREVIEW_MODE = false; // 🚀 RESET PREVIEW ON LOGOUT
            this.handleModeSwitch('welcome');
            this.scheduleRender(PortalTypes_1.DIRTY_WELCOME | PortalTypes_1.DIRTY_ALL);
        });
        window.addEventListener('az-toggle-chat', () => this.handleModeSwitch('chat'));
        window.addEventListener('az-toggle-pathway', () => this.handleModeSwitch('decision-tree'));
        window.addEventListener('az-toggle-archive', () => this.handleModeSwitch('archive'));
        window.addEventListener('az-toggle-logs', () => this.handleModeSwitch('logs'));
        window.addEventListener('az-toggle-custom-workflow', () => this.handleModeSwitch('table'));
        // --- NODE SELECTION HANDLING (Strategic Fusion Map) ---
        this.addEventListener('az-node-selected', (e) => {
            const { title, content, type } = e.detail;
            const panel = document.getElementById('u-node-insight-panel');
            const titleEl = document.getElementById('u-node-title');
            const contentEl = document.getElementById('u-node-content');
            if (panel && titleEl && contentEl) {
                const prefix = type === 'LEAF' ? '詳情內容' : (type === 'BRANCH' ? '核心重點' : '主題目標');
                titleEl.textContent = `${prefix}: ${title}`;
                contentEl.innerHTML = content.replace(/\n/g, '<br>'); // Better formatting for terminal
                panel.classList.remove('translate-y-full');
            }
        });
        this.telemetry.start();
        this.scheduleRender(PortalTypes_1.DIRTY_ALL);
    }
    scheduleRender(mask) {
        this.renderMask |= mask;
        requestAnimationFrame(() => this.performRender());
    }
    performRender() {
        if (this.renderMask === 0)
            return;
        const mask = this.renderMask;
        this.renderMask = 0;
        if (this.currentView === 'welcome') {
            if (mask & PortalTypes_1.DIRTY_WELCOME || !this.querySelector('#u-welcome-overlay')) {
                this.innerHTML = (0, WelcomeView_1.renderWelcomeView)(this.welcomeError, this.serverAuthorized);
                // INDUSTRIAL FIX: Global scan to ensure fragments inside innerHTML are hydrated
                if (window.lucide) {
                    setTimeout(() => {
                        if (window.lucide)
                            window.lucide.createIcons();
                    }, 0);
                }
            }
            return;
        }
        if (!this.querySelector('.u-portal-wrapper')) {
            this.innerHTML = `
                <az-hud></az-hud>
                <div class="u-portal-wrapper flex w-full h-full overflow-hidden px-3 pb-3 relative"
                     style="background: url('./astra_zenith_wallpaper.png') center/cover no-repeat; background-color: #050505;">
                    <!-- Ambient Overlay -->
                    <div class="absolute inset-0 bg-linear-to-tr from-black/90 via-black/40 to-primary/5 pointer-events-none"></div>
                    
                    <div id="u-portal-sidebar" class="w-[74px] shrink-0 h-full bg-black/40 backdrop-blur-3xl border-r border-white/5 relative z-10 transition-all duration-500 overflow-x-hidden"></div>
                    <div id="u-portal-main" class="flex-1 min-w-0 h-full relative z-10"></div>
                    <div id="u-portal-bubble-container" class="relative z-50"></div>
                </div>`;
        }
        const sidebarCont = this.querySelector('#u-portal-sidebar');
        const mainCont = this.querySelector('#u-portal-main');
        if (mask & PortalTypes_1.DIRTY_SIDEBAR && sidebarCont)
            sidebarCont.innerHTML = (0, SidebarView_1.renderSidebar)(agents_1.AGENT_POOL, this.currentTopology, this.executionQueue, this.tableParticipants);
        if (mask & PortalTypes_1.DIRTY_CONTENT && mainCont) {
            const views = {
                chat: () => (0, ChatView_1.renderChatView)(this.messages, this.pollingCycles, this.currentPasses, this.filterRound, this.isStreaming, this.activePrompt),
                'decision-tree': () => (0, DecisionTreeView_1.renderDecisionTreeView)(this.messages, this.isStreaming),
                archive: () => (0, ArchiveView_1.renderArchiveView)(this.archives, this.selectedArchiveId, this.billingTier),
                logs: () => (0, LogsView_1.renderLogsView)(this.logs, 'ALL', this.telemetryState),
                table: () => {
                    const modelConfigs = Object.entries(this.agentModels).map(([id, model]) => ({ id, model }));
                    return (0, SeatsView_1.renderSeatsView)(this.tableParticipants, agents_1.AGENT_POOL, this.currentTopology, this.n8nFlow, null, modelConfigs, this.isEditingTask, this.activePrompt);
                }
            };
            const html = (views[this.currentView] || views.chat)();
            if (this.currentView === 'decision-tree') {
                const graph = mainCont.querySelector('az-semantic-graph');
                if (graph) {
                    this.patchDecisionTree(mainCont, html);
                    return;
                }
            }
            mainCont.innerHTML = html;
        }
        const bubbleCont = this.querySelector('#u-portal-bubble-container');
        if (bubbleCont) {
            bubbleCont.innerHTML = this.selectedAgentInfo
                ? (0, m_agent_info_bubble_1.renderAgentInfoBubble)(this.selectedAgentInfo, this.activePrompt, this.selectedAgentPromptContent, this.apiKey, this.agentModels[this.selectedAgentInfo] || '')
                : '';
        }
        if (window.lucide)
            window.lucide.createIcons();
    }
    handleModeSwitch(view) {
        this.currentView = view;
        // Clear tactical bubble on any view switch
        this.selectedAgentInfo = null;
        this.selectedAgentPromptContent = null;
        window.dispatchEvent(new CustomEvent('az-view-updated', { detail: { view } }));
        this.scheduleRender(PortalTypes_1.DIRTY_ALL);
    }
    handleTopologySwitch(type) { this.currentTopology = type; this.scheduleRender(PortalTypes_1.DIRTY_ALL); }
    pushInternalLog(msg, type = 'INFO') { this.logs.unshift({ message: msg, type, timestamp: new Date().toLocaleTimeString() }); if (this.currentView !== 'welcome')
        this.scheduleRender(PortalTypes_1.DIRTY_SIDEBAR); }
    setWelcomeError(error) { this.welcomeError = error; this.scheduleRender(PortalTypes_1.DIRTY_WELCOME); }
    updateStreamingChunk(agent, chunk) {
        const streamingId = `u-stream-${agent.code}-${agent.round}`;
        const el = document.getElementById(streamingId);
        const scrollEl = document.getElementById('u-chat-scroll');
        if (el) {
            // 🚀 INDUSTRIAL_CLEANUP: Remove placeholder on first real chunk
            const placeholder = el.querySelector('.animate-pulse');
            if (placeholder) {
                el.innerHTML = '';
            }
            el.appendChild(document.createTextNode(chunk));
            if (scrollEl)
                scrollEl.scrollTop = scrollEl.scrollHeight;
        }
    }
    patchDecisionTree(mainCont, html) {
        const temp = document.createElement('div');
        temp.innerHTML = html;
        const newList = temp.querySelector('#u-decision-activity-list');
        const oldList = mainCont.querySelector('#u-decision-activity-list');
        if (newList && oldList && newList.innerHTML !== oldList.innerHTML) {
            oldList.innerHTML = newList.innerHTML;
        }
        const newInd = temp.querySelector('#u-decision-streaming-indicator');
        const oldInd = mainCont.querySelector('#u-decision-streaming-indicator');
        if (newInd && oldInd && newInd.innerHTML !== oldInd.innerHTML) {
            oldInd.innerHTML = newInd.innerHTML;
        }
    }
    async loadAgentPrompt(agentCode) {
        const mapping = {
            'A1': 'agent_a1_researcher.md',
            'A2': 'agent_a2_analyzer.md',
            'A3': 'agent_a3_codegen.md',
            'A4': 'agent_a4_refiner.md',
            'A5': 'agent_a5_evaluator.md',
            'A6': 'agent_a6_manager.md'
        };
        const fileName = mapping[agentCode];
        if (!fileName)
            return;
        try {
            const res = await fetch(`./prompt/${fileName}`);
            if (res.ok) {
                const text = await res.text();
                this.selectedAgentPromptContent = text;
                this.agentPrompts[agentCode] = text;
                this.scheduleRender(PortalTypes_1.DIRTY_ALL);
            }
        }
        catch (e) {
            console.error('FAILED_TO_LOAD_PROMPT:', e);
        }
    }
    async loadAgentPromptToMap(agentCode) {
        const mapping = {
            'A1': 'agent_a1_researcher.md',
            'A2': 'agent_a2_analyzer.md',
            'A3': 'agent_a3_codegen.md',
            'A4': 'agent_a4_refiner.md',
            'A5': 'agent_a5_evaluator.md',
            'A6': 'agent_a6_manager.md'
        };
        const fileName = mapping[agentCode];
        if (!fileName)
            return;
        try {
            const res = await fetch(`./prompt/${fileName}`);
            if (res.ok) {
                this.agentPrompts[agentCode] = await res.text();
            }
        }
        catch (e) {
            console.error('BOOT_LOAD_PROMPT_FAIL:', e);
        }
    }
    async loadCoreProtocol() {
        try {
            const res = await fetch('./prompt/system_core_protocol.md');
            if (res.ok)
                this.coreProtocol = await res.text();
        }
        catch (e) {
            console.error('BOOT_LOAD_CORE_PROTOCOL_FAIL:', e);
        }
    }
}
exports.AZPortal = AZPortal;
customElements.define('az-portal', AZPortal);
