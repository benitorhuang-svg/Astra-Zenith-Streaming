import { PortalContext, DIRTY_ALL } from '../PortalTypes';
import { GlobalIdentity } from '../../../core/identity';

/**
 * IdentityHandler — Atomic Auth Logic (Refactored)
 */
export class IdentityHandler {
    constructor(private context: PortalContext) {}

    public handle(e: Event): boolean {
        const path = (e.composedPath() as HTMLElement[]) || [];
        const find = (selector: string) => path.find(el => el instanceof HTMLElement && el.matches(selector));

        if (this.handleFAQ(find)) return true;
        if (this.handleBoards(find)) return true;
        if (this.handleAvatar(find)) return true;
        if (this.handlePasswordVisibility(find)) return true;

        const previewBtn = find('#u-btn-preview-mode');
        if (previewBtn) { this.handlePreviewMode(previewBtn as any); return true; }

        const loginBtn = find('#u-btn-access-portal');
        if (loginBtn) { this.handleLogin(loginBtn as any); return true; }

        return false;
    }

    private handleFAQ(find: any): boolean {
        const faqSummary = find('summary');
        if (faqSummary && faqSummary.parentElement?.matches('details.group\\/faq')) {
            const currentDetails = faqSummary.parentElement as HTMLDetailsElement;
            const allDetails = document.querySelectorAll('details.group\\/faq');
            allDetails.forEach(d => { if (d !== currentDetails) d.removeAttribute('open'); });
        }
        return false;
    }

    private handleBoards(find: any): boolean {
        const boardFaq = document.getElementById('u-faq-board');
        const boardAvatar = document.getElementById('u-avatar-selection-board');
        const isClickInFaq = find('#u-faq-board');
        const isClickInAvatar = find('#u-avatar-selection-board');
        const isClickInTrigger = find('#u-btn-open-faq') || find('#u-btn-select-avatar') || find('#u-btn-close-faq-board') || find('#u-btn-close-avatar-board');

        if (!isClickInFaq && !isClickInAvatar && !isClickInTrigger) {
            if (boardFaq && !boardFaq.classList.contains('hidden')) { boardFaq.classList.add('hidden'); return true; }
            if (boardAvatar && !boardAvatar.classList.contains('hidden')) { boardAvatar.classList.add('hidden'); return true; }
        }

        if (find('#u-btn-select-avatar')) {
            const board = document.getElementById('u-avatar-selection-board');
            if (board) board.classList.toggle('hidden');
            if (board && !board.classList.contains('hidden')) document.getElementById('u-faq-board')?.classList.add('hidden');
            return true;
        }
        if (find('#u-btn-open-faq')) {
            const board = document.getElementById('u-faq-board');
            if (board) board.classList.toggle('hidden');
            if (board && !board.classList.contains('hidden')) document.getElementById('u-avatar-selection-board')?.classList.add('hidden');
            return true;
        }
        if (find('#u-btn-close-avatar-board')) { document.getElementById('u-avatar-selection-board')?.classList.add('hidden'); return true; }
        if (find('#u-btn-close-faq-board')) { document.getElementById('u-faq-board')?.classList.add('hidden'); return true; }
        return false;
    }

    private handleAvatar(find: any): boolean {
        if (find('#u-btn-upload-avatar')) {
            const input = document.getElementById('u-avatar-upload-input') as HTMLInputElement;
            if (input) {
                input.click();
                if (!(input as any)._bound) {
                    (input as any)._bound = true;
                    input.onchange = (ie: any) => {
                        const file = ie.target.files?.[0];
                        if (file) {
                            const reader = new FileReader();
                            reader.onload = (re: any) => {
                                const url = re.target.result;
                                if (url) { GlobalIdentity.update({ avatarUrl: url }); this.context.scheduleRender(DIRTY_ALL); }
                            };
                            reader.readAsDataURL(file);
                        }
                    };
                }
            }
            return true;
        }
        const avatarOpt = find('.u-avatar-option');
        if (avatarOpt) {
            const url = avatarOpt.getAttribute('data-url');
            if (url) { GlobalIdentity.update({ avatarUrl: url }); this.context.scheduleRender(DIRTY_ALL); }
            return true;
        }
        return false;
    }

    private handlePasswordVisibility(find: any): boolean {
        if (find('#u-btn-toggle-password')) {
            const input = document.getElementById('u-id-key') as HTMLInputElement;
            const btn = document.getElementById('u-btn-toggle-password') as HTMLElement;
            if (input && btn) {
                const win = window as any;
                win._PASSWORD_VISIBLE = !win._PASSWORD_VISIBLE;
                input.type = win._PASSWORD_VISIBLE ? 'text' : 'password';
                btn.innerHTML = `<i data-lucide="${win._PASSWORD_VISIBLE ? 'eye-off' : 'eye'}" class="w-4 h-4 pointer-events-none"></i>`;
                if ((window as any).lucide) (window as any).lucide.createIcons({ parent: btn });
            }
            return true;
        }
        return false;
    }

    private handleLogin(btn: any) {
        const keyInput = document.getElementById('u-id-key') as HTMLInputElement;
        const nameInput = document.getElementById('u-id-name') as HTMLInputElement;
        const apiKey = keyInput?.value.trim() || '';
        const userName = nameInput?.value.trim() || 'OPERATOR_X';

        if (apiKey.toLowerCase() === 'free') {
            (window as any).ZENITH_PREVIEW_MODE = false; 
            GlobalIdentity.update({ apiKey: 'free', userName, accessMode: 'API_ACCESS', billingTier: 'FREE' });
            this.context.apiKey = 'free';
            this.context._p.serverAuthorized = true;
            this.context.handleModeSwitch('chat');
            return;
        }

        if (btn) btn.loading = true;
        this.context.setWelcomeError('');
        fetch('/api/auth/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ apiKey, userName })
        }).then(res => res.json()).then(data => {
            if (data.valid) {
                this.context._p.serverAuthorized = true;
                this.context.apiKey = apiKey;
                GlobalIdentity.update({ apiKey, userName, accessMode: 'API_ACCESS', billingTier: data.tier || 'FREE' });
                this.context.handleModeSwitch('chat');
            } else throw new Error(data.error || 'Access Denied: Invalid Mission Key');
        }).catch(err => this.context.setWelcomeError(err.message || 'Authentication System Failure'))
        .finally(() => { if (btn) btn.loading = false; });
    }

    private handlePreviewMode(btn: any) {
        if (btn) btn.loading = true;
        this.context.setWelcomeError('');
        (window as any).ZENITH_PREVIEW_MODE = true;
        fetch('/api/auth/mode', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mode: 'CLI' })
        }).then(res => {
            if (res.ok) {
                const previewKey = `PREVIEW_${Date.now()}`;
                GlobalIdentity.update({ apiKey: previewKey, userName: 'OPERATOR', accessMode: 'PREVIEW', billingTier: 'FREE' });
                this.context.apiKey = previewKey;
                this.context._p.serverAuthorized = true;
                this.context.handleModeSwitch('chat');
            } else throw new Error('Preview Mode Protocol Rejected by System');
        }).catch(err => this.context.setWelcomeError(err.message || 'Preview Mode Failed'))
        .finally(() => { if (btn) btn.loading = false; });
    }
}
