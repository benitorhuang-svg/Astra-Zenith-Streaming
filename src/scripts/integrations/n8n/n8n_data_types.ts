/**
 * n8n SPECIFIC DATA TYPES
 * Part of the Astra Zenith n8n-Integration Module
 */

export interface N8NNode {
    id: string;
    name: string;
    type: string;
    typeVersion: number;
    position: [number, number];
    parameters: Record<string, unknown>;
}

export interface N8NConnection {
    node: string;
    type: string;
    index: number;
}

export interface N8NWorkflow {
    nodes: N8NNode[];
    connections: Record<string, {
        main: N8NConnection[][];
    }>;
}
