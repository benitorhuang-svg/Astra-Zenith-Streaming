/**
 * Astra Zenith: Primary Entry Point (Modern TypeScript Version)
 * Following Atomic Design Principles
 */

// 0. Styles (Vite Entry)
import './styles/input.css';

// 1. Core Logic & Initialization
import { initThemeToggle } from './core/utils';

// 2. Atoms
import './atoms/brackets';
import './atoms/a_tactical_button';
import './atoms/a_avatar';
import './atoms/a_alert';
import './atoms/a_input';
import './atoms/a_seat_frame';

// 3. Molecules
import './molecules/m_agent_unit';
import './molecules/az_semantic_graph';
import './molecules/m_task_overlay';
import './molecules/m_topology_button';

// 4. Organisms
import './organisms/global/Header';
import './organisms/az_portal';
import './organisms/global/HUD';

// 🚀 2026 PREVIEW_MODE ENGINE (Decoupled & Activated via UI)
function startPreviewMode() {
    console.log('🛰️ [Zenith_OS] Preview Mode Engine Standby...');
    
    const hud = document.querySelector('az-telemetry-hud') as any;

    // 1. Simulate API Telemetry (RPM/RPD)
    if (hud) {
        let currentRpm = 0;
        let currentRpd = 450;

        setInterval(() => {
            if (!(window as any).ZENITH_PREVIEW_MODE) return;
            currentRpm = Math.floor(Math.random() * 5) + 8; // Float around 8-12 RPM
            currentRpd += Math.floor(Math.random() * 2);
            hud.updateStats(currentRpm, 15, currentRpd, 1500);
        }, 3000);
    }
    // 2. Initial Matrix Synchronization (Simulating Backend Sync)
    setTimeout(() => {
        if (!(window as any).ZENITH_PREVIEW_MODE) return;
        console.log('🧩 [Mockup] Synchronizing Neural Graph Cluster (2026 Matrix)...');
    }, 1000);
}

// Bootstrap the application
document.addEventListener('DOMContentLoaded', () => {
    console.log('--- ASTRA_ZENITH_BOOTSTRAP_COMPLETE ---');

    // Start the Preview Experience
    startPreviewMode();

    // Initialize core system modules
    initThemeToggle();
});
