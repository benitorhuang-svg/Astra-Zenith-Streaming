/**
 * AZ PORTAL WELCOME VIEW — Tactical Access Identification
 * Ultra-Atomic Refactor: Logic Decentralization & Content Decoupling
 */

import { GlobalIdentity } from '../../../core/identity';
import type { IdentityState } from '../../../core/identity';

/**
 * DATA_REGISTRY: Standard Assets & Constants
 */
const BG_ASSET = './images/tactical_portal_bg.png';
const AVATAR_REGISTRY = [
    { id: 'tactical', url: './images/operator_99.png', label: 'Tactical_OP' },
    { id: 'cute_robot', url: './images/avatar_cute_robot.png', label: 'Cute_Bot' },
    { id: 'cartoon_agent', url: './images/avatar_cartoon_agent.png', label: 'Agent_Zero' },
    { id: 'ai_soul', url: './images/avatar_ai_soul.png', label: 'AI_Spirit' }
];

const FAQ_ENTRIES = [
    { q: '01 / WHAT_IS_ASTRA?', a: '工業級多特派員戰略指揮系統。旨在提供高保真度、低延遲的自動化工作流與路徑分析環境。', color: 'primary' },
    { q: '02 / MISSION_READY?', a: '<ol class="flex flex-col gap-1.5"><li>1. 輸入操作員 ID 並選擇頭像。</li><li>2. 置入有效 GEMINI API KEY (或預覽模式)。</li><li>3. 初始化空間並開始下達指令。</li></ol>', color: 'primary' },
    { q: '03 / SECURITY_PROTOCOL', a: '所有憑證僅暫存於當前分頁 (SessionStorage)，關閉即毀。核心絕不於服務器留存任何敏感數據。', color: 'secondary' },
    { q: '04 / NEURAL_TOPOLOGY', a: 'LINEAR: 線性傳導 / MATRIX: 多維分析 / CUSTOM: 特殊節點佈局。', color: 'white/40' }
];

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

/**
 * ORGANISM: IDENTIFICATION_BOARD
 */
const renderIdentificationBoard = (error: string, authorized: boolean, identity: IdentityState) => `
    <div class="w-[440px] bg-[#0c141d]/95 backdrop-blur-3xl border border-white/10 p-8 shadow-[0_0_80px_rgba(0,0,0,0.9)] flex flex-col items-center">
        ${renderPortalHeader()}
        ${error ? renderErrorAlert(error) : ''}
        ${renderControlCluster()}
        
        <div class="flex flex-col gap-6 w-full mb-5">
            ${renderOperatorIDInput(identity)}
            ${renderCredentialInput(error, authorized, identity)}
        </div>

        <az-button id="u-btn-access-portal" label="${error ? 'RETRY_INIT' : 'INITIALIZE_STATION'}" icon="chevron-right" variant="primary" size="lg"></az-button>
    </div>
`;

/**
 * MOLECULES: Component Fragments
 */
const renderPortalHeader = () => `
    <div class="flex flex-col items-center gap-0.5 mb-6 w-full border-b border-white/5 pb-4">
        <span class="text-[8px] font-black text-[#00f7ff] uppercase tracking-widest opacity-80 font-mono">Portal_Astra</span>
        <h1 class="text-[20px] font-black text-white tracking-widest uppercase leading-none text-center">Tactical_Access</h1>
    </div>
`;

const renderErrorAlert = (msg: string) => {
    let cleanMsg = msg;
    try {
        if (msg.includes('{')) {
            const parsed = JSON.parse(msg.substring(msg.indexOf('{')));
            cleanMsg = parsed.error?.message || parsed.message || msg;
        }
    } catch (e: unknown) {
        console.warn('Failed to parse error message JSON:', e);
    }

    return `<az-alert message="${cleanMsg}" type="error" title="Access_Denied"></az-alert>`;
};

const renderControlCluster = () => `
    <div class="mb-8 w-full flex justify-center gap-10">
         <az-button id="u-btn-preview-mode" label="Preview_Mode" icon="zap" variant="highlight"></az-button>
         <az-button id="u-btn-open-faq" label="FAQ" icon="help-circle" variant="secondary" style="--btn-accent: #ff0055;"></az-button>
    </div>
`;

