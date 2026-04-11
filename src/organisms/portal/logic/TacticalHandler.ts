import { PortalContext, DIRTY_ALL, DIRTY_CONTENT } from '../PortalTypes';

export class TacticalHandler {
    constructor(private context: PortalContext) {}

    public handle(target: HTMLElement): boolean {
        // Clear Mission
        if (target.closest('#u-btn-clear-mission') || target.closest('#u-btn-clear-all')) {
            this.context.messages = [];
            this.context._p.messages = [];
            this.context.activePrompt = '';
            this.context._p.activePrompt = '';
            this.context.currentPasses = 0;
            this.context.isStreaming = false;
            this.context.tableParticipants.fill(null);
            this.context.executionQueue = [];
            
            // Purge Semantic Graph Global State
            const win = window as any;
            win.semanticNodes = [];
            win.semanticLinks = [];
            
            this.context.scheduleRender(DIRTY_ALL);
            return true;
        }

        // Action (Play/Stop)
        if (target.closest('#u-mission-action')) {
            if (this.context.isStreaming) this.context.stopFlow();
            else this.runFlow();
            return true;
        }

        // Run Flow (Custom)
        if (target.closest('#u-btn-run-flow')) {
            this.runFlow();
            return true;
        }

        // Cycles
        if (target.closest('#u-btn-cycle-up')) {
            if (this.context.pollingCycles < 5) { 
                this.context.pollingCycles++; 
                this.context.scheduleRender(DIRTY_ALL); 
            }
            return true;
        }
        if (target.closest('#u-btn-cycle-down')) {
            if (this.context.pollingCycles > 1) { 
                this.context.pollingCycles--; 
                this.context.scheduleRender(DIRTY_ALL); 
            }
            return true;
        }

        // Filters (Added missing logic from m_portal_hud)
        const passAll = target.closest('.u-btn-pass-all');
        if (passAll) {
            this.context._p.filterRound = 'all';
            this.context.scheduleRender(DIRTY_CONTENT);
            return true;
        }
        const passRound = target.closest('.u-btn-pass-round');
        if (passRound) {
            const round = passRound.getAttribute('data-round');
            if (round) {
                this.context._p.filterRound = parseInt(round);
                this.context.scheduleRender(DIRTY_CONTENT);
            }
            return true;
        }

        return false;
    }

    private runFlow() {
        const prompt = this.context.activePrompt.trim();
        if (!prompt) return;
        this.context.scheduleRender(DIRTY_CONTENT);
        void this.context.workflow?.handleRunFlow();
    }
}
