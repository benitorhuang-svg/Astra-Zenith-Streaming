export class AZTaskOverlay extends HTMLElement {
    static get observedAttributes(): string[] {
        return ['title', 'value', 'placeholder', 'active'];
    }

    connectedCallback(): void {
        this.render();
    }

    attributeChangedCallback(): void {
        this.render();
    }

    private render(): void {
        const title = this.getAttribute('title') || 'MISSION_TASK_ASSIGNMENT';
        const value = this.getAttribute('value') || '';
        const placeholder = this.getAttribute('placeholder') || 'ENTER_MISSION_OBJECTIVES...';
        const isActive = this.hasAttribute('active');

        if (!isActive) {
            this.innerHTML = '';
            return;
        }

        this.innerHTML = `
            <div class="absolute inset-0 z-100 flex items-center justify-center bg-transparent animate-fade-in pointer-events-auto">
                <div class="w-[500px] p-6 bg-[#0a0f18]/90 backdrop-blur-3xl border border-white/20 rounded-sm shadow-[0_0_100px_rgba(0,0,0,0.8)] flex flex-col gap-4 ring-1 ring-white/10">
                    <div class="flex items-center justify-between border-b border-white/10 pb-3">
                        <div class="flex items-center gap-3">
                            <div class="w-1.5 h-1.5 bg-primary shadow-[0_0_10px_#00f7ff] animate-pulse"></div>
                            <span class="text-[11px] font-mono font-black text-white/90 uppercase tracking-widest">${title}</span>
                        </div>
                        <button id="u-btn-close-task" class="text-white/40 hover:text-white transition-colors cursor-pointer">
                            <i data-lucide="x" class="w-4 h-4"></i>
                        </button>
                    </div>
                    
                    <textarea id="u-task-input" 
                                class="w-full h-36 bg-black/60 border border-white/10 p-4 text-[13px] font-mono text-white/90 focus:border-primary/50 outline-none resize-none u-scrollbar placeholder:text-white/10"
                                placeholder="${placeholder}">${value}</textarea>
                    
                    <div class="flex justify-end gap-3 mt-2">
                        <az-button id="u-btn-confirm-task" label="確認指令 / DEPLOY" variant="highlight" size="sm" icon="check"></az-button>
                    </div>
                </div>
            </div>
        `;

        if (window.lucide) {
            window.lucide.createIcons({ parent: this });
        }
    }
}

customElements.define('az-task-overlay', AZTaskOverlay);
