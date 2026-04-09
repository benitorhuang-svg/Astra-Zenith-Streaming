/**
 * AZ_SEMANTIC_GRAPH — Vanilla SVG Force-Directed Engine
 * Industrial-grade knowledge visualization for Astra Zenith
 * v2.0: Fullscreen Responsive Tactical Viewport
 */

export interface GraphNode {
    id: string;
    agentCode: string;
    x: number;
    y: number;
    vx: number;
    vy: number;
    type: 'text' | 'multimodal';
    agentColor?: string;
}

export interface GraphLink {
    source: string;
    target: string;
    value: number;
}

export class SemanticGraph extends HTMLElement {
    private svg: SVGSVGElement | null = null;
    private nodes: GraphNode[] = [];
    private links: GraphLink[] = [];
    private width = 800;
    private height = 600;
    private isUpdating = false;
    private resizeObserver: ResizeObserver | null = null;

    constructor() {
        super();
        this.className = "block w-full h-full overflow-hidden relative";
    }

    connectedCallback() {
        this.innerHTML = `
            <div class="u-graph-container relative w-full h-full bg-[#030303] overflow-hidden">
                <!-- Tactical Blueprint Grid -->
                <div class="absolute inset-0 opacity-[0.03] pointer-events-none" 
                     style="background-image: radial-gradient(var(--portal-aura-color, #4d9eff) 1px, transparent 1px), linear-gradient(to right, #ffffff05 1px, transparent 1px), linear-gradient(to bottom, #ffffff05 1px, transparent 1px); background-size: 40px 40px, 20px 20px, 20px 20px;">
                </div>
                
                <svg id="graph-svg" class="w-full h-full relative z-10 cursor-grab active:cursor-grabbing" 
                     viewBox="0 0 800 600" preserveAspectRatio="xMidYMid meet"></svg>
                
                <!-- HUD Overlays -->
                <div class="absolute top-4 left-4 pointer-events-none flex flex-col gap-1">
                    <span class="text-[9px] font-mono text-white/20 uppercase tracking-[0.4em]">Strategic_Neural_Map // v2.1</span>
                    <div class="flex items-center gap-2">
                        <div class="w-2 h-2 bg-success rounded-full animate-pulse"></div>
                        <span id="graph-node-count" class="text-[10px] font-mono text-white/60 font-black tracking-widest">0 NODES_SYNCED</span>
                    </div>
                </div>

                <div class="absolute bottom-4 left-4 pointer-events-none text-[8px] font-mono text-white/10 uppercase tracking-[0.2em]">
                    Coordinate_System: Cartesian_Force_Directed
                </div>
            </div>
        `;

        this.svg = this.querySelector('#graph-svg');
        
        // Responsive Resizing
        this.resizeObserver = new ResizeObserver(entries => {
            for (const entry of entries) {
                this.width = entry.contentRect.width;
                this.height = entry.contentRect.height;
                if (this.svg) {
                    this.svg.setAttribute('viewBox', `0 0 ${this.width} ${this.height}`);
                }
            }
        });
        this.resizeObserver.observe(this);

        this.startSimulation();
    }

    disconnectedCallback() {
        this.isUpdating = false;
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
    }

    setData(data: { nodes: any[], links: any[] }) {
        const nodeCountEl = this.querySelector('#graph-node-count');
        if (nodeCountEl) nodeCountEl.textContent = `${data.nodes.length} NODES_SYNCED`;

        // Map new data while preserving existing positions for smooth transition
        const newNodes = data.nodes.map(n => {
            const existing = this.nodes.find(old => old.id === n.id);
            return {
                id: n.id,
                agentCode: n.agentCode,
                agentColor: n.agentColor || '#4d9eff',
                x: existing ? existing.x : (Math.random() * this.width),
                y: existing ? existing.y : (Math.random() * this.height),
                vx: existing ? existing.vx : 0,
                vy: existing ? existing.vy : 0,
                type: n.content?.includes('[Multimodal') ? 'multimodal' : 'text'
            } as GraphNode;
        });

        this.nodes = newNodes;
        this.links = data.links;
    }

