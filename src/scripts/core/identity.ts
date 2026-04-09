/**
 * IDENTITY SINGLETON
 * Core source of truth for the active operator.
 */

export interface IdentityState {
    userName: string;
    avatarUrl: string;
    apiKey: string;
    accessMode: 'PREVIEW' | 'API_ACCESS' | 'OFFLINE';
    billingTier: 'FREE' | 'PRO' | 'OFFLINE';
}

const DEFAULT_AVATAR = './images/avatar_cute_robot.png';

class IdentityManager {
    private state: IdentityState = {
        userName: 'USER',
        avatarUrl: DEFAULT_AVATAR,
        apiKey: '',
        accessMode: 'OFFLINE',
        billingTier: 'OFFLINE'
    };

    constructor() {
        this.hydrate();
    }

    private hydrate() {
        try {
            const saved = sessionStorage.getItem('AZ_IDENTITY');
            if (saved) {
                const data = JSON.parse(saved);
                this.state = {
                    ...this.state,
                    userName: data.name || 'USER',
                    apiKey: data.apiKey || '',
                    accessMode: data.accessMode || 'OFFLINE',
                    billingTier: data.billingTier || 'OFFLINE'
                };
                console.log('[ASTRA] Identity Hydrated from SessionStorage');
            }
        } catch { /* silent restore fail */ }
    }

    public update(patch: Partial<IdentityState>): void {
        this.state = { ...this.state, ...patch };
        console.log('[ASTRA] Global Identity Updated:', this.state.userName);
        
        // Persist for recovery
        sessionStorage.setItem('AZ_IDENTITY', JSON.stringify(this.state));

        // Dispatch global event for all components (Header, Portal, etc.)
        window.dispatchEvent(new CustomEvent('az-identity-update', {
            detail: this.state
        }));
    }

    public get(): IdentityState {
        return { ...this.state };
    }
}

export const GlobalIdentity = new IdentityManager();
