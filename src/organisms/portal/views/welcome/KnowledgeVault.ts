const FAQ_ENTRIES = [
    { q: '01 / WHAT_IS_ASTRA?', a: '工業級多特派員戰略指揮系統。旨在提供高保真度、低延遲的自動化工作流與路徑分析環境。', color: 'primary' },
    { q: '02 / MISSION_READY?', a: '<ol class="flex flex-col gap-1.5"><li>1. 輸入操作員 ID 並選擇頭像。</li><li>2. 置入有效 GEMINI API KEY (或預覽模式)。</li><li>3. 初始化空間並開始下達指令。</li></ol>', color: 'primary' },
    { q: '03 / SECURITY_PROTOCOL', a: '所有憑證僅暫存於當前分頁 (SessionStorage)，關閉即毀。核心絕不於服務器留存任何敏感數據。', color: 'secondary' },
    { q: '04 / NEURAL_TOPOLOGY', a: 'LINEAR: 線性傳導 / MATRIX: 多維分析 / CUSTOM: 特殊節點佈局。', color: 'white/40' }
];

export const renderKnowledgeVault = () => `
    <div id="u-faq-board" class="w-[440px] bg-[#0c141d]/98 backdrop-blur-3xl border border-white/10 p-8 hidden flex-col overflow-y-auto u-scrollbar shadow-[0_0_100px_rgba(0,0,0,0.9)] animate-premium-slide">
        <div class="flex items-center justify-between mb-8 border-b border-white/10 pb-5">
             <div class="flex flex-col gap-1">
                 <span class="text-[12px] font-black text-[#ff0055] uppercase tracking-[0.4em] font-mono">Astra_Knowledge</span>
                 <span class="text-[7px] font-mono text-white/20 uppercase tracking-widest">Synthetic Intelligence Operations // FAQ_V4.2</span>
             </div>
             <button id="u-btn-close-faq-board" class="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 border border-white/10 text-white/40 hover:text-white transition-all hover:bg-white/10">
                 <i data-lucide="x" class="w-4 h-4 pointer-events-none"></i>
             </button>
        </div>

        <div class="flex flex-col gap-4 font-mono">
            ${FAQ_ENTRIES.map((f, i) => {
                const accentColor = f.color.includes('secondary') ? '#ff0055' : '#00f7ff';
                return `
                <details class="group/faq border-b border-white/5 pb-4 last:border-none" ${i === 0 ? 'open' : ''}>
                    <summary class="list-none cursor-pointer flex items-center justify-between hover:translate-x-1 transition-transform">
                        <div class="flex items-center gap-4">
                            <span class="text-[10px] text-white/20 font-black">${(i + 1).toString().padStart(2, '0')}</span>
                            <h4 class="text-[11px] text-white/90 font-black uppercase tracking-wider group-open/faq:text-[${accentColor}] transition-colors">${f.q.replace(/^\d+\s\/\s/, '')}</h4>
                        </div>
                        <div class="w-4 h-4 flex items-center justify-center text-white/20 group-open/faq:rotate-180 transition-transform">
                            <i data-lucide="chevron-down" class="w-4 h-4"></i>
                        </div>
                    </summary>
                    <div class="mt-4 pl-9 pr-4 relative">
                        <div class="absolute left-4 top-1 bottom-1 w-px bg-linear-to-b from-[${accentColor}]/40 to-transparent"></div>
                        <div class="text-[10px] text-white/50 leading-[1.8] uppercase tracking-wide animate-fade-in">
                            ${f.a}
                        </div>
                    </div>
                </details>
                `;
            }).join('')}
        </div>

        <div class="mt-12 pt-6 border-t border-white/5 flex justify-between items-center opacity-20">
             <div class="flex gap-1">
                 <div class="w-1 h-3 bg-white/40"></div>
                 <div class="w-1 h-3 bg-white/20"></div>
                 <div class="w-1 h-3 bg-white/10"></div>
             </div>
             <span class="text-[8px] font-mono uppercase tracking-[0.5em]">Auth_Session_Active</span>
        </div>
    </div>
`;
