import { cpSync, mkdirSync, writeFileSync } from 'node:fs';

mkdirSync('docs', { recursive: true });
cpSync('dist', 'docs', { recursive: true });
writeFileSync('docs/.nojekyll', '');
console.log('GitHub Pages files prepared in docs/.');
