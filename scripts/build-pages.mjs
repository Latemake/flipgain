import { cpSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const workspace=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const target=resolve(workspace,'docs');
if(relative(workspace,target)!=='docs')throw new Error('Refusing to replace files outside the generated docs directory.');
rmSync(target,{recursive:true,force:true});
mkdirSync(target, { recursive: true });
cpSync(resolve(workspace,'dist'), target, { recursive: true });
writeFileSync(resolve(target,'.nojekyll'), '');
console.log('GitHub Pages files prepared in docs/.');
