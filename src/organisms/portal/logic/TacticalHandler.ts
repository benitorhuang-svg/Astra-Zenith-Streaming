import { PortalContext, DIRTY_ALL, DIRTY_CONTENT } from '../PortalTypes';

export class TacticalHandler {
    constructor(private context: PortalContext) {}

    public handle(e: Event, find: (selector: string) => HTMLElement | undefined): boolean {
        // Clear Mission
        if (find('#u-btn-clear-mission') || find('#u-btn-clear-all')) {
            this.context.messages = [];
            this.context.activePrompt = '';
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
        if (find('#u-mission-action')) {
            if (this.context.isStreaming) this.context.stopFlow();
            else this.runFlow();
            return true;
        }

        // Run Flow (Custom)
        if (find('#u-btn-run-flow')) {
            this.runFlow();
            return true;
        }

        // Cycles
        if (find('#u-btn-cycle-up')) {
            if (this.context.pollingCycles < 5) { 
                this.context.pollingCycles++; 
                this.context.scheduleRender(DIRTY_ALL); 
            }
            return true;
        }
        if (find('#u-btn-cycle-down')) {
            if (this.context.pollingCycles > 1) { 
                this.context.pollingCycles--; 
                this.context.scheduleRender(DIRTY_ALL); 
            }
            return true;
        }

        // Filters
        const passAll = find('.u-btn-pass-all');
        if (passAll) {
            console.log('[Tactical] Switching to ALL mode');
            this.context.filterRound = 'all';
            this.context.scheduleRender(DIRTY_CONTENT); // 🚀 SET_MASK
            (this.context as any)._p.performRender();    // 🚀 IMMEDIATE_SYNC
            setTimeout(() => {
                const scrollEl = document.getElementById('u-chat-scroll');
                if (scrollEl) scrollEl.scrollTop = scrollEl.scrollHeight;
            }, 10);
            return true;
        }
        const passRound = find('.u-btn-pass-round');
        if (passRound) {
            const roundStr = passRound.getAttribute('data-round');
            if (roundStr) {
                console.log(`[Tactical] Switching to Round: ${roundStr}`);
                const roundNum = parseInt(roundStr);
                this.context.filterRound = roundNum;
                this.context.scheduleRender(DIRTY_CONTENT); // 🚀 SET_MASK
                (this.context as any)._p.performRender();    // 🚀 IMMEDIATE_SYNC
                setTimeout(() => {
                    const scrollEl = document.getElementById('u-chat-scroll');
                    if (scrollEl) scrollEl.scrollTop = 0;
                }, 10);
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
