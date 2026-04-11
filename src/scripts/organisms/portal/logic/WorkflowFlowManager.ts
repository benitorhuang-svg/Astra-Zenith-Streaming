import { PortalContext } from '../PortalTypes';
import type { N8NNode, N8NWorkflow } from '../../../integrations/n8n/n8n_data_types';

/**
 * WorkflowFlowManager — Helper for managing topological N8N-style flow data.
 */
export class WorkflowFlowManager {
    constructor(private context: PortalContext) {}

    public createInitialFlow(): N8NWorkflow {
        return {
            nodes: [
                {
                    id: 'node-root',
                    name: 'INITIAL_TASK',
                    type: 'n8n-nodes-base.agent',
                    typeVersion: 1,
                    position: [400, 300],
                    parameters: { focus: '請在此輸入任務目標...' }
                }
            ],
            connections: {}
        };
    }

    public addNode(flow: N8NWorkflow) {
        if (flow.nodes.length === 0) return this.createInitialFlow();
        
        const lastNode = flow.nodes[flow.nodes.length - 1];
        const newNodeId = `node-${Math.random().toString(36).substr(2, 5)}`;
        const newNodeName = `Agent_${flow.nodes.length + 1}`;

        const newNode: N8NNode = {
            id: newNodeId,
            name: newNodeName,
            type: 'n8n-nodes-base.agent',
            typeVersion: 1,
            position: [lastNode.position[0] + 250, lastNode.position[1]],
            parameters: { focus: 'New Task' }
        };

        flow.nodes.push(newNode);
        
        if (!flow.connections[lastNode.name]) {
            flow.connections[lastNode.name] = { main: [[]] };
        }
        flow.connections[lastNode.name].main[0].push({
            node: newNodeName,
            type: 'main',
            index: 0
        });

        return flow;
    }
}
