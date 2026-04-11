/**
 * AZ PORTAL SEATS VIEW — Synergy Node Orchestration Matrix
 * High-fidelity workstation management for the Astra Zenith mission.
 */

import type { Agent } from '../../../core/agents';
import { renderAgentSeat } from './TableComponent';
import { renderN8NFlowChart } from '../../../integrations/n8n/n8n_flow_renderer';
import type { N8NWorkflow } from '../../../integrations/n8n/n8n_data_types';
import { renderCommonFooter } from '../../../molecules/m_portal_content_footer';

export const renderSeatsView = (
    tableParticipants: (string | null)[] = [], 
    agentPool: Agent[], 
    currentTopology: 'linear' | 'orbital' | 'custom' = 'linear',
    n8nFlow?: N8NWorkflow,
    justLandedIndex: number | null = null,
    modelConfigs: any[] = [],
    isEditingTask = false,
    activePrompt = ''
) => {
    // INDUSTRIAL FIX: Enforce 8-slot limit for consistency with AZPortal state
    let slots = tableParticipants.slice(0, 8); 

    // INDUSTRIAL FEATURE: In "Custom" mode, the main workspace ONLY shows the FIRST agent
    if (currentTopology === 'custom') {
        const firstActiveIndex = slots.findIndex(c => c !== null);
        if (firstActiveIndex !== -1) {
            // Filter slots to only contain the first active one, others become null in the visual layer
            slots = slots.map((c, i) => i === firstActiveIndex ? c : null);
        }
    }

    return `
        <div class="h-full flex flex-col relative overflow-hidden bg-transparent">
            <!-- Content Area: Responsive Flex Container -->
            <div class="flex-1 relative overflow-hidden flex items-center justify-center p-4">
                <!-- Tactical Layers -->
                <div class="absolute inset-0 opacity-10 pointer-events-none g-tactical-grid"></div>
                
                <!-- Orchestration Frame -->
                <div class="absolute left-1/2 top-1/2 w-[1300px] h-[600px] -translate-x-1/2 -translate-y-1/2 origin-center transition-all duration-500 pointer-events-auto scale-[0.6] md:scale-[0.7] lg:scale-[0.8] xl:scale-[0.85] 2xl:scale-[1]">
                    <!-- Logic Flow SVG Layer -->
                    <div class="absolute inset-0 z-10 pointer-events-none">
                        ${renderN8NFlowChart(currentTopology, n8nFlow)}
                    </div>
    
                    <!-- Agent Workstations -->
                    <div class="absolute inset-0 z-50 pointer-events-none">
                        ${slots.map((c, i) => {
                            // INDUSTRIAL FIX: In Linear/Orbital, we MUST render the placeholder boxes (null slots)
                            // In Custom, we only render where there is an agent or a defined n8n node 
                            if (currentTopology === 'custom' && !c) return ''; 
                            
                            const agent = agentPool.find(a => a.code === c) || null;
                            let customPos: [number, number] | undefined;
                            
                            if (currentTopology === 'custom' && n8nFlow?.nodes?.[i]) {
                                const node = n8nFlow.nodes[i];
                                customPos = [node.position[0], node.position[1] + 40];
                            }
                            
                            const config = modelConfigs.find(cfg => cfg.id === c);
                            const modelName = config ? config.model : 'gemini-3-flash';

                            return renderAgentSeat(i, agent, currentTopology, i === justLandedIndex, customPos, null, '', modelName);
                        }).join('')}
                    </div>
                </div>

                <!-- Mission Task Overlay (Custom Mode Interaction) -->
                ${isEditingTask ? `
                    <div class="absolute inset-0 z-100 flex items-center justify-center bg-transparent animate-fade-in pointer-events-auto">
                        <div class="w-[500px] p-6 bg-[#0a0f18]/90 backdrop-blur-3xl border border-white/20 rounded-sm shadow-[0_0_100px_rgba(0,0,0,0.8)] flex flex-col gap-4 ring-1 ring-white/10">
                            <div class="flex items-center justify-between border-b border-white/10 pb-3">
                                <div class="flex items-center gap-3">
                                    <div class="w-1.5 h-1.5 bg-primary shadow-[0_0_10px_#00f7ff] animate-pulse"></div>
                                    <span class="text-[11px] font-mono font-black text-white/90 uppercase tracking-widest">任務指令設定 | TASK_ASSIGNMENT</span>
                                </div>
                                <button id="u-btn-close-task" class="text-white/40 hover:text-white transition-colors cursor-pointer">
                                    <i data-lucide="x" class="w-4 h-4"></i>
                                </button>
                            </div>
                            
                            <textarea id="u-task-input" 
                                      class="w-full h-36 bg-black/60 border border-white/10 p-4 text-[13px] font-mono text-white/90 focus:border-primary/50 outline-none resize-none u-scrollbar placeholder:text-white/10"
                                      placeholder="ENTER_MISSION_OBJECTIVES...">${activePrompt}</textarea>
                            
                            <div class="flex justify-end gap-3 mt-2">
                                <az-button id="u-btn-confirm-task" label="確認指令 / DEPLOY" variant="highlight" size="sm" icon="check"></az-button>
                            </div>
                        </div>
                    </div>
                ` : ''}
            </div>

            <!-- Orchestration Footer -->
            <div class="z-50 shrink-0">
                ${renderOrchestrationFooter(agentPool, tableParticipants, currentTopology)}
            </div>
        </div>
    `;
};

