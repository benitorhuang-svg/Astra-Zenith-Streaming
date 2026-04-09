import type { ChatMessage } from '../../PortalTypes';

export const renderMessageBlock = (msg: ChatMessage) => {
    const clean = (msg.content || '').replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1').trim();
    return `
        <div class="flex flex-col gap-3 group/msg animate-fade-in">
            <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-full border border-white/10" style="border-color: ${msg.agentColor}66">
                    <img src="./images/${msg.agentImg}" class="w-full h-full object-cover">
                </div>
                <span class="text-[11px] font-mono text-white font-black uppercase tracking-widest">${msg.agentName}</span>
            </div>
            <div class="ml-11 p-6 rounded-sm bg-black/40 border-l-[3px] relative" style="border-left-color: ${msg.agentColor}">
                <div class="font-mono text-[15px] text-white/90 whitespace-pre-wrap"${msg.isStreaming ? ' id="u-streaming-content"' : ''}>
                    ${clean || '<span class="animate-pulse">Decrypting...</span>'}
                </div>
            </div>
        </div>`;
};
