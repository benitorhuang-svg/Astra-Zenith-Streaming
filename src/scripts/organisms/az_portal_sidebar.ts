/**
 * SIDEBAR RENDERER
 * Block Decomposition: Extracted from az_portal.ts
 */

import type { Agent } from '../core/agents';

export function renderSidebar(workingAgents: Agent[], currentTopology: 'linear' | 'orbital' | 'custom' = 'linear', executionQueue: Array<{ agentCode: string }> = [], tableParticipants: (string | null)[] = []): string {
    // INDUSTRIAL FIX: Only show agents that are currently "seated" (mounted on tableParticipants)
    const activeCodes = tableParticipants.filter(code => code !== null) as string[];
    const displayedAgents = workingAgents.filter(agent => activeCodes.includes(agent.code));

    return `
        <div class="flex flex-col h-full bg-black/50 border-r border-white/5 relative shadow-inner w-full">
            <!-- Neural Topology (Micro-Compact) -->
            <div class="px-1 pt-2 pb-1 border-b border-white/5 bg-black/60 flex flex-col items-center gap-1.5">
                <span class="text-[11px] font-black text-white/60 uppercase tracking-[0.2em] mb-0.5">模式切換</span>
                <div id="u-sidebar-topology-icon" class="w-full flex items-center justify-center p-1.5 bg-white/3 border border-white/10 rounded-xs animate-fade-in group/topo transition-all hover:bg-white/5 cursor-pointer min-h-[30px] relative overflow-hidden">
                    ${currentTopology === 'linear' ? `
                         <span class="text-[9px] font-mono text-primary font-black uppercase">Linear</span>
                    ` : currentTopology === 'orbital' ? `
                         <span class="text-[9px] font-mono text-secondary font-black uppercase">Matrix</span>
                    ` : `
                         <span class="text-[9px] font-mono text-white/40 font-black uppercase">Custom</span>
                    `}
                </div>
            </div>

            <div class="flex-1 flex flex-col gap-3 items-center mt-3 overflow-y-auto u-scrollbar w-full pb-2 px-1">
                ${displayedAgents.map(agent => {
                    const isProcessing = executionQueue.length > 0 && executionQueue[0].agentCode === agent.code;
                    const isQueued = !isProcessing && executionQueue.some(q => q.agentCode === agent.code);
                    const statusColor = isProcessing ? 'bg-primary' : (isQueued ? 'bg-white/40' : 'bg-white/10');

                    return `
                        <div class="u-agent-pool-item w-14 h-14 p-0.5 bg-white/3 border ${isProcessing ? 'border-primary shadow-[0_0_15px_rgba(0,255,204,0.3)]' : 'border-white/10'} rounded-xs hover:border-primary/40 transition-all cursor-default shrink-0 relative group overflow-hidden" 
                             data-code="${agent.code}" data-title="${agent.name}">
                             
                             <!-- Neural Scan Line (Active) -->
                             ${isProcessing ? `
                                <div class="absolute inset-0 z-20 pointer-events-none w-full h-[1.5px] bg-primary shadow-[0_0_10px_#00ffcc] animate-scan-y"></div>
                             ` : ''}
                             
                             <img src="./images/${agent.img}" class="w-full h-full object-cover rounded-xs border border-white/5 opacity-80 pointer-events-none transition-all duration-300">
                             
                             <!-- Micro-indicator Dot -->
                             <div class="absolute bottom-1 right-1 p-0.5 bg-black/80 rounded-full border border-white/5 z-30">
                                 <div class="w-1.5 h-1.5 ${statusColor} ${isProcessing ? 'animate-pulse shadow-[0_0_5px_#00ffcc]' : ''} rounded-full"></div>
                             </div>
                             
                             <!-- Tooltip -->
                             <div class="absolute left-full ml-4 px-3 py-2 bg-black/95 backdrop-blur-3xl border border-primary/20 rounded-xs text-[9px] font-mono text-white/90 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0 pointer-events-none z-50 shadow-2xl">
                                <span class="text-primary font-black uppercase">${agent.name}</span> <span class="text-white/20 px-2">|</span> IDLE_SYNC
                             </div>
                        </div>
                    `;
                }).join('')}

                ${displayedAgents.length === 0 ? `
                    <div class="flex flex-col items-center mt-6 opacity-10">
                        <div class="w-6 h-6 border border-dashed border-white/20 rounded-full flex items-center justify-center animate-spin-slow"></div>
                        <span class="text-[6px] font-mono uppercase tracking-widest mt-2 whitespace-nowrap">Null_Registry</span>
                    </div>
                ` : ''}
            </div>
            
            <div class="h-[48px] flex items-center justify-center px-2 shrink-0 border-t border-white/10 bg-black/40">
                <button id="u-btn-clear-all" 
                        class="h-10 w-full border border-red-500/40 bg-red-500/10 hover:bg-red-500/20 text-red-500 transition-all cursor-pointer group flex items-center justify-center px-2 rounded-xs shadow-lg uppercase font-mono text-[12px] tracking-widest font-black italic active:scale-95">
                    Fall out
                </button>
            </div>
        </div>
    `;
}

