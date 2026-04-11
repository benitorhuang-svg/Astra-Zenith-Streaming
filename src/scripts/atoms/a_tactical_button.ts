export class AZTacticalButton extends HTMLElement {
    private button: HTMLButtonElement | null = null;

    static get observedAttributes(): string[] {
        return ['label', 'icon', 'variant', 'size', 'loading', 'disabled', 'underline'];
    }

    connectedCallback(): void {
        this.render();
    }

    attributeChangedCallback(): void {
        this.render();
    }

    get loading(): boolean { return this.hasAttribute('loading'); }
    set loading(val: boolean) { if (val) this.setAttribute('loading', ''); else this.removeAttribute('loading'); }
    
    get disabled(): boolean { return this.hasAttribute('disabled'); }
    set disabled(val: boolean) { if (val) this.setAttribute('disabled', ''); else this.removeAttribute('disabled'); }

    private render(): void {
        this.style.display = 'inline-block';
        this.style.verticalAlign = 'middle';
        this.style.width = this.getAttribute('size') === 'lg' ? '100%' : 'fit-content';

        const label = this.getAttribute('label') || '';
        const icon = this.getAttribute('icon') || '';
        const variant = this.getAttribute('variant') || 'primary'; 
        const size = this.getAttribute('size') || 'md'; 
        const isUnderline = this.hasAttribute('underline');

        const baseClasses = "relative w-full h-full font-mono font-black uppercase tracking-[0.2em] transition-all duration-300 flex items-center justify-center gap-2 overflow-hidden select-none active:scale-95 rounded-sm border cursor-pointer m-0 appearance-none";
        
        const sizeClasses = {
            sm: "px-4 py-2 text-[11px] h-10",
            md: "px-6 py-3 text-[10px] h-10",
            lg: "px-10 py-5 text-[14px] h-14"
        }[size] || "px-6 py-3 text-[10px] h-10";

        const variantClasses = {
            primary: "bg-primary text-black border-primary/20 hover:bg-white shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)]",
            secondary: "bg-white/5 border-white/10 text-white hover:border-primary/40 hover:bg-primary/5",
            highlight: "bg-primary text-black border-primary shadow-[0_0_20px_rgba(var(--primary-rgb),0.5)]",
            ghost: "bg-transparent border-white/5 text-white/40 hover:text-white hover:border-white/20",
            danger: "bg-red-500/10 border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white"
        }[variant] || "bg-primary text-black";

        this.innerHTML = `
            <button type="button" class="${baseClasses} ${sizeClasses} ${variantClasses}" style="outline: none;">
                <div class="absolute inset-0 bg-white/5 opacity-0 pointer-events-none transition-opacity"></div>
                ${this.loading ? `
                    <div class="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin pointer-events-none"></div>
                ` : `
                    ${icon ? `<i data-lucide="${icon}" class="w-3.5 h-3.5 pointer-events-none"></i>` : ''}
                    <span class="relative z-10 pointer-events-none ${isUnderline ? 'underline underline-offset-4' : ''}">${label}</span>
                `}
            </button>
        `;
        
        this.button = this.querySelector('button');
        this.updateState();
        window.lucide?.createIcons({ parent: this });
    }

    private updateState(): void {
        if (!this.button) return;
        const isLoading = this.loading;
        const isDisabled = this.disabled;
        
        this.button.disabled = isLoading || isDisabled;
        if (isLoading || isDisabled) {
            this.button.classList.add('opacity-50', 'pointer-events-none', 'grayscale');
        } else {
            this.button.classList.remove('opacity-50', 'pointer-events-none', 'grayscale');
        }
    }
}
customElements.define('az-button', AZTacticalButton);
