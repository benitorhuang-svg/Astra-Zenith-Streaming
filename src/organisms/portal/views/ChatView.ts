import type { ChatMessage } from '../PortalTypes';
import { renderLiveTelemetry, renderRoundFilters, renderCycleController } from '../../../molecules/m_portal_hud';
import { renderMessageBlock } from './chat/MessageRenderer';

export const renderChatView = (
    messages: ChatMessage[],
    pollingCycles: number,
    currentPasses: number,
    filterRound: number | 'all',
    isStreaming: boolean,
    activePrompt: string
) => {
    const win = window as any;
    const harness = win.harnessState || (win.semanticGraph?.context?.harnessState);
    
    let harnessHtml = '';
    if (harness) {
        const facts = (harness.facts || []).map((f: any) => `
            <div class="group relative text-[11px] text-green-400/70 border-l-2 border-green-500/20 pl-2 mb-2 hover:border-green-500/50 transition-all">
                <span class="text-[9px] text-white/20 block font-bold uppercase">${f.sourceAgent || 'System'}</span>
                ● ${f.content || f}
            </div>`).join('');
            
        const vars = Object.entries(harness.variables || {}).map(([k,v]: any) => `
            <div class="flex items-center justify-between text-[10px] bg-white/5 p-1 rounded-xs border border-white/5">
                <span class="text-primary/60 font-bold">${k}</span>
                <span class="text-white/80">${v.value || v}</span>
            </div>`).join('');
        
        harnessHtml = `
            <div class="absolute right-6 top-20 w-64 bg-black/80 backdrop-blur-2xl border border-white/10 p-4 z-40 rounded-sm shadow-2xl overflow-hidden max-h-[70vh] flex flex-col pointer-events-auto">
                <div class="text-[10px] uppercase tracking-tighter text-white/40 mb-4 flex items-center justify-between">
                    <span class="flex items-center gap-2"><i data-lucide="shield-check" class="w-3 h-3 text-green-500"></i> HARNESS KERNEL 4.0</span>
                    <span class="bg-green-500/20 text-green-400 px-1 rounded-xs">LIVE</span>
                </div>
                ${vars ? `<div class="mb-4 space-y-1 overflow-y-auto max-h-32 u-scrollbar pr-1">${vars}</div>` : ''}
                <div class="flex-1 overflow-y-auto u-scrollbar pr-1">
                    ${facts || '<div class="text-[10px] text-white/20 italic">事實固化中...</div>'}
                </div>
            </div>
        `;
    }

    return `
        <div class="h-full flex flex-col relative overflow-hidden bg-transparent">
            ${harnessHtml}
            <div class="h-[60px] border-b border-white/5 flex items-center bg-black/80 backdrop-blur-3xl px-4 shrink-0 z-50">
                <div class="flex items-center gap-6 shadow-2xl">
                    ${renderLiveTelemetry(currentPasses, pollingCycles)}
                    ${renderRoundFilters(pollingCycles, currentPasses, filterRound)}
                    ${renderCycleController(pollingCycles)}
                </div>
                <div class="flex-1 flex items-center justify-end pl-10 gap-3">
                    <input id="u-mission-input" type="text" value="${activePrompt}" 
                           placeholder="ENTER_TACTICAL_COMMAND..." ${isStreaming ? 'disabled' : ''}
                           class="flex-1 h-12 bg-white/5 border border-white/10 rounded-sm px-4 font-mono text-[13px] outline-none focus:border-primary transition-all text-white/80">
                    <az-button id="u-mission-action" icon="${isStreaming ? 'square' : 'send'}" variant="primary" size="md" class="w-12 h-12 shrink-0"></az-button>
                </div>
            </div>
            <div id="u-chat-scroll" class="flex-1 p-10 overflow-y-auto u-scrollbar flex flex-col gap-6 max-w-6xl mx-auto w-full pb-24">
                ${messages
                    .filter(m => filterRound === 'all' || m.round === filterRound)
                    .map(m => renderMessageBlock(m)).join('')}
            </div>
        </div>`;
};
