"use strict";
/**
 * AZ PORTAL N8N VIEW — Standalone Node-RED Style Workflow Editor
 * Ultra-Atomic: Focuses purely on node creation, payload inspection, and connection.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderN8NView = void 0;
const TableComponent_1 = require("./TableComponent");
const n8n_flow_renderer_1 = require("../../../integrations/n8n/n8n_flow_renderer");
const m_portal_content_footer_1 = require("../../../molecules/m_portal_content_footer");
const renderN8NView = (flow, agentPool, activeNodeId = null) => {
    if (!flow)
        return `<div class="flex-1 flex items-center justify-center opacity-20 font-mono text-[10px] tracking-[0.5em]">INITIALIZING_NODE_ENGINE...</div>`;
    return `
        <div class="u-portal-chat-container u-n8n-editor-mode h-full flex flex-col relative overflow-hidden bg-[#050505]">
            <!-- Tactical Workspace Canvas -->
            <div class="flex-1 relative overflow-hidden flex items-center justify-center">
                <!-- GRID BACKDROP -->
                <div class="absolute inset-0 opacity-10 pointer-events-none g-tactical-grid"></div>
                
                <!-- CORE ALIGNMENT -->
                <div class="absolute left-1/2 top-1/2 w-[1600px] h-[800px] origin-center u-core-alignment pointer-events-none">
                    <div class="relative w-full h-full pointer-events-auto">
                        
                        <!-- Dynamic Bezier Connection Layer -->
                        ${(0, n8n_flow_renderer_1.renderN8NFlowChart)('custom', flow)}
        
                        <!-- Interactive Node Matrix -->
                        <div class="absolute inset-0 z-50 pointer-events-none">
                            ${flow.nodes.map((node, i) => {
        const agent = agentPool.find(a => node.name.includes(a.code)) || null;
        const customPos = [node.position[0], node.position[1]];
        const isActive = activeNodeId === node.id;
        return (0, TableComponent_1.renderAgentSeat)(i, agent, 'custom', false, customPos, node, isActive ? 'ring-2 ring-primary/50 rounded-sm shadow-[0_0_25px_rgba(77,158,255,0.25)]' : '');
    }).join('')}
                        </div>
                    </div>
                </div>
            </div>

            <!-- N8N Editor Footer -->
            ${renderN8NEditorFooter(agentPool)}
        </div>
    `;
};
exports.renderN8NView = renderN8NView;
function renderN8NEditorFooter(agentPool) {
    return `
        ${(0, m_portal_content_footer_1.renderCommonFooter)({
        bgClass: 'bg-black/80 backdrop-blur-3xl border-t border-primary/20 shadow-[0_-20px_50px_rgba(0,0,0,0.5)]',
        left: `
                <div class="flex items-center gap-6 px-6 h-full border-r border-white/5">
                    <div class="flex flex-col">
                        <span class="text-[8px] font-mono text-primary font-black uppercase tracking-widest">Editor_Active</span>
                        <span class="text-[10px] font-mono text-white/40 uppercase">N8N_COMPATIBLE_V1</span>
                    </div>
                    <button id="u-btn-import-n8n" class="h-8 px-4 bg-white/5 border border-white/10 rounded-xs text-[9px] font-mono font-black text-white/60 hover:text-primary hover:border-primary/40 transition-all flex items-center gap-2">
                        <i data-lucide="upload-cloud" class="w-3.5 h-3.5"></i> IMPORT
                    </button>
                </div>
            `,
        center: `
                <div class="flex items-center gap-4 px-10">
                    <span class="text-[8px] font-mono text-white/20 uppercase tracking-[0.4em]">Node_Library</span>
                    <div class="flex gap-2">
                        ${agentPool.map(a => `
                            <div class="u-agent-pool-item w-8 h-8 p-0.5 bg-white/5 border border-white/10 rounded-xs hover:border-primary transition-all cursor-grab active:cursor-grabbing" data-code="${a.code}">
                                <img src="images/${a.img}" class="w-full h-full object-cover rounded-xs grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all">
                            </div>
                        `).join('')}
                    </div>
                </div>
            `,
        right: `
                <div class="flex items-center gap-6 px-6 h-full">
                    <button id="u-btn-run-flow" class="h-10 px-8 bg-primary/20 border border-primary/50 text-primary rounded-xs font-mono font-black text-[11px] tracking-[0.2em] hover:bg-primary hover:text-black transition-all u-shadow-glow flex items-center gap-3">
                        <i data-lucide="play" class="w-4 h-4 fill-current"></i> EXECUTE_WORKFLOW
                    </button>
                    <div class="w-px h-8 bg-white/10 mx-2"></div>
                    <button id="u-btn-close-portal" class="w-10 h-10 flex items-center justify-center bg-white/5 border border-white/10 rounded-full text-white/40 hover:text-white hover:border-white/30 transition-all">
                        <i data-lucide="x" class="w-4 h-4"></i>
                    </button>
                </div>
            `
    })}
    `;
}
