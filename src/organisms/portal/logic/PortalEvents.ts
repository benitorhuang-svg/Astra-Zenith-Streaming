import { AZPortal } from '../../az_portal';
import { DIRTY_ALL, DIRTY_WELCOME } from '../PortalTypes';

/**
 * PortalEvents — Orchestrates global and local event listeners for AZPortal
 */
export class PortalEvents {
    constructor(private host: AZPortal) {}

    public setup() {
        // Core Interaction Listeners
        this.host.addEventListener('click', (e) => (this.host as any).interactionHandler.onDelegatedClick(e));
        this.host.addEventListener('pointerdown', (e) => (this.host as any).interactionHandler.onDelegatedPointerDown(e));
        window.addEventListener('pointermove', (e) => (this.host as any).interactionHandler.onGlobalPointerMove(e));
        window.addEventListener('pointerup', (e) => (this.host as any).interactionHandler.onGlobalPointerUp(e));
        this.host.addEventListener('input', (e) => (this.host as any).interactionHandler.onDelegatedInput(e));
        this.host.addEventListener('keydown', (e) => (this.host as any).interactionHandler.onDelegatedKeyDown(e));
        this.host.addEventListener('change', (e) => (this.host as any).interactionHandler.onDelegatedChange(e));
        
        // Specific UI Control Listeners
        this.host.addEventListener('click', this.handlePanelControls.bind(this));
        window.addEventListener('mousedown', this.handleOutsideClicks.bind(this));
        
        // Global Portal Logic Events
        window.addEventListener('az-logout', this.handleLogout.bind(this));
        
        const toggleEvents = ['chat', 'decision-tree', 'archive', 'logs', 'table'];
        toggleEvents.forEach(view => {
            window.addEventListener(`az-toggle-${view === 'decision-tree' ? 'pathway' : (view === 'table' ? 'custom-workflow' : view)}`, 
                () => this.host.handleModeSwitch(view as any));
        });
        
        this.host.addEventListener('az-node-selected', this.handleNodeSelected.bind(this));
    }

    private handlePanelControls(e: MouseEvent) {
        const target = e.target as HTMLElement;
        if (target.id === 'u-close-insight') {
            document.getElementById('u-node-insight-panel')?.classList.add('translate-y-full');
        }
        const graph = document.getElementById('u-pathway-graph') as any;
        if (graph) {
            if (target.closest('#z-in')) graph.zoomIn();
            if (target.closest('#z-out')) graph.zoomOut();
            if (target.closest('#z-reset')) graph.resetView();
        }
    }

    private handleOutsideClicks(e: MouseEvent) {
        const target = e.target as HTMLElement;
        if (this.host.state.selectedAgentInfo) {
            const bubble = document.getElementById('u-agent-info-bubble');
            const isSidebarItem = target.closest('.u-sidebar-agent-item');
            if (bubble && !bubble.contains(target) && !isSidebarItem) {
                this.host.state.selectedAgentInfo = null;
                this.host.state.selectedAgentPromptContent = null;
                this.host.scheduleRender(DIRTY_ALL);
            }
        }
        const panel = document.getElementById('u-node-insight-panel');
        if (panel && !panel.classList.contains('translate-y-full')) {
            const isNode = target.closest('[data-node-id]');
            const isPanel = target.closest('#u-node-insight-panel');
            if (!isNode && !isPanel) panel.classList.add('translate-y-full');
        }
    }

    private handleLogout() {
        this.host.state.serverAuthorized = false;
        this.host.state.apiKey = '';
        (window as any).ZENITH_PREVIEW_MODE = false;
        this.host.handleModeSwitch('welcome');
        this.host.scheduleRender(DIRTY_WELCOME | DIRTY_ALL);
    }

    private handleNodeSelected(e: any) {
        const { title, content, type } = e.detail;
        const panel = document.getElementById('u-node-insight-panel');
        const titleEl = document.getElementById('u-node-title');
        const contentEl = document.getElementById('u-node-content');
        if (panel && titleEl && contentEl) {
            const prefix = type === 'LEAF' ? '詳情內容' : (type === 'BRANCH' ? '核心重點' : '主題目標');
            titleEl.textContent = `${prefix}: ${title}`;
            contentEl.innerHTML = content.replace(/\n/g, '<br>');
            panel.classList.remove('translate-y-full');
        }
    }
}
