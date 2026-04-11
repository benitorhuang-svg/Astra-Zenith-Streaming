export class AZTacticalAlert extends HTMLElement {
    static get observedAttributes(): string[] {
        return ['message', 'type', 'title'];
    }

    connectedCallback(): void {
        this.render();
    }

    attributeChangedCallback(): void {
        this.render();
    }

    private render(): void {
        const message = this.getAttribute('message') || '';
        const type = this.getAttribute('type') || 'error';
        const title = this.getAttribute('title') || 'Access_Denied';

        const isError = type === 'error';
        const bgColor = isError ? 'bg-red-500/10' : 'bg-primary/10';
        const borderColor = isError ? 'border-red-500/30' : 'border-primary/30';
        const textColor = isError ? 'text-red-500' : 'text-primary';
        const icon = isError ? 'alert-triangle' : 'info';

        this.innerHTML = `
            <div class="w-full mb-6 ${bgColor} border ${borderColor} p-4 rounded-xs flex items-start gap-4 animate-shake overflow-hidden max-h-[120px]">
                <i data-lucide="${icon}" class="w-5 h-5 ${textColor} shrink-0 mt-0.5"></i>
                <div class="flex flex-col gap-1 overflow-hidden">
                    <span class="text-[10px] font-mono ${textColor} font-black uppercase tracking-widest">${title}</span>
                    <div class="text-[9px] font-mono text-white/60 leading-normal uppercase overflow-y-auto u-scrollbar max-h-[60px] pr-2">
                        ${message}
                    </div>
                </div>
            </div>
        `;

        if (window.lucide) {
            window.lucide.createIcons({ parent: this });
        }
    }
}

customElements.define('az-alert', AZTacticalAlert);
