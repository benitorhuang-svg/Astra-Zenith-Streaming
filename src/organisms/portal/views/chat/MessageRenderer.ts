import type { ChatMessage } from '../../PortalTypes';

export const renderMessageBlock = (msg: ChatMessage) => {
    const clean = (msg.content || '').replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1').trim();
    // 🚀 INDUSTRIAL_ID: Unique ID per agent-round to avoid streaming collisions
    const streamingId = `u-stream-${msg.agentCode}-${msg.round}`;
    
    return `
        <div class="flex flex-col gap-3 group/msg animate-fade-in" data-round="${msg.round}">
            <div class="flex items-center gap-3">
                <div class="w-8 h-8">
                    <az-avatar url="./images/${msg.agentImg}" size="fill" ring glow="${msg.isStreaming}"></az-avatar>
                </div>
                <div class="flex flex-col">
                    <span class="text-[10px] font-mono text-white font-black uppercase tracking-widest">${msg.agentName}</span>
                    <span class="text-[7px] font-mono text-white/20 uppercase tracking-[0.2em]">NODE_IDENT: ${msg.agentCode}_R${msg.round}</span>
                </div>
            </div>
            <div class="ml-11 p-6 rounded-sm bg-black/40 border-l-[3px] relative group-hover/msg:bg-white/[0.02] transition-colors" style="border-left-color: ${msg.agentColor}">
                <div id="${streamingId}" class="font-mono text-[14px] leading-relaxed text-white/90 whitespace-pre-wrap">
                    ${clean || (msg.isStreaming ? '<span class="animate-pulse text-primary/40">SYNCHRONIZING_NEURAL_PULSE...</span>' : '')}
                </div>
                
                ${msg.isStreaming ? `
                    <div class="absolute -bottom-1 -right-1 w-4 h-4 bg-primary/20 rounded-full flex items-center justify-center animate-spin">
                        <div class="w-1.5 h-1.5 bg-primary rounded-full"></div>
                    </div>
                ` : ''}
            </div>
        </div>`;
};
