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
        const DEFAULT_URL = './images/avatar_cute_robot.png';
        const url = this.getAttribute('url') || DEFAULT_URL;
        const size = this.getAttribute('size') || 'md'; // sm(32), md(40), lg(112)
        const hasGlow = this.hasAttribute('glow');
        const hasRing = this.hasAttribute('ring');

        const sizeMap: Record<string, string> = {
            sm: "w-8 h-8",
            md: "w-10 h-10",
            lg: "w-28 h-28"
        };

        const sizeClass = sizeMap[size] || sizeMap.md;

        this.innerHTML = `
            <div class="${sizeClass} relative group/avatar select-none overflow-hidden rounded-xs border border-white/10 ${hasGlow ? 'shadow-[0_0_15px_rgba(var(--primary-rgb),0.2)]' : ''} bg-black/40 transition-all duration-500 hover:border-primary/60">
                ${hasRing ? `
                    <div class="absolute inset-0 border-2 border-primary/20 rounded-xs pointer-events-none z-10 transition-all group-hover/avatar:border-primary/40"></div>
                ` : ''}
                
                <!-- Inner Glitch Blur Effect (Atom-level VFX) -->
                <div class="absolute inset-0 bg-primary/5 opacity-0 group-hover/avatar:opacity-100 transition-opacity z-20"></div>

                <!-- 
                   TACTICAL IMAGE CONTAINER
                   - object-contain ensures 100% visibility (No Cropping)
                   - 100% width/height fill
                -->
                <img src="${url}" 
                     class="w-full h-full object-contain grayscale-0 brightness-110 contrast-125 group-hover/avatar:scale-105 transition-transform duration-700 p-0" 
                     draggable="false">
            </div>
        `;
    }
}

customElements.define('az-avatar', AZTacticalAvatar);
