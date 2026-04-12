/**
 * PortalShell — Base layout and DOM patching utilities for AZPortal
 */
export const renderPortalShell = () => `
    <az-hud></az-hud>
    <div class="u-portal-wrapper flex w-full h-full overflow-hidden px-3 pb-3 relative"
         style="background: url('./astra_zenith_wallpaper.png') center/cover no-repeat; background-color: #050505;">
        <div class="absolute inset-0 bg-linear-to-tr from-black/90 via-black/40 to-primary/5 pointer-events-none"></div>
        <div id="u-portal-sidebar" class="w-[74px] shrink-0 h-full bg-black/40 backdrop-blur-3xl border-r border-white/5 relative z-10 transition-all duration-500 overflow-x-hidden"></div>
        <div id="u-portal-main" class="flex-1 min-w-0 h-full relative z-10"></div>
        <div id="u-portal-bubble-container" class="relative z-50"></div>
    </div>`;

export const patchDecisionTreeDOM = (mainCont: HTMLElement, html: string) => {
    const temp = document.createElement('div');
    temp.innerHTML = html;
    ['#u-decision-activity-list', '#u-decision-streaming-indicator'].forEach(sel => {
        const next = temp.querySelector(sel);
        const prev = mainCont.querySelector(sel);
        if (next && prev && next.innerHTML !== prev.innerHTML) prev.innerHTML = next.innerHTML;
    });
};
