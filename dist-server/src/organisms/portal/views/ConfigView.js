"use strict";
/**
 * TACTICAL CONFIG VIEW — Custom Model Allocation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderConfigView = renderConfigView;
function renderConfigView(availableModels, currentConfig) {
    return `
        <div class="u-config-view flex flex-col h-full bg-[#050505]/40 backdrop-blur-3xl p-8 overflow-y-auto u-scrollbar animate-portal-reveal">
            <!-- Header Section -->
            <div class="mb-10 flex flex-col gap-2">
                <div class="flex items-center gap-4">
                    <div class="w-1.5 h-6 bg-primary shadow-[0_0_15px_#00ffcc] rounded-full"></div>
                    <h2 class="text-3xl font-headline font-black text-white tracking-[0.3em] uppercase">戰術模型分配</h2>
                </div>
                <p class="text-[11px] font-mono text-white/30 uppercase tracking-widest pl-6">Tactical_Model_Allocation_Hub // System_Config_v3.1</p>
            </div>

            <!-- Configuration Grid -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-6xl">
                ${currentConfig.map(agent => `
                    <div class="bg-white/5 border border-white/10 p-6 rounded-sm hover:border-primary/40 transition-all group flex flex-col gap-4">
                        <div class="flex items-center justify-between border-b border-white/5 pb-3">
                            <div class="flex flex-col">
                                <span class="text-[10px] font-mono text-primary font-black uppercase tracking-widest">Agent_${agent.id}</span>
                                <h3 class="text-lg font-headline font-bold text-white uppercase tracking-wider">${agent.role}</h3>
                            </div>
                            <div class="w-8 h-8 rounded-full border border-white/20 bg-black/40 flex items-center justify-center text-[10px] font-mono text-white/40 group-hover:text-primary transition-colors">
                                ${agent.id}
                            </div>
                        </div>

                        <div class="flex flex-col gap-2">
                            <label class="text-[9px] font-mono text-white/20 uppercase tracking-[0.2em]">Select Deployment Model</label>
                            <div class="relative w-full">
                                <select class="u-config-select w-full bg-black/60 border border-white/10 text-white font-mono text-[12px] p-3 rounded-xs appearance-none focus:outline-none focus:border-primary/60 transition-all cursor-pointer hover:bg-black/80" 
                                        data-agent-id="${agent.id}">
                                    ${availableModels.map(model => {
        let badge = "";
        if (model.includes('pro'))
            badge = " [PRO]";
        else if (model.includes('flash-lite') || model.includes('26b-a4b'))
            badge = " [FAST]";
        else if (model.includes('31b'))
            badge = " [LEADER]";
        return `<option value="${model}" ${model === agent.model ? 'selected' : ''}>${model}${badge}</option>`;
    }).join('')}
                                </select>
                                <div class="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-white/20">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-down"><path d="m6 9 6 6 6-6"/></svg>
                                </div>
                            </div>
                        </div>

                        <div class="mt-2 flex items-center justify-between">
                            <div class="flex gap-2">
                                ${agent.model.includes('pro') || agent.model.includes('31b')
        ? '<span class="px-2 py-0.5 bg-accent/20 border border-accent/40 text-[7px] font-mono text-accent uppercase rounded-full">Reasoning_Heavy</span>'
        : '<span class="px-2 py-0.5 bg-primary/20 border border-primary/40 text-[7px] font-mono text-primary uppercase rounded-full">High_Throughput</span>'}
                                ${agent.model.includes('gemma')
        ? '<span class="px-2 py-0.5 bg-warning/20 border border-warning/40 text-[7px] font-mono text-warning uppercase rounded-full">Quota_Saver</span>'
        : ''}
                            </div>
                            <span class="text-[8px] font-mono text-white/10 uppercase tracking-widest">Latency_Optimized</span>
                        </div>
                    </div>
                `).join('')}
            </div>

            <!-- Footer Action -->
            <div class="mt-12 max-w-6xl flex justify-end">
                <button id="u-btn-save-config" class="h-12 px-10 bg-primary/20 border border-primary text-primary font-mono text-xs font-black uppercase tracking-[0.2em] rounded-sm hover:bg-primary/30 hover:shadow-[0_0_30px_rgba(0,255,204,0.2)] transition-all active:scale-95 group relative overflow-hidden">
                    <span class="relative z-10 flex items-center gap-3">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-save"><path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                        部署更新協議
                    </span>
                    <div class="absolute inset-0 bg-linear-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                </button>
            </div>
            
            <div class="mt-10 pt-10 border-t border-white/5 max-w-6xl">
                <div class="bg-warning/5 border border-warning/20 p-6 rounded-xs flex gap-6 items-center">
                    <div class="w-12 h-12 rounded-full bg-warning/10 border border-warning/30 flex items-center justify-center shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#eab308" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-alert-triangle"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                    </div>
                    <div class="flex-1">
                        <h4 class="text-warning font-black uppercase text-xs tracking-wider mb-1">注意！模型配置限制</h4>
                        <p class="text-[11px] font-mono text-warning/60 leading-relaxed">
                            FREE 層級要求限制為 1,500 RPD。若為多代理人同時運作，請謹慎選擇 Flash-Lite 系列以節省配額。
                            PRO 層級金鑰可解鎖 Frontier 3.1 Pro 深度推理模型。
                        </p>
                    </div>
                </div>
            </div>
        </div>
    `;
}
