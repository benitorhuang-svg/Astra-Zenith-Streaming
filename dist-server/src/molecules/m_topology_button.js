"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AZTopologyButton = void 0;
class AZTopologyButton extends HTMLElement {
    static get observedAttributes() {
        return ['label', 'sublabel', 'icon', 'active', 'variant'];
    }
    connectedCallback() {
        this.render();
    }
    attributeChangedCallback() {
        this.render();
    }
    render() {
        const label = this.getAttribute('label') || '';
        const sublabel = this.getAttribute('sublabel') || '';
        const icon = this.getAttribute('icon') || 'layout';
        const isActive = this.hasAttribute('active');
        const variant = this.getAttribute('variant') || 'primary';
        const variantColor = variant === 'secondary' ? 'secondary' : 'primary';
        const activeClasses = isActive ? `bg-${variantColor}/20 text-${variantColor}` : 'bg-transparent text-white/40 hover:text-white hover:bg-white/5';
        this.innerHTML = `
            <button class="group flex items-center gap-2.5 px-6 h-full transition-all font-mono text-[10px] font-bold shrink-0 border-r border-white/5 ${activeClasses}">
                <i data-lucide="${icon}" class="w-4.5 h-4.5"></i>
                <div class="flex flex-col items-start leading-none gap-0.5 ml-2">
                    <span class="text-[10px]">${label}</span>
                    <span class="text-[6px] opacity-40 uppercase">${sublabel}</span>
                </div>
            </button>
        `;
        if (window.lucide) {
            window.lucide.createIcons({ parent: this });
        }
    }
}
exports.AZTopologyButton = AZTopologyButton;
customElements.define('az-topology-button', AZTopologyButton);
