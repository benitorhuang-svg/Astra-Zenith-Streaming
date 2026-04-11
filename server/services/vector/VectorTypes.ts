export type VectorNodeType = 'ROOT' | 'BRANCH' | 'LEAF' | 'SUMMARY' | 'ADMIN' | 'SYSTEM';

export interface VectorNode {
    id: string;
    content: string | any[];
    agentCode: string;
    vector: number[];
    x: number;
    y: number;
    timestamp: number;
    parentId?: string; // Links to a Root or Branch node
    type?: VectorNodeType;
    title?: string; // Short extracted summary
}

export interface GraphData {
    nodes: any[];
    links: Array<{ 
        source: string, 
        target: string, 
        value: number,
        type?: 'HIERARCHICAL' | 'SEMANTIC' // Distinguish logic parent-child vs. vector similarity
    }>;
}
