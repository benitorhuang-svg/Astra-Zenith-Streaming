"use strict";
/**
 * IDENTITY SINGLETON
 * Core source of truth for the active operator.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GlobalIdentity = void 0;
const DEFAULT_AVATAR = './images/avatar_cute_robot.png';
class IdentityManager {
    state = {
        userName: 'USER',
        avatarUrl: DEFAULT_AVATAR,
        apiKey: '',
        accessMode: 'OFFLINE',
        billingTier: 'OFFLINE'
    };
    constructor() {
        this.hydrate();
    }
    hydrate() {
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
                    avatarUrl: data.avatarUrl || './images/avatar_cute_robot.png'
                };
            }
            catch (e) {
                console.error("Identity hydration failed", e);
            }
        }
    }
    update(newState) {
        this.state = { ...this.state, ...newState };
        sessionStorage.setItem('AZ_IDENTITY', JSON.stringify(this.state));
        window.dispatchEvent(new CustomEvent('az-identity-update', { detail: this.state }));
    }
    logout() {
        this.update({
            apiKey: '',
            accessMode: 'OFFLINE',
            billingTier: 'OFFLINE'
        });
        window.dispatchEvent(new CustomEvent('az-logout'));
    }
    get() {
        return { ...this.state };
    }
}
exports.GlobalIdentity = new IdentityManager();
