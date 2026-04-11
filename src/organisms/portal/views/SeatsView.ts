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
                <az-task-overlay id="u-task-overlay" title="任務指令設定 | TASK_ASSIGNMENT" value="${activePrompt}" ${isEditingTask ? 'active' : ''}></az-task-overlay>
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
    const limit = 6; 
    
    return renderCommonFooter({
        containerClass: 'px-0',
        left: `
            <div class="flex items-stretch gap-0 whitespace-nowrap border-r border-white/10 h-full">
                <az-topology-button id="u-topology-linear" label="線性鏈路" sublabel="LINEAR_RELAY" icon="more-horizontal" ${currentTopology === 'linear' ? 'active' : ''}></az-topology-button>
                <az-topology-button id="u-topology-orbital" label="戰略矩陣" sublabel="STRATEGIC_MAP" icon="layout-grid" variant="secondary" ${currentTopology === 'orbital' ? 'active' : ''}></az-topology-button>
                <az-topology-button id="u-topology-custom" label="戰術自訂" sublabel="TACTICAL_CUSTOM" icon="move" ${currentTopology === 'custom' ? 'active' : ''}></az-topology-button>
            </div>
        `,
        center: `
            <div class="flex gap-4 items-center px-6 overflow-hidden">
                <div class="flex items-center gap-3">
                    ${pooledAgents.slice(0, limit).map(agent => `
                        <div class="u-agent-pool-item w-10 h-10 flex items-center justify-center bg-white/5 border border-white/10 rounded-xs hover:border-primary transition-all relative cursor-pointer shadow-lg" 
                             data-agent-code="${agent.code}">
                             <az-avatar url="images/${agent.img}" size="sm"></az-avatar>
                        </div>
                    `).join('')}
                    ${pooledAgents.length > limit ? `<span class="text-[10px] text-white/10 font-mono tracking-tighter self-end mb-1">+${pooledAgents.length - limit}</span>` : ''}
                </div>
            </div>
        `,
        right: `
            <div class="flex items-center gap-6 px-6 h-full">
                ${currentTopology === 'custom' ? `
                    <az-button id="u-btn-run-flow" label="Execute_Flow" icon="play" variant="secondary" size="sm"></az-button>
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
