export class AZTacticalSeatFrame extends HTMLElement {
    static get observedAttributes(): string[] {
        return ['label', 'status', 'active', 'index'];
    }

    connectedCallback(): void {
        this.render();
    }

    attributeChangedCallback(): void {
        this.render();
    }

    private render(): void {
        const label = this.getAttribute('label') || 'SLOT';
        const status = this.getAttribute('status') || 'READY';
        const isActive = this.hasAttribute('active');
        const index = this.getAttribute('index') || '0';

        this.innerHTML = `
            <div class="relative group/seat">
                <div class="u-seat-add w-24 h-32 border ${isActive ? 'border-primary/40 bg-white/10' : 'border-primary/20 bg-white/5'} backdrop-blur-xl rounded-sm flex flex-col items-center justify-center ${isActive ? 'text-primary' : 'text-primary/40'} hover:text-primary transition-all cursor-pointer group/add shadow-[0_0_30px_rgba(var(--primary-rgb),0.05)] relative overflow-hidden">
                    <!-- Scanline Overlay -->
                    <div class="absolute inset-0 bg-linear-to-b from-transparent via-primary/5 to-transparent h-4 animate-scanline pointer-events-none"></div>
                    
                    <div class="relative w-8 h-8 mb-3 opacity-60 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <i data-lucide="${isActive ? 'user' : 'plus'}" class="w-6 h-6 stroke-[1.5]"></i>
                    </div>
                    
                    <div class="flex flex-col items-center gap-1 group-hover:scale-110 transition-transform">
                        <span class="text-[8px] font-mono font-black uppercase tracking-[0.3em]">${label}</span>
                        <div class="flex items-center gap-1 opacity-40">
                             <div class="w-1 h-1 bg-primary rounded-full"></div>
                             <span class="text-[6px] font-mono italic tracking-tighter uppercase whitespace-nowrap">${status}</span>
                        </div>
                    </div>

                    <!-- Tactical Brackets Atom -->
                    <az-brackets></az-brackets>
                </div>

                <!-- Seat Label -->
                <div class="absolute -bottom-2 -left-2 bg-primary text-black px-1.5 py-0.5 font-mono text-[9px] font-black uppercase tracking-tighter shadow-lg z-50">
                    A${index}
                </div>
            </div>
        `;

        if (window.lucide) {
            window.lucide.createIcons({ parent: this });
        }
    }
}

customElements.define('az-seat-frame', AZTacticalSeatFrame);
