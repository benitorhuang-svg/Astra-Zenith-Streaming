/**
 * AZ_HUD — Tactical Detail Overlay Organism
 * Replaces the static #floatingHUD with a reactive Custom Element.
 */

export interface HUDData {
    title: string;
    code: string;
    status: string;
    desc: string;
    avatar: string | null;
}

export class AZHUD extends HTMLElement {
    private isOpen = false;
    private data: HUDData = {
        title: 'UNIT',
        code: 'node_id',
        status: 'STATUS',
        desc: 'Analysis stream active...',
        avatar: null
    };

    connectedCallback() {
        this.render();
        window.addEventListener('az-open-hud', (e: Event) => this.open((e as CustomEvent<HUDData>).detail));
        window.addEventListener('az-close-hud', () => this.close());
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape') this.close(); });
    }

    public open(data: HUDData) {
        this.data = data;
        this.isOpen = true;
        this.render();
        this.classList.add('o-hud--active');
    }

    public close() {
        this.isOpen = false;
        this.classList.remove('o-hud--active');
    }

    private render() {
        const colorMap: Record<string, string> = {
            'BUSY': '#FFD700', 
            'WAIT': '#8A2BE2', 
            'SUCCESS': '#00FFC3', 
            'ACTIVE': '#00FFC3', 
            'NOMINAL': '#00FFC3', 
            'OFFLINE': '#FF007A', 
            'WARN': '#FF007A', 
            'DEFAULT': '#00F7FF'
        };
        const color = colorMap[this.data.status] || colorMap.DEFAULT;

        this.innerHTML = `
            <div class="o-hud a-glass p-8 rounded-lg border border-primary/40 shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden">
                <az-brackets></az-brackets>
                <div class="flex items-start gap-6 mb-8">
                    <div class="w-20 h-24 a-glass shrink-0 border border-white/20 rounded-md overflow-hidden ${this.data.avatar ? '' : 'hidden'}">
                        <img src="${this.data.avatar || ''}" class="w-full h-full object-cover" style="filter: grayscale(1) contrast(1.25);"/>
                    </div>
                    <div class="flex-1">
                        <h3 class="text-2xl font-headline font-black text-white uppercase tracking-widest">${this.data.title}</h3>
                        <p class="text-[10px] font-mono text-primary mt-1">#${this.data.code}</p>
                        <div class="inline-block px-3 py-1 text-[9px] font-mono font-bold rounded-sm uppercase mt-4" 
                             style="--hud-color: ${color}; color: var(--hud-color); border: 1px solid color-mix(in srgb, var(--hud-color) 40%, transparent); background: color-mix(in srgb, var(--hud-color) 10%, transparent);">
                            ${this.data.status}
                        </div>
                    </div>
                </div>
                <div class="bg-white/5 border border-white/5 p-6 rounded-md mb-8">
                    <p class="text-[13px] text-text-dim leading-relaxed font-mono">${this.data.desc}</p>
                </div>
                
                ${this.data.status === 'VECTORIZED' ? `
                    <button id="u-hud-drill-down" class="w-full py-3 mb-4 bg-success/20 border border-success/40 text-success text-[10px] font-mono uppercase font-bold cursor-pointer hover:bg-success/30 hover:shadow-[0_0_20px_rgba(34,197,94,0.4)] transition-all flex items-center justify-center gap-2">
                        <i data-lucide="microscope" class="w-4 h-4"></i> 以此節點深入探勘 (DRILL DOWN)
                    </button>
                ` : ''}

                <button class="w-full py-3 bg-primary/20 border border-primary/40 text-primary text-[10px] font-mono uppercase font-bold cursor-pointer hover:bg-primary/30 transition-all" 
                        onclick="window.dispatchEvent(new CustomEvent('az-close-hud'))">
                    Acknowledge
                </button>
            </div>
        `;

        // 綁定 Drill Down 事件
        setTimeout(() => {
            const drillBtn = this.querySelector('#u-hud-drill-down');
            if (drillBtn) {
                drillBtn.addEventListener('click', () => {
                    const input = document.getElementById('u-mission-input') as HTMLTextAreaElement;
                    if (input) {
                        input.value = `[深度探勘要求] 請針對以下知識節點進行更深度的邏輯拆解與延伸：\n\n${this.data.desc}`;
                        
                        // 觸發切換回對話視圖
                        const chatTab = document.getElementById('u-tab-chat');
                        if (chatTab) chatTab.click();
                        
                        window.dispatchEvent(new CustomEvent('az-close-hud'));
                    }
                });
            }
            
            // 重新渲染圖標
            if (window.lucide) {
                window.lucide.createIcons({ parent: this });
            }
        }, 0);
    }
}

customElements.define('az-hud', AZHUD);
