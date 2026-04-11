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

    public hydrate(): void {
        const stored = sessionStorage.getItem('AZ_IDENTITY');
        if (stored) {
            try {
                const data = JSON.parse(stored);
                this.state = {
                    ...this.state,
                    userName: data.userName || 'USER',
                    apiKey: data.apiKey || '',
                    accessMode: data.accessMode || 'OFFLINE',
                    billingTier: data.billingTier || 'OFFLINE',
                    avatarUrl: data.avatarUrl || 'https://api.dicebear.com/7.x/bottts/svg?seed=Astra'
                };
            } catch (e) {
                console.error("Identity hydration failed", e);
            }
        }
    }

    public update(newState: Partial<IdentityState>): void {
        this.state = { ...this.state, ...newState };
        sessionStorage.setItem('AZ_IDENTITY', JSON.stringify(this.state));
        window.dispatchEvent(new CustomEvent('az-identity-update', { detail: this.state }));
    }

    public logout(): void {
        this.update({
            apiKey: '',
            accessMode: 'OFFLINE',
            billingTier: 'OFFLINE'
        });
        window.dispatchEvent(new CustomEvent('az-logout'));
    }

    public get(): IdentityState {
        return { ...this.state };
    }
}

export const GlobalIdentity = new IdentityManager();
