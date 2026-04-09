import { GraphNode, GraphLink } from '../az_semantic_graph';

export class GraphEngine {
    constructor(private repulsion = 40, private attraction = 0.04, private gravity = 0.005) {}

    public apply(nodes: GraphNode[], links: GraphLink[], width: number, height: number) {
        const friction = 0.9;
        const centerX = width / 2;
        const centerY = height / 2;

        // Repulsion
        for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                const n1 = nodes[i], n2 = nodes[j];
                const dx = n1.x - n2.x, dy = n1.y - n2.y;
                const distSq = dx * dx + dy * dy + 0.1;
                const force = this.repulsion / distSq;
                n1.vx += dx * force; n1.vy += dy * force;
                n2.vx -= dx * force; n2.vy -= dy * force;
            }
        }

        // Attraction
        links.forEach(l => {
            const n1 = nodes.find(n => n.id === l.source), n2 = nodes.find(n => n.id === l.target);
            if (n1 && n2) {
                const dx = n1.x - n2.x, dy = n1.y - n2.y;
                const dist = Math.sqrt(dx * dx + dy * dy) + 0.1;
                const force = (dist - 120) * this.attraction;
                n1.vx -= (dx / dist) * force; n1.vy -= (dy / dist) * force;
                n2.vx += (dx / dist) * force; n2.vy += (dy / dist) * force;
            }
        });

        // Center Gravity & Friction
        nodes.forEach(n => {
            n.vx += (centerX - n.x) * this.gravity;
            n.vy += (centerY - n.y) * this.gravity;
            n.vx *= friction; n.vy *= friction;
            n.x += n.vx; n.y += n.vy;
        });
    }
}
