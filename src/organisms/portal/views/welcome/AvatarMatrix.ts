const AVATAR_REGISTRY = [
    { id: 'tactical', url: './images/operator_99.png', label: 'Tactical_OP' },
    { id: 'cute_robot', url: './images/avatar_cute_robot.png', label: 'Cute_Bot' },
    { id: 'cartoon_agent', url: './images/avatar_cartoon_agent.png', label: 'Agent_Zero' },
    { id: 'ai_soul', url: './images/avatar_ai_soul.png', label: 'AI_Spirit' }
];

export const renderAvatarMatrix = () => `
    <div id="u-avatar-selection-board" class="w-[300px] bg-[#0c141d]/95 backdrop-blur-3xl border border-white/10 p-6 hidden flex-col">
        <div class="flex items-center justify-between mb-5 border-b border-white/5 pb-3">
             <span class="text-[10px] font-black text-[#00f7ff] uppercase tracking-widest">Profile_Matrix</span>
             <button id="u-btn-close-avatar-board" class="text-white/20 hover:text-white"><i data-lucide="x" class="w-4 h-4 pointer-events-none"></i></button>
        </div>
        <div class="grid grid-cols-2 gap-4">
             ${AVATAR_REGISTRY.map(a => `
                  <div class="u-avatar-option cursor-pointer group/opt" data-url="${a.url}">
                       <az-avatar url="${a.url}" size="lg"></az-avatar>
                       <span class="text-[8px] text-white/40 font-black uppercase text-center block mt-2 tracking-widest group-hover/opt:text-[#00f7ff] transition-colors">${a.label}</span>
                  </div>
             `).join('')}
             <div class="relative w-full aspect-square flex flex-col items-center justify-center border-2 border-dashed border-white/10 bg-white/2 hover:border-[#00f7ff]/40 hover:bg-[#00f7ff]/5 group/upload cursor-pointer" id="u-btn-upload-avatar">
                  <i data-lucide="plus" class="w-8 h-8 text-white/10 group-hover/upload:text-[#00f7ff] transition-all pointer-events-none"></i>
                  <span class="text-[7px] font-black text-white/20 group-hover/upload:text-[#00f7ff] uppercase mt-2 pointer-events-none">Custom_INIT</span>
             </div>
             <input type="file" id="u-avatar-upload-input" class="hidden" accept="image/*">
        </div>
    </div>
`;
