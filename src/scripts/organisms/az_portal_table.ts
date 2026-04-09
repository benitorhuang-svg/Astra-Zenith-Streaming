/**
 * TABLE RENDERER
 * Atomic Refactor: Uses <az-agent-unit> molecule.
 */

import type { Agent } from '../core/agents';
import type { N8NNode } from '../integrations/n8n/n8n_data_types';

/**
 * Renders a single agent seat/workstation node.
 * Updated to "Left Focus" layout: Commander on Far Left, 1 in Mid, 3 on Right column.
 */
export function renderAgentSeat(
    index: number, 
    agent: Agent | null, 
    topology: 'linear' | 'orbital' | 'custom', 
    justLanded: boolean, 
    customPos?: [number, number],
    nodeMetadata?: N8NNode | null,
    extraClass = '',
    modelName = 'gemini-3-flash'
): string {
    let x = 0;
    let y = 0;
    const CX = 650; const CY = 290;
    if (topology === 'orbital') {
        if (index === 0) { x = 180; y = CY; }
        else if (index >= 1 && index <= 3) { 
            x = CX; 
            if (index === 1) y = 135; 
            else if (index === 2) y = CY; 
            else y = 460; 
        }
        else if (index === 4) { x = 1120; y = CY; }
        else { x = 0; y = -1000; }
    } else if (topology === 'custom' && customPos) {
        x = customPos[0]; y = customPos[1];
    } else if (topology === 'linear') {
        x = 150 + (index * 200); y = 290;
    }

    const nodeName = nodeMetadata?.name || `SLOT_${index}`;

    return `
        <div class="u-table-seat flex flex-col items-center justify-center transition-all absolute z-50 u-drop-target -translate-x-1/2 -translate-y-1/2 ${extraClass}" 
             style="left: ${x}px; top: ${y}px;" 
             data-seat-index="${index}"
             data-node-id="${nodeMetadata?.id || ''}">
            
            ${topology === 'custom' ? `
                <!-- Node-RED Style Sockets & Creators -->
                <div class="absolute left-[-12px] top-1/2 -translate-y-1/2 w-3 h-3 bg-primary border-2 border-white/20 rounded-full shadow-[0_0_10px_var(--primary)] z-10"></div>
                <div class="absolute right-[-12px] top-1/2 -translate-y-1/2 w-3 h-3 bg-primary border-2 border-white/20 rounded-full shadow-[0_0_10px_var(--primary)] z-10 group/socket cursor-pointer" id="u-btn-add-successor" data-from-node="${nodeMetadata?.name || ''}">
                    <!-- Add Successor Button (+) -->
                    <div class="absolute left-full ml-2 opacity-0 group-hover/socket:opacity-100 transition-opacity bg-primary text-black w-5 h-5 rounded-full flex items-center justify-center shadow-2xl">
                        <i data-lucide="plus" class="w-3.5 h-3.5"></i>
                    </div>
                </div>
            ` : ''}

            ${agent ? `
                <div class="u-interaction-trigger cursor-pointer" 
                     data-title="NODE: ${nodeName}" 
                     data-code="${agent.code}" 
                     data-status="ACTIVE" 
                     data-desc="[PAYLOAD]:\n${JSON.stringify(nodeMetadata?.parameters || {}, null, 2)}">
                     <div class="relative group/agent">
                        <az-agent-unit code="${agent.code}" status="${agent.status}" origin-seat="${index}" ${justLanded ? 'just-landed' : ''}></az-agent-unit>
                        
                        <!-- NEW: Tactical Model Badge (Hover Trigger) -->
                        <div class="absolute -top-6 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-black/90 border border-primary/40 rounded-sm shadow-[0_0_15px_rgba(0,255,204,0.3)] opacity-0 group-hover/agent:opacity-100 transition-all pointer-events-auto cursor-pointer u-btn-change-model" 
                             data-agent-id="${agent.code}"
                             data-current-model="${modelName}">
                            <span class="text-[7px] font-mono text-primary font-black uppercase tracking-widest">${modelName}</span>
                        </div>
                     </div>
                </div>
            ` : `
                <!-- Strategic Gold Tactical Placeholder -->
                <div class="u-seat-add u-seat-glow w-16 h-22 border border-[#FFD700]/30 border-dashed rounded-xs flex flex-col items-center justify-center text-[#FFD700]/60 hover:text-[#FFD700] transition-all cursor-pointer group/add bg-black/40 shadow-[0_0_20px_rgba(255,215,0,0.05)]">
                    <div class="relative w-5 h-5 mb-2 opacity-80 group-hover/add:opacity-100 transition-opacity animate-pulse text-[#FFD700]">
                        <div class="absolute inset-0 flex items-center justify-center">
                            <i data-lucide="plus" class="w-4 h-4"></i>
                        </div>
                    </div>
                    <span class="text-[6px] font-mono opacity-60 uppercase tracking-[0.4em] font-black group-hover/add:opacity-100 transition-opacity text-[#FFD700]">${nodeName}</span>
                </div>
            `}
        </div>
    `;
};
