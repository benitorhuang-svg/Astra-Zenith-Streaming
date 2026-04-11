/**
 * ATOM: Tactical Avatar
 * Ensures consistent framing, glow, and sizing.
 * Optimized for "No Cropping" (object-contain) and high fidelity.
 */

export class AZTacticalAvatar extends HTMLElement {
    static get observedAttributes(): string[] {
        return ['url', 'size', 'glow', 'ring'];
    }

    connectedCallback(): void {
        this.render();
    }

    attributeChangedCallback(): void {
        this.render();
    }

    render(): void {
        const DEFAULT_URL = 'https://api.dicebear.com/7.x/bottts/svg?seed=Astra';
        const url = this.getAttribute('url') || DEFAULT_URL;
        const size = this.getAttribute('size') || 'md'; 
        const hasGlow = this.hasAttribute('glow');
        const hasRing = this.hasAttribute('ring');

        const sizeMap: Record<string, string> = {
            sm: "w-full h-full", // Full of parent (typically 12x12 or 8x8 in sidebar)
            md: "w-12 h-12",
            lg: "w-28 h-28", // Match the original m_agent_unit size
            fill: "w-full h-full"
        };

        const sizeClass = sizeMap[size] || sizeMap.md;

        this.innerHTML = `
            <div class="${sizeClass} relative group/avatar select-none overflow-hidden rounded-xs border border-white/10 ${hasGlow ? 'shadow-[0_0_15px_rgba(var(--primary-rgb),0.2)]' : ''} bg-black/40 transition-all duration-500 hover:border-primary/60 pointer-events-none">
                ${hasRing ? `
                    <div class="absolute inset-0 border-2 border-primary/20 rounded-xs z-10 transition-all group-hover/avatar:border-primary/40"></div>
                ` : ''}
                
                <!-- Inner Glitch Blur Effect (Atom-level VFX) -->
                <div class="absolute inset-0 bg-primary/5 opacity-0 group-hover/avatar:opacity-100 transition-opacity z-20"></div>

                <!-- Tactical Scanline Atom Effect -->
                <div class="absolute inset-0 z-30 pointer-events-none w-full h-[1.5px] bg-primary/40 shadow-[0_0_10px_var(--color-primary)] animate-scan-y opacity-30"></div>

                <img src="${url}" 
                     class="w-full h-full object-cover grayscale-0 group-hover/avatar:scale-105 transition-transform duration-700 p-0 shadow-inner a-img-contrast" 
                     draggable="false">
            </div>
        `;
        
        this.style.display = 'block';
        this.style.width = '100%';
        this.style.height = '100%';
    }
}

customElements.define('az-avatar', AZTacticalAvatar);
