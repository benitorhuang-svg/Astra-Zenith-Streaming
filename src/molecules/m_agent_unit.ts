/**
 * MOLECULE: Agent Unit
 * Combines Atom (Avatar, Badge) into a tactical unit for seats and sidebar.
 */

import { AGENT_POOL } from '../core/agents';

export class AZAgentUnit extends HTMLElement {
    static get observedAttributes(): string[] {
        return ['code', 'status', 'orientation', 'just-landed', 'origin-seat'];
    }

    connectedCallback(): void {
        this.render();
    }

    attributeChangedCallback(): void {
        this.render();
    }

    render(): void {
        const code = this.getAttribute('code') || '';
        const status = (this.getAttribute('status') || 'IDLE').toUpperCase();
        const orientation = this.getAttribute('orientation') || 'vertical'; // vertical, horizontal
        const justLanded = this.hasAttribute('just-landed');
        const originSeat = this.getAttribute('origin-seat');

        const agent = AGENT_POOL.find(a => a.code === code);
        if (!agent) {
             this.innerHTML = `<div class="text-[8px] opacity-20 font-mono italic">UNIT_NOT_FOUND</div>`;
             return;
        }

        const isVertical = orientation === 'vertical';
        const statusClass = status === 'ACTIVE' || status === 'RUNNING'
            ? 'text-primary'
            : status === 'SUCCESS'
                ? 'text-success'
                : status === 'WARNING' || status === 'WAIT'
                    ? 'text-warning'
                    : status === 'OFFLINE' || status === 'ERROR'
                        ? 'text-error'
                        : 'text-white/30';

        // 1. Structure Selection (Atomic Layouts)
        this.className = "u-seated-agent u-agent-landed-container flex flex-col items-center gap-3 hover:scale-110 transition-all duration-500 cursor-grab group select-none " + (justLanded ? 'u-agent-landed' : '');
        this.setAttribute('data-agent-code', code);
        if (originSeat) this.setAttribute('data-origin-seat', originSeat);

        this.innerHTML = `
            ${isVertical ? `
                <!-- Status Header (Vertical) -->
                <div class="flex flex-col items-center gap-0.5 mb-1 opacity-60 group-hover:opacity-100 transition-opacity">
                    <span class="text-[8px] font-mono ${statusClass} uppercase tracking-[0.3em]">#STATUS_${status}</span>
                </div>
                
                <!-- Main Avatar Atom Shell -->
                <div class="relative group/avatar w-28 h-28">
                    <az-avatar url="images/${agent.img}" size="fill" glow ring></az-avatar>
                    
                    <!-- ID Badge Molecule Removed (Fixed to Seat now) -->
                    <!--
                    <div class="absolute bottom-2 right-2 bg-black/80 px-2 py-0.5 border border-primary/40 rounded-sm font-mono text-[9px] text-primary tracking-widest translate-y-2 group-hover:translate-y-0 transition-transform z-40">
                        ${code}
                    </div>
                    -->
                </div>
            ` : `
                <!-- Horizontal Variant (POOL style) -->
                <div class="flex items-center gap-3 px-3 py-2 rounded-sm border border-white/10 bg-black/50 min-w-[160px]">
                    <div class="w-10 h-10 shrink-0">
                        <az-avatar url="images/${agent.img}" size="fill"></az-avatar>
                    </div>
                    <div class="flex flex-col min-w-0">
                        <span class="text-[9px] font-mono text-white/60 uppercase tracking-[0.25em]">${status}</span>
                        <span class="text-[10px] font-mono text-white font-black uppercase tracking-[0.2em] truncate">${code}</span>
                    </div>
                </div>
            `}
        `;
    }
}

customElements.define('az-agent-unit', AZAgentUnit);