    private startSimulation() {
        if (this.isUpdating) return;
        this.isUpdating = true;
        
        const update = () => {
            if (!this.isUpdating) return;
            this.applyPhysics();
            this.render();
            requestAnimationFrame(update);
        };
        update();
    }

    private applyPhysics() {
        const repulsion = 40;
        const attraction = 0.04;
        const gravity = 0.005;
        const friction = 0.9;

        const centerX = this.width / 2;
        const centerY = this.height / 2;

        // 1. Repulsion (Global spread)
        for (let i = 0; i < this.nodes.length; i++) {
            for (let j = i + 1; j < this.nodes.length; j++) {
                const n1 = this.nodes[i];
                const n2 = this.nodes[j];
                const dx = n1.x - n2.x;
                const dy = n1.y - n2.y;
                const distSq = dx * dx + dy * dy + 0.1;
                const force = repulsion / distSq;
                n1.vx += dx * force;
                n1.vy += dy * force;
                n2.vx -= dx * force;
                n2.vy -= dy * force;
            }
        }

        // 2. Attraction (Links)
        this.links.forEach(link => {
            const n1 = this.nodes.find(n => n.id === link.source);
            const n2 = this.nodes.find(n => n.id === link.target);
            if (n1 && n2) {
                const dx = n1.x - n2.x;
                const dy = n1.y - n2.y;
                const dist = Math.sqrt(dx * dx + dy * dy) + 0.1;
                const targetDist = 120; // Increased for fullscreen
                const force = (dist - targetDist) * attraction;
                n1.vx -= (dx / dist) * force;
                n1.vy -= (dy / dist) * force;
                n2.vx += (dx / dist) * force;
                n2.vy += (dy / dist) * force;
            }
        });

        // 3. Central Gravity & Boundary Update
        this.nodes.forEach(n => {
            n.vx += (centerX - n.x) * gravity;
            n.vy += (centerY - n.y) * gravity;
            
            n.vx *= friction;
            n.vy *= friction;
            
            n.x += n.vx;
            n.y += n.vy;

            // Soft-Bounds
            const padding = 50;
            if (n.x < padding) n.vx += 0.5;
            if (n.x > this.width - padding) n.vx -= 0.5;
            if (n.y < padding) n.vy += 0.5;
            if (n.y > this.height - padding) n.vy -= 0.5;
        });
    }

    private render() {
        if (!this.svg) return;
        let html = '';
        
        // Define Markers & Glows once if needed, but here we use simple shapes for perf
        
        // Draw Links
        this.links.forEach((link) => {
            const n1 = this.nodes.find(n => n.id === link.source);
            const n2 = this.nodes.find(n => n.id === link.target);
            if (n1 && n2) {
                html += `<line x1="${n1.x}" y1="${n1.y}" x2="${n2.x}" y2="${n2.y}" 
                               stroke="${n1.agentColor}" stroke-width="${0.5 + link.value}" 
                               opacity="${0.1 + link.value * 0.2}" stroke-dasharray="2 2" />`;
            }
        });

        // Draw Nodes
        this.nodes.forEach(n => {
            const isMM = n.type === 'multimodal';
            const radius = isMM ? 8 : 5;
            
            html += `
                <g class="cursor-pointer group" style="transform-origin: ${n.x}px ${n.y}px">
                    <!-- Glow Layer -->
                    <circle cx="${n.x}" cy="${n.y}" r="${radius + 10}" fill="${n.agentColor}" opacity="0.05" class="animate-pulse" />
                    
                    <!-- Core Layer -->
                    <circle cx="${n.x}" cy="${n.y}" r="${radius}" 
                            fill="${isMM ? 'transparent' : n.agentColor}" 
                            stroke="${n.agentColor}" stroke-width="2" />
                    
                    ${isMM ? `<circle cx="${n.x}" cy="${n.y}" r="4" fill="white" />` : ''}

                    <!-- Label -->
                    <text x="${n.x + radius + 6}" y="${n.y + 4}" fill="white" font-size="9" 
                          font-family="monospace" font-weight="900" 
                          class="opacity-40 group-hover:opacity-100 transition-opacity tracking-widest uppercase">
                        ${n.agentCode}
                    </text>
                </g>
            `;
        });

        this.svg.innerHTML = html;
    }
}

customElements.define('az-semantic-graph', SemanticGraph);
