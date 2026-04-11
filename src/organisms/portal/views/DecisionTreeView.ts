/**
 * AZ PORTAL DECISION VIEW — Neural Force Graph
 * Uses Semantic Vector Positioning from Backend for clustering.
 * Integrated with the high-fidelity az-semantic-graph molecules.
 */

import { renderCommonFooter } from '../../../molecules/m_portal_content_footer';
import type { ChatMessage } from '../PortalTypes';

interface GraphNode {
    id: string;
    content: string;
    agentCode: string;
    x: number;
    y: number;
    agentColor?: string;
}

interface GraphLink {
    source: string;
    target: string;
    value: number;
}


export const renderDecisionTreeView = (messages: ChatMessage[], isStreaming: boolean) => {
    const nodes: GraphNode[] = (window as any).semanticNodes || [];
    const links: GraphLink[] = (window as any).semanticLinks || [];

    const hasGraphData = nodes.length > 0;
    const shouldRenderGraph = hasGraphData || isStreaming || (window as any).ZENITH_PREVIEW_MODE;

    const renderEmptyState = () => `
        <div class="flex-1 flex flex-col items-center justify-center gap-12 opacity-30 select-none animate-pulse">
            <div class="relative">
                <div class="w-48 h-48 border border-primary/20 rounded-full animate-spin-slow"></div>
                <div class="absolute inset-0 flex items-center justify-center">
                    <i data-lucide="network" class="w-20 h-20 text-primary/40"></i>
                </div>
            </div>
            <div class="flex flex-col items-center gap-4 text-center">
                <span class="text-[14px] font-mono text-primary font-black uppercase tracking-[0.8em]">Neural_Clusters_Offline</span>
                <p class="text-[10px] font-mono text-white/30 uppercase tracking-widest max-w-sm leading-relaxed">請啟動戰略任務，語義向量引擎將自動生成群組。</p>
            </div>
        </div>
    `;

    return `
        <div class="u-portal-chat-container flex flex-col h-full bg-transparent select-none overflow-hidden relative">
            <!-- Strategic Header (Aligned with ChatView 60px height) -->
            <div class="h-[60px] border-b border-white/5 flex items-center bg-black/80 backdrop-blur-3xl px-4 shrink-0 z-50">
                <div class="flex items-center gap-3">
                    <div class="w-1.5 h-1.5 rounded-full bg-primary animate-pulse shadow-[0_0_10px_rgba(var(--primary-rgb),0.5)]"></div>
                    <span class="text-[11px] font-mono text-white/90 font-black tracking-[0.4em] uppercase">戰略路徑融合 // STRATEGIC FUSION MAP</span>
                </div>
                <div class="flex-1 flex items-center justify-end">
                    <div class="flex items-center gap-4 px-3 py-1 bg-white/5 border border-white/10 rounded-full">
                         <span class="text-[7px] font-mono text-white/40 uppercase tracking-widest italic">Mission_Status:</span>
                         <span class="text-[8px] font-mono text-primary font-black uppercase tracking-widest">${isStreaming ? 'PROCESSING_NEURAL_VECTORS' : 'STANDBY_INDEX_READY'}</span>
                    </div>
                </div>
            </div>
            
            <div class="flex-1 relative overflow-hidden flex flex-col min-h-0">
                ${!shouldRenderGraph ? renderEmptyState() : `
                    <!-- Layer 0: Knowledge Map Engine (Atomic Component) -->
                    <div class="absolute inset-0 z-0">
                        <az-semantic-graph id="u-pathway-graph" class="w-full h-full"></az-semantic-graph>
                    </div>

                    <!-- Strategic Overlay Removed as per Redundancy Requirement -->
                `}

                <!-- Bottom Streaming Indicator -->
                <div id="u-decision-streaming-indicator" class="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
                    ${isStreaming ? `
                        <div class="flex items-center gap-4 bg-black/80 backdrop-blur-2xl px-12 py-3 border border-primary/40 rounded-full animate-bounce shadow-[0_0_40px_rgba(var(--primary-rgb),0.2)]">
                            <div class="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                            <span class="text-[9px] font-mono text-primary uppercase tracking-[0.6em] font-black italic">Mapping_Syndicate_Intent...</span>
                        </div>
                    ` : ''}
                </div>

                <!-- Horizontal Investigation Strip (Landscape Terminal) -->
                <div id="u-node-insight-panel" class="absolute left-0 right-0 bottom-0 h-72 z-100 pointer-events-none translate-y-full transition-transform duration-700 ease-out flex flex-col px-8 pb-4">
                    <div class="flex-1 bg-black/95 backdrop-blur-3xl border-t border-white/10 shadow-[0_-50px_100px_rgba(0,0,0,1)] flex flex-row pointer-events-auto relative overflow-hidden">
                        <!-- Vertical Accent Border -->
                        <div class="w-1.5 h-full bg-primary animate-pulse"></div>

                        <!-- Content Section -->
                        <div class="flex-1 flex flex-col min-w-0">
                            <!-- Strip Header -->
                            <div class="px-10 py-6 border-b border-white/5 flex items-center justify-between">
                                <div class="flex items-center gap-8">
                                    <div class="flex flex-col">
                                        <div class="flex items-center gap-3 mb-1">
                                            <div class="px-2 py-0.5 border border-primary/50 text-[7px] font-black text-primary/80 uppercase tracking-widest bg-primary/5">INTEL_STREAM</div>
                                            <span id="u-node-title" class="text-xl font-black text-white uppercase tracking-tighter italic">DATA_AWAITING_INDEX</span>
                                        </div>
                                        <div class="text-[8px] font-mono text-white/10 tracking-[0.4em] uppercase">Tactical_Report_Buffer_Ready</div>
                                    </div>
                                </div>
                                <div class="flex items-center gap-10">
                                    <div class="flex items-center gap-2 opacity-30">
                                        <div class="w-2 h-2 rounded-full bg-primary"></div>
                                        <span class="text-[7px] font-mono text-white tracking-[0.3em]">SECURE_PROTOCOL</span>
                                    </div>
                                    <button id="u-close-insight" class="w-12 h-12 flex center border border-white/10 rounded-full hover:border-primary/50 hover:bg-primary/5 transition-all text-white/20 hover:text-white text-3xl">×</button>
                                </div>
                            </div>
                            <!-- Scrollable Content Strip -->
                            <div class="flex-1 overflow-y-auto u-scrollbar p-10 pr-20">
                                <div id="u-node-content" class="text-base text-white/70 leading-relaxed font-mono whitespace-pre-wrap max-w-7xl">
                                    [SYSTEM_READY]... PLEASE_SELECT_MISSION_NODE_TO_INITIATE_BUFFER_READ.
                                </div>
                            </div>
                        </div>

                        <!-- Side Status Badge -->
                        <div class="w-32 border-l border-white/5 bg-black/40 p-6 flex flex-col justify-between items-center opacity-40">
                             <div class="text-[7px] font-mono text-white uppercase vertical-text tracking-[0.8em]">ASTRA_HORIZON</div>
                             <div class="text-[8px] font-mono text-primary font-black italic">TR_01</div>
                        </div>
                    </div>
                </div>
            </div>

            ${renderCommonFooter({
                bgClass: 'bg-black/80 backdrop-blur-2xl border-t border-white/10',
                center: `
                    <div class="flex items-center gap-14 px-8 h-full">
                        <!-- TELEMETRY -->
                        <div class="flex items-center gap-12">
                            <div class="flex flex-col items-center gap-0.5">
                                 <span class="text-[7px] font-mono text-white/20 uppercase tracking-[0.3em]">Neural_Links</span>
                                 <span class="text-[13px] font-mono text-success font-black tabular-nums tracking-tighter">${links.length}</span>
                            </div>
                            <div class="w-px h-6 bg-white/10"></div>
                            <div class="flex flex-col items-center gap-0.5">
                                 <span class="text-[7px] font-mono text-white/20 uppercase tracking-[0.3em]">Vector_Density</span>
                                 <span class="text-[13px] font-mono text-primary font-black tabular-nums tracking-tighter">${nodes.length}</span>
                            </div>
                        </div>
                        
                        <div class="w-px h-10 bg-white/10 mx-2"></div>
                        
                        <!-- REFINED NAVIGATION CLUSTER -->
                        <div class="flex items-center gap-1">
                            <button id="z-in" class="flex items-center gap-3 px-4 h-10 bg-white/5 border border-white/5 rounded-xs hover:border-primary/40 hover:bg-primary/5 transition-all active:scale-95 group">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" class="text-white/20 group-hover:text-primary"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                                <span class="text-[8px] font-black text-white/30 group-hover:text-white tracking-[0.15em] uppercase">Zoom_In</span>
                            </button>
                            
                            <button id="z-out" class="flex items-center gap-3 px-4 h-10 bg-white/5 border border-white/5 rounded-xs hover:border-primary/40 hover:bg-primary/5 transition-all active:scale-95 group">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" class="text-white/20 group-hover:text-primary"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                                <span class="text-[8px] font-black text-white/30 group-hover:text-white tracking-[0.15em] uppercase">Zoom_Out</span>
                            </button>
                            
                            <div class="w-4"></div>

                            <button id="z-reset" class="px-6 h-10 bg-white/5 border border-white/5 rounded-xs hover:border-primary/40 hover:bg-primary/5 transition-all active:scale-95 group">
                                <span class="text-[8px] font-black text-white/30 group-hover:text-primary tracking-[0.2em] uppercase">Re_Center_Camera</span>
                            </button>
                        </div>
                    </div>
                `,
                right: `
                    <div class="flex items-center gap-6 pr-10">
                         <div class="flex flex-col text-right">
                             <div class="text-[7px] font-mono text-white/20 uppercase tracking-[0.6em] mb-1 italic">Tactical_Relay</div>
                             <div class="text-[11px] font-mono text-primary font-black uppercase tracking-widest">Astra_Horizon_Active</div>
                         </div>
                         <div class="w-3 h-3 rounded-full bg-primary/20 flex center">
                             <div class="w-1 h-1 rounded-full bg-primary animate-pulse"></div>
                         </div>
                    </div>
                `
            })}
        </div>
    `;
};
