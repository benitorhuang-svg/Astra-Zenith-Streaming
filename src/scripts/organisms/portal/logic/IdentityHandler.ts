import { PortalContext, DIRTY_ALL } from '../../az_portal';
import { GlobalIdentity } from '../../../core/identity';

export class IdentityHandler {
    constructor(private context: PortalContext) {}

    public handle(target: HTMLElement): boolean {
        // Toggle Password
        if (target.closest('#u-btn-toggle-password')) {
            const input = document.getElementById('u-id-key') as HTMLInputElement;
            if (input) input.type = input.type === 'password' ? 'text' : 'password';
            return true;
        }

        // Reset Key
        if (target.closest('#u-btn-reset-key')) {
            this.context._p.serverAuthorized = false;
            this.context.scheduleRender(DIRTY_ALL);
            return true;
        }

        // Boards (Avatar/FAQ)
        if (target.closest('#u-btn-select-avatar')) {
            document.getElementById('u-avatar-selection-board')?.classList.toggle('hidden');
            return true;
        }

        // Avatar Selection
        const avatarOpt = target.closest('.u-avatar-option');
        if (avatarOpt) {
            const url = avatarOpt.getAttribute('data-url');
            if (url) { 
                GlobalIdentity.update({ avatarUrl: url }); 
                this.context.scheduleRender(DIRTY_ALL); 
            }
            return true;
        }

        // Login
        if (target.closest('#u-btn-access-portal')) {
            this.handleLogin();
            return true;
        }

        return false;
    }

    private handleLogin() {
        const keyInput = document.getElementById('u-id-key') as HTMLInputElement;
        const nameInput = document.getElementById('u-id-name') as HTMLInputElement;
        const apiKey = keyInput?.value.trim() || '';
        const userName = nameInput?.value.trim() || 'OPERATOR_99';

        this.context.pushInternalLog('正在驗證連線鏈路...', 'SYNC');
        fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ apiKey: apiKey || this.context.apiKey, userName })
        }).then(res => {
            if (res.ok) {
                this.context._p.serverAuthorized = true;
                this.context.apiKey = apiKey || this.context.apiKey;
                GlobalIdentity.update({ apiKey: this.context.apiKey, userName });
                this.context._p.handleModeSwitch('chat');
            } else {
                this.context.setWelcomeError('授權失敗：金鑰無效');
            }
        });
    }
}
