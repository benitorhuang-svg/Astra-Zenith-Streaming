"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AZHeader = void 0;
const utils_1 = require("../../core/utils");
const identity_1 = require("../../core/identity");
/**
 * ORGANISM: Tactical Header
 * Orchestrates navigation, clock, and operator identity status.
 * Robust Implementation: High-frequency reactive updates.
 */
class AZHeader extends HTMLElement {
    connectedCallback() {
        this.render();
        (0, utils_1.initClock)();
        this.bindEvents();
    }
    render() {
        this.className = "h-16 w-full bg-[#050a10]/80 backdrop-blur-xl border-b border-white/5 flex items-center justify-between px-6 z-2000 select-none relative";
        this.innerHTML = `
            <div class="flex flex-col gap-1.5">
                <h1 class="text-xl font-headline font-black uppercase tracking-[0.4em] text-white leading-none">ASTRA ZENITH</h1>
                <div class="flex items-center gap-3">
                    <span class="text-[9px] font-mono text-primary tracking-widest opacity-80">TACTICAL_BLUEPRINT</span>
                    <span id="clock" class="text-[10px] font-mono text-text-dim">00:00:00</span>
                </div>
            </div>

            <!-- Dashboard Tabs -->
            <div class="flex items-center gap-3">
                <az-button id="h-btn-chat" variant="ghost" label="主題對話" icon="message-square" size="md"></az-button>
                <az-button id="h-btn-archive" variant="ghost" label="任務歸檔" icon="archive" size="md"></az-button>
                <az-button id="h-btn-realtime" variant="ghost" label="實時連線" icon="activity" size="md"></az-button>
                <az-button id="h-btn-pathway" variant="ghost" label="路徑分析" icon="git-branch" size="md"></az-button>
                <az-button id="h-btn-custom-flow" variant="ghost" label="工作流自訂" icon="layout" size="md"></az-button>
            </div>

            <!-- Operator Context -->
            <button id="h-btn-profile" 
                    class="flex items-center gap-5 px-5 py-2 rounded-full hover:bg-white/5 active:scale-95 transition-all group border border-transparent hover:border-white/10 no-drag pointer-events-auto cursor-pointer"
                    onclick="window.dispatchEvent(new CustomEvent('az-logout', { bubbles: true, composed: true }))">
                <div class="flex flex-col items-end gap-1 pointer-events-none">
                    <span id="u-operator-role" class="text-[10px] font-black uppercase tracking-[0.2em] transition-colors leading-none">OFFLINE</span>
                    <div class="flex items-center gap-1.5">
                         <span id="u-operator-name" class="text-xs font-mono text-white/90 font-black tracking-wider leading-none">USER</span>
                    </div>
                </div>
                <div id="u-operator-avatar-container" class="relative pointer-events-none w-8 h-8">
                    <az-avatar id="u-operator-avatar-header" size="fill" url="https://api.dicebear.com/7.x/bottts/svg?seed=Astra" ring="primary"></az-avatar>
                </div>
            </button>
        `;
        this.updateWithIdentity(identity_1.GlobalIdentity.get());
    }
    bindEvents() {
        this.addEventListener('click', (e) => {
            const path = e.composedPath() || [];
            const find = (selector) => path.find(el => el.matches && el.matches(selector));
            if (find('#h-btn-chat'))
                window.dispatchEvent(new CustomEvent('az-toggle-chat'));
            if (find('#h-btn-pathway'))
                window.dispatchEvent(new CustomEvent('az-toggle-pathway'));
            if (find('#h-btn-archive'))
                window.dispatchEvent(new CustomEvent('az-toggle-archive'));
            if (find('#h-btn-custom-flow'))
                window.dispatchEvent(new CustomEvent('az-toggle-custom-workflow'));
            if (find('#h-btn-realtime'))
                window.dispatchEvent(new CustomEvent('az-toggle-logs'));
            // Note: Logout is handled by inline onclick for maximum stability
        });
        window.addEventListener('az-identity-update', (e) => {
            this.updateWithIdentity(e.detail);
        });
        window.addEventListener('az-view-updated', (e) => {
            this.updateActiveNav(e.detail.view);
        });
        // Listen for Global Logout to sync local identity state cleanly
        window.addEventListener('az-logout', () => {
            identity_1.GlobalIdentity.logout();
        });
    }
    updateWithIdentity(identity) {
        const nameEl = this.querySelector('#u-operator-name');
        const roleEl = this.querySelector('#u-operator-role');
        const avatarEl = this.querySelector('#u-operator-avatar-header');
        if (nameEl)
            nameEl.textContent = identity.userName || 'USER';
        if (roleEl) {
            const isOffline = identity.accessMode === 'OFFLINE';
            const isPreview = identity.accessMode === 'PREVIEW';
            const tier = identity.billingTier || 'OFFLINE';
            if (isOffline) {
                roleEl.innerHTML = 'OFFLINE';
                roleEl.className = 'text-[10px] font-black uppercase tracking-[0.2em] leading-none text-white/30';
            }
            else if (isPreview) {
                roleEl.innerHTML = 'PREVIEW_MODE';
                roleEl.className = 'text-[10px] font-black uppercase tracking-[0.2em] leading-none text-highlight shadow-[0_0_5px_var(--color-highlight)] font-mono italic font-black';
            }
            else {
                roleEl.innerHTML = `API_${tier}`;
                roleEl.className = 'text-[10px] font-black uppercase tracking-[0.2em] leading-none text-primary shadow-[0_0_5px_var(--color-primary)] font-mono font-black italic';
            }
        }
        if (avatarEl && identity.avatarUrl) {
            avatarEl.setAttribute('url', identity.avatarUrl);
        }
    }
    updateActiveNav(view) {
        const navMap = {
            'chat': '#h-btn-chat',
            'decision-tree': '#h-btn-pathway',
            'archive': '#h-btn-archive',
            'table': '#h-btn-custom-flow',
            'logs': '#h-btn-realtime'
        };
        Object.values(navMap).forEach(selector => {
            const btn = this.querySelector(selector);
            if (btn)
                btn.setAttribute('variant', 'ghost');
        });
        const activeId = navMap[view];
        if (activeId) {
            const activeBtn = this.querySelector(activeId);
            if (activeBtn) {
                activeBtn.setAttribute('variant', 'highlight');
            }
        }
    }
}
exports.AZHeader = AZHeader;
customElements.define('az-header', AZHeader);
