/**
 * Astra Zenith: Primary Entry Point (Modern TypeScript Version)
 * Following Atomic Design Principles
 */

// 0. Styles (Vite Entry)
import '../styles/input.css';

// 1. Core Logic & Initialization
import { initClock, initThemeToggle } from './core/utils';

// 2. Atoms
import './atoms/brackets';
import './atoms/a_tactical_button';
import './atoms/a_avatar';

// 3. Molecules
import './molecules/m_agent_unit';

// 4. Organisms
import './organisms/global/Header';
import './organisms/az_portal';
import './organisms/global/HUD';
import './organisms/global/TelemetryHUD';


// Bootstrap the application
document.addEventListener('DOMContentLoaded', () => {
    console.log('--- ASTRA_ZENITH_BOOTSTRAP_COMPLETE ---');
    
    // PWA Service Worker Registration
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js').catch(err => {
                console.log('SW registration failed: ', err);
            });
        });
    }

    // Initialize Lucide Icons globally first
    if (window.lucide) {
        window.lucide.createIcons();
    }

    // Initialize core system modules
    initClock();
    initThemeToggle();
});
