/**
 * MOLECULE: Portal HUD Elements
 * Granular components for constructing the tactical footer and sidebar.
 */

/**
 * Live Telemetry display (e.g., 0 / 5)
 */
export function renderLiveTelemetry(currentPasses: number, pollingCycles: number): string {
    return `
        <div class="flex flex-col items-center justify-center gap-0.5 shrink-0 px-4 border-r border-white/5">
            <span class="text-[8px] font-mono text-white/30 uppercase tracking-[0.2em] font-bold text-center">Live_Telemetry</span>
            <div class="flex items-center gap-1.5 font-mono">
                <span class="text-[17px] font-black ${currentPasses >= pollingCycles ? 'text-success u-text-shadow-success' : 'text-primary'}">${currentPasses}</span>
                <span class="text-[12px] text-white/10 font-black">/</span>
                <span class="text-[17px] font-black text-white/40">${pollingCycles}</span>
            </div>
        </div>
    `;
}

/**
 * Round quick-filter sequence (buttons 1-5)
 */
export function renderRoundFilters(pollingCycles: number, currentPasses: number, filterRound: number | 'all' = 'all'): string {
    return `
        <div class="flex items-center justify-start gap-2 p-1.5 rounded-sm border border-white/5 bg-black/20 h-12">
            <button class="u-btn-pass-all h-9 px-5 flex items-center justify-center rounded-sm border transition-all font-mono text-[11px] font-bold ${filterRound === 'all' ? 'border-primary bg-primary/20 text-primary u-shadow-glow' : 'border-white/10 bg-white/5 text-white/40 hover:text-white hover:border-white/30'}">
                全部
            </button>
            <div class="w-px h-4 bg-white/10 mx-1"></div>
            ${Array.from({ length: 5 }).map((_, i) => {
                const round = i + 1;
                const isActive = round <= pollingCycles;
                const isFiltered = filterRound === round;
                const isCurrent = round === currentPasses;

                return `
                    <button data-round="${round}" class="u-btn-pass-round w-9 h-9 flex items-center justify-center rounded-sm border transition-all font-mono text-[11px] relative
                        ${isFiltered ? 'border-primary bg-primary/20 text-primary u-shadow-glow' : 'border-white/10 bg-white/5 text-white/40'}
                        ${isActive ? 'opacity-100 hover:border-primary/50' : 'opacity-20 pointer-events-none'}"
                        ${!isActive ? 'disabled' : ''}>
                        ${round}
                        ${isCurrent && !isFiltered ? '<div class="absolute -top-1 -right-1 w-2 h-2 bg-success rounded-full animate-pulse shadow-[0_0_8px_#22c55e]"></div>' : ''}
                    </button>
                `;
            }).join('')}
        </div>
    `;
}

/**
 * Polling Cycle controller (- N +)
 */
export function renderCycleController(pollingCycles: number): string {
    return `
        <div class="flex items-center gap-1 shrink-0">
             <div class="flex flex-col gap-1 mr-3">
                 <span class="text-[11px] font-black text-white/70 uppercase tracking-[0.15em]">輪詢次數</span>
             </div>
             <div class="flex items-center gap-1.5 bg-white/5 rounded-xs p-1 border border-white/10 h-10 px-2">
                <button id="u-btn-cycle-down" ${pollingCycles <= 1 ? 'disabled' : ''} class="w-7 h-7 flex items-center justify-center rounded-xs transition-all ${pollingCycles <= 1 ? 'text-white/10 cursor-not-allowed' : 'text-white/60 hover:text-white hover:bg-white/10 active:scale-90 border border-white/5 bg-white/5'}">
                    <i data-lucide="minus" class="w-3.5 h-3.5"></i>
                </button>
                <span class="text-base font-black text-white/90 w-5 text-center font-mono">${pollingCycles}</span>
                <button id="u-btn-cycle-up" ${pollingCycles >= 5 ? 'disabled' : ''} class="w-7 h-7 flex items-center justify-center rounded-xs transition-all ${pollingCycles >= 5 ? 'text-white/10 cursor-not-allowed' : 'text-white/60 hover:text-white hover:bg-white/10 active:scale-90 border border-white/5 bg-white/5'}">
                    <i data-lucide="plus" class="w-3.5 h-3.5"></i>
                </button>
            </div>
        </div>
    `;
}

/**
 * Combined Horizontal Telemetry (legacy wrapper for backward compatibility)
 */
export function renderPassSequenceHorizontal(pollingCycles: number, currentPasses: number, filterRound: number | 'all' = 'all'): string {
    return `
        <div class="flex items-center gap-6 h-full">
            ${renderLiveTelemetry(currentPasses, pollingCycles)}
            ${renderRoundFilters(pollingCycles, currentPasses, filterRound)}
            ${renderCycleController(pollingCycles)}
        </div>
    `;
}

/**
 * Static Status Telemetry
 */
export function renderStatusTelemetry(currentPasses: number, _pollingCycles: number): string {
    return `
        <div class="flex flex-col items-center gap-1">
            <span class="text-[8px] font-mono text-white/20 uppercase tracking-[0.4em] font-black italic">Command_Status</span>
            <div class="flex items-center gap-3">
                <div class="w-2 h-2 rounded-full ${currentPasses > 0 ? 'bg-primary animate-pulse' : 'bg-white/10'}"></div>
                <span class="text-[10px] font-mono text-white/40 uppercase tracking-widest">${currentPasses > 0 ? 'EXECUTION_ACTIVE' : 'IDLE_STANDBY'}</span>
            </div>
        </div>
    `;
}