const renderOperatorIDInput = (identity: IdentityState) => `
    <div class="flex flex-col gap-2 group/input">
        <label class="text-[8px] font-black uppercase tracking-[0.3em] font-mono ml-0.5 text-[#00f7ff]/40">01 / Operator_ID</label>
        <div class="flex items-center gap-2">
            <!-- Modular Identity Unit -->
            <az-input placeholder="IDENT_ID..." value="${identity.userName}" icon="user" id-attr="u-id-name" class="flex-1"></az-input>
            
            <!-- Tactical Portrait Frame -->
            <div id="u-btn-select-avatar" class="w-12 h-12 bg-white/3 border border-white/10 rounded-xs flex items-center justify-center cursor-pointer hover:bg-white/5 hover:border-[#00f7ff]/40 transition-all group/avatar shrink-0 relative overflow-hidden">
                <div class="absolute inset-0 bg-primary/5 opacity-0 group-hover/avatar:opacity-100 transition-opacity"></div>
                <az-avatar url="${identity.avatarUrl}" size="md" ring glow></az-avatar>
            </div>
        </div>
    </div>
`;

const renderCredentialInput = (error: string, authorized: boolean, identity: IdentityState) => {
    if (authorized && !error) {
        return `
            <div class="flex flex-col gap-2 group/input">
                <label class="text-[8px] font-black uppercase tracking-[0.3em] font-mono ml-0.5 text-success/40">02 / Gemini_Key</label>
                <div class="h-12 bg-success/10 border border-success/30 flex items-center justify-between px-4 rounded-xs group/success animate-premium-slide">
                    <div class="flex items-center">
                        <i data-lucide="shield-check" class="w-3.5 h-3.5 text-success mr-3"></i>
                        <span class="text-[11px] font-mono text-success font-black uppercase tracking-widest">已通過伺服器端授權</span>
                    </div>
                    <button id="u-btn-reset-key" class="flex items-center gap-2 text-success/40 hover:text-success transition-all cursor-pointer group/edit">
                        <span class="text-[8px] font-black uppercase tracking-widest opacity-0 group-hover/edit:opacity-100 transition-opacity">Modify_Key</span>
                        <i data-lucide="edit-3" class="w-3.5 h-3.5 ml-1"></i>
                    </button>
                </div>
            </div>
        `;
    }

    return `
        <div class="flex flex-col gap-1">
            <div class="flex items-center justify-between ml-0.5 mb-1">
                <label class="text-[8px] font-black uppercase tracking-[0.3em] font-mono text-[#00f7ff]/40">02 / Gemini_Key</label>
                <a href="https://aistudio.google.com" target="_blank" class="text-[8px] font-mono text-[#00f7ff]/40 hover:text-[#00f7ff] transition-colors no-underline uppercase">Get API Key</a>
            </div>
            <az-input placeholder="SECURE_PHRASE..." value="${identity.apiKey}" icon="lock" id-attr="u-id-key" type="${(window as any)._PASSWORD_VISIBLE ? 'text' : 'password'}" ${error ? 'error' : ''}>
                <button slot="right" id="u-btn-toggle-password" class="text-white/20 hover:text-white/60 transition-colors cursor-pointer flex items-center justify-center">
                     <i data-lucide="${(window as any)._PASSWORD_VISIBLE ? 'eye-off' : 'eye'}" class="w-4 h-4 pointer-events-none"></i>
                </button>
            </az-input>
            <div class="mt-3 flex items-start gap-2.5 opacity-60">
                <i data-lucide="info" class="w-3.5 h-3.5 mt-0.5 text-primary"></i>
                <p class="text-[10.5px] font-mono leading-relaxed uppercase">及時金鑰驗證機制：關閉分頁即銷毀，伺服器不留殘留。</p>
            </div>
        </div>
    `;
};

/**
 * KNOWLEDGE_BOARD: FAQ (Industrial Accordion)
 */
