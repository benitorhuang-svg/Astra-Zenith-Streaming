import { PortalContext, DIRTY_ALL } from '../../az_portal';
import { handlePointerDown } from './PortalDragHandler';
import { IdentityHandler } from './IdentityHandler';
import { TacticalHandler } from './TacticalHandler';
import { PortalArchive } from '../PortalTypes';

export class AZPortalInteractionHandler {
    private identity: IdentityHandler;
    private tactical: TacticalHandler;

    constructor(private context: PortalContext) {
        this.identity = new IdentityHandler(context);
        this.tactical = new TacticalHandler(context);
    }

    public onDelegatedClick(e: Event): void {
        const target = e.target as HTMLElement;

        if (this.handleNavigation(target)) return;
        if (this.identity.handle(target)) return;
        if (this.tactical.handle(target)) return;
        if (this.handleArchive(target)) return;
    }

    private handleNavigation(target: HTMLElement): boolean {
        if (target.closest('#u-tab-chat')) { this.context._p.handleModeSwitch('chat'); return true; }
        if (target.closest('#u-tab-pathway')) { this.context._p.handleModeSwitch('decision-tree'); return true; }
        if (target.closest('#u-tab-archive')) { this.context._p.handleModeSwitch('archive'); return true; }
        if (target.closest('#u-tab-logs')) { this.context._p.handleModeSwitch('logs'); return true; }

        if (target.closest('#u-sidebar-topology-icon')) {
            const current = this.context.currentTopology || 'linear';
            const next = current === 'linear' ? 'orbital' : (current === 'orbital' ? 'custom' : 'linear');
            this.context._p.handleTopologySwitch(next);
            return true;
        }

        if (target.closest('#u-btn-add-node')) {
            this.context.workflow?.handleAddNode();
            return true;
        }

        return false;
    }

    private handleArchive(target: HTMLElement): boolean {
        const visualBtn = target.closest('.u-btn-archive-visualize') as HTMLElement;
        if (visualBtn) {
            const archId = visualBtn.getAttribute('data-arch-id');
            const arch = this.context.archives.find((a: PortalArchive) => a.id === archId);
            if (arch && !arch.isImage) {
                const prompt = `Create an industrial-grade tactical infographic summarizing: ${arch.title}`;
                void this.context.workflow?.handleVisualize(prompt);
            }
            return true;
        }

        const archiveItem = target.closest('[data-archive-id]');
        if (archiveItem) {
            const aid = archiveItem.getAttribute('data-archive-id');
            if (aid) { 
                this.context._p.selectedArchiveId = aid; 
                this.context.scheduleRender(DIRTY_ALL); 
            }
            return true;
        }
        return false;
    }

    public onDelegatedPointerDown(e: PointerEvent): void {
        const target = e.target as HTMLElement;
        const agentItem = target.closest('[data-agent-code], [data-code], az-agent-unit');
        if (agentItem) {
            const code = agentItem.getAttribute('data-agent-code') || 
                         agentItem.getAttribute('data-code') || 
                         agentItem.getAttribute('code');
            if (code) {
                e.preventDefault();
                handlePointerDown(e, code, this.context);
            }
        }
    }

    public onDelegatedInput(e: Event): void {
        const target = e.target as HTMLTextAreaElement;
        if (target && target.id === 'u-mission-input') {
            this.context.activePrompt = target.value;
            this.context._p.activePrompt = target.value;
        }
    }

    public onDelegatedKeyDown(e: KeyboardEvent): void {
        if (e.key === 'Enter' && !this.context.isStreaming) {
            const focused = document.activeElement;
            if (focused && focused.id === 'u-mission-input') {
                void this.context.workflow?.handleRunFlow();
            }
        }
    }
}
