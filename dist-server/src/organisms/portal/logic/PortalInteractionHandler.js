"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AZPortalInteractionHandler = void 0;
const PortalTypes_1 = require("../PortalTypes");
const agents_1 = require("../../../core/agents");
const PortalDragHandler_1 = require("./PortalDragHandler");
const IdentityHandler_1 = require("./IdentityHandler");
const TacticalHandler_1 = require("./TacticalHandler");
/**
 * PortalInteractionHandler — Robust Event Orchestrator
 * Ultra-stable implementation with behavior suspension and error isolation.
 */
class AZPortalInteractionHandler {
    context;
    identity;
    tactical;
    constructor(context) {
        this.context = context;
        this.identity = new IdentityHandler_1.IdentityHandler(context);
        this.tactical = new TacticalHandler_1.TacticalHandler(context);
    }
    onDelegatedClick(e) {
        try {
            const path = e.composedPath() || [];
            if (path.length === 0)
                return;
            const find = (selector) => path.find(el => el instanceof HTMLElement && el.matches(selector));
            const target = path[0];
            // Navigation - Intercept and Prevent Default
            const chatTab = find('#h-btn-chat');
            if (chatTab) {
                e.preventDefault();
                this.context._p.handleModeSwitch('chat');
                return;
            }
            const pathTab = find('#h-btn-pathway');
            if (pathTab) {
                e.preventDefault();
                this.context._p.handleModeSwitch('decision-tree');
                return;
            }
            const archTab = find('#h-btn-archive');
            if (archTab) {
                e.preventDefault();
                this.context._p.handleModeSwitch('archive');
                return;
            }
            const logTab = find('#h-btn-realtime'); // Match Header.ts
            if (logTab) {
                e.preventDefault();
                this.context._p.handleModeSwitch('logs');
                return;
            }
            const flowTab = find('#h-btn-custom-flow');
            if (flowTab) {
                e.preventDefault();
                this.context._p.handleModeSwitch('table');
                return;
            }
            // Neural Topology Switch (Footer & Sidebar)
            if (find('#u-topology-linear')) {
                e.preventDefault();
                this.context._p.handleTopologySwitch('linear');
                return;
            }
            if (find('#u-topology-orbital')) {
                e.preventDefault();
                this.context._p.handleTopologySwitch('orbital');
                return;
            }
            if (find('#u-topology-custom')) {
                e.preventDefault();
                this.context._p.handleTopologySwitch('custom');
                return;
            }
            // Sidebar Circular Toggle
            if (find('#u-sidebar-topology-icon')) {
                e.preventDefault();
                const current = this.context.currentTopology;
                const next = {
                    'linear': 'orbital',
                    'orbital': 'custom',
                    'custom': 'linear'
                };
                this.context._p.handleTopologySwitch(next[current] || 'linear');
                return;
            }
            if (find('#u-btn-run-flow') || find('#u-mission-action')) {
                e.preventDefault();
                void this.context.workflow?.handleRunFlow();
                return;
            }
            if (find('#u-btn-close-task')) {
                e.preventDefault();
                this.context._p.isEditingTask = false;
                this.context.scheduleRender(PortalTypes_1.DIRTY_ALL);
                return;
            }
            if (find('#u-btn-confirm-task')) {
                e.preventDefault();
                this.context._p.isEditingTask = false;
                this.context.scheduleRender(PortalTypes_1.DIRTY_ALL);
                return;
            }
            // Path Analysis Graph Controls
            if (find('#u-btn-reset-graph')) {
                e.preventDefault();
                window.semanticNodes = [];
                window.semanticLinks = [];
                this.context.scheduleRender(PortalTypes_1.DIRTY_CONTENT);
                return;
            }
            if (find('#u-btn-refresh-graph')) {
                e.preventDefault();
                this.context.scheduleRender(PortalTypes_1.DIRTY_CONTENT);
                return;
            }
            const sidebarAgent = find('.u-sidebar-agent-item');
            if (sidebarAgent) {
                e.preventDefault();
                const code = sidebarAgent.getAttribute('data-code');
                if (code) {
                    this.context._p.selectedAgentInfo = code;
                    this.context._p.loadAgentPrompt(code);
                    this.context.scheduleRender(PortalTypes_1.DIRTY_ALL);
                }
                return;
            }
            if (find('#u-btn-close-bubble')) {
                e.preventDefault();
                this.context._p.selectedAgentInfo = null;
                this.context._p.selectedAgentPromptContent = null;
                this.context.scheduleRender(PortalTypes_1.DIRTY_ALL);
                return;
            }
            // Apply Tactical Update from Bubble (Modular Version)
            if (find('#u-btn-bubble-apply')) {
                e.preventDefault();
                const pText = document.getElementById('u-editor-personality')?.value || '';
                const tText = document.getElementById('u-editor-protocol')?.value || '';
                const eText = document.getElementById('u-editor-expertise')?.value || '';
                const nameEditor = document.getElementById('u-bubble-agent-name');
                const agentCode = this.context._p.selectedAgentInfo;
                // Reconstruct full markdown
                const combinedPrompt = [
                    `## 人格特質\n${pText}`,
                    `## 行為協定\n${tText}`,
                    `## 專業領域\n${eText}`
                ].join('\n\n');
                this.context.activePrompt = combinedPrompt;
                this.context._p.selectedAgentPromptContent = combinedPrompt;
                if (agentCode) {
                    this.context._p.agentPrompts[agentCode] = combinedPrompt;
                }
                this.context._p.pushInternalLog(`TACTICAL_MODULAR_UDPATE: ${agentCode}`, 'SUCCESS');
                if (nameEditor && agentCode) {
                    const agent = agents_1.AGENT_POOL.find(a => a.code === agentCode);
                    if (agent)
                        agent.name = nameEditor.innerText.trim();
                }
                this.context.scheduleRender(PortalTypes_1.DIRTY_ALL);
                return;
            }
            // Tactical Capsule Switch Logic
            const capsule = find('.u-tactical-capsule');
            if (capsule) {
                e.preventDefault();
                const mid = capsule.getAttribute('data-module-id');
                // UI State Update (Direct DOM manipulation for instant feedback)
                document.querySelectorAll('.u-tactical-capsule').forEach(el => {
                    el.classList.remove('border-primary', 'shadow-[0_0_15px_rgba(var(--primary-rgb),0.2)]', 'text-primary');
                    el.classList.add('border-white/10', 'text-white/40');
                    el.querySelector('.rounded-full')?.classList.remove('bg-primary');
                    el.querySelector('.rounded-full')?.classList.add('bg-white/10');
                    el.querySelector('.animate-pulse')?.remove();
                });
                capsule.classList.remove('border-white/10', 'text-white/40');
                capsule.classList.add('border-primary', 'shadow-[0_0_15px_rgba(var(--primary-rgb),0.2)]', 'text-primary');
                capsule.querySelector('.rounded-full')?.classList.remove('bg-white/10');
                capsule.querySelector('.rounded-full')?.classList.add('bg-primary');
                capsule.insertAdjacentHTML('beforeend', '<div class="absolute inset-0 bg-primary/5 animate-pulse"></div>');
                // Toggle Textareas
                document.querySelectorAll('.u-modular-textarea').forEach(el => el.classList.add('hidden'));
                document.getElementById(`u-editor-${mid}`)?.classList.remove('hidden');
                return;
            }
            // Reset Tactical Info from Bubble
            if (find('#u-btn-bubble-reset')) {
                e.preventDefault();
                const agentCode = this.context._p.selectedAgentInfo;
                if (agentCode) {
                    this.context._p.loadAgentPrompt(agentCode); // Re-fetch from .md file
                    this.context._p.pushInternalLog(`TACTICAL_RESET: Agent_${agentCode}`, 'WARNING');
                }
                return;
            }
            // Focus Name Editor on Pen Click
            if (target.closest('.u-bubble-pen-icon')) {
                e.preventDefault();
                const nameEditor = document.getElementById('u-bubble-agent-name');
                if (nameEditor) {
                    nameEditor.focus();
                    // Place cursor at end
                    const range = document.createRange();
                    const sel = window.getSelection();
                    range.selectNodeContents(nameEditor);
                    range.collapse(false);
                    sel?.removeAllRanges();
                    sel?.addRange(range);
                }
                return;
            }
            // Close bubble if clicking outside
            if (this.context._p.selectedAgentInfo && !find('#u-agent-info-bubble') && !find('.u-sidebar-agent-item')) {
                this.context._p.selectedAgentInfo = null;
                this.context._p.selectedAgentPromptContent = null;
                this.context.scheduleRender(PortalTypes_1.DIRTY_ALL);
            }
            // Task Input Delegate
            if (target.id === 'u-task-input') {
                this.context._p.activePrompt = target.value;
                return;
            }
            // Delegate to sub-handlers with protection
            if (this.identity.handle(e)) {
                e.preventDefault();
                return;
            }
            if (this.tactical.handle(target)) {
                e.preventDefault();
                return;
            }
            // --- ARCHIVE LOGIC ---
            const archItem = find('.u-archive-item');
            if (archItem && !find('#u-btn-download-archive')) {
                const id = archItem.getAttribute('data-archive-id');
                if (id) {
                    this.context._p.selectedArchiveId = id;
                    this.context.scheduleRender(PortalTypes_1.DIRTY_CONTENT);
                }
                return;
            }
            // DOWNLOAD ARCHIVE AS PROFESSIONAL PDF (Tactical Manual)
            const downloadBtn = find('#u-btn-download-archive');
            if (downloadBtn) {
                e.preventDefault();
                e.stopPropagation();
                const id = downloadBtn.getAttribute('data-archive-id');
                const archive = this.context.archives.find(a => a.id === id);
                if (archive && archive.messages) {
                    this.exportToTacticalPDF(archive);
                    this.context._p.pushInternalLog(`PDF_PREPARATION_COMPLETE: ${id}`, 'SUCCESS');
                }
                return;
            }
            if (find('#u-btn-clear-all-archive') || find('#u-btn-purge-archive-footer')) {
                if (confirm('確定要清除所有歸檔紀錄嗎？此操作不可還原。')) {
                    this.context.archives = [];
                    this.context._p.selectedArchiveId = null;
                    this.context.scheduleRender(PortalTypes_1.DIRTY_CONTENT);
                }
                return;
            }
        }
        catch (err) {
            console.error("Critical Interaction Failure:", err);
        }
    }
    onDelegatedPointerDown(e) {
        try {
            const path = e.composedPath() || [];
            if (path.find(el => el.id === 'u-portal-sidebar'))
                return;
            const find = (selector) => path.find(el => el.matches && el.matches(selector));
            const agentItem = find('[data-agent-code], [data-code], az-agent-unit');
            if (agentItem) {
                const code = agentItem.getAttribute('data-agent-code') ||
                    agentItem.getAttribute('data-code') ||
                    agentItem.getAttribute('code');
                if (code) {
                    // INDUSTRIAL FEATURE: In Custom mode, clicking an already seated agent opens the TASK EDITOR
                    if (this.context.currentTopology === 'custom') {
                        const isSeated = this.context.tableParticipants.includes(code);
                        if (isSeated) {
                            e.preventDefault();
                            this.context._p.selectedAgentForTask = code;
                            this.context._p.isEditingTask = true;
                            this.context.scheduleRender(PortalTypes_1.DIRTY_ALL);
                            return;
                        }
                    }
                    e.preventDefault();
                    (0, PortalDragHandler_1.handlePointerDown)(e, code, this.context);
                }
            }
        }
        catch (err) {
            console.error("Pointer Down Failure:", err);
        }
    }
    onDelegatedInput(e) {
        const target = e.target;
        if (target && target.id === 'u-mission-input') {
            this.context.activePrompt = target.value;
            this.context._p.activePrompt = target.value;
        }
    }
    onDelegatedChange(e) {
        const target = e.target;
        if (target && target.id === 'u-model-selector') {
            const agentCode = this.context._p.selectedAgentInfo;
            if (agentCode) {
                this.context._p.agentModels[agentCode] = target.value;
                this.context._p.pushInternalLog(`MODEL_UPDATE: ${agentCode} -> ${target.value}`, 'INFO');
            }
        }
    }
    onGlobalPointerMove(e) {
        if (this.context.activeDrag) {
            (0, PortalDragHandler_1.handlePointerMove)(e, this.context.activeDrag);
        }
    }
    onGlobalPointerUp(_e) {
        if (this.context.activeDrag) {
            (0, PortalDragHandler_1.handlePointerUp)(this.context.activeDrag, this.context.tableParticipants, (idx, code) => {
                this.context.tableParticipants[idx] = code;
                this.context.scheduleRender(PortalTypes_1.DIRTY_ALL);
            }, (idx) => {
                this.context.tableParticipants[idx] = null;
                this.context.scheduleRender(PortalTypes_1.DIRTY_ALL);
            }, () => { this.context.scheduleRender(PortalTypes_1.DIRTY_ALL); });
            this.context.activeDrag = null;
        }
    }
    onDelegatedKeyDown(e) {
        const target = e.target;
        const isInput = target && (target.id === 'u-mission-input' || target.id === 'u-task-input' || target.tagName === 'TEXTAREA');
        if (e.key === 'Enter' && isInput && !this.context.isStreaming) {
            // Support Shift+Enter for newline in textareas, but Enter triggers flow
            if (e.shiftKey && target.tagName === 'TEXTAREA')
                return;
            e.preventDefault();
            // Final Sync of Value before execution
            const value = target.value;
            this.context.activePrompt = value;
            this.context._p.activePrompt = value;
            if (value.trim().length > 0) {
                void this.context.workflow?.handleRunFlow();
                target.value = '';
            }
        }
    }
    exportToTacticalPDF(archive) {
        const printWindow = window.open('', '_blank');
        if (!printWindow)
            return;
        const messagesHtml = archive.messages.map((m) => {
            // Parse ## and ### for PDF styling
            const content = m.content
                .replace(/^##\s+(.*)$/gm, '<h2 class="pdf-h2">$1</h2>')
                .replace(/^###\s+(.*)$/gm, '<h3 class="pdf-h3">$1</h3>')
                .replace(/\n/g, '<br>');
            return `
                <div class="pdf-agent-block">
                    <div class="pdf-agent-header" style="border-left-color: ${m.agentColor}">
                        <span class="agent-name">${m.agentName}</span>
                        <span class="agent-meta">IDENT: ${m.agentCode} // ROUND: ${m.round}</span>
                    </div>
                    <div class="pdf-agent-content">${content}</div>
                </div>
            `;
        }).join('');
        printWindow.document.write(`
            <html>
            <head>
                <title>AZ_SDR_${archive.id}</title>
                <style>
                    @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap');
                    body { 
                        font-family: 'JetBrains Mono', monospace; 
                        background: #fff; color: #111; 
                        padding: 40px; line-height: 1.6;
                    }
                    .pdf-cover { 
                        text-align: center; border: 4px double #000; 
                        padding: 60px 20px; margin-bottom: 50px; 
                        page-break-after: always;
                        display: flex; flex-direction: column; justify-content: center; height: 80vh;
                    }
                    .pdf-title { font-size: 32px; font-weight: 900; margin-bottom: 10px; text-transform: uppercase; }
                    .pdf-subtitle { font-size: 14px; color: #666; letter-spacing: 0.3em; margin-bottom: 40px; }
                    .pdf-meta { font-size: 12px; margin-top: 20px; text-align: left; display: inline-block; }
                    
                    .pdf-agent-block { margin-bottom: 40px; page-break-inside: avoid; }
                    .pdf-agent-header { 
                        background: #f4f4f4; border-left: 10px solid #000; 
                        padding: 10px 20px; display: flex; justify-content: space-between; align-items: center;
                        margin-bottom: 15px;
                    }
                    .agent-name { font-weight: 900; font-size: 16px; text-transform: uppercase; }
                    .agent-meta { font-size: 10px; color: #888; }
                    
                    .pdf-agent-content { padding: 0 20px; font-size: 13px; }
                    .pdf-h2 { background: #000; color: #fff; padding: 5px 15px; font-size: 15px; margin-top: 25px; text-transform: uppercase; }
                    .pdf-h3 { border-bottom: 2px solid #000; display: inline-block; font-size: 14px; margin-top: 20px; }
                    
                    @media print {
                        body { padding: 0; }
                        .no-print { display: none; }
                    }
                </style>
            </head>
            <body>
                <div class="pdf-cover">
                    <div class="pdf-title">Strategic Deployment Report</div>
                    <div class="pdf-subtitle">ASTRA ZENITH TACTICAL OPERATIONS</div>
                    <div class="pdf-meta">
                        <strong>MISSION_TOPIC:</strong> ${archive.title}<br>
                        <strong>MISSION_ID:</strong> ${archive.id}<br>
                        <strong>TIMESTAMP:</strong> ${archive.time}<br>
                        <strong>STATUS:</strong> VERIFIED_CONVERGENCE<br>
                        <strong>SECURITY:</strong> INDUSTRIAL_GRADE_ONLY
                    </div>
                </div>
                <div class="pdf-content-body">
                    ${messagesHtml}
                </div>
                <script>
                    setTimeout(() => {
                        window.print();
                        window.close();
                    }, 500);
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
    }
}
exports.AZPortalInteractionHandler = AZPortalInteractionHandler;
