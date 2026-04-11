"use strict";
/**
 * AZ_TELEMETRY_HUD — Tactical Sidebar Widget
 * Repurposed in Phase 11 to focus on Mission Topology.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TelemetryHUD = void 0;
class TelemetryHUD extends HTMLElement {
    constructor() {
        super();
        this.className = "flex flex-col gap-4 p-4 h-full bg-sidebar-bg/60 backdrop-blur-xl border-l border-sidebar-border overflow-y-auto u-scrollbar";
        this.render();
    }
    render() {
        this.innerHTML = `
            <div class="flex items-center gap-3 mb-2">
                <div class="w-1 h-3 bg-primary shadow-[0_0_8px_var(--primary)]"></div>
                <h3 class="text-[9px] font-black text-white/70 uppercase tracking-[0.2em]">任務拓導監控 // TELEMETRY</h3>
            </div>

            <div class="flex flex-col gap-4">
                <!-- API Budget Status (New) -->
                <div class="p-4 bg-white/3 border border-white/5 rounded-xs flex flex-col gap-3">
                    <span class="text-[7px] text-white/30 uppercase tracking-widest block">API_Rate_Limit_Monitor</span>
                    
                    <!-- RPM Progress -->
                    <div class="flex flex-col gap-1.5">
                        <div class="flex justify-between items-end">
                            <span class="text-[8px] font-mono text-white/40 uppercase tracking-widest">RPM_Load</span>
                            <span id="u-hud-rpm-val" class="text-[10px] font-mono text-primary font-black">0 / 15</span>
                        </div>
                        <div class="h-1 bg-white/5 rounded-full overflow-hidden">
                            <div id="u-hud-rpm-bar" class="h-full bg-primary w-[0%] shadow-[0_0_10px_var(--primary)] transition-all duration-500"></div>
                        </div>
                    </div>

                    <!-- RPD Progress -->
                    <div class="flex flex-col gap-1.5">
                        <div class="flex justify-between items-end">
                            <span class="text-[8px] font-mono text-white/40 uppercase tracking-widest">Daily_RPD_Budget</span>
                            <span id="u-hud-rpd-val" class="text-[10px] font-mono text-white/60 font-black">0 / 1500</span>
                        </div>
                        <div class="h-0.5 bg-white/5 rounded-full overflow-hidden">
                            <div id="u-hud-rpd-bar" class="h-full bg-white/20 w-[0%] transition-all duration-1000"></div>
                        </div>
                    </div>
                </div>

                <!-- Active Swarm Status -->
                <div class="p-4 bg-white/3 border border-white/5 rounded-xs">
                    <span class="text-[7px] text-white/30 uppercase tracking-widest block mb-3">Syndicate_Health</span>
                    <div class="grid grid-cols-2 gap-2">
                        ${['A1', 'A2', 'A3', 'A4', 'A5', 'A6'].map(id => `
                            <div class="flex items-center gap-2">
                                <div class="w-1.5 h-1.5 rounded-full bg-success shadow-[0_0_5px_rgba(34,197,94,0.5)]"></div>
                                <span class="text-[9px] font-mono text-white/60 font-black">${id}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    }
    updateStats(rpm, rpmLimit, rpd, rpdLimit) {
        const rpmPct = Math.min((rpm / rpmLimit) * 100, 100);
        const rpdPct = Math.min((rpd / rpdLimit) * 100, 100);
        const rpmBar = this.querySelector('#u-hud-rpm-bar');
        const rpdBar = this.querySelector('#u-hud-rpd-bar');
        const rpmVal = this.querySelector('#u-hud-rpm-val');
        const rpdVal = this.querySelector('#u-hud-rpd-val');
        if (rpmBar) {
            rpmBar.style.width = `${rpmPct}%`;
            rpmBar.className = `h-full shadow-[0_0_10px_var(--primary)] transition-all duration-500 ${rpmPct > 80 ? 'bg-error shadow-[0_0_15px_var(--error)] animate-pulse' : 'bg-primary'}`;
        }
        if (rpdBar)
            rpdBar.style.width = `${rpdPct}%`;
        if (rpmVal)
            rpmVal.textContent = `${rpm} / ${rpmLimit}`;
        if (rpdVal)
            rpdVal.textContent = `${rpd} / ${rpdLimit}`;
    }
    connectedCallback() {
        // In Phase 11, the Global Knowledge Map is handled by AZPortal and the Decision View.
        // This component is now a static Tactical Status monitor.
    }
}
exports.TelemetryHUD = TelemetryHUD;
customElements.define('az-telemetry-hud', TelemetryHUD);
