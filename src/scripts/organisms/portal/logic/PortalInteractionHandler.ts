import { PortalContext, DIRTY_ALL } from '../PortalTypes';
import { AGENT_POOL } from '../../../core/agents';
import { handlePointerDown, handlePointerMove, handlePointerUp } from './PortalDragHandler';
import { IdentityHandler } from './IdentityHandler';
import { TacticalHandler } from './TacticalHandler';

/**
 * PortalInteractionHandler — Robust Event Orchestrator
 * Ultra-stable implementation with behavior suspension and error isolation.
 */
export class AZPortalInteractionHandler {
    private identity: IdentityHandler;
    private tactical: TacticalHandler;

    constructor(private context: PortalContext) {
        this.identity = new IdentityHandler(context);
        this.tactical = new TacticalHandler(context);
    }

    public onDelegatedClick(e: Event): void {
        try {
            const path = (e.composedPath() as HTMLElement[]) || [];
            if (path.length === 0) return;

            const find = (selector: string) => path.find(el => el instanceof HTMLElement && el.matches(selector));
            const target = path[0] as HTMLElement;

            // Navigation - Intercept and Prevent Default
            const chatTab = find('#h-btn-chat');
            if (chatTab) { e.preventDefault(); this.context._p.handleModeSwitch('chat'); return; }
            const pathTab = find('#h-btn-pathway');
            if (pathTab) { e.preventDefault(); this.context._p.handleModeSwitch('decision-tree'); return; }
            const archTab = find('#h-btn-archive');
            if (archTab) { e.preventDefault(); this.context._p.handleModeSwitch('archive'); return; }
            const logTab = find('#h-btn-realtime'); // Match Header.ts
            if (logTab) { e.preventDefault(); this.context._p.handleModeSwitch('logs'); return; }
            const flowTab = find('#h-btn-custom-flow'); 
            if (flowTab) { e.preventDefault(); this.context._p.handleModeSwitch('table'); return; }

            // Footer / Topology Switch Events
            if (find('#u-topology-linear')) { e.preventDefault(); this.context._p.handleTopologySwitch('linear'); return; }
            if (find('#u-topology-orbital')) { e.preventDefault(); this.context._p.handleTopologySwitch('orbital'); return; }
            if (find('#u-topology-custom')) { e.preventDefault(); this.context._p.handleTopologySwitch('custom'); return; }
            if (find('#u-btn-run-flow')) { e.preventDefault(); void this.context.workflow?.handleRunFlow(); return; }
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

            const sidebarAgent = find('.u-sidebar-agent-item');
            if (sidebarAgent) {
                e.preventDefault();
                const code = sidebarAgent.getAttribute('data-code');
                if (code) {
                    this.context._p.selectedAgentInfo = code;
                    this.context._p.loadAgentPrompt(code);
                    this.context.scheduleRender(DIRTY_ALL);
                }
                return;
            }

            if (find('#u-btn-close-bubble')) {
                e.preventDefault();
                this.context._p.selectedAgentInfo = null;
                this.context._p.selectedAgentPromptContent = null;
                this.context.scheduleRender(DIRTY_ALL);
                return;
            }

            // Apply Tactical Update from Bubble (Modular Version)
            if (find('#u-btn-bubble-apply')) {
                e.preventDefault();
                const pText = (document.getElementById('u-editor-personality') as HTMLTextAreaElement)?.value || '';
                const tText = (document.getElementById('u-editor-protocol') as HTMLTextAreaElement)?.value || '';
                const eText = (document.getElementById('u-editor-expertise') as HTMLTextAreaElement)?.value || '';
                
                const nameEditor = document.getElementById('u-bubble-agent-name') as HTMLElement;
                const agentCode = this.context._p.selectedAgentInfo;

                // Reconstruct full markdown
                const combinedPrompt = [
                    `## 人格特質\n${pText}`,
                    `## 行為協定\n${tText}`,
                    `## 專業領域\n${eText}`
                ].join('\n\n');
                
                this.context.activePrompt = combinedPrompt;
                this.context._p.selectedAgentPromptContent = combinedPrompt;
                if (agentCode) {
                    this.context._p.agentPrompts[agentCode] = combinedPrompt;
                }
                this.context._p.pushInternalLog(`TACTICAL_MODULAR_UDPATE: ${agentCode}`, 'SUCCESS');
                
                if (nameEditor && agentCode) {
                    const agent = AGENT_POOL.find(a => a.code === agentCode);
                    if (agent) agent.name = nameEditor.innerText.trim();
                }

                this.context.scheduleRender(DIRTY_ALL);
                return;
            }

            // Tactical Capsule Switch Logic
            const capsule = find('.u-tactical-capsule');
            if (capsule) {
                e.preventDefault();
                const mid = capsule.getAttribute('data-module-id');
                
                // UI State Update (Direct DOM manipulation for instant feedback)
                document.querySelectorAll('.u-tactical-capsule').forEach(el => {
                    el.classList.remove('border-primary', 'shadow-[0_0_15px_rgba(var(--primary-rgb),0.2)]', 'text-primary');
                    el.classList.add('border-white/10', 'text-white/40');
                    el.querySelector('.rounded-full')?.classList.remove('bg-primary');
                    el.querySelector('.rounded-full')?.classList.add('bg-white/10');
                    el.querySelector('.animate-pulse')?.remove();
                });
                
                capsule.classList.remove('border-white/10', 'text-white/40');
                capsule.classList.add('border-primary', 'shadow-[0_0_15px_rgba(var(--primary-rgb),0.2)]', 'text-primary');
                capsule.querySelector('.rounded-full')?.classList.remove('bg-white/10');
                capsule.querySelector('.rounded-full')?.classList.add('bg-primary');
                capsule.insertAdjacentHTML('beforeend', '<div class="absolute inset-0 bg-primary/5 animate-pulse"></div>');

                // Toggle Textareas
                document.querySelectorAll('.u-modular-textarea').forEach(el => el.classList.add('hidden'));
                document.getElementById(`u-editor-${mid}`)?.classList.remove('hidden');
                return;
            }

            // Reset Tactical Info from Bubble
            if (find('#u-btn-bubble-reset')) {
                e.preventDefault();
                const agentCode = this.context._p.selectedAgentInfo;
                if (agentCode) {
                    this.context._p.loadAgentPrompt(agentCode); // Re-fetch from .md file
                    this.context._p.pushInternalLog(`TACTICAL_RESET: Agent_${agentCode}`, 'WARNING');
                }
                return;
            }

            // Focus Name Editor on Pen Click
            if (target.closest('.u-bubble-pen-icon')) {
                e.preventDefault();
                const nameEditor = document.getElementById('u-bubble-agent-name');
                if (nameEditor) {
                    nameEditor.focus();
                    // Place cursor at end
                    const range = document.createRange();
                    const sel = window.getSelection();
                    range.selectNodeContents(nameEditor);
                    range.collapse(false);
                    sel?.removeAllRanges();
                    sel?.addRange(range);
                }
                return;
            }

            // Close bubble if clicking outside
            if (this.context._p.selectedAgentInfo && !find('#u-agent-info-bubble') && !find('.u-sidebar-agent-item')) {
                this.context._p.selectedAgentInfo = null;
                this.context._p.selectedAgentPromptContent = null;
                this.context.scheduleRender(DIRTY_ALL);
            }

            // Task Input Delegate
            if (target.id === 'u-task-input') {
                this.context._p.activePrompt = (target as HTMLTextAreaElement).value;
                return;
            }
            
            // Delegate to sub-handlers with protection
            if (this.identity.handle(e)) { e.preventDefault(); return; }
            if (this.tactical.handle(target)) { e.preventDefault(); return; }
            
            // ... (rest of archives etc)
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
                    // INDUSTRIAL FEATURE: In Custom mode, clicking an already seated agent opens the TASK EDITOR
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
        if (e.key === 'Enter' && !this.context.isStreaming) {
            const focused = document.activeElement;
            if (focused && (focused.id === 'u-mission-input' || focused.tagName === 'TEXTAREA')) {
                e.preventDefault();
                void this.context.workflow?.handleRunFlow();
            }
        }
    }
}
