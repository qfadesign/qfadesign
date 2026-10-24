// Regenera js/vendor/lanyard.js (la tarjeta colgante 3D). Solo hace falta si cambiás src/lanyard.js.
//   cd scripts/lanyard && npm i three esbuild && node build.mjs
import { build } from 'esbuild';
await build({ entryPoints: ['src/entry.js'], bundle: true, minify: true, format: 'iife', target: ['es2019'], outfile: '../../js/vendor/lanyard.js', legalComments: 'none' });
