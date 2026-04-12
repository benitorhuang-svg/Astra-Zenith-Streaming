import { PortalContext, DIRTY_CONTENT } from '../PortalTypes';

/**
 * GraphSyncService — Synchronizes tactical content with the semantic graph visualization.
 * Optimized for hierarchical Markdown parsing and ASTRA ZENITH mapping protocols.
 * Flat-tree mode: H2 connects directly to ROOT to match Google_Gemma4 perfectly.
 */
export class GraphSyncService {
    constructor(private context: PortalContext) {}

    public sync(agentCode: string, agentName: string, content: string, round: number, silent = false) {
        const win = window as any;
        if (!win.semanticNodes) win.semanticNodes = [];
        if (!win.semanticLinks) win.semanticLinks = [];

        // 1. Initialize Root if missing
        this.ensureRootNode(win);
        const rootNode = win.semanticNodes.find((n: any) => n.type === 'ROOT');

        // 2. Process Markdown Headings directly attaching to ROOT
        this.processMarkdownHeadings(win, content, agentCode, round, rootNode.id);

        if (!silent) this.context.scheduleRender(DIRTY_CONTENT);
    }

    private ensureRootNode(win: any) {
        if (win.semanticNodes.length === 0) {
            win.semanticNodes.push({ 
                id: 'root-node', 
                title: 'Google Gemma 4 模型家族', 
                type: 'ROOT', 
                agentCode: 'SYSTEM', 
                x: 400, y: 300, 
                content: '' 
            });
        }
    }

    private processMarkdownHeadings(win: any, content: string, agentCode: string, round: number, rootId: string) {
        // Handle H2 (##) as BRANCH nodes directly under ROOT
        const h2Segments = content.split(/^##\s+/gm);
        h2Segments.forEach((h2Seg, i) => {
            if (i === 0) return; // Skip the preamble before the first H2
            
            const lines = h2Seg.split('\n');
            const header = lines[0].trim();
            const parts = header.split('|').map(p => p.trim());
            const idCode = parts[0].replace(/\s/g, '_') || `H2-${i}`;
            const nodeId = `branch-h2-${idCode}`;
            
            let nodeH2 = win.semanticNodes.find((n: any) => n.id === nodeId);
            if (!nodeH2) {
                nodeH2 = { 
                    id: nodeId, title: parts[1] || parts[0], type: 'BRANCH', 
                    agentCode, parentId: rootId, x: 700, y: 300, 
                    content: `## ${header}` 
                };
                win.semanticNodes.push(nodeH2);
                win.semanticLinks.push({ source: rootId, target: nodeId, value: 1, type: 'HIERARCHICAL' });
            } else { 
                nodeH2.title = parts[1] || parts[0]; 
                nodeH2.isGhost = false; 
                nodeH2.agentCode = agentCode; 
            }
            
            // Handle H3 (###) as DETAIL/LEAF nodes under H2
            const h3Segments = h2Seg.split(/^###\s+/gm);
            nodeH2.content = `## ${header}\n\n${h3Segments[0]}`;
            
            h3Segments.forEach((h3Seg, j) => {
                if (j === 0) return;
                const h3Lines = h3Seg.split('\n');
                const h3Header = h3Lines[0].trim();
                const h3Parts = h3Header.split('|').map(p => p.trim());
                const h3Id = `leaf-h3-${h3Parts[0].replace(/\s/g, '_')}`;
                
                let nodeH3 = win.semanticNodes.find((n: any) => n.id === h3Id);
                if (!nodeH3) {
                    nodeH3 = { 
                        id: h3Id, title: h3Parts[1] || h3Parts[0], type: 'DETAIL', 
                        agentCode, parentId: nodeId, x: 900, y: 300, 
                        content: `### ${h3Header}\n\n${h3Lines.slice(1).join('\n')}` 
                    };
                    win.semanticNodes.push(nodeH3);
                    win.semanticLinks.push({ source: nodeId, target: h3Id, value: 0.5, type: 'HIERARCHICAL' });
                } else { 
                    nodeH3.content = `### ${h3Header}\n\n${h3Lines.slice(1).join('\n')}`; 
                    nodeH3.isGhost = false; 
                }
            });
        });
    }
}
