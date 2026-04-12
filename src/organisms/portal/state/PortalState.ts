import { 
    PortalView, PortalArchive, PortalTelemetry, 
    PortalTopology, ChatMessage, PortalExecutionTask,
    PortalContext, DIRTY_ALL
} from '../PortalTypes';
import { AGENT_POOL } from '../../../core/agents';

/**
 * PortalState — Centralized state management for AZPortal
 */
export class PortalState {
    public currentView: 'welcome' | PortalView = 'welcome';
    public messages: ChatMessage[] = [];
    public archives: PortalArchive[] = [];
    public activePrompt = '';
    public currentPasses = 0;
    public currentTopology: PortalTopology = 'linear';
    public tableParticipants: (string | null)[] = ['A1', 'A2', null, null, null, null, null, null];
    public isStreaming = false;
    public executionQueue: PortalExecutionTask[] = [];
    public logs: any[] = [];
    public apiKey = '';
    public billingTier: 'FREE' | 'PAID' | 'OFFLINE' = 'OFFLINE';
    public pollingCycles = 3;
    public serverAuthorized = false;
    public welcomeError = '';
    public selectedArchiveId: string | null = null;
    public telemetryState: PortalTelemetry = {
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
    public filterRound: number | 'all' = 'all';
    public n8nFlow: any = null;
    public isEditingTask = false;
    public selectedAgentForTask: string | null = null;
    public selectedAgentInfo: string | null = null;
    public selectedAgentPromptContent: string | null = null;
    public agentPrompts: Record<string, string> = {};
    public agentModels: Record<string, string> = {};
    public coreProtocol: string = '';

    public createContext(host: any): PortalContext {
        return {
            get messages() { return host.state.messages; },
            set messages(v) { host.state.messages = v; },
            get archives() { return host.state.archives; },
            set archives(v) { host.state.archives = v; },
            get currentView() { return host.state.currentView; },
            set currentView(v) { host.state.currentView = v; },
            get currentTopology() { return host.state.currentTopology; },
            set currentTopology(v) { host.state.currentTopology = v; },
            get activePrompt() { return host.state.activePrompt; },
            set activePrompt(v) { host.state.activePrompt = v; },
            get currentPasses() { return host.state.currentPasses; },
            set currentPasses(v) { host.state.currentPasses = v; },
            tableParticipants: this.tableParticipants,
            get isStreaming() { return host.state.isStreaming; },
            set isStreaming(v) { host.state.isStreaming = v; },
            agentPool: AGENT_POOL, 
            get executionQueue() { return host.state.executionQueue; },
            set executionQueue(v) { host.state.executionQueue = v; },
            get apiKey() { return host.state.apiKey; },
            set apiKey(v) { host.state.apiKey = v; },
            get billingTier() { return host.state.billingTier; },
            set billingTier(v) { host.state.billingTier = v; },
            get pollingCycles() { return host.state.pollingCycles; },
            set pollingCycles(v: number) { host.state.pollingCycles = v; },
            scheduleRender: (m: number) => host.scheduleRender(m),
            pushInternalLog: (m: string, t?: string) => host.pushInternalLog(m, t),
            setWelcomeError: (e: string) => host.setWelcomeError(e),
            handleModeSwitch: (v: PortalView | 'welcome') => host.handleModeSwitch(v),
            handleTopologySwitch: (t: PortalTopology) => host.handleTopologySwitch(t),
            workflow: null, stopRequested: false, 
            stopFlow: () => { host.state.isStreaming = false; host.scheduleRender(DIRTY_ALL); },
            updateStreamingChunk: (a: any, c: string) => host.updateStreamingChunk(a, c),
            get filterRound() { return host.state.filterRound; },
            set filterRound(v: number | 'all') { host.state.filterRound = v; },
            _p: host.state, activeDrag: null
        } as any;
    }
}
