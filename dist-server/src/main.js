"use strict";
/**
 * Astra Zenith: Primary Entry Point (Modern TypeScript Version)
 * Following Atomic Design Principles
 */
Object.defineProperty(exports, "__esModule", { value: true });
// 0. Styles (Vite Entry)
require("./styles/input.css");
// 1. Core Logic & Initialization
const utils_1 = require("./core/utils");
// 2. Atoms
require("./atoms/brackets");
require("./atoms/a_tactical_button");
require("./atoms/a_avatar");
require("./atoms/a_alert");
require("./atoms/a_input");
require("./atoms/a_seat_frame");
// 3. Molecules
require("./molecules/m_agent_unit");
require("./molecules/az_semantic_graph");
require("./molecules/m_task_overlay");
require("./molecules/m_topology_button");
// 4. Organisms
require("./organisms/global/Header");
require("./organisms/az_portal");
require("./organisms/global/HUD");
// 🚀 2026 PREVIEW_MODE ENGINE (Decoupled & Activated via UI)
function startPreviewMode() {
    console.log('🛰️ [Zenith_OS] Preview Mode Engine Standby...');
    const hud = document.querySelector('az-telemetry-hud');
    // 1. Simulate API Telemetry (RPM/RPD)
    if (hud) {
        let currentRpm = 0;
        let currentRpd = 450;
        setInterval(() => {
            if (!window.ZENITH_PREVIEW_MODE)
                return;
            currentRpm = Math.floor(Math.random() * 5) + 8; // Float around 8-12 RPM
            currentRpd += Math.floor(Math.random() * 2);
            hud.updateStats(currentRpm, 15, currentRpd, 1500);
        }, 3000);
    }
    // 2. Initial Matrix Synchronization (Simulating Backend Sync)
    setTimeout(() => {
        if (!window.ZENITH_PREVIEW_MODE)
            return;
        console.log('🧩 [Mockup] Synchronizing Neural Graph Cluster (2026 Matrix)...');
    }, 1000);
}
// Bootstrap the application
document.addEventListener('DOMContentLoaded', () => {
    console.log('--- ASTRA_ZENITH_BOOTSTRAP_COMPLETE ---');
    // Start the Preview Experience
    startPreviewMode();
    // Initialize core system modules
    (0, utils_1.initThemeToggle)();
});
