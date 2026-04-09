/**
 * ATOM: Tactical Button
 * Standardized industrial-grade button component.
 */

export class AZTacticalButton extends HTMLElement {
    static get observedAttributes(): string[] {
        return ['label', 'icon', 'variant', 'size', 'loading', 'disabled', 'underline'];
    }

    connectedCallback(): void {
        this.render();
    }

    attributeChangedCallback(): void {
        this.render();
    }

    render(): void {
        const label = this.getAttribute('label') || '';
        const icon = this.getAttribute('icon') || '';
        const variant = this.getAttribute('variant') || 'primary'; // primary, secondary, ghost, danger
        const size = this.getAttribute('size') || 'md'; // sm, md, lg
        const isLoading = this.hasAttribute('loading');
        const isDisabled = this.hasAttribute('disabled');
        const isUnderline = this.hasAttribute('underline');

        const baseClasses = "relative w-full h-full font-mono font-black uppercase tracking-[0.2em] transition-all duration-300 flex items-center justify-center gap-2 overflow-hidden select-none active:scale-95 rounded-full";
        
        const sizeClasses = {
            sm: "px-3 py-1.5 text-[8px] h-8",
            md: "px-6 py-3 text-[10px] h-10",
            lg: "px-10 py-5 text-[14px] h-14"
        }[size] || "px-6 py-3 text-[10px] h-10";

        const variantClasses = {
            primary: "bg-primary text-black hover:bg-white shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)] border border-primary/20",
            secondary: "bg-white/5 border border-white/10 text-white hover:border-primary/40 hover:bg-primary/5 shadow-lg",
            highlight: "bg-primary/20 border border-primary/50 text-primary hover:bg-primary hover:text-black shadow-[0_0_20px_rgba(var(--primary-rgb),0.2)]",
            ghost: "bg-transparent border border-white/5 text-white/40 hover:text-white hover:border-white/20",
            danger: "bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white shadow-[0_0_20px_rgba(239,68,68,0.2)]"
        }[variant] || "bg-primary text-black";

        const stateClasses = isDisabled || isLoading ? "opacity-50 pointer-events-none grayscale" : "cursor-pointer pointer-events-auto";

        // We wrap everything in a div so that the custom element itself remains the primary event target 
        // but the visual button handles the styling.
        this.innerHTML = `
            <div class="${baseClasses} ${sizeClasses} ${variantClasses} ${stateClasses}" 
                 style="pointer-events: none;"> <!-- Inner contents ignore events to help delegation bubble to the custom element -->
                
                <!-- Inner Glow / Bezel Effect -->
                <div class="absolute inset-0 bg-white/5 opacity-0 pointer-events-none transition-opacity"></div>
                
                ${isLoading ? `
                    <div class="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin pointer-events-none"></div>
                ` : `
                    ${icon ? `<i data-lucide="${icon}" class="w-3.5 h-3.5 ${variant === 'primary' ? 'opacity-80' : 'opacity-40'} pointer-events-none"></i>` : ''}
                    <span class="relative z-10 pointer-events-none ${isUnderline ? 'underline underline-offset-4' : ''}">${label}</span>
                `}
            </div>
        `;

        // Ensure the custom element itself has the correct pointer events
        this.style.display = 'inline-block';
        if (size === 'lg') this.style.display = 'block'; // Make large buttons full width if needed
        this.style.pointerEvents = isDisabled || isLoading ? 'none' : 'auto';
        this.style.cursor = isDisabled || isLoading ? 'default' : 'pointer';

        window.lucide?.createIcons({ parent: this });
    }
}

customElements.define('az-button', AZTacticalButton);
