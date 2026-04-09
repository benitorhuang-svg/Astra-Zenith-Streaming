/**
 * AZ PORTAL HANDLERS — Mission Interaction Strategy
 */

import { PortalContext, DIRTY_ALL, DIRTY_SIDEBAR, DIRTY_CONTENT } from './az_portal';
import { handlePointerDown } from './az_portal_drag';
import type { PortalArchive, PortalWorkflowController } from './az_portal_types';
import { GlobalIdentity } from '../core/identity';

export class AZPortalInteractionHandler {
    constructor(private context: PortalContext) {}

    public onDelegatedClick(e: Event): void {
        const target = e.target as HTMLElement;

        if (this.handleNavigationInteractions(target)) return;
        if (this.handleIdentityInteractions(target)) return;
        if (this.handleTacticalInteractions(target)) return;
        if (this.handleModelSelectInteraction(target)) return;
        if (this.handleHUDInteractions(target)) return;
        if (this.handleArchiveInteractions(target)) return;
    }

    /**
     * ATOMIC_NAV: Handle Global View Switching & Tabs
     */
    private handleNavigationInteractions(target: HTMLElement): boolean {
        if (target.closest('#u-tab-chat')) { this.context._p.handleModeSwitch('chat'); return true; }
        if (target.closest('#u-tab-pathway')) { this.context._p.handleModeSwitch('decision-tree'); return true; }
        if (target.closest('#u-tab-archive')) { this.context._p.handleModeSwitch('archive'); return true; }
        if (target.closest('#u-tab-logs')) { this.context._p.handleModeSwitch('logs'); return true; }
        if (target.closest('#u-btn-preview-mode')) { 
            GlobalIdentity.update({ accessMode: 'PREVIEW', userName: 'USER' });
            this.context._p.handleModeSwitch('chat'); 
            return true; 
        }
        if (target.closest('#u-btn-close-portal')) { this.context._p.handleModeSwitch('chat'); return true; }
        
        if (target.closest('#u-btn-save-config')) {
            const selects = document.querySelectorAll('.u-config-select') as NodeListOf<HTMLSelectElement>;
            const mapping: Record<string, string> = {};
            selects.forEach(s => {
                mapping[s.dataset.agentId!] = s.value;
            });

            this.context._p.pushInternalLog('正在同步戰術模型配置至核心...', 'SYNC');
            fetch('/api/auth/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mapping })
            }).then(res => res.json()).then(() => {
                this.context._p.pushInternalLog('✅ 戰術分配已成功部署。', 'SUCCESS');
                this.context._p.handleModeSwitch('chat');
            });
            return true;
        }

        if (target.closest('#u-sidebar-topology-icon')) {
            const current = this.context._p.currentTopology || 'linear';
            const next = current === 'linear' ? 'orbital' : (current === 'orbital' ? 'custom' : 'linear');
            this.context._p.handleTopologySwitch(next);
            this.context._p.scheduleRender(DIRTY_ALL);
            return true;
        }

        if (target.closest('#u-topology-linear')) { this.context._p.handleTopologySwitch('linear'); this.context._p.scheduleRender(DIRTY_ALL); return true; }
        if (target.closest('#u-topology-orbital')) { this.context._p.handleTopologySwitch('orbital'); this.context._p.scheduleRender(DIRTY_ALL); return true; }
        if (target.closest('#u-btn-add-node')) {
            this.context.workflow?.handleAddNode();
            return true;
        }

        if (target.closest('#u-btn-import-n8n')) {
            const workflow = this.context.workflow;
            if (workflow) {
                this.handleN8NImport(workflow);
            }
            return true;
        }

        const addSuccessorBtn = target.closest('#u-btn-add-successor') as HTMLElement;
        if (addSuccessorBtn) {
            const fromNode = addSuccessorBtn.getAttribute('data-from-node');
            if (fromNode && this.context.workflow) {
                this.context.workflow.addSuccessorNode(fromNode);
                return true;
            }
        }

