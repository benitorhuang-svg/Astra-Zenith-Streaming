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
    return `
        <div class="h-full flex flex-col relative overflow-hidden bg-transparent">
            <div class="h-[60px] border-b border-white/5 flex items-center bg-black/80 backdrop-blur-3xl px-4 shrink-0 z-50">
                <div class="flex items-center gap-6 shadow-2xl">
                    ${renderLiveTelemetry(currentPasses, pollingCycles)}
                    ${renderRoundFilters(pollingCycles, currentPasses, filterRound)}
                    ${renderCycleController(pollingCycles)}
                </div>
                <div class="flex-1 flex items-center justify-end pl-10 gap-4">
                    <input id="u-mission-input" type="text" value="${activePrompt}" 
                           placeholder="ENTER_TACTICAL_COMMAND..." ${isStreaming ? 'disabled' : ''}
                           class="flex-1 h-11 bg-white/5 border border-white/10 rounded-sm px-4 font-mono text-[13px] outline-none focus:border-primary transition-all">
                    <button id="u-mission-action" class="w-11 h-11 flex items-center justify-center bg-primary/10 border border-primary/30 rounded-sm hover:bg-primary transition-all">
                        <i data-lucide="${isStreaming ? 'square' : 'send'}" class="w-4 h-4 text-primary group-hover:text-black"></i>
                    </button>
                </div>
            </div>
            <div id="u-chat-scroll" class="flex-1 p-10 overflow-y-auto u-scrollbar flex flex-col gap-6 max-w-6xl mx-auto w-full pb-24">
                ${messages
                    .filter(m => filterRound === 'all' || m.round === filterRound)
                    .map(m => renderMessageBlock(m)).join('')}
            </div>
        </div>`;
};
