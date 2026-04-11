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
            sm: "w-8 h-8",
            md: "w-12 h-12",
            lg: "w-32 h-32"
        };

        const sizeClass = sizeMap[size] || sizeMap.md;

        // INDUSTRIAL FIX: 
        // We set pointer-events: none on the entire inner structure 
        // to ensure that clicks on the avatar always bubble correctly 
        // to parent interactive elements like profile buttons.
        this.innerHTML = `
            <div class="${sizeClass} relative group/avatar select-none overflow-hidden rounded-xs border border-white/10 ${hasGlow ? 'shadow-[0_0_15px_rgba(var(--primary-rgb),0.2)]' : ''} bg-black/40 transition-all duration-500 hover:border-primary/60 pointer-events-none">
                ${hasRing ? `
                    <div class="absolute inset-0 border-2 border-primary/20 rounded-xs z-10 transition-all group-hover/avatar:border-primary/40"></div>
                ` : ''}
                
                <!-- Inner Glitch Blur Effect (Atom-level VFX) -->
                <div class="absolute inset-0 bg-primary/5 opacity-0 group-hover/avatar:opacity-100 transition-opacity z-20"></div>

                <img src="${url}" 
                     class="w-full h-full object-contain grayscale-0 group-hover/avatar:scale-105 transition-transform duration-700 p-0 shadow-inner" 
                     draggable="false">
            </div>
        `;
        
        this.style.display = 'inline-block';
        // Ensure the custom element itself doesn't block events if its internal div has pointer-events: none
        // Actually, if we want it clickable but only as a whole, we keep it as block.
    }
}

customElements.define('az-avatar', AZTacticalAvatar);
