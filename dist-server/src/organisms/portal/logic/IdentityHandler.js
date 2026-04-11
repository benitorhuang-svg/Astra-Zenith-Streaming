"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IdentityHandler = void 0;
const PortalTypes_1 = require("../PortalTypes");
const identity_1 = require("../../../core/identity");
/**
 * IdentityHandler — Atomic Auth Logic
 */
class IdentityHandler {
    context;
    constructor(context) {
        this.context = context;
    }
    handle(e) {
        const path = e.composedPath() || [];
        const find = (selector) => path.find(el => el instanceof HTMLElement && el.matches(selector));
        // --- FAQ Accordion Logic: Close others on open ---
        const faqSummary = find('summary');
        if (faqSummary && faqSummary.parentElement?.matches('details.group\\/faq')) {
            const currentDetails = faqSummary.parentElement;
            const allDetails = document.querySelectorAll('details.group\\/faq');
            allDetails.forEach(d => {
                if (d !== currentDetails)
                    d.removeAttribute('open');
            });
            // Let the default toggle behavior proceed
        }
        // --- Click Outside Boards ---
        const boardFaq = document.getElementById('u-faq-board');
        const boardAvatar = document.getElementById('u-avatar-selection-board');
        const isClickInFaq = find('#u-faq-board');
        const isClickInAvatar = find('#u-avatar-selection-board');
        const isClickInTrigger = find('#u-btn-open-faq') || find('#u-btn-select-avatar') || find('#u-btn-close-faq-board') || find('#u-btn-close-avatar-board');
        if (!isClickInFaq && !isClickInAvatar && !isClickInTrigger) {
            if (boardFaq && !boardFaq.classList.contains('hidden')) {
                boardFaq.classList.add('hidden');
                return true;
            }
            if (boardAvatar && !boardAvatar.classList.contains('hidden')) {
                boardAvatar.classList.add('hidden');
                return true;
            }
        }
        // --- Boards (Avatar/FAQ) ---
        if (find('#u-btn-select-avatar')) {
            const board = document.getElementById('u-avatar-selection-board');
            if (board)
                board.classList.toggle('hidden');
            if (board && !board.classList.contains('hidden')) {
                document.getElementById('u-faq-board')?.classList.add('hidden');
            }
            return true;
        }
        if (find('#u-btn-open-faq')) {
            const board = document.getElementById('u-faq-board');
            if (board)
                board.classList.toggle('hidden');
            if (board && !board.classList.contains('hidden')) {
                document.getElementById('u-avatar-selection-board')?.classList.add('hidden');
            }
            return true;
        }
        if (find('#u-btn-close-avatar-board')) {
            document.getElementById('u-avatar-selection-board')?.classList.add('hidden');
            return true;
        }
        if (find('#u-btn-close-faq-board')) {
            document.getElementById('u-faq-board')?.classList.add('hidden');
            return true;
        }
        // --- Avatar Upload ---
        const uploadBtn = find('#u-btn-upload-avatar');
        if (uploadBtn) {
            const input = document.getElementById('u-avatar-upload-input');
            if (input) {
                input.click();
                if (!input._bound) {
                    input._bound = true;
                    input.onchange = (ie) => {
                        const file = ie.target.files?.[0];
                        if (file) {
                            const reader = new FileReader();
                            reader.onload = (re) => {
                                const url = re.target.result;
                                if (url) {
                                    identity_1.GlobalIdentity.update({ avatarUrl: url });
                                    this.context.scheduleRender(PortalTypes_1.DIRTY_ALL);
                                }
                            };
                            reader.readAsDataURL(file);
                        }
                    };
                }
            }
            return true;
        }
        // --- Avatar Selection ---
        const avatarOpt = find('.u-avatar-option');
        if (avatarOpt) {
            const url = avatarOpt.getAttribute('data-url');
            if (url) {
                identity_1.GlobalIdentity.update({ avatarUrl: url });
                this.context.scheduleRender(PortalTypes_1.DIRTY_ALL);
            }
            return true;
        }
        // --- Password Visibility (Localized Fix to prevent flashing) ---
        if (find('#u-btn-toggle-password')) {
            const input = document.getElementById('u-id-key');
            const btn = document.getElementById('u-btn-toggle-password');
            if (input && btn) {
                const win = window;
                win._PASSWORD_VISIBLE = !win._PASSWORD_VISIBLE;
                // Direct DOM Mutation (Zero Flash)
                input.type = win._PASSWORD_VISIBLE ? 'text' : 'password';
                btn.innerHTML = `<i data-lucide="${win._PASSWORD_VISIBLE ? 'eye-off' : 'eye'}" class="w-4 h-4 pointer-events-none"></i>`;
                if (window.lucide) {
                    window.lucide.createIcons({ parent: btn });
                }
            }
            return true;
        }
        // --- Preview Mode ---
        const previewBtn = find('#u-btn-preview-mode');
        if (previewBtn) {
            this.handlePreviewMode(previewBtn);
            return true;
        }
        // --- Login ---
        const loginBtn = find('#u-btn-access-portal');
        if (loginBtn) {
            this.handleLogin(loginBtn);
            return true;
        }
        return false;
    }
    handleLogin(btn) {
        const keyInput = document.getElementById('u-id-key');
        const nameInput = document.getElementById('u-id-name');
        const apiKey = keyInput?.value.trim() || '';
        const userName = nameInput?.value.trim() || 'OPERATOR_X';
        if (apiKey.toLowerCase() === 'free') {
            // 🚀 REAL_MODE ENTRY with Free Tier Strategy
            window.ZENITH_PREVIEW_MODE = false;
            identity_1.GlobalIdentity.update({
                apiKey: 'free',
                userName,
                accessMode: 'API_ACCESS',
                billingTier: 'FREE'
            });
            this.context.apiKey = 'free';
            this.context._p.serverAuthorized = true;
            this.context.handleModeSwitch('chat');
            return;
        }
        if (btn)
            btn.loading = true;
        this.context.setWelcomeError('');
        fetch('/api/auth/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ apiKey, userName })
        }).then(res => res.json()).then(data => {
            if (data.valid) {
                this.context._p.serverAuthorized = true;
                this.context.apiKey = apiKey;
                identity_1.GlobalIdentity.update({
                    apiKey,
                    userName,
                    accessMode: 'API_ACCESS',
                    billingTier: data.tier || 'FREE'
                });
                this.context.handleModeSwitch('chat');
            }
            else {
                throw new Error(data.error || 'Access Denied: Invalid Mission Key');
            }
        }).catch(err => {
            this.context.setWelcomeError(err.message || 'Authentication System Failure');
        }).finally(() => {
            if (btn)
                btn.loading = false;
        });
    }
    handlePreviewMode(btn) {
        if (btn)
            btn.loading = true;
        this.context.setWelcomeError('');
        // 🚀 ACTIVATE_TACTICAL_MOCKUP: Globally enable interception for AgentTaskRunner
        window.ZENITH_PREVIEW_MODE = true;
        // Step 1: Switch server to CLI mode (Mocking internal system)
        fetch('/api/auth/mode', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mode: 'CLI' })
        }).then(res => {
            if (res.ok) {
                const previewKey = `PREVIEW_${Date.now()}`;
                identity_1.GlobalIdentity.update({
                    apiKey: previewKey,
                    userName: 'OPERATOR',
                    accessMode: 'PREVIEW',
                    billingTier: 'FREE'
                });
                this.context.apiKey = previewKey;
                this.context._p.serverAuthorized = true;
                this.context.handleModeSwitch('chat');
            }
            else {
                throw new Error('Preview Mode Protocol Rejected by System');
            }
        }).catch(err => {
            this.context.setWelcomeError(err.message || 'Preview Mode Failed');
        }).finally(() => {
            if (btn)
                btn.loading = false;
        });
    }
}
exports.IdentityHandler = IdentityHandler;
