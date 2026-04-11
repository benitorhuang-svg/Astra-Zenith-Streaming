"use strict";
/**
 * AZ_SEMANTIC_GRAPH — Technical Blueprint Engine
 * Reconfigured for Top-Origin Tree growth and Landscape Navigation.
 * Zoom/Pan controls moved to Global Tactical Footer.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SemanticGraph = void 0;
class SemanticGraph extends HTMLElement {
    nodes = [];
    links = [];
    svg = null;
    viewport = null;
    elementMap = new Map();
    zoom = 0.8;
    panX = 0;
    panY = 40;
    isPanning = false;
    connectedCallback() {
        this.innerHTML = `
            <div class="w-full h-full bg-[#020202] overflow-hidden relative select-none">
                <div class="absolute inset-0 opacity-20 pointer-events-none" 
                     style="background-image: linear-gradient(#1a1a1a 1px, transparent 1px), linear-gradient(90deg, #1a1a1a 1px, transparent 1px); background-size: 40px 40px;"></div>
                <div class="absolute inset-0 g-vignette pointer-events-none"></div>

                <svg id="graph-svg" class="w-full h-full cursor-grab active:cursor-grabbing">
                    <defs>
                        <filter id="glow-v11" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2.5" result="b"/><feComposite in="SourceGraphic" in2="b" operator="over"/></filter>
                        <linearGradient id="path-v11" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" style="stop-color:rgba(255,255,255,0.1)"/><stop offset="100%" style="stop-color:transparent"/></linearGradient>
                    </defs>
                    <g id="viewport"></g>
                </svg>
            </div>`;
        this.svg = this.querySelector('#graph-svg');
        this.viewport = this.querySelector('#viewport');
        this.updateViewport();
        this.setupEvents();
        this.loop();
    }
    setupEvents() {
        if (!this.svg)
            return;
        this.addEventListener('wheel', (e) => { e.preventDefault(); this.setZoom(this.zoom * (e.deltaY > 0 ? 0.94 : 1.06), e.clientX, e.clientY); }, { passive: false });
        this.svg.addEventListener('pointerdown', (e) => { if (e.button === 0)
            this.isPanning = true; });
        window.addEventListener('pointermove', (e) => { if (this.isPanning) {
            this.panX += e.movementX;
            this.panY += e.movementY;
            this.updateViewport();
        } });
        window.addEventListener('pointerup', () => { this.isPanning = false; });
    }
    zoomIn() { this.setZoom(this.zoom * 1.3); }
    zoomOut() { this.setZoom(this.zoom * 0.7); }
    resetView() { this.zoom = 0.8; this.panX = 0; this.panY = 40; this.updateViewport(); }
    setZoom(nz, cX, cY) {
        const oz = this.zoom;
        this.zoom = Math.max(0.1, Math.min(3, nz));
        if (cX !== undefined && cY !== undefined && this.svg) {
            const r = this.svg.getBoundingClientRect();
            const mX = cX - r.left, mY = cY - r.top;
            this.panX -= (mX - this.panX) * (this.zoom / oz - 1);
            this.panY -= (mY - this.panY) * (this.zoom / oz - 1);
        }
        this.updateViewport();
    }
    updateViewport() { if (this.viewport)
        this.viewport.setAttribute('transform', `translate(${this.panX},${this.panY}) scale(${this.zoom})`); }
    setData(data) {
        const centerX = 600;
        const rootY = 10;
        this.nodes = data.nodes.map(n => {
            const old = this.nodes.find(o => o.id === n.id);
            const color = n.agentColor || window.AGENT_POOL?.find((a) => a.code === n.agentCode)?.color || '#ffffff';
            let tx = centerX, ty = rootY;
            if (n.type === 'BRANCH') {
                const branches = data.nodes.filter(b => b.type === 'BRANCH');
                const spacing = Math.min(260, 1000 / (branches.length || 1));
                tx = centerX + (branches.indexOf(n) - (branches.length - 1) / 2) * spacing;
                ty = rootY + 110;
            }
            else if (n.type === 'LEAF') {
                const pLink = data.links.find(l => l.target === n.id);
                const pNode = data.nodes.find(pn => pn.id === pLink?.source);
                if (pNode) {
                    const branches = data.nodes.filter(b => b.type === 'BRANCH');
                    const bIndex = branches.indexOf(pNode);
                    const bSpacing = Math.min(260, 1000 / (branches.length || 1));
                    const siblings = data.nodes.filter(s => s.type === 'LEAF' && data.links.some(l => l.source === pNode.id && l.target === s.id));
                    tx = centerX + (bIndex - (branches.length - 1) / 2) * bSpacing;
                    ty = rootY + 110 + 60 + (siblings.indexOf(n) * 38);
                }
            }
            else if (n.type === 'DETAIL') {
                const pLink = data.links.find(l => l.target === n.id);
                const pNode = data.nodes.find(pn => pn.id === pLink?.source);
                if (pNode) {
                    tx = pNode.tx + 45; // Horizontal offset for details
                    const siblings = data.nodes.filter(s => s.type === 'DETAIL' && data.links.some(l => l.source === pNode.id && l.target === s.id));
                    ty = pNode.ty + 20 + (siblings.indexOf(n) * 22);
                }
            }
            if (old)
                return { ...old, ...n, tx, ty, agentColor: color };
            return { ...n, x: centerX, y: rootY, tx, ty, agentColor: color };
        });
        this.links = data.links;
        this.reconcileElements();
    }
    reconcileElements() {
        if (!this.viewport)
            return;
        this.links.forEach(l => {
            const key = `link-${l.source}-${l.target}`;
            if (!this.elementMap.has(key)) {
                const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                p.setAttribute('fill', 'none');
                p.setAttribute('stroke-width', '1.2');
                p.setAttribute('opacity', '0.24');
                this.viewport?.prepend(p);
                this.elementMap.set(key, p);
            }
        });
        this.nodes.forEach(n => {
            const key = `node-${n.id}`;
            if (!this.elementMap.has(key)) {
                const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
                g.setAttribute('data-node-id', n.id);
                g.setAttribute('class', 'cursor-pointer group');
                this.renderNodeContent(g, n);
                g.onclick = (e) => { e.stopPropagation(); this.dispatchEvent(new CustomEvent('az-node-selected', { bubbles: true, detail: { ...n } })); };
                this.viewport?.appendChild(g);
                this.elementMap.set(key, g);
            }
            else
                this.renderNodeContent(this.elementMap.get(key), n);
        });
    }
    renderNodeContent(g, n) {
        const color = n.agentColor || '#ffffff';
        if (n.type === 'ROOT') {
            g.innerHTML = `<rect x="-100" y="-18" width="200" height="36" rx="2" fill="#000" stroke="${color}" stroke-opacity="0.6" stroke-width="2" filter="url(#glow-v11)" />
                <text text-anchor="middle" dy="6" fill="#fff" font-size="13" font-family="sans-serif" font-weight="900" class="uppercase tracking-tighter">${n.title || 'STRATEGY'}</text>
                <circle cx="0" cy="22" r="3" fill="${color}" class="animate-pulse" />`;
        }
        else if (n.type === 'BRANCH') {
            g.innerHTML = `<rect x="-75" y="-16" width="150" height="32" fill="#050505" stroke="${color}" stroke-width="1" />
                <rect x="-75" y="-16" width="150" height="3" fill="${color}" />
                <text text-anchor="middle" dy="6" fill="${color}" font-size="9.5" font-family="sans-serif" font-weight="900" class="uppercase tracking-widest">${n.title}</text>`;
        }
        else if (n.type === 'DETAIL') {
            g.innerHTML = `<rect x="0" y="-8" width="4" height="1" fill="${color}" opacity="0.4" /><text dx="8" dy="2" fill="#fff" font-size="8" font-family="monospace" opacity="0.4" italic>${n.title}</text>`;
        }
        else {
            g.innerHTML = `<circle cx="0" cy="0" r="2.5" fill="${color}" opacity="0.4" /><text dx="10" dy="4" fill="#fff" font-size="9" font-family="monospace" opacity="0.6">${n.title}</text>`;
        }
    }
    loop() {
        const tick = () => {
            if (!this.isConnected)
                return;
            const win = window;
            if (win.semanticNodes && win.semanticNodes.length !== this.nodes.length)
                this.setData({ nodes: win.semanticNodes, links: win.semanticLinks || [] });
            this.nodes.forEach(n => { n.x += (n.tx - n.x) * 0.12; n.y += (n.ty - n.y) * 0.12; const el = this.elementMap.get(`node-${n.id}`); if (el)
                el.setAttribute('transform', `translate(${n.x},${n.y})`); });
            this.links.forEach(l => {
                const el = this.elementMap.get(`link-${l.source}-${l.target}`);
                const n1 = this.nodes.find(n => n.id === l.source), n2 = this.nodes.find(n => n.id === l.target);
                if (el && n1 && n2) {
                    const color = n1.agentColor || n2.agentColor || '#ffffff';
                    // 🚀 TACTICAL_CURVE: Use straight or smooth lines instead of stiff orthogonal paths
                    const d = `M ${n1.x} ${n1.y + (n1.type === 'ROOT' ? 22 : 16)} L ${n2.x} ${n2.y - 12}`;
                    el.setAttribute('d', d);
                    el.setAttribute('stroke', color);
                }
            });
            requestAnimationFrame(tick);
        };
        tick();
    }
}
exports.SemanticGraph = SemanticGraph;
customElements.define('az-semantic-graph', SemanticGraph);
