import { GraphEngine } from './graph/GraphEngine';

export interface GraphNode { id: string; agentCode: string; x: number; y: number; vx: number; vy: number; type: 'text' | 'multimodal'; agentColor?: string; }
export interface GraphLink { source: string; target: string; value: number; }

export class SemanticGraph extends HTMLElement {
    private nodes: GraphNode[] = [];
    private links: GraphLink[] = [];
    private engine = new GraphEngine();
    private svg: SVGSVGElement | null = null;
    private isUpdating = false;

    connectedCallback() {
        this.innerHTML = `<div class="w-full h-full bg-[#030303] overflow-hidden"><svg id="graph-svg" class="w-full h-full"></svg></div>`;
        this.svg = this.querySelector('#graph-svg');
        this.startSimulation();
    }

    setData(data: { nodes: any[], links: any[] }) {
        this.nodes = data.nodes.map(n => ({
            ...n, x: n.x || Math.random() * 800, y: n.y || Math.random() * 600,
            vx: 0, vy: 0, type: n.content?.includes('[Multimodal') ? 'multimodal' : 'text'
        }));
        this.links = data.links;
    }

    private startSimulation() {
        const tick = () => {
            if (!this.isConnected) return;
            this.engine.apply(this.nodes, this.links, this.offsetWidth, this.offsetHeight);
            this.render();
            requestAnimationFrame(tick);
        };
        tick();
    }

    private render() {
        if (!this.svg) return;
        let html = '';
        this.links.forEach(l => {
            const n1 = this.nodes.find(n => n.id === l.source), n2 = this.nodes.find(n => n.id === l.target);
            if (n1 && n2) html += `<line x1="${n1.x}" y1="${n1.y}" x2="${n2.x}" y2="${n2.y}" stroke="${n1.agentColor}" opacity="0.2" stroke-dasharray="2 2" />`;
        });
        this.nodes.forEach(n => {
            html += `<g transform="translate(${n.x},${n.y})">
                <circle r="5" fill="${n.agentColor}"/><text dx="10" dy="4" fill="white" font-size="8">${n.agentCode}</text>
            </g>`;
        });
        this.svg.innerHTML = html;
    }
}
customElements.define('az-semantic-graph', SemanticGraph);
