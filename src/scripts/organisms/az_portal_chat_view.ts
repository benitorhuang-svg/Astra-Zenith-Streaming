/**
 * AZ PORTAL CHAT VIEW — Main Communication Organism
 */

import type { ChatMessage } from './az_portal_types';
import { 
    renderLiveTelemetry, 
    renderRoundFilters, 
    renderCycleController 
} from '../molecules/m_portal_hud';

export const renderChatView = (
    messages: ChatMessage[],
    pollingCycles: number,
    currentPasses: number,
    filterRound: number | 'all',
    isStreaming: boolean,
    activePrompt: string,
    subagentRegistry: Array<[string, unknown]> = [],
    isCompacting: boolean = false
) => {
    const activeAgent = messages.find(m => m.isStreaming) || (messages.length > 0 ? messages[messages.length - 1] : null);

    const renderPathBreadcrumb = (path?: string[]) => {
        if (!path || path.length === 0) return '';
        return `
            <div class="flex items-center gap-2 text-[8px] font-mono uppercase tracking-[0.25em] text-white/30 mb-3">
                <span>Path</span>
                <span class="text-primary/70">${path.join(' › ')}</span>
            </div>
        `;
    };

    const renderReasoningBlock = (msg: ChatMessage) => {
        if (!msg.reasoning && !msg.summary) return '';
        const content = msg.reasoning || msg.summary || '';
        return `
            <details class="mt-4 rounded-sm border border-white/5 bg-white/2 px-4 py-3 text-[11px] text-white/70">
                <summary class="cursor-pointer font-mono text-[9px] uppercase tracking-[0.3em] text-white/40">Reasoning</summary>
                <div class="mt-3 whitespace-pre-wrap font-mono leading-relaxed text-white/60">${content}</div>
            </details>
        `;
    };

    const renderCitations = (msg: ChatMessage) => {
        const grounding = (msg as any).metadata?.groundingMetadata;
        if (!grounding || !grounding.groundingChunks) return '';

        return `
            <div class="mt-4 pt-4 border-t border-white/5 flex flex-col gap-2">
                <div class="flex items-center gap-2">
                    <div class="w-1.5 h-1.5 bg-warning rounded-full shadow-[0_0_8px_var(--warning)]"></div>
                    <span class="text-[9px] font-mono text-warning/80 uppercase tracking-widest font-black">Google Search Grounding // Verified Sources</span>
                </div>
                <div class="flex flex-wrap gap-2 mt-1">
                    ${grounding.groundingChunks.map((chunk: any, i: number) => {
                        const title = chunk.web?.title || `Source_${i+1}`;
                        const uri = chunk.web?.uri || '#';
                        return `
                            <a href="${uri}" target="_blank" class="px-2 py-1 bg-white/5 border border-white/10 rounded-xs text-[9px] text-white/50 hover:text-white hover:border-primary-cyan-glow transition-all flex items-center gap-2 decoration-none">
                                <i data-lucide="link" class="w-3 h-3"></i>
                                <span>${title}</span>
                            </a>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    };

    const renderSubagentHub = () => {
        if (subagentRegistry.length === 0 && !isCompacting) return '';
        return `
            <div class="absolute top-6 right-8 flex flex-col items-end gap-3 z-50 pointer-events-none select-none">
                ${isCompacting ? `
                    <div class="px-4 py-1.5 bg-amber-500/10 border border-amber-500/40 rounded-sm flex items-center gap-3 animate-pulse shadow-[0_0_20px_rgba(245,158,11,0.1)]">
                        <div class="w-2 h-2 rounded-full bg-amber-500"></div>
                        <span class="text-[9px] font-mono text-amber-500 font-black uppercase tracking-[0.2em]">Context_Compaction</span>
                    </div>
                ` : ''}
                
                ${subagentRegistry.map(([id]) => `
                    <div class="px-5 py-3 bg-black/80 backdrop-blur-2xl border border-white/5 rounded-sm flex flex-col gap-2 min-w-[180px] shadow-2xl skew-x-[-4deg]">
                        <div class="flex items-center justify-between gap-6">
                            <span class="text-[9px] font-mono text-white/50 uppercase tracking-widest">Task_${id.slice(0, 6)}</span>
                            <span class="text-[8px] font-mono text-primary font-black animate-pulse">RUNNING</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    };

    return `
        <div class="u-portal-chat-container u-chat-view-container h-full flex flex-col relative overflow-hidden">
            
            <!-- Global Mission Control Header (Top Station) -->
            <div class="h-[60px] border-b border-white/5 flex items-center bg-black/80 backdrop-blur-3xl select-none shrink-0 z-50 shadow-[0_20px_60px_rgba(0,0,0,0.8)] px-4">
                
                <!-- Section 1 (Left): Metrics, Rounds & Cycles -->
                <div class="flex items-center gap-6 py-1 shrink-0">
                    ${renderLiveTelemetry(currentPasses, pollingCycles)}
                    ${renderRoundFilters(pollingCycles, currentPasses, filterRound)}
                    ${renderCycleController(pollingCycles)}
                </div>

                <!-- Section 2 (Right Terminal): Tactical Mission Input -->
                <div class="flex-1 flex items-center justify-end pl-10 gap-4">
                    <div class="flex-1 max-w-4xl relative group">
                        <!-- MISSION_INDICATOR: Always display 'OPERATOR' context above the input -->
                        <div class="absolute -top-3 left-1 flex items-center gap-1.5 z-10 transition-all opacity-60 group-focus-within:opacity-100">
                             <div class="w-1 h-1 bg-primary rounded-full shadow-[0_0_8px_rgba(0,255,204,0.6)]"></div>
                             <span class="text-[8px] font-mono text-primary font-black uppercase tracking-[0.2em]">00 / OPERATOR_TACTICAL_ANCHOR</span>
                        </div>

                        <input id="u-mission-input" type="text" value="${activePrompt}" 
                               placeholder="${isStreaming ? '>> EXECUTING_LIVE_SEQUENCE...' : 'ENTER_TACTICAL_COMMAND...'}" 
                               ${isStreaming ? 'disabled' : ''}
                               class="w-full h-11 bg-white/5 border ${isStreaming ? 'border-primary/60 shadow-[0_0_20px_rgba(0,255,204,0.15)] text-primary/80 bg-primary/5' : 'border-white/10 text-white'} rounded-sm px-4 pt-1 outline-none font-mono text-[13px] focus:border-primary focus:bg-white/10 transition-all shadow-inner placeholder:text-white/20">
                    </div>
                    
                    <button id="u-mission-action" class="w-11 h-11 flex items-center justify-center bg-primary/10 border ${isStreaming ? 'border-red-500/50 text-red-500' : 'border-primary/30 text-primary'} rounded-sm hover:bg-primary hover:text-black active:scale-90 transition-all shadow-[0_0_30px_rgba(0,255,204,0.1)] group flex-none">
                        ${isStreaming ? `
                            <div class="w-3 h-3 bg-red-600 rounded-sm shadow-[0_0_15px_#dc2626] animate-pulse"></div>
                        ` : `
                            <i data-lucide="send" class="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform"></i>
                        `}
                    </button>
                </div>
            </div>

            <!-- MAIN_CHAT_CONTROL (Full Width) -->
            <div class="flex-1 flex flex-col relative h-full min-w-0 overflow-hidden">
                ${renderSubagentHub()}
                
                <div id="u-chat-scroll" class="flex-1 p-10 overflow-y-auto u-scrollbar bg-transparent flex flex-col gap-6 max-w-6xl mx-auto w-full pb-24">
                    <!-- [FRAGMENT] System_Intro: Project Usage & Features -->
                    <div class="mb-2 bg-primary/5 border border-primary/20 p-6 rounded-sm backdrop-blur-3xl animate-fade-in">
                        <div class="flex items-center gap-3 mb-4">
                            <div class="w-8 h-8 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center">
                                <i data-lucide="info" class="w-4 h-4 text-primary"></i>
                            </div>
                            <span class="text-[12px] font-black text-primary uppercase tracking-[0.3em]">系統概覽 / System_Intro</span>
                        </div>
                        <div class="flex flex-col gap-4">
                            <p class="text-[14px] text-white/90 leading-relaxed font-mono">
                                <span class="text-primary font-bold">Astra Zenith</span> 是一款工業級多代理人聯動系統。
                                本系統集成了智慧型節點佈局與高保真度日誌流。
                            </p>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
                                <div class="flex flex-col gap-2">
                                    <span class="text-[9px] text-white/40 font-black uppercase tracking-widest">Core Features / 系統特色</span>
                                    <ul class="text-[11px] text-white/60 font-mono flex flex-col gap-1.5 list-none p-0">
                                        <li>• 視覺化戰略決策路徑 (Strategic Pathway)</li>
                                        <li>• 多維度節點工作流 (Node Workflow)</li>
                                        <li>• 實時系統遙測與日誌流 (Telemetry & Logging)</li>
                                    </ul>
                                </div>
                                <div class="flex flex-col gap-2">
                                    <span class="text-[9px] text-white/40 font-black uppercase tracking-widest">Usage Protocol / 使用方式</span>
                                    <p class="text-[11px] text-white/60 font-mono leading-relaxed">
                                        選取儀表板上方各項戰術面板，透過輸入指令或點擊節點進行交互分析。
                                    </p>
                                </div>
                            </div>
                            <div class="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
                                <span class="text-[10px] text-primary/60 italic font-mono uppercase tracking-widest">
                                    * 提示：透過申請並置入 API 金鑰即可解鎖完整功能，進入正式對話模式。
                                </span>
                                <a href="https://aistudio.google.com" target="_blank" class="text-[10px] text-primary border-b border-primary/30 hover:border-primary transition-all no-underline uppercase tracking-widest font-black">申請 gemini API Key</a>
                            </div>
                        </div>
                    </div>
                    ${messages
                        .filter(msg => filterRound === 'all' || msg.round === filterRound)
                        .map(msg => {
                            // DENSE_DISPLAY_PROTOCOL: Strategic data synthesis & symbol eradication
                            const cleanContent = (msg.content || '')
                                .replace(/\r\n/g, '\n')
                                .replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1')
                                .replace(/[#*-]{3,}/g, '') 
                                .replace(/\n{3,}/g, '\n\n') 
                                .replace(/[`]/g, '') 
                                .replace(/^\s*[-*+]\s+/gm, '• ') 
                                .trim();
                            
                            return `
                            <div class="flex flex-col gap-3 group/msg animate-fade-in">
                                <div class="flex items-center gap-3">
                                    <div class="w-8 h-8 rounded-full border border-white/10 overflow-hidden ring-2 ring-black/50" style="border-color: ${msg.agentColor}66">
                                        <img src="./images/${msg.agentImg}" class="w-full h-full object-cover">
                                    </div>
                                    <div class="flex items-center gap-4">
                                        <span class="text-[11px] font-mono text-white font-black uppercase tracking-widest">${msg.agentName}</span>
                                        <span class="px-2 py-0.5 bg-white/5 rounded-xs text-[7px] font-mono text-white/30 uppercase tracking-widest border border-white/5 font-black">ROUND_${msg.round.toString().padStart(2, '0')}</span>
                                    </div>
                                </div>

                                <div class="ml-11 p-6 rounded-sm bg-black/40 backdrop-blur-3xl border border-white/5 border-l-[3px] transition-all relative overflow-hidden group-hover/msg:border-white/15 group-hover/msg:bg-black/50 shadow-xl" 
                                     data-path="${msg.path?.join('/') || ''}"
                                     style="--agent-color: ${msg.agentColor}; border-left-color: color-mix(in srgb, var(--agent-color) 80%, transparent);">
                                     
                                      <div class="absolute inset-0 pointer-events-none opacity-[0.02] u-bg-dots"></div>

                                      ${renderPathBreadcrumb(msg.path)}

                                      ${msg.isImage ? `
                                          <div class="flex flex-col gap-4 relative z-10">
                                              <div class="relative group/img overflow-hidden border border-white/10 rounded-sm shadow-2xl max-w-2xl">
                                                  <img src="${msg.imageUrl || ''}" class="w-full object-contain">
                                              </div>
                                          </div>
                                      ` : `
                                         <div class="font-mono text-[15px] text-white/90 leading-[1.7] tracking-tight whitespace-pre-wrap relative z-10 font-medium"${msg.isStreaming ? ' id="u-streaming-content" data-agent="' + msg.agentCode + '"' : ''}>
                                             ${cleanContent || `
                                                 <div class="flex flex-col gap-6 py-4 animate-pulse">
                                                     <div class="flex items-center gap-4">
                                                         <div class="w-2 h-2 rounded-full u-shadow-glow" style="background: var(--agent-color)"></div>
                                                         <span class="text-[10px] font-black uppercase tracking-[0.6em] opacity-40">Decrypting_Neural_Pulse...</span>
                                                     </div>
                                                 </div>
                                             `}
                                             ${msg.isStreaming ? `<span class="inline-block w-3 h-5 ml-2 bg-primary/60 animate-pulse align-middle u-shadow-glow"></span>` : ''}
                                          </div>
                                      `}

                                      ${renderReasoningBlock(msg)}
                                      ${renderCitations(msg)}
                                      
                                      ${msg.isStreaming ? `
                                         <div class="absolute bottom-0 left-0 w-full h-[2px] overflow-hidden">
                                             <div class="h-full w-1/4 animate-[shimmer_1.5s_infinite]" style="background: var(--agent-color)"></div>
                                         </div>
                                     ` : ''}
                                </div>
                            </div>
                        `;
                        }).join('')}

                    ${(isStreaming && !activeAgent?.isStreaming) ? `
                        <div class="flex flex-col items-center justify-center py-24 gap-8 opacity-40">
                            <div class="w-14 h-14 border-4 border-primary/20 border-t-primary rounded-full animate-spin shadow-[0_0_30px_rgba(0,255,204,0.1)]"></div>
                            <span class="text-[11px] font-mono text-primary uppercase tracking-[0.5em] font-black">Awaiting_Strategic_Input...</span>
                        </div>
                    ` : ''}
                </div>
            </div>
        </div>
    `;
};

