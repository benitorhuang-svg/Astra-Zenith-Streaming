import { initClock } from '../../core/utils';
import type { IdentityState } from '../../core/identity';

console.log('AZHeader module loaded (v2)');

export class AZHeader extends HTMLElement {
    connectedCallback(): void {
        this.render();
        initClock();
        this.bindEvents();
    }

    private render(): void {
        this.innerHTML = `
            <div class="flex flex-col gap-1">
                <h1 class="text-base font-headline font-black uppercase tracking-[0.4em] text-white leading-none">ASTRA ZENITH</h1>
                <div class="flex items-center gap-3">
                    <span class="text-[8px] font-mono text-primary tracking-widest">TACTICAL_BLUEPRINT</span>
                    <span id="clock" class="text-[9px] font-mono text-text-dim">00:00:00</span>
                </div>
            </div>

            <!-- Global Action Console (Integrated) -->
            <div class="flex items-center gap-3">
                <button id="h-btn-chat" class="h-9 px-5 flex items-center justify-center gap-2.5 bg-primary/10 border border-primary/40 rounded-sm text-primary font-mono text-[11px] font-bold hover:bg-primary/20 hover:border-primary transition-all active:scale-95 group u-shadow-glow" title="開啟主題對話介面">
                    <i data-lucide="message-square" class="w-3.5 h-3.5"></i>
                    <span class="tracking-widest">主題對話</span>
                </button>

                <button id="u-btn-download-archive" class="h-9 px-5 flex items-center justify-center gap-2.5 bg-white/5 border border-white/10 rounded-sm text-white/40 font-mono text-[11px] font-bold hover:bg-secondary/20 hover:border-secondary/50 hover:text-secondary transition-all active:scale-90 group" title="進入任務歸檔 (DATA VAULT)">
                    <i data-lucide="archive" class="w-3.5 h-3.5 group-hover:scale-110 transition-transform"></i>
                    <span class="tracking-widest">任務歸檔</span>
                </button>

                <button id="h-btn-realtime" class="h-9 px-5 flex items-center justify-center gap-2.5 bg-secondary/10 border border-secondary/30 rounded-sm text-secondary font-mono text-[11px] font-bold hover:bg-secondary/20 hover:border-secondary transition-all active:scale-95 u-shadow-glow" title="即時日誌監控 (SYSTEM_LOG)">
                    <i data-lucide="activity" class="w-3.5 h-3.5"></i>
                    <span class="tracking-widest capitalize">實時連線</span>
                </button>

                <button id="h-btn-pathway" class="h-9 px-5 flex items-center justify-center gap-2.5 bg-success/10 border border-success/40 rounded-sm text-success font-mono text-[11px] font-bold hover:bg-success/20 hover:border-success transition-all active:scale-95 group u-shadow-glow" title="路徑分析與心智導圖 (STRATEGIC_PATHWAY)">
                    <i data-lucide="network" class="w-3.5 h-3.5"></i>
                    <span class="tracking-widest capitalize">路徑分析</span>
                </button>

                <button id="h-btn-custom-flow" class="h-9 px-5 flex items-center justify-center gap-2.5 bg-primary/10 border border-primary/40 rounded-sm text-primary font-mono text-[11px] font-bold hover:bg-primary/20 hover:border-primary transition-all active:scale-95 group u-shadow-glow" title="自訂工作流 (NODE_WORKFLOW)">
                    <i data-lucide="blocks" class="w-3.5 h-3.5"></i>
                    <span class="tracking-widest capitalize">工作流自訂</span>
                </button>
            </div>

            <!-- Operator Context -->
            <button id="h-btn-profile" class="flex items-center gap-6 group bg-white/5 transition-colors cursor-pointer px-4 py-1.5 rounded-sm border border-white/20 hover:border-primary/50 shadow-[0_0_15px_rgba(255,255,255,0.05)]" title="點擊修改身分及 API 金鑰 (EDIT_PROFILE)">
                <div class="flex flex-col items-end">
                    <span id="u-operator-role" class="text-[9px] font-mono text-white/30 tracking-[0.2em] uppercase font-bold group-hover:text-primary transition-colors italic">OFFLINE</span>
                    <div class="flex items-center gap-3">
                        <span id="u-operator-name" class="text-xs font-mono text-white font-bold tracking-widest uppercase group-hover:text-primary transition-colors">USER</span>
                    </div>
                </div>
                <div id="u-operator-avatar-container">
                    <az-avatar id="u-operator-avatar-header" url="" size="md"></az-avatar>
                </div>
            </button>
        `;
        window.lucide?.createIcons({ parent: this });

        // Initialize with GlobalIdentity State
        import('../../core/identity').then(({ GlobalIdentity }) => {
            const current = GlobalIdentity.get();
            this.updateWithIdentity(current);
        });
    }

