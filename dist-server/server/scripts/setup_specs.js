"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Astra Zenith Streaming — Setup & Cleanup Script
 * Run: npm run setup:specs
 */
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const AZ = process.cwd();
const DOCS = node_path_1.default.join(AZ, 'docs');
const SPEC_ROOT = node_path_1.default.join(AZ, '.specify', 'specs', 'astra-zenith-streaming');
const toDelete = [
    node_path_1.default.join(DOCS, 'OPEN_HARNESS_DEEP_INSIGHTS.md'),
    node_path_1.default.join(DOCS, 'astra_zenith_advice.md'),
];
for (const filePath of toDelete) {
    if (node_fs_1.default.existsSync(filePath)) {
        node_fs_1.default.unlinkSync(filePath);
        console.log(`OK Deleted: ${node_path_1.default.basename(filePath)}`);
    }
}
const dirs = [
    node_path_1.default.join(AZ, '.specify', 'templates'),
    node_path_1.default.join(SPEC_ROOT, 'contracts'),
];
for (const dir of dirs) {
    node_fs_1.default.mkdirSync(dir, { recursive: true });
    console.log(`OK Created: ${node_path_1.default.relative(AZ, dir)}`);
}
const specFiles = [
    ['SPEC.md', 'spec.md'],
    ['PLAN.md', 'plan.md'],
    ['TASKS.md', 'tasks.md'],
    ['CHECKLIST.md', 'checklist.md'],
    ['CONSTITUTION.md', 'constitution.md'],
];
const referenceFiles = [
    ['ASTRA_ZENITH_ARCH_BLUEPRINT.md', 'references/astra_zenith_arch_blueprint.md'],
    ['MODELS_SPEC.md', 'references/models_spec.md'],
];
function copyDocs(entries, label) {
    for (const [src, dest] of entries) {
        const srcPath = node_path_1.default.join(DOCS, src);
        const destPath = node_path_1.default.join(SPEC_ROOT, dest);
        if (!node_fs_1.default.existsSync(srcPath)) {
            console.warn(`WARN Missing ${label}: docs/${src}`);
            continue;
        }
        node_fs_1.default.mkdirSync(node_path_1.default.dirname(destPath), { recursive: true });
        node_fs_1.default.copyFileSync(srcPath, destPath);
        console.log(`OK Copied: docs/${src} -> .specify/specs/astra-zenith-streaming/${dest}`);
    }
}
copyDocs(specFiles, 'spec file');
copyDocs(referenceFiles, 'reference doc');
console.log('\nDONE Setup complete!');
