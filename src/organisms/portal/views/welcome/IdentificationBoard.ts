import { IdentityState } from '../../../../core/identity';

export const renderIdentificationBoard = (error: string, authorized: boolean, identity: IdentityState) => `
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
            <az-input placeholder="IDENT_ID..." value="${identity.userName}" icon="user" id-attr="u-id-name" class="flex-1"></az-input>
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
