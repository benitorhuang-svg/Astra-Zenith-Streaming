/**
 * AZ_TELEMETRY_HUD — Tactical Sidebar Widget
 * Repurposed in Phase 11 to focus on Mission Topology.
 */

export class TelemetryHUD extends HTMLElement {
    constructor() {
        super();
        this.className = "flex flex-col gap-4 p-4 h-full bg-sidebar-bg/60 backdrop-blur-xl border-l border-sidebar-border overflow-y-auto u-scrollbar";
        this.render();
    }

    private render() {
        this.innerHTML = `
            <div class="flex items-center gap-3 mb-2">
                <div class="w-1 h-3 bg-primary shadow-[0_0_8px_var(--primary)]"></div>
                <h3 class="text-[9px] font-black text-white/70 uppercase tracking-[0.2em]">任務拓撲 // TOPOLOGY</h3>
            </div>

            <div class="flex flex-col gap-4">
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

                <!-- Signal Integrity -->
                <div class="flex flex-col gap-2">
                    <div class="flex justify-between items-end">
                        <span class="text-[7px] text-white/30 uppercase tracking-widest">Signal_Integrity</span>
                        <span class="text-[10px] font-mono text-primary font-black">98.4%</span>
                    </div>
                    <div class="h-1 bg-white/5 rounded-full overflow-hidden">
                        <div class="h-full bg-primary w-[98%] shadow-[0_0_10px_var(--primary)] animate-pulse"></div>
                    </div>
                </div>

                <!-- Neural Synapse Density -->
                <div class="flex flex-col gap-2">
                    <div class="flex justify-between items-end">
                        <span class="text-[7px] text-white/30 uppercase tracking-widest">Synapse_Load</span>
                        <span class="text-[10px] font-mono text-success font-black">LOW</span>
                    </div>
                    <div class="h-1 bg-white/5 rounded-full overflow-hidden">
                        <div class="h-full bg-success w-[12%] shadow-[0_0_10px_var(--success)]"></div>
                    </div>
                </div>
            </div>

            <div class="mt-auto pt-6 border-t border-white/5">
                <div class="flex flex-col gap-1 opacity-40">
                    <span class="text-[7px] font-mono text-white/50 uppercase tracking-[0.3em]">Zenith_OS_Runtime</span>
                    <span class="text-[10px] font-mono text-white font-black uppercase">Stable_v4.2.0</span>
                </div>
            </div>
        `;
    }

    connectedCallback() {
        // In Phase 11, the Global Knowledge Map is handled by AZPortal and the Decision View.
        // This component is now a static Tactical Status monitor.
    }
}

customElements.define('az-telemetry-hud', TelemetryHUD);
