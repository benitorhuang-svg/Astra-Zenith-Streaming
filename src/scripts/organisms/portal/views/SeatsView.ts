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
    tableParticipants: (string | null)[] = [null, 'A1', null, 'A3', null, null], 
    agentPool: Agent[], 
    currentTopology: 'linear' | 'orbital' | 'custom' = 'linear',
    n8nFlow?: N8NWorkflow,
    justLandedIndex: number | null = null,
    modelConfigs: any[] = []
) => {
    return `
        <div class="u-portal-chat-container">
            <div class="flex-1 relative overflow-hidden flex items-center justify-center">
                <!-- Tactical Grid Background -->
                <div class="absolute inset-0 opacity-10 pointer-events-none g-tactical-grid"></div>
                
                <!-- Central Focus Vignette -->
                <div class="absolute inset-0 pointer-events-none g-vignette"></div>

                <!-- CORE ALIGNMENT CONTAINER -->
                <div class="absolute left-1/2 top-1/2 w-[1300px] h-[600px] origin-center transition-opacity duration-300 pointer-events-none u-core-alignment">
                    
                    <div class="relative w-full h-full pointer-events-auto">
                        <!-- Logic Process Mapping (SVG Layer) -->
                        ${renderN8NFlowChart(currentTopology, n8nFlow)}
        
                        <!-- Agent Workstations (Absolute UI Layers) -->
                        <div class="absolute inset-0 z-50 pointer-events-none">
                            ${tableParticipants.map((c, i) => {
                                const agent = agentPool.find(a => a.code === c) || null;
                                let customPos: [number, number] | undefined;
                                
                                if (currentTopology === 'custom' && n8nFlow?.nodes?.[i]) {
                                    const node = n8nFlow.nodes[i];
                                    customPos = [node.position[0], node.position[1] + 40];
                                } else if (currentTopology === 'custom' && !c) {
                                    return ''; 
                                }
                                
                                const config = modelConfigs.find(cfg => cfg.id === c);
                                const modelName = config ? config.model : 'gemini-3-flash';

                                return renderAgentSeat(i, agent, currentTopology, i === justLandedIndex, customPos, null, '', modelName);
                            }).join('')}
                        </div>
                    </div>
                </div>
            </div>

            <!-- Orchestration Footer -->
            ${renderOrchestrationFooter(agentPool, tableParticipants, currentTopology)}
        </div>
    `;
};

/**
 * MOLECULE: Orchestration Footer
 */
