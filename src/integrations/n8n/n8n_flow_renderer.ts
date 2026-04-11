/**
 * AZ PORTAL FLOWCHART — Agent Orchestration Molecule
 * High-fidelity SVG-driven logic propagation map.
 */

import type { N8NWorkflow } from './n8n_data_types';

/**
 * ATOM: Silver-White High-Bright Filter
 */
const renderAtomicFilters = () => `
    <defs>
        <filter id="silverGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feFlood flood-color="#F8FAFC" result="color" />
            <feComposite in="color" in2="blur" operator="in" result="glow" />
            <feMerge>
                <feMergeNode in="glow" />
                <feMergeNode in="SourceGraphic" />
            </feMerge>
        </filter>
        <filter id="coreSurge" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="12" result="blur" />
            <feFlood flood-color="white" result="color" />
            <feComposite in="color" in2="blur" operator="in" />
        </filter>
    </defs>
`;

/**
 * ATOM: Logic Flux Path (The "Current")
 */
const renderFluxPath = (d: string, isCoreAxis: boolean) => `
    <!-- 1. GHOST CHANNEL -->
    <path d="${d}" fill="none" stroke="#F8FAFC" stroke-width="1.2" opacity="0.1" />
    
    <!-- 2. TACTICAL PULSE -->
    <path d="${d}" fill="none" stroke="#F8FAFC" 
          stroke-width="2.5" 
          opacity="0.8" 
          stroke-dasharray="150,450" 
          filter="url(#silverGlow)">
        <animate attributeName="stroke-dashoffset" from="600" to="0" 
                 dur="7.5s" repeatCount="indefinite" />
    </path>

    ${isCoreAxis ? `
        <!-- 3. PLASMA CORE SURGE (The Master Current) -->
        <path d="${d}" fill="none" stroke="white" stroke-width="3.5" opacity="0.4" 
              stroke-dasharray="100,500" filter="url(#coreSurge)">
            <animate attributeName="stroke-dashoffset" from="600" to="0" dur="7.5s" repeatCount="indefinite" />
        </path>
        <path d="${d}" fill="none" stroke="white" stroke-width="0.8" opacity="0.6">
            <animate attributeName="opacity" values="0.6;0.2;0.6" dur="0.6s" repeatCount="indefinite" />
        </path>
    ` : ''}
`;

export const renderN8NFlowChart = (topology: 'linear' | 'orbital' | 'custom' = 'linear', n8nFlow?: N8NWorkflow) => {
    let result: string;

    if (topology === 'orbital') {
        const CY = 290;
        const CX = 650;
        const nodes = [
            { x: 180, y: CY }, { x: CX, y: 135 }, { x: CX, y: CY }, { x: CX, y: 460 }, { x: 1120, y: CY }
        ];
        const connections = [[0, 1], [0, 2], [0, 3], [1, 4], [2, 4], [3, 4]];

        result = `
            <div class="u-topology-base u-topology-hub">
                <svg class="absolute inset-0 w-full h-full" viewBox="0 0 1300 600">
                    ${renderAtomicFilters()}
                    ${connections.map(([from, to]) => {
                        const isCoreAxis = (from === 0 && to === 2) || (from === 2 && to === 4);
                        const d = `M${nodes[from].x},${nodes[from].y} L${nodes[to].x},${nodes[to].y}`;
                        return renderFluxPath(d, isCoreAxis);
                    }).join('')}
                    
                    <!-- ATOMIC NODES -->
                    ${nodes.map((n, i) => {
                        const isCore = i === 0 || i === 2 || i === 4;
                        return `<circle cx="${n.x}" cy="${n.y}" r="${isCore ? 5 : 3}" fill="white" filter="url(#silverGlow)" />`;
                    }).join('')}
                </svg>
            </div>
        `;
    } else if (topology === 'custom') {
        result = n8nFlow?.nodes.length ? renderN8NFlow(n8nFlow) : `<div class="u-topology-base u-topology-custom"></div>`;
    } else {
        const nodes = [150, 350, 550, 750, 950, 1150].map(x => ({ x, y: 290 }));
        result = `
            <div class="u-topology-base u-topology-linear">
                <svg class="absolute inset-0 w-full h-full" viewBox="0 0 1300 600">
                    ${renderAtomicFilters()}
                    ${nodes.map((n, i) => {
                        if (i === nodes.length - 1) return '';
                        const d = `M${n.x},${n.y} L${nodes[i+1].x},${nodes[i+1].y}`;
                        return renderFluxPath(d, true); 
                    }).join('')}

                    <!-- HIGH-FIDELITY LINEAR NODES -->
                    ${nodes.map(n => `
                        <circle cx="${n.x}" cy="${n.y}" r="4" fill="white" filter="url(#silverGlow)" />
                    `).join('')}
                </svg>
                ${['INPUT', 'ANALYSIS', 'LOGIC', 'SYNTHESIS', 'REFINER', 'OUTPUT'].map((label, i) => `
                    <div class="absolute flex flex-col items-center -translate-x-1/2" style="left: ${nodes[i].x}px; top: 180px;">
                        <span class="text-[10px] font-black text-white/40 tracking-[0.4em] uppercase">${label}</span>
                    </div>
                `).join('')}
            </div>
        `;
    }

    return result;
};