        return false;
    }

    /**
     * 🛰️ SEMANTIC_GRAPH_SYNC
     * Fetches the latest vector-positioned nodes from the backend.
     */
    private async refreshSemanticGraph(): Promise<void> {
        try {
            const res = await fetch('/api/analysis/graph');
            if (res.ok) {
                const data = await res.json();
                window.semanticNodes = data.nodes;
                window.semanticLinks = data.links;
                this.context._p.scheduleRender(DIRTY_CONTENT);
                this.context.pushInternalLog('🛰️ 語義向量圖譜已成功同步。', 'SUCCESS');
            }
        } catch (e) {
            console.warn('[GRAPH_SYNC] Failed:', e);
        }
    }

    private async resetSemanticGraph(): Promise<void> {
        if (!confirm('確定要清空當前語義空間嗎？這將重置所有節點位置。')) return;
        try {
            const res = await fetch('/api/analysis/reset', { method: 'POST' });
            if (res.ok) {
                window.semanticNodes = [];
                window.semanticLinks = [];
                this.context._p.scheduleRender(DIRTY_CONTENT);
                this.context.pushInternalLog('🧹 語義空間已重置。', 'WARN');
            }
        } catch { /* silent reset fail */ }
    }

    private handleN8NImport(workflow: PortalWorkflowController): void {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e: Event) => {
            const target = e.currentTarget as HTMLInputElement | null;
            const file = target?.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (event: ProgressEvent<FileReader>) => {
                const content = event.target?.result;
                if (typeof content === 'string') {
                    void workflow.importFlow(content);
                }
            };
            reader.readAsText(file);
        };
        input.click();
    }

    /**
     * ATOMIC_IDENTITY: Handle Credential, Session, and Avatar State
     */
    private handleIdentityInteractions(target: HTMLElement): boolean {
        // Toggle Password visibility
        if (target.closest('#u-btn-toggle-password')) {
            const input = document.getElementById('u-id-key') as HTMLInputElement;
            if (input) {
                const isPassword = input.type === 'password';
                input.type = isPassword ? 'text' : 'password';
                const icon = target.closest('button')?.querySelector('i');
                if (icon) icon.setAttribute('data-lucide', isPassword ? 'eye-off' : 'eye');
            }
            return true;
        }

        // Reset API Key (Modification Flow)
        if (target.closest('#u-btn-reset-key')) {
            this.context._p.serverAuthorized = false;
            this.context._p.scheduleRender(DIRTY_ALL);
            return true;
        }

        // Boards: Avatar & FAQ
        if (target.closest('#u-btn-select-avatar')) {
            const board = document.getElementById('u-avatar-selection-board');
            if (board) { board.classList.toggle('hidden'); board.classList.add('flex'); }
            return true;
        }
        if (target.closest('#u-btn-open-faq')) {
            const faq = document.getElementById('u-faq-board');
            if (faq) { faq.classList.toggle('hidden'); faq.classList.add('flex'); }
            document.getElementById('u-avatar-selection-board')?.classList.add('hidden');
            return true;
        }
        if (target.closest('#u-btn-close-faq-board')) { document.getElementById('u-faq-board')?.classList.add('hidden'); return true; }
        if (target.closest('#u-btn-close-avatar-board')) { document.getElementById('u-avatar-selection-board')?.classList.add('hidden'); return true; }

        // Avatar Selection logic
        const avatarOpt = target.closest('.u-avatar-option');
        if (avatarOpt) {
            const url = avatarOpt.getAttribute('data-url');
            if (url) { GlobalIdentity.update({ avatarUrl: url }); this.context.scheduleRender(DIRTY_ALL); }
            return true;
        }

        // Portal Access (Login)
        if (target.closest('#u-btn-access-portal')) {
            this.handleCredentialHandshake();
            return true;
        }

        return false;
    }

    private handleCredentialHandshake(): void {
        const keyInput = document.getElementById('u-id-key') as HTMLInputElement;
        const nameInput = document.getElementById('u-id-name') as HTMLInputElement;
        const apiKey = keyInput?.value.trim() || '';
        const userName = nameInput?.value.trim() || 'OPERATOR_99';

        if (this.context._p.serverAuthorized && !apiKey) {
            this.context._p.handleModeSwitch('chat');
            return;
        }

        if (!apiKey && !this.context._p.serverAuthorized) {
            this.context._p.setWelcomeError('請輸入有效的 Gemini API 金鑰。');
            return;
        }

        this.context._p.pushInternalLog('正在驗證連線鏈路...', 'SYNC');
        fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ apiKey: apiKey || this.context._p.apiKey, userName, mode: 'API' })
        }).then(async res => {
            if (res.ok) {
                this.context._p.serverAuthorized = true;
                this.context._p.apiKey = apiKey || this.context._p.apiKey;
                GlobalIdentity.update({ apiKey: this.context._p.apiKey, userName });
                this.context._p.handleModeSwitch('chat');
            } else {
                const err = await res.json();
                this.context._p.serverAuthorized = false;
                this.context._p.setWelcomeError(`授權失敗: ${err.error || '金鑰無效'}`);
            }
        }).catch(err => this.context._p.setWelcomeError(`伺服器連線異常: ${err}`));
    }

    /**
     * ATOMIC_TACTICAL: Handle Live Execution & Purge
     */
    private handleTacticalInteractions(target: HTMLElement): boolean {
        // Mission Wipe (Industrial Reset / Fall Out)
        if (target.closest('#u-btn-clear-mission') || target.closest('#u-btn-clear-all')) {
            // Clear Arrays in-place to maintain references if necessary, 
            // but primarily ensure _p (the actual component state) is wiped.
            this.context.messages = [];
            this.context._p.messages = [];
            
            this.context.activePrompt = '';
            this.context._p.activePrompt = '';
            
            this.context.currentPasses = 0;
            this.context._p.currentPasses = 0;
            
            this.context.isStreaming = false;
            this.context._p.isStreaming = false;
            
            this.context.tableParticipants = [null, null, null, null, null, null];
            this.context._p.tableParticipants = [null, null, null, null, null, null];

            this.context.executionQueue = [];
            this.context._p.executionQueue = [];
            this.context.isProcessingQueue = false;
            this.context._p.isProcessingQueue = false;
            
            this.context.scheduleRender(DIRTY_ALL);
            return true;
        }

        // Process Action (Play/Stop Cycle)
        if (target.closest('#u-mission-action')) {
            if (this.context.isStreaming) this.context.stopFlow();
            else this.handleSendMessageWithDetection();
            return true;
        }

        if (target.closest('#u-btn-run-flow')) {
            void this.context.workflow?.handleRunFlow();
            return true;
        }

        // Polling Cycles (+/-)
        if (target.closest('#u-btn-cycle-up')) {
            if (this.context._p.pollingCycles < 5) { this.context._p.pollingCycles++; this.context._p.scheduleRender(DIRTY_CONTENT); }
            return true;
        }
        if (target.closest('#u-btn-cycle-down')) {
            if (this.context._p.pollingCycles > 1) { this.context._p.pollingCycles--; this.context._p.scheduleRender(DIRTY_CONTENT); }
            return true;
        }

        return false;
    }

    private handleModelSelectInteraction(target: HTMLElement): boolean {
        const btn = target.closest('.u-btn-change-model') as HTMLElement;
        if (!btn) return false;

        const agentId = btn.getAttribute('data-agent-id');
        const currentModel = btn.getAttribute('data-current-model');
        if (!agentId) return false;

        const available = (this.context._p as any).availableModels || [];
        if (available.length === 0) {
            this.context._p.pushInternalLog('⚠️ 無法獲取可用模型清單，請稍後再試。', 'WARN');
            return true;
        }

        // Industrial Context Menu (Simplified for now with prompt, but will upgrade to UI later if needed)
        // Actually, let's use a quick selection list to be "WOW"
        const nextModel = window.prompt(`[TACTICAL_OVERRIDE] 變更代理人 ${agentId} 的模型\n\n當前: ${currentModel}\n可用: ${available.join(', ')}`, currentModel || undefined);
        
        if (nextModel && available.includes(nextModel) && nextModel !== currentModel) {
            this.context._p.pushInternalLog(`正在重連代理人 ${agentId} 至 ${nextModel}...`, 'SYNC');
            
            const mapping: Record<string, string> = {};
            (this.context._p as any).agentConfigs.forEach((cfg: any) => {
                mapping[cfg.id] = cfg.id === agentId ? nextModel : cfg.model;
            });

            fetch('/api/auth/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mapping })
            }).then(res => res.json()).then(() => {
                this.context._p.pushInternalLog(`✅ ${agentId} 戰術協議已更新：${nextModel}`, 'SUCCESS');
                // Refresh local state and re-render
                (this.context._p as any).agentConfigs.forEach((cfg: any) => {
                    if (cfg.id === agentId) cfg.model = nextModel;
                });
                this.context._p.scheduleRender(DIRTY_CONTENT);
            });
        }

        return true;
    }

    /**
     * ATOMIC_HUD: Telemetry & Tooltip System
     */
    private handleHUDInteractions(target: HTMLElement): boolean {
        // Custom Mode Node Metadata Viewer
        const seat = target.closest('.u-table-seat') as HTMLElement;
        if (this.context._p.currentTopology === 'custom' && seat && this.context.n8nFlow) {
            const idx = parseInt(seat.getAttribute('data-seat-index') || '-1');
            const node = this.context.n8nFlow.nodes[idx];
            if (node) {
                window.dispatchEvent(new CustomEvent('az-open-hud', {
                    detail: {
                        avatar: null,
                        title: `NODE: ${node.name}`,
                        code: node.type,
                        status: 'CONFIG_ACTIVE',
                        desc: `[PARAMETERS]:\n${JSON.stringify(node.parameters, null, 2)}\n\n[POSITION]: X:${node.position[0]}, Y:${node.position[1]}`
                    }
                }));
                return true;
            }
        }

        const trigger = target.closest('.u-interaction-trigger') as HTMLElement;
        if (trigger) {
            const avatarImg = trigger.querySelector('img');
            window.dispatchEvent(new CustomEvent('az-open-hud', {
                detail: {
                    avatar: avatarImg ? avatarImg.src : null,
                    title: trigger.getAttribute('data-title') || 'UNIT_INFO',
                    code: trigger.getAttribute('data-code') || 'SYS_01',
                    status: trigger.getAttribute('data-status') || 'NOMINAL',
                    desc: trigger.getAttribute('data-desc') || 'Analysis stream active...'
                }
            }));
            return true;
        }

        // Participant Slots
        const slot = target.closest('[data-slot-idx]');
        if (slot) {
            const idx = parseInt(slot.getAttribute('data-slot-idx') || '0', 10);
            if (this.context.tableParticipants[idx]) {
                this.context.tableParticipants[idx] = null;
                this.context.scheduleRender(DIRTY_SIDEBAR);
            }
            return true;
        }
        return false;
    }

    /**
     * ATOMIC_ARCHIVE: Tactical Vault Browsing & Downloads
     */
    private handleArchiveInteractions(target: HTMLElement): boolean {
        // PRIORITY_ORDER: Check specific action buttons FIRST (they're nested inside [data-archive-id])
        if (target.closest('#u-btn-download-archive')) {
            this.handleDownloadArchive();
            return true;
        }

        const vizBtn = target.closest('.u-btn-archive-visualize') as HTMLElement;
        if (vizBtn) {
            const archId = vizBtn.getAttribute('data-arch-id');
            if (archId) {
                this.context._p.selectedArchiveId = archId;
                const arch = this.context.archives.find((a: PortalArchive) => a.id === archId);
                if (arch && !arch.isImage) {
                    const prompt = `Create an industrial-grade tactical infographic summarizing: ${arch.title}`;
                    void this.context.workflow?.handleVisualize(prompt);
                }
            }
            return true;
        }

        // FALLBACK: Archive item selection (navigate to view)
        const archiveItem = target.closest('[data-archive-id]');
        if (archiveItem) {
            const aid = archiveItem.getAttribute('data-archive-id');
            if (aid) { this.context._p.selectedArchiveId = aid; this.context.scheduleRender(DIRTY_ALL); }
            return true;
        }

        return false;
    }

    private handleDownloadArchive(): void {
        const aid = this.context._p.selectedArchiveId;
        const archive = this.context.archives.find((item: PortalArchive) => item.id === aid);
        if (!archive) return;

        const data = JSON.stringify(archive, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `AstraZenetih_${archive.id}_${archive.mission}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        this.context.pushInternalLog(`📥 歸檔導出: ${archive.id} 已下載至本地。`, 'SUCCESS');
    }

    public onDelegatedPointerDown(e: PointerEvent): void {
        const target = e.target as HTMLElement;
        
        // SUPPORT_MATRIX: Capture agent code from Pool, Sidebar, or Seat
        const agentItem = target.closest('[data-agent-code], [data-code], az-agent-unit');
        if (agentItem) {
            const code = agentItem.getAttribute('data-agent-code') || 
                         agentItem.getAttribute('data-code') || 
                         agentItem.getAttribute('code');
                         
            if (code) {
                // Prevent default behavior to ensure clean industrial drag
                e.preventDefault();
                handlePointerDown(e, code, this.context);
            }
        }
    }

    public onDelegatedInput(e: Event): void {
        const target = e.target as HTMLTextAreaElement;
        if (target && target.id === 'u-mission-input') {
            this.context.activePrompt = target.value;
            this.context._p.activePrompt = target.value; // SYNC_BRIDGE: Keep AZPortal instance in sync for render
        }
    }

    public onDelegatedKeyDown(e: KeyboardEvent): void {
        if (e.key === 'Enter' && !this.context.isStreaming) {
            const focused = document.activeElement;
            if (focused && focused.id === 'u-mission-input') {
                this.handleSendMessageWithDetection();
            }
        }
    }

    private handleSendMessageWithDetection(): void {
        const prompt = this.context.activePrompt.trim();
        if (!prompt) return;

        // MISSION_STRATEGY: Operator task is now fixed in the Tactical Command input, 
        // no longer duplicated on the 'Big Screen' (Chat Area).
        
        this.context.scheduleRender(DIRTY_CONTENT);
        void this.context.workflow?.handleRunFlow();
    }
}
