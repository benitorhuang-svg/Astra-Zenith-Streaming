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
    { q: '02 / MISSION_READY?', a: '<ol class="flex flex-col gap-1.5"><li>1. 輸入操作員 ID 並選擇頭像。</li><li>2. 置入有效 Gemini API Key (或預覽模式)。</li><li>3. 初始化空間並開始下達指令。</li></ol>', color: 'primary' },
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

const renderErrorAlert = (msg: string) => `
    <div class="w-full mb-6 bg-red-500/10 border border-red-500/30 p-4 rounded-xs flex items-start gap-4 animate-shake">
        <i data-lucide="alert-triangle" class="w-5 h-5 text-red-500 shrink-0"></i>
        <div class="flex flex-col gap-1">
            <span class="text-[10px] font-mono text-red-500 font-black uppercase tracking-widest">Access_Denied</span>
            <p class="text-[9px] font-mono text-white/60 leading-normal uppercase">${msg}</p>
        </div>
    </div>
`;

const renderControlCluster = () => `
    <div class="mb-8 w-full flex justify-center gap-10">
         <az-button id="u-btn-preview-mode" label="Preview_Mode" icon="zap" variant="highlight"></az-button>
         <az-button id="u-btn-open-faq" label="FAQ" icon="help-circle" variant="secondary" style="--btn-accent: #ff0055;"></az-button>
    </div>
`;

const renderOperatorIDInput = (identity: IdentityState) => `
    <div class="flex flex-col gap-2 group/input">
        <label class="text-[8px] font-black text-white/30 uppercase tracking-[0.3em] font-mono ml-0.5">01 / Operator_ID</label>
        <div class="flex items-center gap-3">
             <div class="flex-1 h-12 bg-white/3 border border-white/5 flex items-center px-4 rounded-xs">
                 <i data-lucide="user" class="w-3.5 h-3.5 text-white/10 mr-3"></i>
                 <input type="text" id="u-id-name" placeholder="IDENT_ID..." value="${identity.userName}" class="bg-transparent border-none outline-hidden text-[13px] font-mono text-white/80 w-full uppercase tracking-widest">
             </div>
             <div id="u-btn-select-avatar" class="cursor-pointer hover:scale-105 transition-transform">
                  <az-avatar url="${identity.avatarUrl}" size="md" ring glow></az-avatar>
             </div>
        </div>
    </div>
`;

const renderCredentialInput = (error: string, authorized: boolean, identity: IdentityState) => {
    const statusColor = error ? '#ef4444' : 'rgba(255,255,255,0.3)';
    return `
    <div class="flex flex-col gap-2 group/input">
        <div class="flex items-center justify-between ml-0.5">
            <label class="text-[8px] font-black uppercase tracking-[0.3em] font-mono" style="color: ${statusColor}">02 / Gemini_Key</label>
            <a href="https://aistudio.google.com" target="_blank" class="text-[8px] font-mono text-[#00f7ff]/40 hover:text-[#00f7ff] transition-colors no-underline uppercase">Get API Key</a>
        </div>
        ${(authorized && !error) ? `
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
        ` : `
            <div class="h-12 bg-white/3 border flex items-center px-4 rounded-xs relative" style="border-color: ${error ? '#ef4444' : 'rgba(255,255,255,0.05)'}">
                <i data-lucide="lock" class="w-3.5 h-3.5 mr-3 shrink-0" style="color: ${error ? '#ef4444' : 'rgba(255,255,255,0.1)'}"></i>
                <input type="password" id="u-id-key" placeholder="SECURE_PHRASE..." value="${identity.apiKey}" 
                       class="bg-transparent border-none outline-hidden text-[13px] font-mono w-full pr-12 ${error ? 'text-red-300' : 'text-white/80'} uppercase">
                <button id="u-btn-toggle-password" class="absolute right-4 text-white/20 hover:text-white/60 transition-colors cursor-pointer flex items-center justify-center">
                     <i data-lucide="eye" class="w-4 h-4 pointer-events-none"></i>
                </button>
            </div>
        `}
        <div class="mt-3 flex items-start gap-2.5 opacity-60">
            <i data-lucide="info" class="w-3.5 h-3.5 mt-0.5 text-primary"></i>
            <p class="text-[10.5px] font-mono leading-relaxed uppercase">及時金鑰驗證機制：關閉分頁即銷毀，伺服器不留殘留。</p>
        </div>
    </div>
`;};

/**
 * KNOWLEDGE_BOARD: FAQ
 */
const renderKnowledgeVault = () => `
    <div id="u-faq-board" class="w-[360px] bg-[#0c141d]/95 backdrop-blur-3xl border border-white/10 p-6 hidden flex-col overflow-y-auto u-scrollbar">
        <div class="flex items-center justify-between mb-6 border-b border-white/5 pb-3">
             <span class="text-[10px] font-black text-[#ff0055] uppercase tracking-widest">Astra_Knowledge</span>
             <button id="u-btn-close-faq-board" class="text-white/20 hover:text-white"><i data-lucide="x" class="w-4 h-4"></i></button>
        </div>
        <div class="flex flex-col gap-6 font-mono pr-2 uppercase">
            ${FAQ_ENTRIES.map(f => `
                <section>
                    <h4 class="text-[10px] text-${f.color} font-black mb-2 tracking-widest underline decoration-${f.color}/30 underline-offset-4">${f.q}</h4>
                    <p class="text-[9px] text-white/60 leading-relaxed">${f.a}</p>
                </section>
            `).join('')}
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