const renderKnowledgeVault = () => `
    <div id="u-faq-board" class="w-[440px] bg-[#0c141d]/98 backdrop-blur-3xl border border-white/10 p-8 hidden flex-col overflow-y-auto u-scrollbar shadow-[0_0_100px_rgba(0,0,0,0.9)] animate-premium-slide">
        <!-- Header Section -->
        <div class="flex items-center justify-between mb-8 border-b border-white/10 pb-5">
             <div class="flex flex-col gap-1">
                 <span class="text-[12px] font-black text-[#ff0055] uppercase tracking-[0.4em] font-mono">Astra_Knowledge</span>
                 <span class="text-[7px] font-mono text-white/20 uppercase tracking-widest">Synthetic Intelligence Operations // FAQ_V4.2</span>
             </div>
             <button id="u-btn-close-faq-board" class="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 border border-white/10 text-white/40 hover:text-white transition-all hover:bg-white/10">
                 <i data-lucide="x" class="w-4 h-4 pointer-events-none"></i>
             </button>
        </div>

        <!-- Accordion Body -->
        <div class="flex flex-col gap-4 font-mono">
            ${FAQ_ENTRIES.map((f, i) => {
                const accentColor = f.color.includes('secondary') ? '#ff0055' : '#00f7ff';
                return `
                <details class="group/faq border-b border-white/5 pb-4 last:border-none" ${i === 0 ? 'open' : ''}>
                    <summary class="list-none cursor-pointer flex items-center justify-between hover:translate-x-1 transition-transform">
                        <div class="flex items-center gap-4">
                            <span class="text-[10px] text-white/20 font-black">${(i + 1).toString().padStart(2, '0')}</span>
                            <h4 class="text-[11px] text-white/90 font-black uppercase tracking-wider group-open/faq:text-[${accentColor}] transition-colors">${f.q.replace(/^\d+\s\/\s/, '')}</h4>
                        </div>
                        <div class="w-4 h-4 flex items-center justify-center text-white/20 group-open/faq:rotate-180 transition-transform">
                            <i data-lucide="chevron-down" class="w-4 h-4"></i>
                        </div>
                    </summary>
                    <div class="mt-4 pl-9 pr-4 relative">
                        <!-- Timeline Marker -->
                        <div class="absolute left-4 top-1 bottom-1 w-px bg-linear-to-b from-[${accentColor}]/40 to-transparent"></div>
                        <div class="text-[10px] text-white/50 leading-[1.8] uppercase tracking-wide animate-fade-in">
                            ${f.a}
                        </div>
                    </div>
                </details>
                `;
            }).join('')}
        </div>

        <!-- Footer Decoration -->
        <div class="mt-12 pt-6 border-t border-white/5 flex justify-between items-center opacity-20">
             <div class="flex gap-1">
                 <div class="w-1 h-3 bg-white/40"></div>
                 <div class="w-1 h-3 bg-white/20"></div>
                 <div class="w-1 h-3 bg-white/10"></div>
             </div>
             <span class="text-[8px] font-mono uppercase tracking-[0.5em]">Auth_Session_Active</span>
        </div>
    </div>
`;

/**
 * PROFILE_BOARD: AVATARS
 */
const renderAvatarMatrix = () => `
    <div id="u-avatar-selection-board" class="w-[300px] bg-[#0c141d]/95 backdrop-blur-3xl border border-white/10 p-6 hidden flex-col">
        <div class="flex items-center justify-between mb-5 border-b border-white/5 pb-3">
             <span class="text-[10px] font-black text-[#00f7ff] uppercase tracking-widest">Profile_Matrix</span>
             <button id="u-btn-close-avatar-board" class="text-white/20 hover:text-white"><i data-lucide="x" class="w-4 h-4 pointer-events-none"></i></button>
        </div>
        <div class="grid grid-cols-2 gap-4">
             ${AVATAR_REGISTRY.map(a => `
                  <div class="u-avatar-option cursor-pointer group/opt" data-url="${a.url}">
                       <az-avatar url="${a.url}" size="lg"></az-avatar>
                       <span class="text-[8px] text-white/40 font-black uppercase text-center block mt-2 tracking-widest group-hover/opt:text-[#00f7ff] transition-colors">${a.label}</span>
                  </div>
             `).join('')}
             <div class="relative w-full aspect-square flex flex-col items-center justify-center border-2 border-dashed border-white/10 bg-white/2 hover:border-[#00f7ff]/40 hover:bg-[#00f7ff]/5 group/upload cursor-pointer" id="u-btn-upload-avatar">
                  <i data-lucide="plus" class="w-8 h-8 text-white/10 group-hover/upload:text-[#00f7ff] transition-all pointer-events-none"></i>
                  <span class="text-[7px] font-black text-white/20 group-hover/upload:text-[#00f7ff] uppercase mt-2 pointer-events-none">Custom_INIT</span>
             </div>
             <input type="file" id="u-avatar-upload-input" class="hidden" accept="image/*">
        </div>
    </div>
`;
