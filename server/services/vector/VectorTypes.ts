export interface VectorNode {
    id: string;
    content: string;
    agentCode: string;
    vector: number[];
    x: number;
    y: number;
    timestamp: number;
}

export interface GraphData {
    nodes: any[];
    links: Array<{ source: string, target: string, value: number }>;
}
