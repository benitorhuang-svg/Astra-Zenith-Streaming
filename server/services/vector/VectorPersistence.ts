import fs from 'fs';
import path from 'path';
import { VectorNode } from './VectorTypes';

export class VectorPersistence {
    private storagePath: string;

    constructor() {
        this.storagePath = path.join(process.cwd(), 'server', 'core', 'VECTOR_STORAGE.json');
    }

    saveNodes(nodes: VectorNode[]) {
        try {
            fs.writeFileSync(this.storagePath, JSON.stringify(nodes, null, 2), 'utf8');
            console.log(`[VectorPersistence] Graph saved: ${nodes.length} nodes`);
        } catch (e) {
            console.error('[VectorPersistence] Save failed:', e);
        }
    }

    loadNodes(): VectorNode[] {
        if (fs.existsSync(this.storagePath)) {
            try {
                const data = JSON.parse(fs.readFileSync(this.storagePath, 'utf8'));
                if (Array.isArray(data)) {
                    return data;
                }
            } catch (e) {
                console.error('[VectorPersistence] Load failed:', e);
            }
        }
        return [];
    }
}

export const vectorPersistence = new VectorPersistence();
