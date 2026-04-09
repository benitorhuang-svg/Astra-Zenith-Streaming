/**
 * AZ PORTAL DECISION VIEW — Neural Force Graph (Obsidian Style v3.0)
 * Uses Semantic Vector Positioning from Backend for clustering.
 * Integrated with the high-fidelity az-semantic-graph molecules.
 * [STABILITY_PATCH_v2.1]
 */

import { renderCommonHeader } from '../molecules/m_portal_content_header';
import { renderCommonFooter } from '../molecules/m_portal_content_footer';
import type { ChatMessage } from './az_portal_types';

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

interface PathwayBlock {
    explanation: string;
    question: string;
    answer: string;
    summary: string;
}

/**
 * Parses structured blocks from agent content.
 */
function parsePathwayBlocks(content: string): PathwayBlock[] {
    const blocks: PathwayBlock[] = [];
    const parts = content.split(/(?=【解說】)/);
    for (const part of parts) {
        const explanation = part.match(/【解說】([\s\S]*?)(?=【Q】|$)/)?.[1]?.trim() || '';
        const question = part.match(/【Q】([\s\S]*?)(?=【A】|$)/)?.[1]?.trim() || '';
        const answer = part.match(/【A】([\s\S]*?)(?=【Summary】|$)/)?.[1]?.trim() || '';
        const summary = part.match(/【Summary】([\s\S]*?)$/)?.[1]?.trim() || '';
        if (explanation || question || answer || summary) {
            blocks.push({ explanation, question, answer, summary });
        }
    }
    return blocks;
}

export const renderDecisionTreeView = (messages: ChatMessage[], isStreaming: boolean) => {
    const nodes: GraphNode[] = (window as any).semanticNodes || [];
    const links: GraphLink[] = (window as any).semanticLinks || [];

    const hasGraphData = nodes.length > 0;
    const hasMessages = messages.length > 0;

    const messageCards = messages
        .filter(m => m.agentCode !== 'USER')
        .map(m => ({
            agentCode: m.agentCode,
            agentName: m.agentName,
            agentColor: m.agentColor,
            agentImg: m.agentImg,
            round: m.round,
            blocks: parsePathwayBlocks(m.content),
            rawContent: m.content
        }));

    const isEmpty = !hasGraphData && !hasMessages && !isStreaming;

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

    const renderGraphLayer = () => `
        <div class="absolute inset-0 z-0">
            <az-semantic-graph id="u-pathway-graph" class="w-full h-full"></az-semantic-graph>
        </div>
    `;

    const renderActivityOverlay = () => {
        const cleanText = (text: string) => text
            .replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1')
            .replace(/[#*-]{3,}/g, '')
            .replace(/[`]/g, '')
            .trim();

        return `
        <div class="absolute left-6 top-24 bottom-24 w-80 z-20 pointer-events-none flex flex-col gap-4 overflow-hidden">
            <div class="flex flex-col gap-3 overflow-y-auto u-scrollbar pr-2 pointer-events-auto">
                ${messageCards.slice().reverse().map((card, idx) => `
                    <div class="p-3 bg-black/60 backdrop-blur-md border border-white/5 border-l-[3px] rounded-xs animate-fade-in" 
                         style="border-left-color: ${card.agentColor}; animation-delay: ${idx * 100}ms">
                        <div class="flex items-center gap-2 mb-2">
                            <span class="text-[8px] font-mono text-white/40 uppercase tracking-widest font-black">${card.agentName}</span>
                            <span class="text-[7px] text-white/20 uppercase font-black tracking-tighter">R_${card.round.toString().padStart(2, '0')}</span>
                        </div>
                        <div class="text-[10px] font-mono text-white/60 leading-tight line-clamp-3">
                            ${card.blocks.length > 0 ? card.blocks[0].summary || card.blocks[0].explanation : cleanText(card.rawContent)}
                        </div>
                    </div>
                `).join('')}
                ${isEmpty ? `
                    <div class="p-4 border border-white/5 bg-white/3 rounded-xs opacity-40 italic text-[10px] text-white/50 font-mono center text-center">
                        NO_ACTIVE_PATHWAY_DATA...
                    </div>
                ` : ''}
            </div>
        </div>
        `;
    };

    return `
        <div class="u-portal-chat-container flex flex-col h-full bg-[#030303] select-none shadow-[inset_0_0_100px_rgba(0,0,0,0.8)] overflow-hidden relative">
            ${renderCommonHeader({
                title: '戰略路徑融合 // STRATEGIC FUSION MAP',
                accentColor: 'var(--portal-aura-color, #10b981)',
                showControl: false,
                currentView: 'decision-tree'
            })}
            
            <div class="flex-1 relative overflow-hidden flex flex-col min-h-0">
                ${isEmpty ? renderEmptyState() : `
                    <!-- Layer 0: Knowledge Map Engine -->
                    ${renderGraphLayer()}

                    <!-- Layer 1: Strategic Overlay -->
                    ${renderActivityOverlay()}
                `}

                ${isStreaming ? `
                    <div class="absolute top-12 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-black/80 backdrop-blur-2xl px-10 py-3 border border-primary/40 rounded-full animate-pulse z-50">
                        <div class="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                        <span class="text-[8px] font-mono text-primary uppercase tracking-[0.5em] font-black italic">Mapping_Syndicate_Intent...</span>
                    </div>
                ` : ''}
            </div>

            ${renderCommonFooter({
                bgClass: 'bg-black/80 backdrop-blur-2xl border-t border-white/10',
                center: `
                    <div class="flex items-center gap-16 px-8">
                        <div class="flex flex-col items-center gap-1">
                             <span class="text-[7px] font-mono text-white/30 uppercase tracking-[0.3em]">Neural_Links</span>
                             <span class="text-[14px] font-mono text-success font-black tabular-nums">${links.length}</span>
                        </div>
                        <div class="w-px h-6 bg-white/10"></div>
                        <div class="flex flex-col items-center gap-1">
                             <span class="text-[7px] font-mono text-white/30 uppercase tracking-[0.3em]">Vector_Density</span>
                             <span class="text-[14px] font-mono text-primary font-black tabular-nums">${nodes.length}</span>
                        </div>
                        <div class="w-px h-6 bg-white/10"></div>
                        <div class="flex flex-col items-center gap-1">
                             <span class="text-[7px] font-mono text-white/30 uppercase tracking-[0.3em]">Knowledge_Tier</span>
                             <span class="text-[11px] font-mono text-amber-400 font-black uppercase tracking-widest">${nodes.length > 5 ? 'CLUSTERING_ACTIVE' : 'SYNCHRONIZING'}</span>
                        </div>
                    </div>
                `,
                right: `
                    <div class="flex items-center gap-4 pr-6">
                         <button id="u-btn-reset-graph" class="h-8 px-6 border border-white/5 hover:border-danger/40 bg-white/3 hover:bg-danger/10 text-[9px] font-mono text-white/30 hover:text-danger uppercase tracking-[0.2em] transition-all rounded-xs">
                             Purge_Space
                         </button>
                         <button id="u-btn-refresh-graph" class="w-8 h-8 flex items-center justify-center border border-white/10 bg-white/5 hover:bg-primary/20 text-white rounded-xs transition-all">
                             <i data-lucide="refresh-cw" class="w-3.5 h-3.5"></i>
                         </button>
                    </div>
                `
            })}
        </div>
    `;
};
