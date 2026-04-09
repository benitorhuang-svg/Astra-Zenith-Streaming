/**
 * Astra Zenith Streaming — Setup & Cleanup Script
 * Run: npm run setup:specs
 *
 * 1. Deletes redundant doc files
 * 2. Creates the .specify directory structure
 * 3. Copies spec docs and key references into .specify for spec-kit use
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE = __dirname;
const AZ = path.join(BASE, 'Astra Zenith Streaming');
const DOCS = path.join(AZ, 'docs');
const SPEC_ROOT = path.join(AZ, '.specify', 'specs', 'astra-zenith-streaming');

const toDelete = [
  path.join(DOCS, 'OPEN_HARNESS_DEEP_INSIGHTS.md'),
  path.join(DOCS, 'astra_zenith_advice.md'),
];

for (const filePath of toDelete) {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    console.log(`OK Deleted: ${path.basename(filePath)}`);
  } else {
    console.log(`SKIP Already removed: ${path.basename(filePath)}`);
  }
}

const dirs = [
  path.join(AZ, '.specify', 'templates'),
  path.join(SPEC_ROOT, 'contracts'),
];

for (const dir of dirs) {
  fs.mkdirSync(dir, { recursive: true });
  console.log(`OK Created: ${path.relative(BASE, dir)}`);
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
    const srcPath = path.join(DOCS, src);
    const destPath = path.join(SPEC_ROOT, dest);

    if (!fs.existsSync(srcPath)) {
      console.warn(`WARN Missing ${label}: docs/${src}`);
      continue;
    }

    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    fs.copyFileSync(srcPath, destPath);
    console.log(`OK Copied: docs/${src} -> .specify/specs/astra-zenith-streaming/${dest}`);
  }
}

copyDocs(specFiles, 'spec file');
copyDocs(referenceFiles, 'reference doc');

console.log('');
console.log('DONE Setup complete!');
console.log(`     Spec root: ${path.relative(BASE, SPEC_ROOT)}`);
console.log('     Docs remain in docs/ as the source of truth');
