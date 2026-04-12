/**
 * AZ_SEMANTIC_GRAPH — Markmap Implementation
 * Focus exclusively on the mind map itself, styled like @Google_Gemma4.html
 */

export interface GraphNode { 
    id: string; 
    parentId?: string;
    agentCode: string; 
    type: 'ROOT' | 'BRANCH' | 'LEAF' | 'DETAIL'; 
    title?: string;
    content?: string;
}

export class SemanticGraph extends HTMLElement {
    private mm: any = null;
    private svg: SVGSVGElement | null = null;
    private lastMarkdown: string = '';
    private currentNodes: GraphNode[] = [];
    private _lastStateKey: string = '';

    connectedCallback() {
        // Removed header and title area. Focus only on the map container.
        this.innerHTML = `
            <div class="w-full h-full relative overflow-hidden bg-white">
                <style>
                    #markmap-svg {
                        width: 100%;
                        height: 100%;
                        font-family: "Microsoft JhengHei", "Segoe UI", Tahoma, sans-serif;
                    }
                    /* Base styles from Google_Gemma4.html logic */
                    .markmap-node-text {
                        fill: #333 !important;
                        font-size: 13px !important;
                    }
                    .markmap-node-depth-0 > .markmap-node-text {
                        font-size: 16px !important;
                        font-weight: bold !important;
                    }
                    .markmap-node-depth-1 > .markmap-node-text {
                        font-size: 14px !important;
                        font-weight: bold !important;
                    }
                    .markmap-node-depth-3 > .markmap-node-text {
                        font-size: 12px !important;
                    }
                    .markmap-link {
                        stroke-width: 2px !important;
                        opacity: 0.8 !important;
                    }
                    .markmap-node-circle {
                        fill: #fff !important;
                        stroke-width: 1.5px !important;
                    }
                </style>
                
                <svg id="markmap-svg" class="w-full h-full"></svg>
                
                <!-- Reset View Button -->
                <button id="mm-fit" class="absolute bottom-4 right-4 w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center shadow-sm hover:bg-white text-slate-500 transition-all active:scale-95 z-50">
                    <i data-lucide="maximize" class="w-4 h-4"></i>
                </button>
            </div>`;
            
        this.svg = this.querySelector('#markmap-svg');
        this.querySelector('#mm-fit')?.addEventListener('click', () => this.resetView());

        if (window.lucide) (window as any).lucide.createIcons({ props: { "stroke-width": 2 }, scope: this });

        const check = setInterval(() => {
            if ((window as any).markmap) {
                clearInterval(check);
                this.startPolling();
                window.addEventListener('resize', () => { if(this.mm) this.mm.fit(); });
            }
        }, 500);
    }

    public resetView() { if (this.mm) this.mm.fit(); }

    setData(data: { nodes: GraphNode[], links: any[] }) {
        this.currentNodes = data.nodes;
        const markdown = this.nodesToMarkdown(data.nodes);
        if (markdown === this.lastMarkdown) return;
        this.lastMarkdown = markdown;
        this.renderMarkmap(markdown);
    }

    private nodesToMarkdown(nodes: GraphNode[]): string {
        if (!nodes.length) return '# Gemma 4 選型指南';
        const root = nodes.find(n => n.type === 'ROOT') || nodes[0];

        const buildTree = (parentId: string, depth: number): string => {
            const children = nodes.filter(n => n.parentId === parentId);
            let md = '';
            children.forEach(child => {
                const prefix = depth === 1 ? '##' : (depth === 2 ? '###' : '-');
                md += `${prefix} ${child.title || 'UNTITLED'}\n`;
                
                // Append content bullets for details
                if ((child.type === 'DETAIL' || child.type === 'LEAF') && child.content) {
                    const lines = child.content.split('\n');
                    const bullets = lines.filter(l => l.trim().startsWith('-'));
                    if (bullets.length > 0) md += bullets.join('\n') + '\n';
                }
                
                md += buildTree(child.id, depth + 1);
            });
            return md;
        };

        let result = `# ${root.title || 'Gemma 4 選型指南'}\n\n`;
        result += buildTree(root.id, 1);
        return result;
    }

    private async renderMarkmap(markdown: string) {
        if (!this.svg) return;
        const { Markmap, Transformer, loadCSS, loadJS } = (window as any).markmap;
        const transformer = new Transformer();
        const { root } = transformer.transform(markdown);
        const { styles, scripts } = transformer.getAssets();

        if (styles) loadCSS(styles);
        if (scripts) loadJS(scripts);

        const options = {
            autoFit: true,
            padding: 20,
            duration: 500,
            initialExpandLevel: 4,
        };

        if (!this.mm) {
            this.mm = Markmap.create(this.svg, options, root);
            setTimeout(() => this.mm.fit(), 300);
        } else {
            this.mm.setData(root);
            this.mm.fit();
        }

        // Click to select node
        const d3 = (window as any).d3;
        if (d3) {
            const svg = d3.select(this.svg);
            svg.selectAll('.markmap-node').on('click', (event: any, d: any) => {
                event.stopPropagation();
                const original = this.currentNodes.find(n => n.title === d.data.content) || 
                                 this.currentNodes.find(n => d.data.content && d.data.content.includes(n.title || ''));
                this.dispatchEvent(new CustomEvent('az-node-selected', {
                    bubbles: true,
                    detail: {
                        title: d.data.content,
                        content: original?.content || d.data.content,
                        type: d.depth === 0 ? 'ROOT' : (d.depth === 1 ? 'BRANCH' : 'LEAF')
                    }
                }));
            });
        }
    }

    private startPolling() {
        const tick = () => {
            if (!this.isConnected) return;
            const win = window as any;
            if (win.semanticNodes && win.semanticNodes.length > 0) {
                const currentCount = win.semanticNodes.length;
                const lastNodeContent = win.semanticNodes[currentCount - 1]?.content || '';
                const stateKey = `PURE-MAP-${currentCount}-${lastNodeContent.length}`;
                if (this._lastStateKey !== stateKey) {
                    this._lastStateKey = stateKey;
                    this.setData({ nodes: win.semanticNodes, links: [] });
                }
            }
            requestAnimationFrame(tick);
        };
        tick();
    }
}
customElements.define('az-semantic-graph', SemanticGraph);
