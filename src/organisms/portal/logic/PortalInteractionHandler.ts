import { PortalContext, DIRTY_ALL, DIRTY_CONTENT } from '../PortalTypes';
import { handlePointerDown, handlePointerMove, handlePointerUp } from './PortalDragHandler';
import { IdentityHandler } from './IdentityHandler';
import { TacticalHandler } from './TacticalHandler';
import { NavigationHandler } from './handlers/NavigationHandler';
import { TopologyHandler } from './handlers/TopologyHandler';
import { AgentBubbleHandler } from './handlers/AgentBubbleHandler';
import { ArchiveHandler } from './handlers/ArchiveHandler';

/**
 * PortalInteractionHandler — Robust Event Orchestrator
 * Ultra-stable implementation with behavior suspension and error isolation.
 */
export class AZPortalInteractionHandler {
    private identity: IdentityHandler;
    private tactical: TacticalHandler;
    private navigation: NavigationHandler;
    private topology: TopologyHandler;
    private agentBubble: AgentBubbleHandler;
    private archive: ArchiveHandler;

    constructor(private context: PortalContext) {
        this.identity = new IdentityHandler(context);
        this.tactical = new TacticalHandler(context);
        this.navigation = new NavigationHandler(context);
        this.topology = new TopologyHandler(context);
        this.agentBubble = new AgentBubbleHandler(context);
        this.archive = new ArchiveHandler(context);
    }

    public onDelegatedClick(e: Event): void {
        try {
            const path = (e.composedPath() as HTMLElement[]) || [];
            if (path.length === 0) return;

            const find = (selector: string) => path.find(el => el instanceof HTMLElement && el.matches(selector));
            const target = path[0] as HTMLElement;

            // 1. Navigation
            if (this.navigation.handle(e, find)) return;

            // 2. Topology
            if (this.topology.handle(e, find)) return;
            
            // 3. Task / Flow Controls
            if (find('#u-btn-run-flow') || find('#u-mission-action')) { e.preventDefault(); void this.context.workflow?.handleRunFlow(); return; }
            if (find('#u-btn-close-task')) {
                e.preventDefault();
                this.context._p.isEditingTask = false;
                this.context.scheduleRender(DIRTY_ALL);
                return;
            }
            if (find('#u-btn-confirm-task')) {
                e.preventDefault();
                this.context._p.isEditingTask = false;
                this.context.scheduleRender(DIRTY_ALL);
                return;
            }

            // 4. Graph Controls
            if (find('#u-btn-reset-graph')) {
                e.preventDefault();
                (window as any).semanticNodes = [];
                (window as any).semanticLinks = [];
                this.context.scheduleRender(DIRTY_CONTENT);
                return;
            }
            if (find('#u-btn-refresh-graph')) {
                e.preventDefault();
                this.context.scheduleRender(DIRTY_CONTENT);
                return;
            }

            // 5. Agent Bubble & Info
            if (this.agentBubble.handle(e, find, target)) return;

            // 6. Identity & Auth (Login, Avatar, etc.)
            if (this.identity.handle(e)) { e.preventDefault(); return; }

            // 7. Tactical & Mission Controls
            if (this.tactical.handle(e, find)) { e.preventDefault(); return; }
            
            // 8. Archive Logic
            if (this.archive.handle(e, find)) return;

            // 9. Task Input Delegate
            if (target.id === 'u-task-input') {
                this.context._p.activePrompt = (target as HTMLTextAreaElement).value;
                return;
            }
        } catch (err) {
            console.error("Critical Interaction Failure:", err);
        }
    }

    public onDelegatedPointerDown(e: PointerEvent): void {
        try {
            const path = (e.composedPath() as HTMLElement[]) || [];
            if (path.find(el => el.id === 'u-portal-sidebar')) return; 
            
            const find = (selector: string) => path.find(el => el.matches && el.matches(selector));
            
            const agentItem = find('[data-agent-code], [data-code], az-agent-unit');
            if (agentItem) {
                const code = agentItem.getAttribute('data-agent-code') || 
                             agentItem.getAttribute('data-code') || 
                             agentItem.getAttribute('code');
                
                if (code) {
                    if (this.context.currentTopology === 'custom') {
                        const isSeated = this.context.tableParticipants.includes(code);
                        if (isSeated) {
                            e.preventDefault();
                            this.context._p.selectedAgentForTask = code;
                            this.context._p.isEditingTask = true;
                            this.context.scheduleRender(DIRTY_ALL);
                            return;
                        }
                    }

                    e.preventDefault();
                    handlePointerDown(e, code, this.context as any);
                }
            }
        } catch (err) {
            console.error("Pointer Down Failure:", err);
        }
    }

    public onDelegatedInput(e: Event): void {
        const target = e.target as HTMLTextAreaElement;
        if (target && target.id === 'u-mission-input') {
            this.context.activePrompt = target.value;
            this.context._p.activePrompt = target.value;
        }
    }

    public onDelegatedChange(e: Event): void {
        const target = e.target as HTMLSelectElement;
        if (target && target.id === 'u-model-selector') {
            const agentCode = this.context._p.selectedAgentInfo;
            if (agentCode) {
                this.context._p.agentModels[agentCode] = target.value;
                this.context._p.pushInternalLog(`MODEL_UPDATE: ${agentCode} -> ${target.value}`, 'INFO');
            }
        }
    }

    public onGlobalPointerMove(e: PointerEvent): void {
        if (this.context.activeDrag) {
            handlePointerMove(e, this.context.activeDrag);
        }
    }

    public onGlobalPointerUp(_e: PointerEvent): void {
        if (this.context.activeDrag) {
            handlePointerUp(
                this.context.activeDrag,
                this.context.tableParticipants,
                (idx, code) => { 
                    this.context.tableParticipants[idx] = code; 
                    this.context.scheduleRender(DIRTY_ALL); 
                },
                (idx) => { 
                    this.context.tableParticipants[idx] = null; 
                    this.context.scheduleRender(DIRTY_ALL); 
                },
                () => { this.context.scheduleRender(DIRTY_ALL); }
            );
            this.context.activeDrag = null;
        }
    }

    public onDelegatedKeyDown(e: KeyboardEvent): void {
        const target = e.target as HTMLElement;
        const isInput = target && (target.id === 'u-mission-input' || target.id === 'u-task-input' || target.tagName === 'TEXTAREA');

        if (e.key === 'Enter' && isInput && !this.context.isStreaming) {
            if (e.shiftKey && target.tagName === 'TEXTAREA') return;

            e.preventDefault();
            
            const value = (target as HTMLInputElement | HTMLTextAreaElement).value;
            this.context.activePrompt = value;
            this.context._p.activePrompt = value;

            if (value.trim().length > 0) {
                void this.context.workflow?.handleRunFlow();
                (target as HTMLInputElement).value = '';
            }
        }
    }
}