/**
 * High-fidelity n8n-compatible Flow Renderer
 * Refined for Node-RED style smooth Bezier connections and data flow animations.
 */
function renderN8NFlow(flow: N8NWorkflow): string {
    const nodes = flow.nodes;
    const padding = 150;
    const minX = Math.min(...nodes.map(n => n.position[0]));
    const minY = Math.min(...nodes.map(n => n.position[1]));
    const maxX = Math.max(...nodes.map(n => n.position[0]));
    const maxY = Math.max(...nodes.map(n => n.position[1]));
    const viewBox = `${minX - padding} ${minY - padding} ${maxX - minX + padding * 2} ${maxY - minY + padding * 2}`;

    return `
        <div class="u-topology-base u-topology-custom">
            <svg class="absolute inset-0 w-full h-full p-10 overflow-visible" viewBox="${viewBox}" style="pointer-events: none;">
                <defs>
                    <filter id="wireGlow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="3" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                    
                    <linearGradient id="flowGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stop-color="var(--primary)" stop-opacity="0.2" />
                        <stop offset="50%" stop-color="var(--primary)" stop-opacity="1" />
                        <stop offset="100%" stop-color="var(--primary)" stop-opacity="0.2" />
                    </linearGradient>

                    <mask id="flowMask">
                        <rect x="0" y="0" width="100%" height="100%" fill="white" />
                    </mask>
                </defs>

                ${Object.entries(flow.connections).map(([sourceName, conn]) => {
                    const sourceNode = nodes.find(n => n.name === sourceName);
                    if (!sourceNode) return '';
                    
                    // Node Output Socket Position (Right-Center)
                    const sx = sourceNode.position[0] + 140; 
                    const sy = sourceNode.position[1] + 55;

                    return conn.main.map(batch => batch.map(target => {
                        const targetNode = nodes.find(n => n.name === target.node);
                        if (!targetNode) return '';
                        
                        // Node Input Socket Position (Left-Center)
                        const tx = targetNode.position[0] - 20;
                        const ty = targetNode.position[1] + 55;

                        // Calculate Smooth Bezier Control Points
                        const dx = Math.abs(tx - sx) * 0.5;
                        const d = `M${sx},${sy} C${sx + dx},${sy} ${tx - dx},${ty} ${tx},${ty}`;

                        return `
                            <!-- Static Wire Background -->
                            <path d="${d}" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="3" />
                            
                            <!-- Tactical Data Wire -->
                            <path d="${d}" fill="none" stroke="var(--primary)" stroke-width="1.5" 
                                  opacity="0.3" stroke-dasharray="4,4" />

                            <!-- Active Data Flow Pulse (The 'Task' Packet) -->
                            <path d="${d}" fill="none" stroke="url(#flowGradient)" stroke-width="2.5" 
                                  stroke-dasharray="20, 100" filter="url(#wireGlow)">
                                <animate attributeName="stroke-dashoffset" from="120" to="0" dur="2s" repeatCount="indefinite" />
                            </path>
                        `;
                    }).join('')).join('');
                }).join('')}
            </svg>
        </div>
    `;
}
