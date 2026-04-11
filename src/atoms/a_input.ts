export class AZTacticalInput extends HTMLElement {
    static get observedAttributes(): string[] {
        return ['label', 'placeholder', 'value', 'icon', 'type', 'id-attr', 'error'];
    }

    connectedCallback(): void {
        this.render();
    }

    attributeChangedCallback(): void {
        this.render();
    }

    private render(): void {
        const label = this.getAttribute('label') || '';
        const placeholder = this.getAttribute('placeholder') || '';
        const value = this.getAttribute('value') || '';
        const icon = this.getAttribute('icon') || '';
        const type = this.getAttribute('type') || 'text';
        const idAttr = this.getAttribute('id-attr') || '';
        const error = this.hasAttribute('error');

        // INDUSTRIAL FIX: If already rendered, only update dynamic parts to prevent wiping slots
        const internalInput = this.querySelector('.az-input-core') as HTMLInputElement;
        if (internalInput) {
            internalInput.value = value;
            internalInput.type = type;
            internalInput.placeholder = placeholder;
            if (error) internalInput.classList.add('text-red-300');
            else internalInput.classList.remove('text-red-300');
            return; 
        }

        const statusColor = error ? '#ef4444' : 'rgba(255,255,255,0.3)';
        const borderColor = error ? '#ef4444' : 'rgba(255,255,255,0.05)';
        const iconColor = error ? '#ef4444' : 'rgba(255,255,255,0.1)';

        const savedChildren = Array.from(this.children);

        this.innerHTML = `
            <div class="flex flex-col ${label ? 'gap-2' : ''} group/input w-full">
                ${label ? `<label class="text-[8px] font-black uppercase tracking-[0.3em] font-mono ml-0.5" style="color: ${statusColor}">${label}</label>` : ''}
                <div class="h-12 bg-white/3 border flex items-center px-4 rounded-xs relative transition-all" style="border-color: ${borderColor}">
                    ${icon ? `<i data-lucide="${icon}" class="w-3.5 h-3.5 mr-3 shrink-0" style="color: ${iconColor}"></i>` : ''}
                    <input type="${type}" id="${idAttr}" placeholder="${placeholder}" value="${value}" 
                           class="az-input-core bg-transparent border-none outline-hidden text-[13px] font-mono flex-1 min-w-0 ${error ? 'text-red-300' : 'text-white/80'} uppercase tracking-widest px-0">
                    <div id="u-slot-right-container" class="flex items-center shrink-0"></div>
                </div>
            </div>
        `;

        const rightCont = this.querySelector('#u-slot-right-container');
        if (rightCont) {
            savedChildren.forEach(child => {
                if (child.getAttribute('slot') === 'right') {
                   rightCont.appendChild(child);
                }
            });
        }

        if (window.lucide) {
            window.lucide.createIcons({ parent: this });
        }
    }
}

customElements.define('az-input', AZTacticalInput);
