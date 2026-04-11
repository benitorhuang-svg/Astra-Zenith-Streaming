/**
 * AZ PORTAL ARCHIVE VIEW — Tactical Data Vault Organism
 * Designed for 2026 Industrial Mission Archiving.
 */

import type { PortalArchive, ChatMessage } from '../PortalTypes';
import { renderCommonHeader } from '../../../molecules/m_portal_content_header';
import { renderCommonFooter } from '../../../molecules/m_portal_content_footer';

export const renderArchiveView = (archives: PortalArchive[] = [], selectedId: string | null = null) => {
    const selectedArch = selectedId ? archives.find(a => a.id === selectedId) : archives[0];

    const header = renderCommonHeader({
        title: '任務歸檔：離線數據歸檔庫',
        accentColor: '#4d9eff', // Primary blue
        currentView: 'archive',
        leftExtra: `
            <button id="u-btn-clear-all-archive" class="ml-4 h-7 px-4 bg-red-500/10 border border-red-500/30 rounded-full text-red-500 font-mono text-[9px] font-black uppercase tracking-widest hover:bg-red-500/30 hover:shadow-[0_0_15px_rgba(239,68,68,0.3)] transition-all active:scale-95 flex items-center gap-2" title="清除所有檔案 (CLEAR_ALL_FILES)">
                <i data-lucide="trash-2" class="w-3 h-3"></i>
                CLEAR ALL
            </button>
        `
    });

    return `
        <div class="u-portal-chat-container animate-fade-in flex flex-col h-full">
            ${header}
            <div class="flex-1 flex overflow-hidden bg-black/20 relative min-h-0">
                
                <!-- Left Sidebar: Mission Manifest -->
                <div class="w-[420px] flex flex-col border-r border-white/5 bg-black/10 shrink-0">
                     <div class="px-6 py-4 flex items-center justify-between border-b border-white/5 bg-white/2">
                          <span class="text-[9px] font-mono text-white/40 uppercase tracking-[0.25em]">Session_Manifest</span>
                          <span class="text-[9px] font-mono text-primary/60">${archives.length} UNITS</span>
                     </div>
                     <div class="flex-1 overflow-y-auto u-scrollbar">
                         ${archives.map((arch, i) => {
                             const isSelected = selectedId ? arch.id === selectedId : i === 0;
                             const isGenerating = arch.status === 'GENERATING';

                             return `
                             <div class="u-archive-item relative flex items-center gap-3 px-4 py-3 border-b border-white/5 hover:bg-white/5 transition-all cursor-pointer group ${isSelected ? 'bg-primary/10 border-l-2 border-primary' : ''}" 
                                  data-archive-id="${arch.id}">
                                  
                                  <div class="flex items-center gap-1 shrink-0">
                                      <button id="u-btn-download-archive" class="w-6 h-6 flex items-center justify-center bg-white/5 border border-white/10 rounded-xs text-white/20 hover:text-primary hover:border-primary/40 transition-all active:scale-90" title="數據匯出">
                                          <i data-lucide="download" class="w-3 h-3"></i>
                                      </button>
                                      <button class="u-btn-archive-visualize w-6 h-6 flex items-center justify-center bg-white/5 border border-white/10 rounded-xs text-white/20 hover:text-secondary hover:border-secondary/40 transition-all active:scale-90 ${isGenerating ? 'animate-pulse cursor-wait' : ''}" 
                                              title="圖像化摘要" data-arch-id="${arch.id}" ${isGenerating ? 'disabled' : ''}>
                                          <i data-lucide="${isGenerating ? 'refresh-cw' : 'image'}" class="w-3 h-3 ${isGenerating ? 'animate-spin' : ''}"></i>
                                      </button>
                                  </div>

                                  <div class="flex flex-col gap-0.5 flex-1 min-w-0">
                                       <div class="flex items-center gap-2">
                                            <span class="text-[9px] font-mono text-primary font-black opacity-60 underline decoration-primary/30">[${arch.time}]</span>
                                            <span class="text-[10px] font-mono text-white/90 font-black truncate uppercase tracking-tight">${arch.title}</span>
                                       </div>
                                       <span class="text-[7px] font-mono text-white/15 uppercase tracking-[0.2em] truncate">${arch.mission} // ID: ${arch.id}</span>
                                  </div>

                                  ${arch.isImage ? '<i data-lucide="zap" class="w-2.5 h-2.5 text-secondary animate-pulse shrink-0"></i>' : ''}
                             </div>
                             `;
                         }).join('')}
                     </div>
                </div>

                <!-- Right Pane: Viewer (Dynamic) -->
                <div class="flex-1 flex flex-col bg-black/40 relative overflow-hidden">
                     <div class="absolute inset-0 u-grid-pattern opacity-5 pointer-events-none"></div>

                     <div class="flex-1 overflow-y-auto u-scrollbar z-10">
                            ${selectedArch ? `
                                <div class="h-full w-full p-8 flex flex-col justify-start">
                                     ${selectedArch.isImage ? `
                                         <!-- Image Display Overlay Mode -->
                                         <div class="w-full h-full flex flex-col items-center justify-center relative animate-fade-in">
                                              ${selectedArch.imageUrl ? `
                                                  <div class="w-full max-w-4xl bg-white/2 border border-white/10 rounded-xs p-3 relative group">
                                                       <!-- Controls -->
                                                       <div class="absolute top-6 right-6 flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                                                            <a href="${selectedArch.imageUrl}" download="AZ_Infographic_${selectedArch.id}.png" class="w-10 h-10 bg-black/80 border border-primary/50 text-primary flex items-center justify-center rounded-full hover:bg-primary hover:text-black transition-all shadow-2xl" title="下載圖像">
                                                                 <i data-lucide="download" class="w-5 h-5"></i>
                                                            </a>
                                                       </div>
                                                       
                                                       <div class="aspect-square w-full flex items-center justify-center bg-black/40 overflow-hidden rounded-xs border border-white/5">
                                                            <img src="${selectedArch.imageUrl}" class="max-w-full max-h-full object-contain shadow-[0_0_100px_rgba(0,0,0,0.8)]">
                                                       </div>
                                                       
                                                       <div class="mt-4 flex items-center justify-between px-2">
                                                            <div class="flex flex-col">
                                                                 <span class="text-[10px] font-mono text-primary font-black uppercase tracking-[0.2em]">${selectedArch.title}</span>
                                                                 <span class="text-[8px] font-mono text-white/20 uppercase tracking-widest mt-1">Industrial_Synthesis_Engine // Imagen_4.0_Ultra</span>
                                                            </div>
                                                            <span class="text-[8px] font-mono text-white/40 uppercase tracking-widest">TS_SYNC: ${selectedArch.time}</span>
                                                       </div>
                                                  </div>
                                              ` : `
                                                  <!-- Generating Loading State -->
                                                  <div class="flex flex-col items-center gap-6 animate-pulse">
                                                       <div class="w-32 h-32 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                                                       <div class="flex flex-col items-center">
                                                            <span class="text-[11px] font-mono text-primary font-black uppercase tracking-[0.5em]">Synthesizing_Asset</span>
                                                            <span class="text-[8px] font-mono text-white/20 uppercase mt-2">Imagen_4.0_Ultra // Neural_Inference_Processing</span>
                                                       </div>
                                                  </div>
                                              `}
                                         </div>
                                     ` : `
                                         <!-- Standard Text Log Mode -->
                                        <div class="max-w-4xl mx-auto w-full flex flex-col gap-8 animate-fade-in py-8">
                                            <div class="p-6 bg-primary/5 border-l-4 border-primary/40 rounded-sm mb-4">
                                                 <span class="text-primary font-black uppercase block text-[10px] mb-2 tracking-widest">[MISSION_RECORD_INITIALIZED]</span>
                                                 <p class="text-[13px] font-mono text-white/80 leading-relaxed uppercase tracking-tight">系統歸檔節點：正在檢視於 ${selectedArch.time} 執行的 "${selectedArch.title}" 任務鏈路。此報表包含所有部署特派員的戰略輸出。</p>
                                            </div>

                                            <div class="flex flex-col gap-10">
                                                 ${(selectedArch.messages || []).map((msg: ChatMessage) => {
                                                     const cleanContent = (msg.content || '')
                                                         .replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1')
                                                         .replace(/[#*-]{3,}/g, '') 
                                                         .replace(/^\s*[-*+]\s+/gm, '• ') 
                                                         .trim();

                                                    return `
                                                        <div class="flex flex-col gap-4 border-b border-white/5 pb-8 last:border-0 group/arch-msg">
                                                            <div class="flex items-center gap-4">
                                                                <div class="w-8 h-8 rounded-full border border-white/10 overflow-hidden ring-2 ring-black/50" style="border-color: ${msg.agentColor}66">
                                                                    <img src="./images/${msg.agentImg}" class="w-full h-full object-cover grayscale group-hover/arch-msg:grayscale-0 transition-all">
                                                                </div>
                                                                <div class="flex flex-col">
                                                                    <span class="text-[10px] font-mono text-white font-black uppercase tracking-widest">${msg.agentName}</span>
                                                                    <span class="text-[8px] font-mono text-white/30 uppercase tracking-widest">ROUND_${msg.round.toString().padStart(2, '0')}</span>
                                                                </div>
                                                            </div>
                                                            <div class="ml-12 p-5 bg-white/2 border border-white/5 rounded-sm font-mono text-[14px] text-white/70 leading-relaxed whitespace-pre-wrap">
                                                                ${cleanContent || '[NO_DATA_RECORDS]'}
                                                            </div>
                                                        </div>
                                                    `;
                                                }).join('')}
                                            </div>

                                            ${(!selectedArch.messages || selectedArch.messages.length === 0) ? `
                                                <div class="py-20 flex flex-col items-center gap-4 opacity-20 select-none">
                                                    <i data-lucide="file-warning" class="w-12 h-12"></i>
                                                    <span class="text-[10px] font-mono font-black uppercase tracking-[0.4em]">Historical_Data_Purged_Or_Missing</span>
                                                </div>
                                            ` : ''}
                                        </div>
                                     `}
                                </div>
                            ` : `
                                 <div class="w-full h-full flex flex-col items-center justify-center gap-6 opacity-20">
                                     <div class="w-20 h-20 border border-dashed border-white/20 rounded-full flex items-center justify-center animate-pulse">
                                         <i data-lucide="hard-drive" class="w-8 h-8"></i>
                                     </div>
                                     <span class="text-[10px] font-mono font-black uppercase tracking-[0.4em]">Vault_Empty // Select_Log</span>
                                 </div>
                            `}
                     </div>
                </div>
            </div>
            
            ${renderCommonFooter({
                bgClass: 'bg-white/5',
                left: `
                    <button id="u-btn-purge-archive-footer" class="px-3 py-1 bg-red-500/10 border border-red-500/30 rounded-xs text-[8px] font-mono font-black text-red-500 hover:bg-red-500/20 transition-all uppercase tracking-widest leading-none">
                        Purge_Archives
                    </button>
                `,
                right: `
                    <div class="text-[9px] font-mono text-white/30 font-black tracking-widest uppercase">
                        VAULT_ACTIVE // ARCHIVE_ENGINE_V4
                    </div>
                `
            })}
        </div>
    `;
};
