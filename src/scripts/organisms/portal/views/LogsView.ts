/**
 * AZ PORTAL LOGS VIEW — Real-time Stream Organism
 */

import type { LogEntry } from '../PortalTypes';
import { renderCommonHeader } from '../../../molecules/m_portal_content_header';
import { renderCommonFooter } from '../../../molecules/m_portal_content_footer';

export const renderLogsView = (logs: LogEntry[], logFilter: string, telemetry: any) => {
    const filteredLogs = logFilter === 'ALL'
        ? logs
        : logs.filter(l => logFilter === 'WARN' ? l.type.toUpperCase().includes('WARN') : l.type === logFilter);

    const filterBtn = (label: string, active: boolean, color: string) => `
        <button class="u-btn-log-filter px-2.5 py-1 rounded-sm border transition-all text-[8px] font-mono uppercase font-black tracking-widest ${active ? 'u-shadow-glow' : 'opacity-40 hover:opacity-100'}" 
                data-filter="${label}"
                style="background: ${color}1a; border-color: ${color}${active ? '55' : '22'}; color: ${color}; ${active ? `box-shadow: 0 0 10px ${color}33;` : ''}">
            ${label}
        </button>
    `;

    const logFilters = `
        <div class="flex items-center gap-2">
            ${filterBtn('ALL', logFilter === 'ALL', '#ffffff')}
            ${filterBtn('SUCCESS', logFilter === 'SUCCESS', '#22c55e')}
            ${filterBtn('INFO', logFilter === 'INFO', '#4d9eff')}
            ${filterBtn('WARN', logFilter === 'WARN', '#f59e0b')}
            ${filterBtn('ERROR', logFilter === 'ERROR', '#ef4444')}
        </div>
    `;

    const header = renderCommonHeader({
        title: '實時連線：數據日誌串流',
        accentColor: 'var(--color-secondary)',
        currentView: 'logs',
        leftExtra: logFilters
    });

    return `
        <div class="u-portal-chat-container flex flex-col h-full overflow-hidden">
            ${header}
            <div class="flex-1 p-6 flex flex-col bg-black/20 overflow-hidden">
                <div id="u-log-container" class="flex-1 overflow-y-auto u-scrollbar pr-4 font-mono text-[11px] text-white/70 flex flex-col gap-1">
                    ${filteredLogs.map(log => `
                        <div class="flex items-start gap-4 py-1 border-b border-white/10 hover:bg-white/5 transition-colors">
                            <span class="text-white/20 shrink-0 w-[70px] font-bold">${log.timestamp}</span>
                            <span class="font-bold w-[70px] ${(log.type.toUpperCase().includes('SUCCESS')) ? 'text-success' : (log.type.toUpperCase().includes('ERROR')) ? 'text-error' : (log.type.toUpperCase().includes('WARN')) ? 'text-warning' : 'text-primary' }">[${log.type}]</span>
                            <p class="flex-1">${log.message}</p>
                            ${log.path?.length ? `<span class="shrink-0 text-[8px] font-mono text-white/20 uppercase tracking-widest">${log.path.join(' › ')}</span>` : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
            ${renderCommonFooter({
                bgClass: 'bg-white/3',
                left: `
                    <div class="flex items-center gap-10 font-mono">
                        <div class="flex flex-col">
                            <span class="text-[8px] text-white/30 uppercase tracking-widest leading-none mb-1">THROUGHPUT</span>
                            <span class="text-[10px] text-primary font-black uppercase">Active_Stream</span>
                        </div>
                        <div class="flex flex-col">
                            <span class="text-[8px] text-white/30 uppercase tracking-widest leading-none mb-1">PROTOCOL</span>
                            <span class="text-[10px] text-white font-black uppercase">SSE/H2_V3</span>
                        </div>
                    </div>
                `,
                center: `
                    <!-- Integrated Telemetry Strip -->
                    <div class="flex items-center gap-8 bg-black/40 px-6 py-1.5 rounded-full border border-white/5 shadow-inner">
                        <div class="flex flex-col items-center">
                            <span class="text-[7px] text-white/20 uppercase tracking-tighter">Cache_Hit</span>
                            <span class="text-[10px] font-mono text-success font-black">${telemetry?.cacheHitRate ?? 0}%</span>
                        </div>
                        <div class="w-px h-4 bg-white/10"></div>
                        <div class="flex flex-col items-center">
                            <span class="text-[7px] text-white/20 uppercase tracking-tighter">Grounding</span>
                            <span class="text-[10px] font-mono ${telemetry?.searchCalls > 0 ? 'text-warning pulse' : 'text-white/40'} font-black">
                                ${telemetry?.searchCalls > 0 ? 'ACTIVE' : 'IDLE'}
                            </span>
                        </div>
                        <div class="w-px h-4 bg-white/10"></div>
                        <div class="flex flex-col items-center">
                            <span class="text-[7px] text-white/20 uppercase tracking-tighter">Savings</span>
                            <span class="text-[10px] font-mono text-primary-cyan font-black">$${(telemetry?.estimatedSavings || 0).toFixed(3)}</span>
                        </div>
                    </div>
                `,
                right: `
                    <div class="text-[11px] font-mono text-secondary font-black tracking-[0.2em] opacity-80 uppercase">
                        ${(telemetry?.tokenCount || 0).toLocaleString()} TKNS_PROCESSED
                    </div>
                `
            })}
        </div>
    `;
};
