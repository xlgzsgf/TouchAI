import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const projectRoot = resolve(__dirname, '..');

describe('built-in tools production bundle regression', () => {
    it('uses the vue-draggable-plus CJS runtime entry to avoid unsafe ESM export tree-shaking', () => {
        const viteConfig = readFileSync(resolve(projectRoot, 'vite.config.ts'), 'utf8');

        expect(viteConfig).toContain('vue-draggable-plus');
        expect(viteConfig).toContain('vue-draggable-plus/dist/vue-draggable-plus.cjs');
    });
});