function renderOrchestrationFooter(agentPool: Agent[], tableParticipants: (string | null)[], currentTopology: 'linear' | 'orbital' | 'custom'): string {
    const pooledAgents = agentPool.filter(a => !tableParticipants.includes(a.code));
    
    return `            ${renderCommonFooter({
                containerClass: 'px-0', // Remove outer padding since we have internal borders/padding
                left: `
                    <!-- Topology Switcher / Custom Workflow Actions -->
                    <div class="flex items-stretch gap-0 whitespace-nowrap border-r border-white/10 h-full">
                        ${currentTopology === 'custom' ? `
                            <button id="u-btn-import-n8n" class="group flex items-center gap-2.5 px-6 h-full transition-all font-mono text-[10px] font-bold text-white/40 hover:text-white hover:bg-white/5 border-r border-white/5">
                                <i data-lucide="upload-cloud" class="w-4.5 h-4.5"></i>
                                <div class="flex flex-col items-start leading-none gap-0.5">
                                    <span class="text-[10px]">匯入工作流</span>
                                    <span class="text-[6px] opacity-40 uppercase">IMPORT_N8N</span>
                                </div>
                            </button>
                            <button id="u-btn-export-n8n" class="group flex items-center gap-2.5 px-6 h-full transition-all font-mono text-[10px] font-bold text-white/40 hover:text-white hover:bg-white/5">
                                <i data-lucide="download-cloud" class="w-4.5 h-4.5"></i>
                                <div class="flex flex-col items-start leading-none gap-0.5">
                                    <span class="text-[10px]">匯出方案</span>
                                    <span class="text-[6px] opacity-40 uppercase">EXPORT_FLOW</span>
                                </div>
                            </button>
                        ` : `
                            <button id="u-topology-linear" class="group flex items-center gap-2.5 px-6 h-full transition-all font-mono text-[10px] font-bold shrink-0 border-r border-white/5 ${currentTopology === 'linear' ? 'bg-primary/20 text-primary shadow-[inset_0_0_20px_rgba(77,158,255,0.1)]' : 'bg-transparent text-white/40 hover:text-white hover:bg-white/5'}">
                                <svg class="w-4.5 h-4.5 opacity-60 group-hover:opacity-100" viewBox="0 0 24 24">
                                     <path d="M4,12 L8,12 M12,12 L16,12 M20,12 L24,12" stroke="currentColor" stroke-width="2" fill="none"/>
                                     <circle cx="6" cy="12" r="2" fill="currentColor"/>
                                     <circle cx="14" cy="12" r="2" fill="currentColor"/>
                                     <circle cx="22" cy="12" r="2" fill="currentColor"/>
                                </svg>
                                <div class="flex flex-col items-start leading-none gap-0.5">
                                    <span class="text-[10px]">線性鏈路</span>
                                    <span class="text-[6px] opacity-40 uppercase">LINEAR_RELAY</span>
                                </div>
                            </button>
                            <button id="u-topology-orbital" class="group flex items-center gap-2.5 px-6 h-full transition-all font-mono text-[10px] font-bold shrink-0 border-r border-white/5 ${currentTopology === 'orbital' ? 'bg-secondary/20 text-secondary shadow-[inset_0_0_20px_rgba(255,100,255,0.1)]' : 'bg-transparent text-white/40 hover:text-white hover:bg-white/5'}">
                                <svg class="w-4.5 h-4.5 opacity-60 group-hover:opacity-100" viewBox="0 0 24 24">
                                     <circle cx="12" cy="12" r="4" stroke="currentColor" stroke-width="1.5" fill="none"/>
                                     <circle cx="12" cy="4" r="2" fill="currentColor"/>
                                     <circle cx="12" cy="20" r="2" fill="currentColor"/>
                                     <circle cx="4" cy="12" r="2" fill="currentColor"/>
                                     <circle cx="20" cy="12" r="2" fill="currentColor"/>
                                </svg>
                                <div class="flex flex-col items-start leading-none gap-0.5">
                                    <span class="text-[10px]">戰略矩陣</span>
                                    <span class="text-[6px] opacity-40 uppercase">STRATEGIC_MAP</span>
                                </div>
                            </button>
                        `}
                    </div>
                `,
                center: `
                    <!-- Shared Agent Pool Section -->
                    <div class="flex gap-4 items-center px-6 overflow-x-auto u-scrollbar-h">
                         <div class="flex items-center gap-3">
                            ${pooledAgents.map(agent => `
                                <div class="flex items-center gap-1 group/item">
                                    <div class="u-agent-item u-agent-pool-item w-8 h-8 p-0.5 bg-white/5 border border-white/10 rounded-xs hover:border-primary transition-all cursor-default shrink-0 relative overflow-hidden" 
                                         data-agent-code="${agent.code}" 
                                         data-agent-name="${agent.name}"
                                         data-agent-img="${agent.img}">
                                         <img src="images/${agent.img}" class="w-full h-full object-cover rounded-xs a-img-contrast grayscale pointer-events-none" draggable="false">
                                    </div>
                                </div>
                            `).join('')}
                            ${pooledAgents.length === 0 ? `<span class="text-[8px] text-white/10 uppercase italic font-bold tracking-widest whitespace-nowrap">Personnel_Deployed</span>` : ''}
                            <button id="u-btn-add-node" class="w-8 h-8 flex items-center justify-center bg-white/5 border border-white/10 rounded-full text-white/40 hover:text-primary hover:border-primary transition-all active:scale-95 shrink-0 ml-2" title="自訂代理人節點 (ADD NODE)">
                                <i data-lucide="plus" class="w-4 h-4"></i>
                            </button>
                         </div>
                    </div>
                `,
                right: `
                    <div class="flex items-center gap-6 px-6 h-full">
                         <div class="w-px h-8 bg-white/10"></div>
                         ${currentTopology === 'custom' ? `
                             <button id="u-btn-run-flow" class="h-9 px-6 flex items-center gap-3 bg-secondary/20 border border-secondary/50 rounded-xs text-secondary hover:bg-secondary/40 transition-all u-shadow-glow group/run cursor-pointer">
                                  <i data-lucide="play" class="w-3.5 h-3.5 group-hover/run:scale-110 transition-transform fill-current"></i>
                                  <span class="text-[9px] font-mono font-black uppercase tracking-widest">Execute_Flow</span>
                             </button>
                         ` : ''}
                         <!-- Return to Chat Button -->
                         <div class="flex items-center group cursor-pointer h-full" id="u-btn-close-portal" title="返回任務會話 (RETURN TO CHAT)">
                              <div class="flex flex-col items-end mr-3 leading-none opacity-40 group-hover:opacity-100 transition-opacity">
                                   <span class="text-[8px] font-mono font-bold tracking-widest text-primary uppercase">Mission_Chat</span>
                                   <span class="text-[6px] font-mono tracking-tighter text-white/40 uppercase mt-0.5">Return_Interface</span>
                              </div>
                              <button class="w-9 h-9 flex items-center justify-center text-white/60 bg-primary/10 border border-primary/30 rounded-full group-hover:text-white group-hover:bg-primary/40 group-hover:border-primary transition-all active:scale-90 shadow-[0_0_20px_rgba(77,158,255,0.2)]">
                                  <i data-lucide="message-square" class="w-4 h-4 group-hover:scale-110 transition-transform"></i>
                              </button>
                         </div>
                    </div>
                `
            })}
    `;
}
