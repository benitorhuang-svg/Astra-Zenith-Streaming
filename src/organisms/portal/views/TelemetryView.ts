/**
 * AZ PORTAL TELEMETRY VIEW — System Diagnostic HUD
 * Visualizing real-time performance, token consumption, and neural load.
 */

import type { PortalTelemetry } from '../PortalTypes';
import { renderCommonHeader } from '../../../molecules/m_portal_content_header';
import { renderCommonFooter } from '../../../molecules/m_portal_content_footer';

export const renderTelemetryView = (telemetry: PortalTelemetry) => {
    const activePath = telemetry.lastPath.length > 0 ? telemetry.lastPath.join(' › ') : 'IDLE';
    return `
        <div class="u-portal-chat-container flex flex-col h-full overflow-hidden">
            ${renderCommonHeader({
                title: '系統遠測：實時性能監控 (SYSTEM TELEMETRY DIAGNOSTICS)',
                accentColor: '#f59e0b',
                showControl: false,
                currentView: 'telemetry'
            })}
            <div class="flex-1 p-8 lg:p-12 bg-black/40 overflow-y-auto u-scrollbar flex flex-col min-h-0">
                <div class="grid grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-12 max-w-5xl w-full mx-auto shrink-0">
                    ${renderTelemetryTile('Neural_Load', `${telemetry.activeAgentCount}`, 'var(--primary)', `Active_Agent: ${telemetry.activeAgentCode ?? 'IDLE'}`)}
                    ${renderTelemetryTile('Token_Watermark', `${telemetry.tokenCount.toLocaleString()}`, 'var(--secondary)', `Budget: ${telemetry.tokenBudget.toLocaleString()}`)}
                    ${renderTelemetryTile('Queue_Depth', `${telemetry.queueDepth}`, 'rgba(255,255,255,0.4)', `Current_Path: ${activePath}`)}
                    ${renderTelemetryTile('Agent_Sync_Rate', telemetry.isCompacting ? 'COMPACT' : 'SYNC', 'var(--success)', `Compaction: ${telemetry.isCompacting ? 'ACTIVE' : 'IDLE'}`)}
                    ${renderTelemetryTile('Polling_Progress', `${telemetry.currentPasses}/${telemetry.pollingCycles}`, 'var(--primary)', 'Strategic_Cycle_Completion')}
                    ${renderTelemetryTile('System_Status', telemetry.currentView.toUpperCase(), 'rgba(255,255,255,0.2)', `Logs: ${telemetry.logCount}`)}
                </div>
                
                <div class="mt-8 lg:mt-16 w-full max-w-5xl mx-auto h-32 bg-white/3 border border-white/10 rounded-xs flex items-end p-6 gap-2 overflow-hidden relative shrink-0">
                    <div class="absolute top-4 left-6 text-[9px] font-mono text-white/20 uppercase tracking-widest italic">Neural_Oscillation_Stream</div>
                    ${Array.from({length: 40}).map((_, i) => `
                        <div class="flex-1 bg-primary/20 hover:bg-primary/40 transition-all cursor-crosshair h-[${10 + ((i * 37 + 13) % 80)}%]"></div>
                    `).join('')}
                </div>
            </div>
            ${renderCommonFooter({
                bgClass: 'bg-white/3',
                left: `
                    <div class="flex items-center gap-10 font-mono">
                        <div class="flex flex-col">
                            <span class="text-[8px] text-white/30 uppercase tracking-widest leading-none mb-1">DRIVE_STATUS</span>
                            <span class="text-[10px] text-primary font-black uppercase inline-flex items-center gap-1.5">
                                <div class="w-1.5 h-1.5 bg-primary rounded-full animate-pulse"></div>
                                ${telemetry.isCompacting ? 'Context_Compaction' : 'High_Availability'}
                            </span>
                        </div>
                        <div class="flex flex-col border-l border-white/10 pl-10">
                            <span class="text-[8px] text-white/30 uppercase tracking-widest leading-none mb-1">ENCRYPTION</span>
                            <span class="text-[10px] text-white font-black uppercase">${telemetry.tokenBudget > 0 ? 'AES-256_GCM' : 'DISABLED'}</span>
                        </div>
                    </div>
                `,
                right: `
                    <div class="text-[11px] font-mono text-secondary font-black tracking-[0.2em] opacity-80 uppercase">
                        TELEMETRY_READY // HUD_V4 // ${activePath}
                    </div>
                `
            })}
        </div>
    `;
};

/**
 * MOLECULE: Telemetry Tile
 */
function renderTelemetryTile(title: string, value: string, color: string, subtitle: string): string {
    return `
        <div class="flex flex-col gap-2 p-6 border-l border-white/10 bg-white/2 hover:bg-white/5 transition-all group" 
             style="--tile-color: ${color};">
            <span class="text-[9px] font-mono text-white/30 uppercase tracking-[0.3em] font-black group-hover:text-(--tile-color) transition-colors">${title}</span>
            <span class="text-4xl font-mono font-black tracking-tighter" style="color: var(--tile-color); text-shadow: 0 0 20px color-mix(in srgb, var(--tile-color) 30%, transparent);">${value}</span>
            <span class="text-[8px] font-mono text-white/10 uppercase italic border-t border-white/5 pt-2 mt-2">${subtitle}</span>
        </div>
    `;
}
