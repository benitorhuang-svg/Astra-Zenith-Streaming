/**
 * AZ PORTAL HEADER — Internal Modular Header
 * Providing consistent tactical navigation across all command views.
 */

export interface HeaderOptions {
    title: string;
    modeIcon?: string;
    accentColor?: string;
    showControl?: boolean; // If true: shows Polling & Mission controls (Main Chat mode)
    leftExtra?: string;
    rightExtra?: string;
    currentView?: string;
}

export const renderCommonHeader = (opts: HeaderOptions) => {
    const { 
        title, 
        modeIcon = '', 
        accentColor = 'var(--color-primary)', 
        showControl = false, 
        leftExtra = '', 
        rightExtra = ''
    } = opts;

    return `
        <div class="flex items-center justify-between h-12 px-4 border-b border-white/10 bg-white/5 backdrop-blur-3xl sticky top-0 z-50 shrink-0">
            <div class="flex items-center h-full gap-8 flex-1">
                <div class="flex items-center gap-3 shrink-0">
                      <div class="w-1.5 h-1.5 rounded-full animate-pulse" style="--local-accent: ${accentColor}; background: var(--local-accent); box-shadow: 0 0 10px var(--local-accent);"></div>
                      <span class="text-[11px] font-mono text-white/90 font-black tracking-[0.3em] uppercase whitespace-nowrap">${title}</span>
                 </div>
                 
                  <!-- Navigation Tabs REMOVED: Redundant with Global Header (User's instruction) -->
                  <div class="flex-1"></div>
                  ${leftExtra}
            </div>
            
            <div class="flex items-center gap-6 flex-1 justify-end h-full">
                 ${rightExtra}
                 ${showControl ? '' : `
                 <div class="flex items-center gap-4 group cursor-pointer" id="u-btn-close-portal">
                     ${modeIcon}
                     <button class="w-8 h-8 flex items-center justify-center text-white/40 bg-primary/10 border border-primary/30 rounded-full group-hover:text-white group-hover:bg-primary/30 group-hover:border-primary transition-all active:scale-90 shadow-[0_0_15px_rgba(77,158,255,0.2)]" title="返回矩陣工作區">
                         <i data-lucide="layout-grid" class="w-3.5 h-3.5 group-hover:scale-110 transition-transform"></i>
                     </button>
                 </div>`}
            </div>
        </div>
    `;
};
