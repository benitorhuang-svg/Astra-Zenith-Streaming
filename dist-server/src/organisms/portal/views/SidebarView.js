"use strict";
/**
 * SIDEBAR RENDERER
 * Block Decomposition: Extracted from az_portal.ts
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderSidebar = renderSidebar;
function renderSidebar(workingAgents, currentTopology = 'linear', executionQueue = [], tableParticipants = []) {
    // INDUSTRIAL FIX: Only show agents that are currently "seated" (mounted on tableParticipants)
    // INDUSTRIAL FIX: In Custom mode, only show the ONE agent present in the main workspace
    let displayedAgents = tableParticipants
        .map(code => workingAgents.find(a => a.code === code))
        .filter(agent => agent !== undefined);
    if (currentTopology === 'custom' && displayedAgents.length > 0) {
        displayedAgents = [displayedAgents[0]];
    }
    return `
        <div class="flex flex-col h-full bg-black/50 border-r border-white/5 relative shadow-inner w-full overflow-x-hidden">
            <!-- Neural Topology (Micro-Compact) -->
            <div class="px-2 pt-1.5 pb-1 border-b border-white/5 bg-black/60 flex flex-col items-center gap-1">
                <span class="text-[8px] font-black text-white/40 uppercase tracking-[0.2em]">模式控制</span>
                <div id="u-sidebar-topology-icon" class="w-full flex items-center justify-center py-1 bg-white/3 border border-white/5 rounded-xs animate-fade-in group/topo transition-all hover:bg-white/5 cursor-pointer min-h-[28px] relative overflow-hidden">
                    ${currentTopology === 'linear' ? `
                         <span class="text-[8px] font-mono text-primary font-black uppercase tracking-widest">Linear</span>
                    ` : currentTopology === 'orbital' ? `
                         <span class="text-[8px] font-mono text-secondary font-black uppercase tracking-widest">Matrix</span>
                    ` : `
                         <span class="text-[8px] font-mono text-white/40 font-black uppercase tracking-widest">Custom</span>
                    `}
                </div>
            </div>

            <div class="flex-1 flex flex-col gap-2.5 items-center mt-3 overflow-y-auto overflow-x-hidden u-scrollbar w-full pb-4 px-2">
                ${displayedAgents.map(agent => {
        const isProcessing = executionQueue.length > 0 && executionQueue[0].agentCode === agent.code;
        const isQueued = !isProcessing && executionQueue.some(q => q.agentCode === agent.code);
        const statusColor = isProcessing ? 'bg-success' : (isQueued ? 'bg-white/40' : 'bg-white/10');
        return `
                        <div class="u-sidebar-agent-item w-14 h-14 bg-white/3 border ${isProcessing ? 'border-success shadow-[0_0_20px_rgba(16,185,129,0.4)]' : 'border-white/10'} rounded-xs hover:border-success/40 transition-all cursor-default shrink-0 relative group" 
                             data-code="${agent.code}" data-title="${agent.name}">
                             
                             <div class="w-full h-full p-1">
                                <az-avatar url="./images/${agent.img}" size="fill" ${isProcessing ? 'glow' : ''}></az-avatar>
                             </div>
                             
                             <!-- Micro-indicator Dot -->
                             <div class="absolute bottom-1 right-1 p-0.5 bg-black/90 rounded-full border border-white/5 z-30">
                                 <div class="w-1.5 h-1.5 ${statusColor} ${isProcessing ? 'animate-pulse shadow-[0_0_5px_#00ffcc]' : ''} rounded-full"></div>
                             </div>
                             
                             <!-- Tooltip -->
                             <div class="absolute left-full ml-4 px-4 py-2 bg-black/95 backdrop-blur-3xl border border-primary/20 rounded-xs text-[9px] font-mono text-white/90 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0 pointer-events-none z-50 shadow-2xl">
                                <span class="text-primary font-black uppercase tracking-widest">${agent.name}</span> <span class="text-white/20 px-2">|</span> IDLE_SYNC
                             </div>
                        </div>
                    `;
    }).join('')}

                ${displayedAgents.length === 0 ? `
                    <div class="flex flex-col items-center mt-3 opacity-10">
                        <div class="w-6 h-6 border border-dashed border-white/20 rounded-full flex items-center justify-center animate-spin-slow"></div>
                        <span class="text-[6px] font-mono uppercase tracking-widest mt-2 whitespace-nowrap">Null_Registry</span>
                    </div>
                ` : ''}
            </div>
            
            <div class="h-[48px] flex items-center justify-center px-2 shrink-0 border-t border-white/10 bg-black/40">
                <az-button id="u-btn-clear-all" label="Fall out" variant="danger" size="xs" style="width: 100%;"></az-button>
            </div>
        </div>
    `;
}