function renderOrchestrationFooter(agentPool: Agent[], tableParticipants: (string | null)[], currentTopology: 'linear' | 'orbital' | 'custom'): string {
    const pooledAgents = agentPool.filter(a => !tableParticipants.includes(a.code));
    
    // INDUSTRIAL FIX: In Custom mode, only show THE FIRST ALREADY SEATED agent in the workspace (handled in renderSeatsView)
    // AND show ALL unplaced agents in the pool here.
    const limit = 6; 
    
    return renderCommonFooter({
        containerClass: 'px-0',
        left: `
            <div class="flex items-stretch gap-0 whitespace-nowrap border-r border-white/10 h-full">
                <button id="u-topology-linear" class="group flex items-center gap-2.5 px-6 h-full transition-all font-mono text-[10px] font-bold shrink-0 border-r border-white/5 ${currentTopology === 'linear' ? 'bg-primary/20 text-primary' : 'bg-transparent text-white/40 hover:text-white hover:bg-white/5'}">
                    <i data-lucide="more-horizontal" class="w-4.5 h-4.5"></i>
                    <div class="flex flex-col items-start leading-none gap-0.5 ml-2">
                        <span class="text-[10px]">線性鏈路</span>
                        <span class="text-[6px] opacity-40 uppercase">LINEAR_RELAY</span>
                    </div>
                </button>
                <button id="u-topology-orbital" class="group flex items-center gap-2.5 px-6 h-full transition-all font-mono text-[10px] font-bold shrink-0 border-r border-white/5 ${currentTopology === 'orbital' ? 'bg-secondary/20 text-secondary' : 'bg-transparent text-white/40 hover:text-white hover:bg-white/5'}">
                    <i data-lucide="layout-grid" class="w-4.5 h-4.5"></i>
                    <div class="flex flex-col items-start leading-none gap-0.5 ml-2">
                        <span class="text-[10px]">戰略矩陣</span>
                        <span class="text-[6px] opacity-40 uppercase">STRATEGIC_MAP</span>
                    </div>
                </button>
                <button id="u-topology-custom" class="group flex items-center gap-2.5 px-6 h-full transition-all font-mono text-[10px] font-bold shrink-0 border-r border-white/5 ${currentTopology === 'custom' ? 'bg-primary/20 text-primary' : 'bg-transparent text-white/40 hover:text-white hover:bg-white/5'}">
                    <i data-lucide="move" class="w-4.5 h-4.5"></i>
                    <div class="flex flex-col items-start leading-none gap-0.5 ml-2">
                        <span class="text-[10px]">戰術自訂</span>
                        <span class="text-[6px] opacity-40 uppercase">TACTICAL_CUSTOM</span>
                    </div>
                </button>
            </div>
        `,
        center: `
            <div class="flex gap-4 items-center px-6 overflow-hidden">
                <div class="flex items-center gap-3">
                    ${pooledAgents.slice(0, limit).map(agent => `
                        <div class="u-agent-pool-item w-12 h-12 p-0.5 bg-white/5 border border-white/10 rounded-xs hover:border-primary transition-all relative overflow-hidden cursor-pointer shadow-lg" 
                             data-agent-code="${agent.code}">
                             <img src="images/${agent.img}" class="w-full h-full object-cover rounded-xs grayscale hover:grayscale-0 transition-all opacity-80 hover:opacity-100">
                        </div>
                    `).join('')}
                    ${pooledAgents.length > limit ? `<span class="text-[10px] text-white/10 font-mono tracking-tighter self-end mb-1">+${pooledAgents.length - limit}</span>` : ''}
                </div>
            </div>
        `,
        right: `
            <div class="flex items-center gap-6 px-6 h-full">
                ${currentTopology === 'custom' ? `
                    <button id="u-btn-run-flow" class="h-9 px-6 flex items-center gap-3 bg-secondary/20 border border-secondary/50 rounded-xs text-secondary hover:bg-secondary/40 transition-all shadow-[0_0_15px_rgba(var(--secondary-rgb),0.2)]">
                        <i data-lucide="play" class="w-3.5 h-3.5 fill-current"></i>
                        <span class="text-[9px] font-mono font-black uppercase tracking-widest">Execute_Flow</span>
                    </button>
                ` : ''}
                <div id="u-btn-close-portal" class="cursor-pointer">
                    <button class="w-9 h-9 flex items-center justify-center text-white/60 bg-primary/10 border border-primary/30 rounded-full hover:bg-primary/40 transition-all">
                        <i data-lucide="message-square" class="w-4 h-4"></i>
                    </button>
                </div>
            </div>
        `
    });
}
