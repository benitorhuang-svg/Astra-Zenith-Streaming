/**
 * MOLECULE: Agent Info Bubble
 * Floating glassmorphism box displaying agent status, model, and tactical prompt.
 */

import { AGENT_POOL } from '../core/agents';

export function renderAgentInfoBubble(agentCode: string, activePrompt: string, selectedAgentPromptContent: string | null, apiKey: string, agentModel: string): string {
    const agent = AGENT_POOL.find(a => a.code === agentCode);
    if (!agent) return '';

    // Logic for Tier-Aware Model Visibility
    const isFreeTier = !apiKey || apiKey.toLowerCase() === 'free' || apiKey.startsWith('PREVIEW_');
    const currentModel = agentModel || (isFreeTier ? 'gemini-3.1-flash-lite-preview' : 'gemini-3.1-pro-preview');

    // Model Matrix
    const paidModels = [
        { id: "gemini-3.1-pro-preview", name: "Frontier 3.1 Pro" },
        { id: "gemini-2.5-pro", name: "Stable 2.5 Pro" }
    ];

    const freeModels = [
        { id: "gemini-3.1-flash-lite-preview", name: "Frontier 3.1 Flash Lite" },
        { id: "gemini-3-flash-preview", name: "Frontier 3 Flash" },
        { id: "gemini-2.5-flash", name: "Stable 2.5 Flash" },
        { id: "gemini-2.5-flash-lite", name: "Stable 2.5 Flash Lite" }
    ];

    const specializedModels = [
        { id: "gemini-robotics-er-1.5-preview", name: "Robotics-ER 1.5" },
        { id: "gemma-4-31b-it", name: "Gemma 4 Standard (31B)" },
        { id: "gemma-4-26b-a4b-it", name: "Gemma 4 Turbo (MoE)" }
    ];
    
    const prompt = activePrompt || "[MISSION_COMMAND_PENDING]";
    const rawContent = (selectedAgentPromptContent || prompt).replace(/!\[.*?\]\(.*?\)/g, '');
    
    /**
     * ADVANCED MODULAR PARSING
     * Splitting the prompt into three tactical modules
     */
    const parseModule = (header: string) => {
        const regex = new RegExp(`## ${header}[\\s\\S]*?(?=##|$)`);
        const match = rawContent.match(regex);
        return match ? match[0].replace(`## ${header}`, '').trim() : '';
    };

    const modules = [
        { id: 'personality', label: 'Personality_Traits', content: parseModule('人格特質') },
        { id: 'protocol', label: 'Tactical_Protocol', content: parseModule('行為協定') },
        { id: 'expertise', label: 'Expertise_Domain', content: parseModule('專業領域') }
    ];

    return `
        <div id="u-agent-info-bubble" class="fixed left-[130px] top-[70px] bottom-1 right-2 z-100 flex items-stretch animate-portal-reveal">
            <!-- Tactical Main Panel -->
            <div class="relative flex-1 bg-black/98 border border-primary/30 rounded-t-xs shadow-[0_0_80px_rgba(var(--primary-rgb),0.25)] flex overflow-hidden">
                
                <!-- Left Column: Vision & Key Controls -->
                <div class="w-80 border-r border-white/10 flex flex-col p-8 bg-linear-to-b from-primary/10 to-transparent shrink-0">
                    <div class="relative aspect-square w-full border border-primary/40 p-1.5 bg-black/60 group overflow-hidden shadow-inner mb-6">
                        <img src="images/${agent.img}" class="w-full h-full object-cover transition-all duration-700 group-hover:scale-110">
                        <div class="absolute inset-0 bg-primary/10 mix-blend-overlay"></div>
                        <!-- Scanner VFX -->
                        <div class="absolute inset-0 w-full h-px bg-primary/60 shadow-[0_0_15px_#00ffcc] animate-scan-y"></div>
                        <!-- Tech Brackets -->
                        <az-brackets></az-brackets>
                    </div>

                    <!-- Compact Model Control -->
                    <div class="flex flex-col gap-6">
                        <div class="flex flex-col gap-2">
                            <span class="text-[9px] font-mono text-white/40 uppercase tracking-widest text-center">Intelligence_Core_Selector</span>
                            <div class="relative group">
                                <select id="u-model-selector" class="w-full h-10 bg-white/5 border border-white/10 px-3 text-[11px] font-mono text-primary font-bold uppercase tracking-wider appearance-none cursor-pointer focus:border-primary/50 outline-none hover:bg-white/10 transition-all text-center">
                                    <optgroup label="💎 PAID FRONTIER CORES" class="bg-[#0a0f18] ${isFreeTier ? 'text-white/20' : 'text-primary/60'}">
                                        ${paidModels.map(m => `
                                            <option value="${m.id}" 
                                                    ${m.id === currentModel ? 'selected' : ''} 
                                                    ${isFreeTier ? 'disabled' : ''}
                                                    class="bg-[#0a0f18] ${isFreeTier ? 'text-white/20' : 'text-white'}">
                                                ${isFreeTier ? '🔒 ' : ''}${m.name} ${isFreeTier ? ' (PAID_ONLY)' : ''}
                                            </option>`).join('')}
                                    </optgroup>
                                    
                                    <optgroup label="🆓 FREE STABLE CORES" class="bg-[#0a0f18] text-primary/60">
                                        ${freeModels.map(m => `<option value="${m.id}" ${m.id === currentModel ? 'selected' : ''} class="bg-[#0a0f18] text-white">${m.name}</option>`).join('')}
                                    </optgroup>
                                    <optgroup label="🛸 SPECIALIZED (ER)" class="bg-[#0a0f18] text-primary/60">
                                        <option value="${specializedModels[0].id}" ${specializedModels[0].id === currentModel ? 'selected' : ''} class="bg-[#0a0f18] text-white font-bold">${specializedModels[0].name}</option>
                                    </optgroup>
                                    <optgroup label="📦 OPEN (GEMMA)" class="bg-[#0a0f18] text-primary/60">
                                        <option value="${specializedModels[1].id}" ${specializedModels[1].id === currentModel ? 'selected' : ''} class="bg-[#0a0f18] text-white font-bold">${specializedModels[1].name}</option>
                                    </optgroup>
                                </select>
                                <div class="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-white/40">
                                    <i data-lucide="chevron-down" class="w-3 h-3"></i>
                                </div>
                            </div>
                        </div>

                        <!-- Apply Button -->
                        <az-button id="u-btn-bubble-apply" label="Apply_Tactical_Update" variant="primary" size="md"></az-button>
                    </div>

                    <div class="flex-1"></div>
                </div>

                <!-- Right Column: Modular Tactical Switchboard -->
                <div class="flex-1 flex flex-col relative min-w-0">
                    <!-- Close Button -->
                    <button id="u-btn-close-bubble" class="absolute top-6 right-6 w-10 h-10 flex items-center justify-center bg-white/5 border border-white/10 text-white/40 hover:text-white hover:bg-red-500/20 hover:border-red-500/40 transition-all rounded-xs z-20 group">
                        <i data-lucide="x" class="w-5 h-5 group-hover:rotate-90 transition-transform"></i>
                    </button>

                    <div class="p-10 pb-4 flex flex-col h-full overflow-hidden">
                        <!-- Header: Reset | UNIT_CODENAME: NAME -->
                        <div class="flex items-center gap-4 mb-8">
                            <az-button id="u-btn-bubble-reset" label="Reset_Protocol" icon="rotate-ccw" variant="ghost" size="sm"></az-button>
                            <div class="h-px bg-primary/40 flex-1"></div>
                            <div class="flex items-center gap-4">
                                <span class="text-[11px] font-mono text-primary/60 font-black uppercase tracking-[0.4em]">UNIT_CODENAME:</span>
                                <div class="flex items-center gap-3 group/name">
                                    <h3 id="u-bubble-agent-name" class="text-xl font-headline font-black text-white tracking-widest uppercase outline-none focus:text-primary transition-all pr-2" contenteditable="true" spellcheck="false">${agent.name.replace(/\s*\(.*?\)\s*/g, '')}</h3>
                                    <i data-lucide="edit-3" class="u-bubble-pen-icon w-4 h-4 text-white/20 group-hover/name:text-primary transition-colors cursor-pointer"></i>
                                </div>
                            </div>
                            <div class="h-px bg-primary/40 w-12"></div>
                        </div>

                        <!-- NEW: TACTICAL CAPSULE CLUSTER -->
                        <div class="flex gap-4 mb-6">
                            ${modules.map((m, idx) => `
                                <button data-module-id="${m.id}" 
                                        class="u-tactical-capsule flex-1 h-12 bg-white/5 border ${idx === 0 ? 'border-primary shadow-[0_0_15px_rgba(var(--primary-rgb),0.2)] text-primary' : 'border-white/10 text-white/40'} px-6 rounded-full font-mono text-[10px] font-black uppercase tracking-widest transition-all hover:bg-white/10 flex items-center justify-between group overflow-hidden relative">
                                    <span class="z-10">${m.label}</span>
                                    <div class="w-2 h-2 rounded-full ${idx === 0 ? 'bg-primary' : 'bg-white/10'} transition-colors z-10"></div>
                                    <!-- Scan Line VFX for active -->
                                    ${idx === 0 ? '<div class="absolute inset-0 bg-primary/5 animate-pulse"></div>' : ''}
                                </button>
                            `).join('')}
                        </div>

                        <!-- MODULAR EDITOR AREA -->
                        <div class="flex-1 flex flex-col min-h-0 bg-black/40 border border-white/5 rounded-xs p-1 relative mb-2">
                            <div class="absolute inset-0 opacity-5 pointer-events-none g-tactical-grid"></div>
                            
                            <!-- 3 Hidden Textareas, only one active at a time -->
                            ${modules.map((m, idx) => `
                                <textarea id="u-editor-${m.id}" 
                                          class="u-modular-textarea flex-1 bg-transparent w-full h-full text-[15px] font-mono text-white/80 leading-relaxed outline-none resize-none u-scrollbar z-10 p-8 selection:bg-primary/30 ${idx === 0 ? 'block' : 'hidden'}"
                                          placeholder="Awaiting_Operational_Parameters..."
                                          spellcheck="false">${m.content}</textarea>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>
            <!-- Overall Bottom Decoration -->
            <div class="absolute bottom-0 left-0 right-0 h-1 bg-primary/40 backdrop-blur-sm shadow-[0_0_30px_rgba(var(--primary-rgb),0.5)] z-20"></div>
        </div>
    `;
}
