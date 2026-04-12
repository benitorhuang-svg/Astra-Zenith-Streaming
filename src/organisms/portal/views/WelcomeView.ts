/**
 * AZ PORTAL WELCOME VIEW — Tactical Access Identification
 * Ultra-Atomic Refactor: Logic Decentralization & Content Decoupling
 */

import { GlobalIdentity } from '../../../core/identity';
import { renderIdentificationBoard } from './welcome/IdentificationBoard';
import { renderAvatarMatrix } from './welcome/AvatarMatrix';
import { renderKnowledgeVault } from './welcome/KnowledgeVault';

const BG_ASSET = './images/tactical_portal_bg.png';

/**
 * TEMPLATE: WELCOME_VIEW (Orchestrator)
 */
export const renderWelcomeView = (error: string = '', serverAuthorized: boolean = false) => {
    const identity = GlobalIdentity.get();
    return `
        <div class="fixed inset-0 bg-[#000408] flex items-center justify-center overflow-hidden z-9999 font-['Outfit']" 
             id="u-welcome-overlay" style="background-image: url('${BG_ASSET}'); background-size: cover; background-position: center;">
            <div class="absolute inset-0 bg-black/70 backdrop-blur-[1px] pointer-events-none"></div>
            <div class="relative flex items-start gap-8 animate-premium-slide">
                ${renderIdentificationBoard(error, serverAuthorized, identity)}
                ${renderAvatarMatrix()}
                ${renderKnowledgeVault()}
            </div>
        </div>
    `;
};
