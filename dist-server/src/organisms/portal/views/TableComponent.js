"use strict";
/**
 * TABLE RENDERER
 * Atomic Refactor: Uses <az-agent-unit> molecule.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderAgentSeat = renderAgentSeat;
/**
 * Renders a single agent seat/workstation node.
 * Updated to "Left Focus" layout: Commander on Far Left, 1 in Mid, 3 on Right column.
 */
function renderAgentSeat(index, agent, topology, justLanded, customPos, nodeMetadata, extraClass = '', modelName = 'gemini-3-flash') {
    let x = 0;
    let y = 0;
    const CX = 650;
    const CY = 290;
    if (topology === 'orbital') {
        if (index === 0) {
            x = 180;
            y = CY;
        }
        else if (index >= 1 && index <= 3) {
            x = CX;
            if (index === 1)
                y = 135;
            else if (index === 2)
                y = CY;
            else
                y = 460;
        }
        else if (index === 4) {
            x = 1120;
            y = CY;
        }
        else {
            x = 0;
            y = -1000;
        }
    }
    else if (topology === 'custom') {
        if (customPos) {
            x = customPos[0];
            y = customPos[1];
        }
        else {
            // Default position towards bottom-right for clean custom start
            x = 200 + (index * 50);
            y = 250 + (index * 30);
        }
    }
    else if (topology === 'linear') {
        x = 150 + (index * 200);
        y = 290;
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
                <div class="u-interaction-trigger cursor-pointer relative" 
                     data-title="NODE: ${nodeName}" 
                     data-code="${agent.code}" 
                     data-status="ACTIVE" 
                     data-desc="[PAYLOAD]:\n${JSON.stringify(nodeMetadata?.parameters || {}, null, 2)}">
                     
                     <div class="relative group/agent">
                        <!-- Seat Frame (Behind Agent) -->
                        <div class="absolute inset-x-[-10px] inset-y-[-10px] border border-primary/20 bg-white/5 backdrop-blur-md rounded-sm -z-10 group-hover/agent:border-primary/40 transition-colors">
                            <az-brackets></az-brackets>
                            <!-- Seat Label (Fixed to Seat Position) -->
                            <div class="absolute -bottom-2 -left-2 bg-primary text-black px-1.5 py-0.5 font-mono text-[9px] font-black uppercase tracking-tighter shadow-lg z-50">
                                A${index + 1}
                            </div>
                        </div>

                        <az-agent-unit code="${agent.code}" status="${agent.status}" origin-seat="${index}" ${justLanded ? 'just-landed' : ''}></az-agent-unit>
                        
                        <!-- NEW: Tactical Model Badge (Hover Trigger) -->
                        <div class="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-black/95 border border-primary/40 rounded-sm shadow-[0_0_20px_rgba(0,255,204,0.4)] opacity-0 group-hover/agent:opacity-100 transition-all pointer-events-auto cursor-pointer u-btn-change-model z-100"
                             data-agent-id="${agent.code}"
                             data-current-model="${modelName}">
                            <div class="flex flex-col items-center gap-0.5">
                                <span class="text-[6px] font-mono text-white/40 uppercase tracking-widest">Active_Core</span>
                                <span class="text-[8px] font-mono text-primary font-black uppercase tracking-wider whitespace-nowrap">${modelName}</span>
                            </div>
                        </div>
                     </div>
                </div>
            ` : `
                <az-seat-frame label="${nodeName}" status="SEAT_READY" index="${index + 1}"></az-seat-frame>
            `}
        </div>
    `;
}
;
