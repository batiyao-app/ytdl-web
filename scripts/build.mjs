import {build} from 'esbuild';
await build({entryPoints:['src/app.js'],bundle:true,format:'iife',platform:'browser',target:'es2022',outfile:'app/app.js',legalComments:'eof',minify:true});