    private updateWithIdentity(identity: IdentityState): void {
        const nameEl = this.querySelector('#u-operator-name');
        const roleEl = this.querySelector('#u-operator-role') as HTMLElement;
        const avatarEl = this.querySelector('#u-operator-avatar-header');
        const chatBtnText = this.querySelector('#h-btn-chat span');

        if (nameEl && identity.userName) nameEl.textContent = identity.userName;
        if (avatarEl && identity.avatarUrl) avatarEl.setAttribute('url', identity.avatarUrl);
        
        if (chatBtnText) {
            chatBtnText.textContent = (identity.accessMode === 'PREVIEW') ? '虛擬劇本' : '主題對話';
        }

        if (roleEl && identity.accessMode) {
            const isPreview = identity.accessMode === 'PREVIEW';
            const tier = identity.billingTier || 'OFFLINE';
            
            let statusLabel = 'Preview';
            let statusColor = 'text-warning';

            if (!isPreview) {
                if (tier === 'PRO') {
                    statusLabel = 'API_Pro';
                    statusColor = 'text-success';
                } else {
                    statusLabel = 'API_FREE';
                    statusColor = 'text-primary';
                }
            }
            
            roleEl.innerHTML = `<span class="${statusColor} font-black text-[9px] tracking-widest italic uppercase">${statusLabel}</span>`;
            roleEl.className = 'flex flex-col items-end opacity-100 transition-all';
        }
    }

    private bindEvents(): void {
        this.querySelector('#h-btn-custom-flow')?.addEventListener('click', () => window.dispatchEvent(new CustomEvent('az-toggle-custom-workflow')));
        this.querySelector('#h-btn-pathway')?.addEventListener('click', () => window.dispatchEvent(new CustomEvent('az-toggle-pathway')));
        this.querySelector('#h-btn-realtime')?.addEventListener('click', () => window.dispatchEvent(new CustomEvent('az-toggle-logs')));
        this.querySelector('#h-btn-profile')?.addEventListener('click', () => window.dispatchEvent(new CustomEvent('az-logout')));
        this.querySelector('#u-btn-download-archive')?.addEventListener('click', () => window.dispatchEvent(new CustomEvent('az-toggle-archive')));
        this.querySelector('#h-btn-chat')?.addEventListener('click', () => window.dispatchEvent(new CustomEvent('az-toggle-chat')));

        window.addEventListener('az-identity-update', (e: Event) => this.updateWithIdentity((e as CustomEvent<IdentityState>).detail));

        window.addEventListener('az-view-updated', (e: Event) => this.updateActiveNav((e as CustomEvent<{ view: string }>).detail.view));
    }

    private updateActiveNav(view: string): void {
        const navMap: Record<string, string> = {
            'chat': '#h-btn-chat',
            'archive': '#u-btn-download-archive',
            'logs': '#h-btn-realtime',
            'config': '#h-btn-config',
            'decision-tree': '#h-btn-pathway',
            'table': '#h-btn-custom-flow'
        };

        Object.values(navMap).forEach(selector => {
            const btn = this.querySelector(selector) as HTMLElement;
            if (btn) {
                btn.classList.remove('bg-[#ff007f]/20', 'border-[#ff007f]', 'u-highlight-active', 'u-shadow-glow-pink');
                btn.classList.add('bg-white/5');
            }
        });

        const activeSelector = navMap[view];
        if (activeSelector) {
            const btn = this.querySelector(activeSelector) as HTMLElement;
            if (btn) {
                btn.classList.remove('bg-white/5');
                btn.classList.add('bg-[#ff007f]/20', 'border-[#ff007f]', 'u-highlight-active', 'u-shadow-glow-pink');
            }
        }
    }
}
customElements.define('az-header', AZHeader);
