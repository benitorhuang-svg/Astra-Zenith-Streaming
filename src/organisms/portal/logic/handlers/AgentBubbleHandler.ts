import { PortalContext, DIRTY_ALL } from '../../PortalTypes';
import { AGENT_POOL } from '../../../../core/agents';

/**
 * AgentBubbleHandler ??Handles agent bubble interaction (info bubble)
 */
export class AgentBubbleHandler {
    constructor(private context: PortalContext) {}

    public handle(e: Event, find: (selector: string) => HTMLElement | undefined, target: HTMLElement): boolean {
        const sidebarAgent = find('.u-sidebar-agent-item');
        if (sidebarAgent) {
            e.preventDefault();
            const code = sidebarAgent.getAttribute('data-code');
            if (code) {
                this.context._p.selectedAgentInfo = code;
                this.context._p.loadAgentPrompt(code);
                this.context.scheduleRender(DIRTY_ALL);
            }
            return true;
        }

        if (find('#u-btn-close-bubble')) {
            e.preventDefault();
            this.context._p.selectedAgentInfo = null;
            this.context._p.selectedAgentPromptContent = null;
            this.context.scheduleRender(DIRTY_ALL);
            return true;
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
                `## 鈭箸?寡釭\n${pText}`,
                `## 銵??\n${tText}`,
                `## 撠平??\n${eText}`
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
            return true;
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
            return true;
        }

        // Reset Tactical Info from Bubble
        if (find('#u-btn-bubble-reset')) {
            e.preventDefault();
            const agentCode = this.context._p.selectedAgentInfo;
            if (agentCode) {
                this.context._p.loadAgentPrompt(agentCode); // Re-fetch from .md file
                this.context._p.pushInternalLog(`TACTICAL_RESET: Agent_${agentCode}`, 'WARNING');
            }
            return true;
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
            return true;
        }

        // Close bubble if clicking outside
        if (this.context._p.selectedAgentInfo && !find('#u-agent-info-bubble') && !find('.u-sidebar-agent-item')) {
            this.context._p.selectedAgentInfo = null;
            this.context._p.selectedAgentPromptContent = null;
            this.context.scheduleRender(DIRTY_ALL);
            // Click outside doesn't necessarily mean it handled the click, but it's a side effect.
            // Let's return false to allow other interactions if needed, or true to consume it.
            // In the original file, it was just an if-check.
        }

        return false;
    }
}
