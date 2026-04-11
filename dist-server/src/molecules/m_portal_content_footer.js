"use strict";
/**
 * AZ PORTAL FOOTER — Unified Modular Footer Molecule
 * Designed for 2026 Industrial Mission HUD.
 * Ensures consistent height (48px), border-t parity, and layout slots.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderCommonFooter = void 0;
const renderCommonFooter = (opts = {}) => {
    const { height = 'h-[48px]', left = '', center = '', right = '', containerClass = '', bgClass = 'bg-black/40 backdrop-blur-xl' } = opts;
    return `
        <div class="${height} border-t border-white/10 flex items-center justify-between px-6 ${bgClass} relative z-40 select-none shrink-0 ${containerClass}">
            <div class="flex-1 flex items-center justify-start h-full">
                ${left}
            </div>
            <div class="flex items-center justify-center h-full">
                ${center}
            </div>
            <div class="flex-1 flex items-center justify-end h-full">
                ${right}
            </div>
        </div>
    `;
};
exports.renderCommonFooter = renderCommonFooter;
