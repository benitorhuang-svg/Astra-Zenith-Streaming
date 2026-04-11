"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.vectorPersistence = exports.VectorPersistence = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
class VectorPersistence {
    storagePath;
    constructor() {
        this.storagePath = path_1.default.join(process.cwd(), 'server', 'core', 'VECTOR_STORAGE.json');
    }
    saveNodes(nodes) {
        try {
            fs_1.default.writeFileSync(this.storagePath, JSON.stringify(nodes, null, 2), 'utf8');
            console.log(`[VectorPersistence] Graph saved: ${nodes.length} nodes`);
        }
        catch (e) {
            console.error('[VectorPersistence] Save failed:', e);
        }
    }
    loadNodes() {
        if (fs_1.default.existsSync(this.storagePath)) {
            try {
                const data = JSON.parse(fs_1.default.readFileSync(this.storagePath, 'utf8'));
                if (Array.isArray(data)) {
                    return data;
                }
            }
            catch (e) {
                console.error('[VectorPersistence] Load failed:', e);
            }
        }
        return [];
    }
}
exports.VectorPersistence = VectorPersistence;
exports.vectorPersistence = new VectorPersistence();
